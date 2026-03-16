# obshare-cli

A command-line interface tool for uploading Obsidian Markdown documents to Feishu cloud documents.

[![PyPI version](https://badge.fury.io/py/obshare-cli.svg)](https://badge.fury.io/py/obshare-cli)
[![Python](https://img.shields.io/pypi/pyversions/obshare-cli.svg)](https://pypi.org/project/obshare-cli/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

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

```bash
# Set App ID
obshare-cli config set-app-id "cli_xxx"

# Set App Secret
obshare-cli config set-app-secret "xxx"

# Set User ID
obshare-cli config set-user-id "xxx"

# Set Folder Token
obshare-cli config set-folder "fldcnxxx"

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

## Links

- [GitHub Repository](https://github.com/SuShuHeng/obshare-cli)
- [PyPI Package](https://pypi.org/project/obshare-cli/)
- [Issue Tracker](https://github.com/SuShuHeng/obshare-cli/issues)
