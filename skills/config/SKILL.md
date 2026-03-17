---
name: config
description: Manage Feishu configuration for obshare-cli. Use for setting app ID, app secret, user ID, folder token, viewing configuration, testing connection, or clearing configuration.
argument-hint: <subcommand> [value]
---

# obshare-cli config

Manage Feishu API configuration.

## Subcommands

| Command | Arguments | Description |
|---------|-----------|-------------|
| `set-app-id` | `<app_id>` | Set Feishu App ID |
| `set-app-secret` | `<app_secret>` | Set Feishu App Secret |
| `set-user-id` | `<user_id>` | Set Feishu User ID |
| `set-folder` | `<folder_token>` | Set Feishu Folder Token |
| `show` | - | Display current configuration (masks sensitive data) |
| `test` | - | Test connection to Feishu API |
| `clear` | - | Clear all configuration |

## Usage

### Set Configuration

```bash
# Set App ID (from Feishu Open Platform)
conda run -n obsd obshare-cli config set-app-id "cli_xxx"

# Set App Secret (from Feishu Open Platform)
conda run -n obsd obshare-cli config set-app-secret "your_app_secret"

# Set User ID (your Feishu user ID)
conda run -n obsd obshare-cli config set-user-id "ou_xxx"

# Set Folder Token (target folder for uploads)
conda run -n obsd obshare-cli config set-folder "fldcnxxx"
```

### View Configuration

```bash
# Show current configuration (sensitive data is masked)
conda run -n obsd obshare-cli config show

# JSON output for programmatic use
conda run -n obsd obshare-cli config show --json
```

### Test Connection

```bash
# Verify configuration and test API connection
conda run -n obsd obshare-cli config test
```

### Clear Configuration

```bash
# Remove all saved configuration
conda run -n obsd obshare-cli config clear
```

## Configuration Details

- **Storage Location**: `~/.obshare/config.json`
- **Encryption**: Sensitive fields (app_secret) are encrypted using Fernet symmetric encryption
- **Required Fields**: All four fields must be set before uploading documents

## How to Get Credentials

1. **App ID & App Secret**:
   - Go to [Feishu Open Platform](https://open.feishu.cn/)
   - Create a custom app
   - Find App ID and App Secret in app settings

2. **User ID**:
   - Your Feishu user ID (format: `ou_xxx`)
   - Can be obtained from Feishu admin panel or API

3. **Folder Token**:
   - Open the target folder in Feishu Docs
   - Copy the token from URL (format: `fldcnxxx`)
