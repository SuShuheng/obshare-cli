---
name: delete
description: Delete a Feishu document uploaded via obshare-cli. Use for removing documents, cleaning up, or managing cloud storage.
argument-hint: <token>
---

# obshare-cli delete

Delete a Feishu cloud document.

## Syntax

```bash
conda run -n obsd obshare-cli delete <token> [OPTIONS]
```

## Arguments

| Argument | Description |
|----------|-------------|
| `<token>` | Document token to delete (format: `doxcnxxx`) |

## Options

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format |

## Usage Examples

### Delete a Document

```bash
# Delete by document token
conda run -n obsd obshare-cli delete doxcnAbcDefGhi

# JSON output
conda run -n obsd obshare-cli delete doxcnAbcDefGhi --json
```

## Behavior

When you delete a document:

1. **Feishu Document**: The document is moved to trash in Feishu
2. **Local History**: The entry is removed from `~/.obshare/history.json`

## Finding Document Tokens

Use the list command to find document tokens:

```bash
# View upload history to find tokens
conda run -n obsd obshare-cli list history

# Or with JSON output
conda run -n obsd obshare-cli list history --json
```

## Notes

- Deletion is irreversible (document goes to Feishu trash)
- Document token format: `doxcn` followed by alphanumeric characters
- Requires valid configuration (use `/obshare-cli:config` to set up)
