# obshare-cli

Upload Obsidian Markdown documents to Feishu cloud documents with a workflow built around `obshare-cli` and the bundled Obsidian companion plugin.

[![PyPI version](https://badge.fury.io/py/obshare-cli.svg)](https://badge.fury.io/py/obshare-cli)
[![Python](https://img.shields.io/pypi/pyversions/obshare-cli.svg)](https://pypi.org/project/obshare-cli/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [中文说明](./README_Zh_CN.md)
>
> `mermaid-cli` rendering has been removed. The supported Mermaid path is `obshare-cli` -> Obsidian CLI -> `obsidian-plugins` bridge -> PNG upload.

![pip-install-obshare-cli](./assets/obshare-cli.gif)

## Supported Stack

This repository now has three layers:

- `obshare-cli`: upload Markdown, manage permissions, inspect history, and return JSON for automation
- `obsidian-plugins/`: the required desktop companion plugin for runtime binding, shared config/history management, and Mermaid rendering
- Claude Code plugin skills: an agent-facing layer that drives the same CLI + Obsidian workflow

If you want the supported experience, install the CLI and the Obsidian plugin together.

## 5-Minute Quick Start

### 1. Create the recommended `obsd` conda environment

```bash
conda create -n obsd python -y
conda run -n obsd python -m pip install --upgrade pip
conda run -n obsd python -m pip install --upgrade obshare-cli
conda run -n obsd obshare-cli --version
```

### 2. Install the Obsidian companion plugin

1. Copy [`obsidian-plugins/`](./obsidian-plugins/) into your vault plugin directory as `.obsidian/plugins/obshare-cli/`.
2. Enable `obshare-cli` in Obsidian.
3. Open the plugin settings.
4. In `Environment Configuration`, choose the `conda (obsd)` runtime.
5. Set a shared bridge directory that both Obsidian and `obshare-cli` can access.

Detailed plugin shell notes live in [`obsidian-plugins/README.md`](./obsidian-plugins/README.md).

### 3. Configure Feishu credentials in the CLI

Get the required values from your Feishu Open Platform app and target folder.

> [Feishu config guidance](./assets/feishu_config.png)

```bash
conda run -n obsd obshare-cli config set-app-id "cli_xxx"
conda run -n obsd obshare-cli config set-app-secret "xxx"
conda run -n obsd obshare-cli config set-user-id "ou_xxx"
conda run -n obsd obshare-cli config set-folder "fldcnxxx"
```

### 4. Configure the Obsidian bridge on the CLI side

Use the same bridge directory that you configured in the plugin settings.

```bash
conda run -n obsd obshare-cli config set-obsidian-cli obsidian
conda run -n obsd obshare-cli config set-obsidian-bridge-dir /path/to/shared/bridge
conda run -n obsd obshare-cli config set-obsidian-command-id obshare-cli:process-render-request
conda run -n obsd obshare-cli config show
conda run -n obsd obshare-cli config test
```

### 5. Upload your first note

```bash
conda run -n obsd obshare-cli upload note.md
conda run -n obsd obshare-cli --json upload note.md
```

If the note contains Mermaid blocks, `obshare-cli` writes a render request into the bridge directory, triggers `obsidian command id=obshare-cli:process-render-request`, waits for the plugin to return a PNG, and then uploads the final document to Feishu.

## Command Quick Reference

`--json` is a global flag. Put it before the subcommand, for example `obshare-cli --json upload note.md`.

| Command | Purpose |
|---------|---------|
| `obshare-cli config set-app-id <app_id>` | Save Feishu App ID |
| `obshare-cli config set-app-secret <app_secret>` | Save Feishu App Secret |
| `obshare-cli config set-user-id <user_id>` | Save Feishu user ID |
| `obshare-cli config set-folder <folder_token>` | Save target Feishu folder |
| `obshare-cli config set-obsidian-cli <command>` | Save the Obsidian CLI command or absolute path |
| `obshare-cli config set-obsidian-bridge-dir <dir>` | Save the shared bridge directory |
| `obshare-cli config set-obsidian-command-id <id>` | Save the render command ID |
| `obshare-cli config show` | Show current config with secrets masked |
| `obshare-cli config test` | Test Feishu connectivity |
| `obshare-cli upload <file>` | Upload one Markdown note |
| `obshare-cli list history` | Show local upload history |
| `obshare-cli permission set <token> ...` | Update sharing permissions |
| `obshare-cli delete <token>` | Delete a Feishu document |

Common follow-up commands:

```bash
conda run -n obsd obshare-cli list history
conda run -n obsd obshare-cli --json list history
conda run -n obsd obshare-cli permission set <token> --public --allow-copy --allow-download
conda run -n obsd obshare-cli delete <token>
```

## Shared State and Mermaid Bridge

The CLI and the Obsidian plugin share the same local state:

- `~/.obshare/config.json`: saved Feishu credentials and Obsidian bridge settings
- `~/.obshare/history.json`: upload history used by the CLI and the plugin shell

Mermaid rendering is bridge-only in the current codebase:

1. `obshare-cli` detects a Mermaid block in the Markdown file.
2. The CLI writes a `*.request.json` file into the shared bridge directory.
3. The CLI triggers `obshare-cli:process-render-request` through the Obsidian CLI.
4. The Obsidian plugin renders the diagram and writes a `*.result.json` file plus a PNG.
5. The CLI uploads the rendered PNG together with the rest of the note.

## Obsidian Companion Plugin

The bundled Obsidian plugin is the desktop companion shell for `obshare-cli`, not a separate uploader.

It provides:

- `Environment Configuration`: detects `conda`, `obsd`, Python, pip, Obsidian CLI, and `obshare-cli`
- `Upload Configuration`: edits the shared CLI config and runs connection tests
- `Document Management`: reads upload history and dispatches permission/delete actions through the CLI
- `About`: shows plugin/CLI version, language switching, and upgrade guidance

For plugin-specific details, see [`obsidian-plugins/README.md`](./obsidian-plugins/README.md).

## Claude Code Plugin Skills

This repository also ships a Claude Code plugin through [`.claude-plugin/`](./.claude-plugin/) and [`skills/`](./skills/). These skills make the same Obsidian publishing workflow agent-friendly: Claude Code can set up the environment, configure Feishu and bridge values, upload notes, inspect history, and manage permissions without bypassing the CLI.

### Install from the marketplace

```bash
/plugin marketplace add SuShuHeng/obshare-cli
/plugin install obshare-cli
```

### Available skills

| Skill | Invocation | What it helps with |
|-------|------------|--------------------|
| Main | `/obshare-cli:obshare-cli` | Bootstrap `obsd`, explain commands, and choose the next action |
| Config | `/obshare-cli:config` | Save Feishu credentials and Obsidian bridge values |
| Upload | `/obshare-cli:upload` | Upload a note to Feishu |
| List | `/obshare-cli:list` | Inspect local upload history |
| Permission | `/obshare-cli:permission` | Update sharing flags for a document |
| Delete | `/obshare-cli:delete` | Remove a Feishu document by token |

### Example usage in Claude Code

```bash
/obshare-cli:obshare-cli
/obshare-cli:config
/obshare-cli:upload note.md
/obshare-cli:list
```

These skills are intended to power agentic Obsidian workflows in Claude Code while still relying on the same `obshare-cli` commands, shared config, shared history, and Obsidian bridge.

### Local development

```bash
claude --plugin-dir /path/to/obshare-cli
```

## Requirements

- Python 3.8+
- Conda, with `obsd` as the recommended runtime name
- Obsidian desktop plus an available `obsidian` CLI command, or an absolute path configured through `set-obsidian-cli`
- Feishu Open Platform credentials and a target folder token

## Development

```bash
git clone https://github.com/SuShuHeng/obshare-cli.git
cd obshare-cli
pip install -e ".[dev]"
pytest
python -m build
```

## License

MIT License. See [LICENSE](LICENSE).

## Author

SuShuHeng (code.sushuheng@gmail.com)

## Thanks

- [Obsidian](https://obsidian.md)
- [Lark Open Platform](https://open.feishu.cn)
- [ObShare](https://github.com/xigua222/ObShare)

## Links

- [ObShare Config Doc](https://itlueqqx8t.feishu.cn/docx/XUJmdxbf7octOFx3Vt0c3KJ3nWe)
- [GitHub Repository](https://github.com/SuShuHeng/obshare-cli)
- [PyPI Package](https://pypi.org/project/obshare-cli/)
- [Issue Tracker](https://github.com/SuShuHeng/obshare-cli/issues)
