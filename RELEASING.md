# Release Process

All 11 steps are mandatory. Do not skip steps or reorder.

## Release checklist

### 1. Test

```bash
npm test
```

All tests must pass before proceeding.

### 2. Update version strings

Update in all 7 locations:

| # | File | Location |
|---|------|----------|
| 1 | `package.json` | `version` field |
| 2 | `server.json` | `version` (root) + `packages[0].version` — 2 places |
| 3 | `src/cli/index.ts` | CLI `--version` output |
| 4 | `src/mcp/server.ts` | MCP server version |
| 5 | `.claude-plugin/plugin.json` | `version` field |
| 6 | `.claude-plugin/marketplace.json` | `plugins[0].version` field |
| 7 | `.cursor-plugin/plugin.json` | `version` field |

### 3. Update CHANGELOG.md

Add entry for the new version with date and change summary.

### 4. Build and bundle

```bash
npm run bundle          # tsc + esbuild → dist/cli.bundle.js + dist/mcp.bundle.js
npm run build:skill-zip # → dist/image-generation-skill.zip
```

Both bundles and the Skill ZIP must be committed (plugin distribution relies on git).

### 5. Update README.md

Update if the release adds features, changes commands, or modifies usage.
Skip for bug-fix-only releases.

### 6. Commit and push (imgx-mcp)

```bash
git add -A
git commit -m "release: vX.Y.Z — <summary>"
git push
```

### 7. Publish to npm

```bash
npm publish --access public --otp=YOUR_OTP
```

Verify: `npm info imgx-mcp version`

### 8. Claude Code MCP update and verification

Restart the MCP server in Claude Code and verify:

- `generate_image` produces output
- `edit_image` / `edit_last` work
- `list_providers` returns correct version

### 9. Update app-division-ops documentation

Files that reference imgx-mcp version (update as applicable):

| Category | Files |
|----------|-------|
| Core docs | `CLAUDE.md`, `README.md`, `docs/app-division-plan.md`, `docs/team.md` |
| Product spec | `docs/analytics/specs/imgx-mcp.md` |
| Website sources | `content/platforms/somacoffee-net/imgx-mcp/{en,ja}/{lp,usage,story}.md` |
| Website HTML | `content/platforms/somacoffee-net/imgx-mcp/html/{en,ja}/{lp,usage,story}.html` |
| note.com articles | `content/platforms/note/articles/imgx-mcp/` (if content changed) |

### 10. Commit and push (app-division-ops)

```bash
git add -A
git commit -m "docs: update imgx-mcp references to vX.Y.Z"
git push
```

### 11. Public distribution update

| Channel | Action | Verification |
|---------|--------|-------------|
| somacoffee.net | Update WordPress pages (LP + usage + story) | Check live pages |
| MCP Registry | `./mcp-publisher publish` | Succeeds with new version |
| Claude Desktop Skill ZIP | Upload `dist/image-generation-skill.zip` via Settings > Skills | Skill appears in Claude Desktop |

Additional channels (auto-updated or pending):

| Channel | How it updates |
|---------|---------------|
| PulseMCP | Auto-ingested from MCP Registry |
| Claude Code plugin | Users reinstall to get latest git |
| Claude Desktop MCP | `npx imgx-mcp@latest` fetches new version on next launch |

---

## Plugin structure

imgx-mcp doubles as an AI coding tool plugin. The repository contains:

```
.claude-plugin/
├── plugin.json          # Claude Code plugin manifest
└── marketplace.json     # Marketplace definition for plugin discovery
.cursor-plugin/
└── plugin.json          # Cursor plugin manifest
.mcp.json                # MCP server config (auto-registered on plugin install)
skills/
└── image-generation/
    ├── SKILL.md         # Skill instructions
    └── references/
        └── providers.md # Provider and model reference
dist/
├── cli.bundle.js        # Bundled CLI (tracked in git for plugin distribution)
├── mcp.bundle.js        # Bundled MCP server
└── image-generation-skill.zip  # Skill ZIP for Claude Desktop upload
```

### Plugin configuration files

- **`.claude-plugin/plugin.json`** — Plugin identity. Fields: `name`, `description`, `version`, `author`. No `category` field (that belongs in `marketplace.json` only).
- **`.claude-plugin/marketplace.json`** — Marketplace wrapper. The `source` field must use URL format for self-referencing repositories: `"source": "url"`, `"url": "https://github.com/somacoffeekyoto/imgx-mcp.git"`.
- **`skills/image-generation/SKILL.md`** — Uses `${CLAUDE_PLUGIN_ROOT}` variable for portable CLI paths. Frontmatter (`name`, `description`) is required for skill registration.
