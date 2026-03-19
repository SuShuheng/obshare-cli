# obshare-cli Obsidian Plugin

This is the Obsidian desktop companion plugin for `obshare-cli`.

In `V0.2.0`, the plugin becomes the primary direct-share UI for `obshare-cli`: share the current note to Feishu from inside Obsidian, while the CLI remains the execution backend. Mermaid rendering inside a real Obsidian environment is still part of the plugin's runtime responsibilities.

Repository: `https://github.com/SuShuheng/obshare-cli`

Default plugin language: `zh_cn`

Supported plugin languages:

- `zh_cn`
- `en_us`

## Plugin Tabs

The plugin shell is organized into four tabs:

- `Environment Configuration`
- `Upload Configuration`
- `Document Management`
- `About`

## Direct Share Entry Points

The plugin now exposes three direct-share entry points for Markdown notes:

- command palette: `Share Current Note To Feishu`
- file context menu: `Share To Feishu`
- ribbon button: `Share To Feishu`

The direct-share flow is:

1. validate the target note
2. block if the current note has unsaved changes
3. confirm share permissions
4. run `obshare-cli --json upload ...`
5. show staged progress
6. show either the success URL or a failure summary
7. allow failure log export to a user-selected folder

The first implemented functional tab is `Environment Configuration`, which detects:

- current platform
- Python
- pip
- Obsidian CLI
- `obshare-cli`

It also persists:

- selected install mode
- bound Python executable
- bound CLI executable
- bound isolated environment path
- bridge directory and render timeout

## Current Functional Coverage

`Environment Configuration`
- probes `conda`, `conda env: obsd`, Python, pip, Obsidian CLI, and `obshare-cli`
- prefers `conda (obsd)` as the recommended runtime
- supports two conda execution modes:
  - `conda run -n obsd`
  - `obsd` Python absolute path with `-m obshare_cli`
- still supports compatibility paths for:
  - `venv (obsd)`
  - `system Python`
- supports copy and optional direct execution of the generated install command
- shows Miniconda guidance when `conda` is missing

`Upload Configuration`
- loads real shared config values through `obshare-cli --json config export-runtime`
- saves updates through CLI config subcommands
- imports and exports the shared config file
- tests connectivity through `obshare-cli --json config test`

`Document Management`
- reads `~/.obshare/history.json`
- opens recorded document URLs
- dispatches delete and permission updates through CLI JSON commands

`Direct Share`
- resolves the selected Markdown note to a filesystem path
- calls `obshare-cli --json upload ...`
- applies share permissions selected in the confirmation dialog
- shows a staged progress dialog during upload
- shows a success dialog with the Feishu URL
- shows a failure dialog with `.log` export

`About`
- shows plugin version
- shows detected CLI version
- links to the repository
- lets the user switch between `zh_cn` and `en_us`
- refreshes the plugin shell after language switching
- provides plugin update guidance
- generates and can execute the CLI upgrade command for the bound runtime

## Commands

- `obshare-cli:process-render-request`

This command is the one `obshare-cli` should trigger through the official Obsidian CLI for Mermaid bridge rendering:

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
