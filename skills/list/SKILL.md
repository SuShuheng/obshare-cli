---
name: list
description: Query obshare-cli resources and upload history. Use for viewing past uploads, finding document tokens, or checking upload status.
argument-hint: <subcommand>
---

# obshare-cli list

Query resources and upload history.

## Subcommands

| Command | Description |
|---------|-------------|
| `history` | Show upload history |

## list history

Display the history of all uploaded documents.

### Syntax

```bash
conda run -n obsd obshare-cli list history [OPTIONS]
```

### Options

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format |

## Usage Examples

### View History

```bash
# Show upload history
conda run -n obsd obshare-cli list history

# JSON output for programmatic use
conda run -n obsd obshare-cli list history --json
```

## History Data Structure

Each history entry contains:

| Field | Description |
|-------|-------------|
| `title` | Document title |
| `docToken` | Document token (for permission/delete operations) |
| `url` | Feishu document URL |
| `uploadTime` | Upload timestamp |
| `permissions` | Permission settings (isPublic, allowCopy, allowCreateCopy) |

### JSON Output Example

```json
[
  {
    "title": "My Note",
    "docToken": "doxcnAbcDefGhi",
    "url": "https://feishu.cn/docx/doxcnAbcDefGhi",
    "uploadTime": "2024-01-15 10:30",
    "permissions": {
      "isPublic": false,
      "allowCopy": false,
      "allowCreateCopy": false
    }
  }
]
```

## Storage

- **Location**: `~/.obshare/history.json`
- **Format**: JSON array of upload records

## Notes

- History is automatically updated on each upload
- Use `docToken` from history for `permission set` and `delete` commands
- History persists across sessions
