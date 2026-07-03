# nicode

A personal fork of [opencode](https://github.com/opencode-ai/opencode) with MCP proxy-per-server architecture, runtime rate limiting, and local TUI commands.

## Fork Differences

- **MCP Proxy-per-Server** — One `mcp_<server>` tool per MCP server instead of N individual per-tool stubs. Saves ~95% of MCP schema tokens per turn (~33KB → ~2KB).
- **`tools_search`** — Built-in runtime tool discovery. Model discovers schemas via `tools_search`, then calls proxy tools.
- **Token-Bucket Rate Limiting** — Per-provider RPM limiting. Set at startup via config, or at runtime via `/rate-limit set <provider> <rpm>`.
- **Local TUI Commands** — `/rate-limit`, `/config`, `/help`, `/clear`, `/cost`, `/doctor` handled locally without reaching the model.
- **All Claude Code Skills/Plugins/Rules** preserved from original opencode.

## Installation

```powershell
# From build output:
bun run build
Copy-Item packages\opencode\dist\opencode-windows-x64\bin\opencode.exe ~\.opencode\bin\nicode.exe -Force

# Run:
nicode
```

## Configuration

```powershell
notepad ~\.config\opencode\opencode.jsonc
```

See `opencode.template.jsonc` for a reference config.

## Upstream Tracking

```powershell
git remote add upstream https://github.com/opencode-ai/opencode.git
git fetch upstream
git checkout -b merge-upstream main
git pull upstream main
# Resolve conflicts, then merge into main
```

## Local TUI Commands

| Command | Description |
|---------|-------------|
| `/rate-limit set <provider> <rpm>` | Set RPM for a provider at runtime |
| `/rate-limit get <provider>` | Show current RPM for a provider |
| `/rate-limit list` | Show all provider rate limits |
| `/config show` | Show current settings |
| `/config set <key> <value>` | Change a runtime setting |
| `/settings` | Alias for `/config` |
| `/help` | List available commands |
| `/clear` | Clear the screen |
| `/cost` | Show model, usage, and duration |
| `/doctor` | Show session diagnostics |

## License

Same as opencode — Apache 2.0.
