---
name: obshare-cli
description: Upload Obsidian Markdown documents to Feishu (Lark) cloud documents. Use for environment setup, configuration, uploading notes, managing permissions, and viewing upload history.
---

# obshare-cli

A CLI tool for uploading Obsidian Markdown documents to Feishu (Lark) cloud documents.

## Environment Setup

```bash
# Create conda environment
conda create -n obsd python=3.12 -y

# Install obshare-cli
conda run -n obsd python -m pip install obshare-cli

# Verify installation
conda run -n obsd obshare-cli --help
```

## Global Options

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format (useful for AI agent integration) |
| `--debug` | Enable debug logging |
| `--version` | Show version (current: 0.1.0) |

## Available Commands

| Command | Description |
|---------|-------------|
| `config` | Manage Feishu configuration (app ID, secret, user ID, folder) |
| `upload` | Upload Obsidian Markdown document to Feishu |
| `permission` | Manage document permissions |
| `list` | Query resources (upload history) |
| `delete` | Delete a Feishu document |

## Configuration Storage

- **Location**: `~/.obshare/config.json` (platform-specific)
- **Encryption**: Uses Fernet (AES-128-CBC + HMAC-SHA256) for sensitive fields
- **Required fields**: `app_id`, `app_secret`, `user_id`, `folder_token`

## Quick Start

```bash
# 1. Configure Feishu credentials
conda run -n obsd obshare-cli config set-app-id "cli_xxx"
conda run -n obsd obshare-cli config set-app-secret "xxx"
conda run -n obsd obshare-cli config set-user-id "xxx"
conda run -n obsd obshare-cli config set-folder "fldcnxxx"

# 2. Test connection
conda run -n obsd obshare-cli config test

# 3. Upload a document
conda run -n obsd obshare-cli upload document.md

# 4. View upload history
conda run -n obsd obshare-cli list history
```

## Related Skills

- `/config` - Detailed configuration management
- `/upload` - Document upload with options
- `/permission` - Permission management
- `/list` - Query upload history
- `/delete` - Delete documents
