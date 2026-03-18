# obshare-cli

A command-line interface tool for uploading Obsidian Markdown documents to Feishu cloud documents.

[![PyPI version](https://badge.fury.io/py/obshare-cli.svg)](https://badge.fury.io/py/obshare-cli)
[![Python](https://img.shields.io/pypi/pyversions/obshare-cli.svg)](https://pypi.org/project/obshare-cli/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [中文翻译点此](./README_Zh_CN.md)

## Installation

![pip-install-obshare-cli](./assets/obshare-cli.gif)

Recommended when using `obsidian-plugins`: install `obshare-cli` into a dedicated conda environment named `obsd`.

```bash
conda create -n obsd python -y
conda run -n obsd python -m pip install --upgrade pip
conda run -n obsd python -m pip install --upgrade obshare-cli
```

### Optional: Mermaid Support

`obshare-cli` supports two Mermaid rendering modes:

1. Local Mermaid CLI rendering:

```bash
npm install -g @mermaid-js/mermaid-cli
```

2. Obsidian bridge rendering through the bundled companion plugin in `obsidian-plugins/`.

Use the Obsidian plugin together with `obshare-cli`. The plugin does not replace the CLI upload flow; it provides visual configuration, document/config management, and Mermaid rendering inside a real Obsidian environment.

## Configuration

First, configure your Feishu credentials:

You can get these token by the guidance:

> [feishu_config_guidance](./assets/feishu_config.png)

```bash
# Set App ID
conda run -n obsd obshare-cli config set-app-id "cli_xxx"

# Set App Secret
conda run -n obsd obshare-cli config set-app-secret "xxx"

# Set User ID
conda run -n obsd obshare-cli config set-user-id "xxx"

# Set Folder Token
conda run -n obsd obshare-cli config set-folder "xxxxxxx"

# Show current configuration
conda run -n obsd obshare-cli config show

# Test connection
conda run -n obsd obshare-cli config test
```

## Obsidian Companion Plugin

`obsidian-plugins` is the Obsidian desktop companion plugin for `obshare-cli`. It is designed to be used together with `obshare-cli`, not as a standalone uploader.

It provides:

- Simple visual environment configuration
- Shared document and configuration management
- A Mermaid rendering bridge that lets `obshare-cli` trigger Obsidian to return Mermaid PNG images

### Quick Start

1. Create the recommended conda environment and install `obshare-cli`:

```bash
conda create -n obsd python -y
conda run -n obsd python -m pip install --upgrade pip
conda run -n obsd python -m pip install --upgrade obshare-cli
```

2. Copy `obsidian-plugins/` to your vault plugin directory: `.obsidian/plugins/obshare-cli/`
3. Enable the plugin in Obsidian
4. In the plugin settings, select the `conda (obsd)` runtime and set a shared bridge directory
5. In `obshare-cli`, configure the same Obsidian bridge values:

```bash
conda run -n obsd obshare-cli config set-obsidian-cli obsidian
conda run -n obsd obshare-cli config set-obsidian-bridge-dir /path/to/shared/bridge
conda run -n obsd obshare-cli config set-obsidian-command-id obshare-cli:process-render-request
```

After that, continue using the normal CLI workflow:

```bash
conda run -n obsd obshare-cli upload document.md
```

When Mermaid blocks are detected, `obshare-cli` can call the Obsidian plugin bridge to render images and continue the upload flow.

## Usage

### Upload a Document

```bash
# Basic upload
conda run -n obsd obshare-cli upload document.md

# Upload with JSON output (for AI agents)
conda run -n obsd obshare-cli upload document.md --json

# Upload with permissions
conda run -n obsd obshare-cli upload document.md --public --allow-copy --allow-download
```

### View Upload History

```bash
conda run -n obsd obshare-cli list history
conda run -n obsd obshare-cli list history --json
```

### Set Document Permissions

```bash
conda run -n obsd obshare-cli permission set <token> --public --allow-copy --allow-download
```

### Delete a Document

```bash
conda run -n obsd obshare-cli delete <token>
```

## JSON Output Example

```json
{
  "success": true,
  "document": {
    "title": "My Note",
    "token": "doxcnAbcDefGhi",
    "url": "https://feishu.cn/docx/doxcnAbcDefGhi"
  },
  "permissions": {
    "isPublic": false,
    "allowCopy": false,
    "allowCreateCopy": false
  },
  "uploadTime": "2024-01-15T10:30:00Z"
}
```

## Features

- Upload Markdown documents to Feishu
- Support for YAML frontmatter
- Support for Obsidian Callouts
- Support for Mermaid diagrams (converted to images)
- Optional Obsidian companion plugin for visual configuration and Mermaid bridge rendering
- Support for embedded images (Obsidian `![[image.png]]` and Markdown `![](image.png)`)
- Configurable document permissions
- Upload history tracking
- JSON output mode for AI/CLI integration

## Claude Code Plugin

This project includes a Claude Code Plugin for AI-assisted usage. The plugin provides skills for environment setup, configuration, uploading notes, managing permissions, and viewing upload history.

### Install Plugin

```bash
# Step 1: Add marketplace
/plugin marketplace add SuShuHeng/obshare-cli

# Step 2: Install plugin
/plugin install obshare-cli
```

### Available Skills

| Skill | Invocation | Description |
|-------|------------|-------------|
| Main | `/obshare-cli:obshare-cli` | Environment setup & CLI overview |
| Config | `/obshare-cli:config` | Manage Feishu configuration |
| Upload | `/obshare-cli:upload` | Upload documents to Feishu |
| Permission | `/obshare-cli:permission` | Manage document permissions |
| List | `/obshare-cli:list` | Query upload history |
| Delete | `/obshare-cli:delete` | Delete Feishu documents |

### Usage with Claude Code

```bash
# In Claude Code, invoke skills with plugin namespace
/obshare-cli:obshare-cli     # Get environment setup guide
/obshare-cli:config          # Configure Feishu credentials
/obshare-cli:upload note.md  # Upload a document
/obshare-cli:list            # View upload history
```

### Local Development

To test the plugin locally:

```bash
claude --plugin-dir /path/to/obshare-cli
```

## Requirements

- Python 3.8+
- Node.js >= 16 (optional, for Mermaid rendering)

## Development

```bash
# Clone the repository
git clone https://github.com/SuShuHeng/obshare-cli.git
cd obshare-cli

# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest

# Build package
python -m build
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

SuShuHeng (code.sushuheng@gmail.com)

## Thanks

- [Obsidian](https://obsidian.md) - The best AI-powered note-taking software

- [Lark Open Platform](https://open.feishu.cn) - Provides technical platform support
- [ObShare](https://github.com/xigua222/ObShare) - A significant source for this project, thank you.

## Links

- [ObShare Config Doc](https://itlueqqx8t.feishu.cn/docx/XUJmdxbf7octOFx3Vt0c3KJ3nWe)

- [GitHub Repository](https://github.com/SuShuHeng/obshare-cli)
- [PyPI Package](https://pypi.org/project/obshare-cli/)
- [Issue Tracker](https://github.com/SuShuHeng/obshare-cli/issues)
