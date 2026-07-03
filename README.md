# nicode

A personal fork of [opencode](https://github.com/opencode-ai/opencode) with MCP proxy-per-server architecture, runtime rate limiting, and local TUI commands.

## Fork Differences

- **MCP Proxy-per-Server** — One `mcp_<server>` tool per MCP server instead of N individual per-tool stubs. Saves ~95% of MCP schema tokens per turn (~33KB → ~2KB).
- **`tools_search`** — Built-in runtime tool discovery. Model discovers schemas via `tools_search`, then calls proxy tools.
- **Token-Bucket Rate Limiting** — Per-provider RPM limiting. Set at startup via config, or at runtime via `/rate-limit set <provider> <rpm>`.
- **Local TUI Commands** — `/rate-limit`, `/config`, `/help`, `/clear`, `/cost`, `/doctor` handled locally without reaching the model.
- **All Claude Code Skills/Plugins/Rules** preserved from original opencode.

## Running

```powershell
# 1. Build (from repo root):
cd packages\opencode
bun run build

# 2. Run via PowerShell function (already added to profile):
nicode

# Or run directly:
packages\opencode\dist\opencode-windows-x64\bin\opencode.exe
```

No standalone install — the `nicode` PowerShell function points to the built binary in the repo.

## Configuration

```powershell
notepad ~\.config\opencode\opencode.jsonc
```

See `opencode.template.jsonc` for a reference config. Personal config stays at `~\.config\opencode\opencode.jsonc` — outside the repo.

## Upstream Merge Strategy (Manual)

When opencode (or another upstream) releases changes you want:

```powershell
# From repo root (C:\Users\niloy\Documents\nicode):
git fetch upstream
git checkout -b merge-upstream main
git pull upstream main
# Resolve conflicts, commit, then merge back:
git checkout main
git merge merge-upstream
git branch -d merge-upstream
```

**Porting features from other sources** (Claude Code, other forks):

1. Create a branch: `git checkout -b port-feature`
2. Manually apply the changes (patch files, cherry-pick from other repos, or hand-write)
3. Keep changes focused — one feature per branch
4. PR into `main` when done

**Keep your patches on top**: All nicode-specific changes are in commits on `main`. When upstream releases, merge them in. Conflicts are typically small — our modifications are localized to a few files (`session/tools.ts`, `provider/rate-limit.ts`, `tui/` commands, etc.).

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
