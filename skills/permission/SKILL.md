---
name: permission
description: Manage Feishu document permissions. Use for setting document visibility, allowing copy/download, or modifying access settings.
argument-hint: set <token> [options]
---

# obshare-cli permission

Manage permissions for uploaded Feishu documents.

## Subcommands

| Command | Description |
|---------|-------------|
| `set` | Set document permissions |

## permission set

Modify permissions for an existing document.

### Syntax

```bash
conda run -n obsd obshare-cli permission set <token> [OPTIONS]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<token>` | Document token (format: `doxcnxxx`) |

### Options

| Option | Description |
|--------|-------------|
| `--public` | Make document publicly accessible |
| `--allow-copy` | Allow copying content |
| `--allow-download` | Allow download and create copy |
| `--json` | Output in JSON format |

## Usage Examples

### Make Document Public

```bash
# Set document as public
conda run -n obsd obshare-cli permission set doxcnAbcDefGhi --public
```

### Set Multiple Permissions

```bash
# Allow copy and download
conda run -n obsd obshare-cli permission set doxcnAbcDefGhi --allow-copy --allow-download

# Full public access
conda run -n obsd obshare-cli permission set doxcnAbcDefGhi --public --allow-copy --allow-download
```

### JSON Output

```bash
conda run -n obsd obshare-cli permission set doxcnAbcDefGhi --public --json
```

## Permission Types

| Permission | Effect |
|------------|--------|
| `--public` | Anyone with the link can view the document |
| `--allow-copy` | Viewers can copy content from the document |
| `--allow-download` | Viewers can download and create their own copy |

## Notes

- Document token can be found in upload output or history
- Permissions are applied immediately
- Use `/obshare-cli:list` to view document tokens from upload history
