# obshare-cli Obsidian Plugin

This is the Obsidian desktop companion plugin for `obshare-cli`.

Its first internal runtime capability is Mermaid rendering inside a real Obsidian environment, but the plugin identity is broader: it is the desktop companion shell for `obshare-cli`.

## Commands

- `obshare-cli:process-render-request`

This command is the one `obshare-cli` should trigger through the official Obsidian CLI:

```bash
obsidian command id=obshare-cli:process-render-request
```

## Installation

1. Copy this folder into your vault plugin directory:
   `.obsidian/plugins/obshare-cli/`
2. Enable the plugin in Obsidian.
3. Open the plugin settings and set the shared bridge directory.
4. In `obshare-cli`, configure the matching values:

```bash
obshare-cli config set-obsidian-cli obsidian
obshare-cli config set-obsidian-bridge-dir /path/to/shared/bridge
obshare-cli config set-obsidian-command-id obshare-cli:process-render-request
```

## Bridge Files

`obshare-cli` writes a `*.request.json` file into the bridge directory. The plugin reads the oldest request, renders Mermaid, then writes:

- `outputPngPath`
- `resultPath`

The result JSON contains:

```json
{
  "status": "success",
  "pngPath": "/path/to/rendered.png",
  "width": 800,
  "height": 600
}
```

On failure it writes:

```json
{
  "status": "error",
  "error": "..."
}
```
