# obshare-cli

A command-line interface tool for uploading Obsidian Markdown documents to Feishu cloud documents.

[![PyPI version](https://badge.fury.io/py/obshare-cli.svg)](https://badge.fury.io/py/obshare-cli)
[![Python](https://img.shields.io/pypi/pyversions/obshare-cli.svg)](https://pypi.org/project/obshare-cli/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [中文翻译点此](./README_Zh_CN.md)

## Installation

![pip-install-obshare-cli](./assets/obshare-cli.gif)

```bash
pip install obshare-cli
```

### Optional: Mermaid Support

For Mermaid diagram rendering, install Puppeteer:

```bash
npm install -g puppeteer
```

## Configuration

First, configure your Feishu credentials:

You can get these token by the guidance:

> [feishu_config_guidance](./assets/feishu_config.png)

```bash
# Set App ID
obshare-cli config set-app-id "cli_xxx"

# Set App Secret
obshare-cli config set-app-secret "xxx"

# Set User ID
obshare-cli config set-user-id "xxx"

# Set Folder Token
obshare-cli config set-folder "xxxxxxx"

# Show current configuration
obshare-cli config show

# Test connection
obshare-cli config test
```

## Usage

### Upload a Document

```bash
# Basic upload
obshare-cli upload document.md

# Upload with JSON output (for AI agents)
obshare-cli upload document.md --json

# Upload with permissions
obshare-cli upload document.md --public --allow-copy --allow-download
```

### View Upload History

```bash
obshare-cli list history
obshare-cli list history --json
```

### Set Document Permissions

```bash
obshare-cli permission set <token> --public --allow-copy --allow-download
```

### Delete a Document

```bash
obshare-cli delete <token>
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
- Support for embedded images (Obsidian `![[image.png]]` and Markdown `![](image.png)`)
- Configurable document permissions
- Upload history tracking
- JSON output mode for AI/CLI integration

## Claude Code Skills

This project includes Anthropic Claude Code Skills for AI-assisted usage. The skills are located in `.claude/skills/obshare-cli/`.

### Available Skills

| Skill | Command | Description |
|-------|---------|-------------|
| Main | `/obshare-cli` | Environment setup & CLI overview |
| Config | `/config` | Manage Feishu configuration |
| Upload | `/upload` | Upload documents to Feishu |
| Permission | `/permission` | Manage document permissions |
| List | `/list` | Query upload history |
| Delete | `/delete` | Delete Feishu documents |

### Usage with Claude Code

```bash
# In Claude Code, invoke skills with /
/obshare-cli          # Get environment setup guide
/config               # Configure Feishu credentials
/upload note.md       # Upload a document
/list                 # View upload history
```

### Installation for Claude Code

The skills are automatically discovered when you open this project in Claude Code. No additional installation required.

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

