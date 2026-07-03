import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { MCP } from "@/mcp"
import { McpCatalog } from "@/mcp/catalog"

export const Parameters = Schema.Struct({
  query: Schema.String.annotate({
    description:
      'Query to find MCP tools. Use "select:<tool_key>" for direct selection (comma-separated for multi-select), or keywords to search by name, description, and parameter names.',
  }),
  max_results: Schema.optional(Schema.Number).annotate({
    description: "Maximum number of results to return (default: 10)",
  }),
})

type Metadata = {
  matches: number
  tools: string[]
}

function formatProp(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "any"
  const p = prop as Record<string, unknown>
  const parts: string[] = []
  if (p.type) parts.push(String(p.type))
  if (p.enum && Array.isArray(p.enum)) {
    parts.push(`enum[${p.enum.map((v) => JSON.stringify(v)).join(", ")}]`)
  }
  if (p.properties && typeof p.properties === "object") {
    parts.push("object{...}")
  }
  if (p.items && typeof p.items === "object") {
    const items = p.items as Record<string, unknown>
    if (items.properties) parts.push("array[object{...}]")
    else if (items.type) parts.push(`array[${items.type}]`)
    else parts.push("array")
  }
  return parts.join(" | ")
}

function formatSchema(schema: unknown): string {
  if (!schema || typeof schema !== "object") return "  (any input)"
  const s = schema as Record<string, unknown>
  if (s.type !== "object" || !s.properties || typeof s.properties !== "object") {
    return `  (type: ${s.type ?? "any"})`
  }
  const props = s.properties as Record<string, unknown>
  const required = Array.isArray(s.required) ? new Set(s.required as string[]) : new Set<string>()
  const lines: string[] = []
  for (const [name, prop] of Object.entries(props)) {
    const req = required.has(name) ? " (required)" : " (optional)"
    const desc = prop && typeof prop === "object" && (prop as Record<string, unknown>).description
      ? ` - ${(prop as Record<string, unknown>).description}`
      : ""
    lines.push(`  ${name}: ${formatProp(prop)}${req}${desc}`)
  }
  return lines.join("\n") || "  (no parameters)"
}

function formatToolInfo(server: string, key: string, def: MCP.McpTool): string {
  const lines: string[] = []
  lines.push(`Tool: ${key}`)
  if (def.def.description) lines.push(`Description: ${def.def.description}`)
  lines.push("Parameters:")
  lines.push(formatSchema(def.def.inputSchema))
  return lines.join("\n")
}

function extractServerName(key: string, toolName: string): string {
  const suffix = "_" + McpCatalog.sanitize(toolName)
  return key.endsWith(suffix) ? key.slice(0, key.length - suffix.length) : key
}

export const ToolSearchTool = Tool.define<typeof Parameters, Metadata, MCP.Service>(
  "tools_search",
  Effect.gen(function* () {
    const mcp = yield* MCP.Service

    return {
      description:
        "Searches MCP (Model Context Protocol) tools and returns their complete parameter schemas. " +
        "MCP tool schemas are not included in the initial tools list to save context. " +
        'Use "select:<tool_key>" to fetch specific tools by name, or provide keywords for discovery.',
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context<Metadata>) =>
        Effect.gen(function* () {
          const maxResults = params.max_results ?? 10
          const allTools = yield* mcp.tools()
          const entries = Object.entries(allTools)

          const selectMatch = params.query.match(/^select:(.+)$/i)
          if (selectMatch) {
            const requested = selectMatch[1]
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
            const found: typeof entries = []
            for (const name of requested) {
              for (const [key, entry] of entries) {
                if (key === name || entry.def.name === name) {
                  if (!found.some((f) => f[0] === key)) found.push([key, entry])
                }
              }
            }
            if (found.length === 0) {
              return {
                title: "No tools found",
                output: `None of the requested tools were found: ${requested.join(", ")}`,
                metadata: { matches: 0, tools: [] },
              }
            }
            const toolKeys = found.map((f) => f[0])
            const formatted = found
              .map(([key, entry]) => formatToolInfo(extractServerName(key, entry.def.name), key, entry))
              .join("\n---\n")
            return {
              title: `${found.length} tool${found.length === 1 ? "" : "s"} selected`,
              output: `Fetched ${found.length} tool(s):\n${formatted}`,
              metadata: { matches: found.length, tools: toolKeys },
            }
          }

          const queryLower = params.query.toLowerCase()
          const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 0)
          const scored: Array<{ key: string; entry: MCP.McpTool; score: number }> = []

          for (const [key, entry] of entries) {
            const def = entry.def
            const name = def.name.toLowerCase()
            const desc = (def.description ?? "").toLowerCase()
            const schemaText = JSON.stringify(def.inputSchema).toLowerCase()
            const candidates = [name, desc, schemaText]

            let score = 0
            for (const term of queryTerms) {
              const matches = candidates.some((c) => c.includes(term))
              if (!matches) { score = -1; break }
              score += name.includes(term) ? 3 : desc.includes(term) ? 2 : 1
            }
            if (score >= 0) scored.push({ key, entry, score })
          }

          scored.sort((a, b) => b.score - a.score)
          const top = scored.slice(0, maxResults)

          if (top.length === 0) {
            const servers = [...new Set(entries.map(([k, e]) => extractServerName(k, e.def.name)))].join(", ")
            return {
              title: "No matching MCP tools found",
              output: [
                `No MCP tools matched "${params.query}".`,
                `Connected MCP servers: ${servers || "(none)"}`,
                'Use "select:<tool_key>" to fetch specific tools, or try broader keywords.',
              ].join("\n"),
              metadata: { matches: 0, tools: [] },
            }
          }

          const toolKeys = top.map((t) => t.key)
          const formatted = top
            .map((t) => formatToolInfo(extractServerName(t.key, t.entry.def.name), t.key, t.entry))
            .join("\n---\n")

          return {
            title: `${top.length} MCP tool${top.length === 1 ? "" : "s"} found`,
            output: `Found ${top.length} tool(s) for "${params.query}":\n${formatted}`,
            metadata: { matches: top.length, tools: toolKeys },
          }
        }),
    } satisfies Tool.DefWithoutID<typeof Parameters, Metadata>
  }),
)