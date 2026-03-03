# Release Process

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

## Release checklist

When releasing a new version:

### 1. Update version strings

Update in all locations:

- `package.json`
- `server.json` (2 places: root `version` + `packages[0].version`)
- `src/cli/index.ts` — CLI `--version` output
- `src/mcp/server.ts` — MCP server version
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `.cursor-plugin/plugin.json`

### 2. Build and commit

```bash
npm run bundle
npm run build:skill-zip
# commit dist/ (bundles + skill ZIP — plugin distribution relies on git)
git push
```

### 3. Publish to registries

```bash
npm publish --access public --otp=YOUR_OTP
./mcp-publisher publish          # requires: mcp-publisher login github
```

### 4. Verify distribution

| Channel | How to verify |
|---------|--------------|
| npm | `npm info imgx-mcp version` |
| MCP Registry | `./mcp-publisher publish` succeeds with new version |
| PulseMCP | Auto-ingested from MCP Registry (daily/weekly) |
| Claude Code plugin | Users reinstall to get latest git |
| Claude Desktop MCP | `npx imgx-mcp@latest` fetches new version on next launch |
| Claude Desktop skill | Upload `dist/image-generation-skill.zip` via Settings > Skills |
