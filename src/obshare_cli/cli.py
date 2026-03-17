#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
ObShare CLI - Upload Markdown documents to Feishu
"""

import click
import json
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import Optional

from obshare_cli import __version__
from obshare_cli.core.config import ConfigManager, ObShareConfig
from obshare_cli.core.api_client import FeishuApiClient
from obshare_cli.core.history import HistoryManager


# Global options context
@click.group()
@click.version_option(version=__version__, prog_name='obshare-cli')
@click.option('--json', 'json_output', is_flag=True, help='Output in JSON format')
@click.option('--debug', is_flag=True, help='Enable debug logging')
@click.pass_context
def cli(ctx, json_output, debug):
    """ObShare CLI - Upload Markdown documents to Feishu"""
    ctx.ensure_object(dict)
    ctx.obj['json'] = json_output
    ctx.obj['debug'] = debug


# Config commands group
@cli.group()
@click.pass_context
def config(ctx):
    """Configuration management"""
    pass


@config.command('set-app-id')
@click.argument('app_id')
@click.pass_context
def set_app_id(ctx, app_id):
    """Set Feishu App ID"""
    try:
        config_manager = ConfigManager()
        config_manager.update_config(app_id=app_id)
        if ctx.obj['json']:
            click.echo(json.dumps({"success": True, "field": "app_id"}))
        else:
            click.echo("[OK] App ID has been set")
    except Exception as e:
        if ctx.obj['json']:
            click.echo(json.dumps({"success": False, "error": str(e)}))
        else:
            click.echo(f"[ERROR] Error: {e}")
        sys.exit(1)


@config.command('set-app-secret')
@click.argument('app_secret')
@click.pass_context
def set_app_secret(ctx, app_secret):
    """Set Feishu App Secret"""
    try:
        config_manager = ConfigManager()
        config_manager.update_config(app_secret=app_secret)
        if ctx.obj['json']:
            click.echo(json.dumps({"success": True, "field": "app_secret"}))
        else:
            click.echo("[OK] App Secret has been set")
    except Exception as e:
        if ctx.obj['json']:
            click.echo(json.dumps({"success": False, "error": str(e)}))
        else:
            click.echo(f"[ERROR] Error: {e}")
        sys.exit(1)


@config.command('set-user-id')
@click.argument('user_id')
@click.pass_context
def set_user_id(ctx, user_id):
    """Set Feishu User ID"""
    try:
        config_manager = ConfigManager()
        config_manager.update_config(user_id=user_id)
        if ctx.obj['json']:
            click.echo(json.dumps({"success": True, "field": "user_id"}))
        else:
            click.echo("[OK] User ID has been set")
    except Exception as e:
        if ctx.obj['json']:
            click.echo(json.dumps({"success": False, "error": str(e)}))
        else:
            click.echo(f"[ERROR] Error: {e}")
        sys.exit(1)


@config.command('set-folder')
@click.argument('folder_token')
@click.pass_context
def set_folder(ctx, folder_token):
    """Set Feishu Folder Token"""
    try:
        config_manager = ConfigManager()
        config_manager.update_config(folder_token=folder_token)
        if ctx.obj['json']:
            click.echo(json.dumps({"success": True, "field": "folder_token"}))
        else:
            click.echo("[OK] Folder Token has been set")
    except Exception as e:
        if ctx.obj['json']:
            click.echo(json.dumps({"success": False, "error": str(e)}))
        else:
            click.echo(f"[ERROR] Error: {e}")
        sys.exit(1)


@config.command('show')
@click.pass_context
def show_config(ctx):
    """Show current configuration"""
    try:
        config_manager = ConfigManager()
        config = config_manager.load_config()

        if ctx.obj['json']:
            click.echo(json.dumps({
                "app_id": config.app_id[:8] + "..." if config.app_id else "",
                "app_secret": "***" if config.app_secret else "",
                "user_id": config.user_id,
                "folder_token": config.folder_token[:8] + "..." if config.folder_token else "",
                "is_complete": config.is_complete()
            }, indent=2))
        else:
            click.echo("\n[CONFIG] Current Configuration:")
            click.echo("-" * 30)
            click.echo(f"  App ID: {config.app_id[:8] + '...' if config.app_id else 'Not set'}")
            click.echo(f"  App Secret: {'***' if config.app_secret else 'Not set'}")
            click.echo(f"  User ID: {config.user_id or 'Not set'}")
            click.echo(f"  Folder Token: {config.folder_token[:8] + '...' if config.folder_token else 'Not set'}")
            click.echo(f"  Complete: {'[OK]' if config.is_complete() else '[ERROR]'}")
            click.echo()
    except Exception as e:
        if ctx.obj['json']:
            click.echo(json.dumps({"success": False, "error": str(e)}))
        else:
            click.echo(f"[ERROR] Error: {e}")
        sys.exit(1)


@config.command('test')
@click.pass_context
def test_connection(ctx):
    """Test connection to Feishu API"""
    try:
        config_manager = ConfigManager()
        config = config_manager.load_config()

        if not config.is_complete():
            if ctx.obj['json']:
                click.echo(json.dumps({"success": False, "error": "Configuration not complete"}))
            else:
                click.echo("[ERROR] Configuration not complete. Please set all required fields.")
            sys.exit(1)

        client = FeishuApiClient(config.app_id, config.app_secret)
        success = client.test_connection()

        if ctx.obj['json']:
            click.echo(json.dumps({"success": success}))
        else:
            if success:
                click.echo("[OK] Connection test successful!")
            else:
                click.echo("[ERROR] Connection test failed!")
                sys.exit(1)
    except Exception as e:
        if ctx.obj['json']:
            click.echo(json.dumps({"success": False, "error": str(e)}))
        else:
            click.echo(f"[ERROR] Error: {e}")
        sys.exit(1)


@config.command('clear')
@click.pass_context
def clear_config(ctx):
    """Clear all configuration"""
    try:
        config_manager = ConfigManager()
        config_manager.clear_config()
        if ctx.obj['json']:
            click.echo(json.dumps({"success": True}))
        else:
            click.echo("[OK] Configuration cleared")
    except Exception as e:
        if ctx.obj['json']:
            click.echo(json.dumps({"success": False, "error": str(e)}))
        else:
            click.echo(f"[ERROR] Error: {e}")
        sys.exit(1)


# Upload command
@cli.command()
@click.argument('file', type=click.Path(exists=True))
@click.option('--public', is_flag=True, help='Make document public')
@click.option('--allow-copy', is_flag=True, help='Allow copying content')
@click.option('--allow-download', is_flag=True, help='Allow download and create copy')
@click.pass_context
def upload(ctx, file, public, allow_copy, allow_download):
    """Upload a Markdown document to Feishu"""
    try:
        config_manager = ConfigManager()
        config = config_manager.load_config()

        if not config.is_complete():
            if ctx.obj['json']:
                click.echo(json.dumps({
                    "success": False,
                    "error": {
                        "code": "CONFIG_INCOMPLETE",
                        "message": "Configuration not complete"
                    }
                }))
            else:
                click.echo("[ERROR] Configuration not complete. Please run:")
                click.echo("  obshare-cli config set-app-id <app_id>")
                click.echo("  obshare-cli config set-app-secret <app_secret>")
                click.echo("  obshare-cli config set-user-id <user_id>")
                click.echo("  obshare-cli config set-folder <folder_token>")
            sys.exit(1)

        # Read file content
        file_path = Path(file)
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        title = file_path.stem

        # Create API client
        client = FeishuApiClient(config.app_id, config.app_secret)

        if not ctx.obj['json']:
            click.echo(f"[UPLOAD] Uploading: {title}.md")

        # Upload document
        def progress_callback(msg):
            if not ctx.obj['json']:
                click.echo(f"  {msg}")

        result = client.upload_document(
            f"{title}.md",
            content,
            config.folder_token,
            on_progress=progress_callback
        )

        # Set permissions if specified
        if public or allow_copy or allow_download:
            if not ctx.obj['json']:
                click.echo("  Setting permissions...")
            client.set_document_permissions(
                result.token,
                is_public=public,
                allow_copy=allow_copy,
                allow_create_copy=allow_download,
                user_id=config.user_id
            )

        # Save to history
        upload_time = datetime.now().strftime("%Y-%m-%d %H:%M")
        history_item = {
            "title": title,
            "url": result.url,
            "docToken": result.token,
            "uploadTime": upload_time,
            "permissions": {
                "isPublic": public,
                "allowCopy": allow_copy,
                "allowCreateCopy": allow_download
            }
        }
        config_manager.add_history_item(history_item)

        if ctx.obj['json']:
            click.echo(json.dumps({
                "success": True,
                "document": {
                    "title": title,
                    "token": result.token,
                    "url": result.url
                },
                "permissions": {
                    "isPublic": public,
                    "allowCopy": allow_copy,
                    "allowCreateCopy": allow_download
                },
                "uploadTime": upload_time
            }, indent=2))
        else:
            click.echo("\n[OK] Upload successful!\n")
            click.echo(f"  Document: {title}")
            click.echo(f"  Token: {result.token}")
            click.echo(f"  URL: {result.url}")
            click.echo("\n  Permissions:")
            click.echo(f"    Public: {'Yes' if public else 'No'}")
            click.echo(f"    Allow Copy: {'Yes' if allow_copy else 'No'}")
            click.echo(f"    Allow Download: {'Yes' if allow_download else 'No'}")
            click.echo()

    except Exception as e:
        if ctx.obj['json']:
            click.echo(json.dumps({
                "success": False,
                "error": {
                    "code": "UPLOAD_FAILED",
                    "message": str(e)
                }
            }))
        else:
            click.echo(f"[ERROR] Upload failed: {e}")
        sys.exit(1)


# Permission command group
@cli.group()
@click.pass_context
def permission(ctx):
    """Document permission management"""
    pass


@permission.command('set')
@click.argument('token')
@click.option('--public', is_flag=True, help='Make document public')
@click.option('--allow-copy', is_flag=True, help='Allow copying content')
@click.option('--allow-download', is_flag=True, help='Allow download and create copy')
@click.pass_context
def set_permission(ctx, token, public, allow_copy, allow_download):
    """Set document permissions"""
    try:
        config_manager = ConfigManager()
        config = config_manager.load_config()

        if not config.is_complete():
            if ctx.obj['json']:
                click.echo(json.dumps({"success": False, "error": "Configuration not complete"}))
            else:
                click.echo("[ERROR] Configuration not complete")
            sys.exit(1)

        client = FeishuApiClient(config.app_id, config.app_secret)
        client.set_document_permissions(
            token,
            is_public=public,
            allow_copy=allow_copy,
            allow_create_copy=allow_download,
            user_id=config.user_id
        )

        # Update history
        config_manager.update_history_permissions(token, {
            "isPublic": public,
            "allowCopy": allow_copy,
            "allowCreateCopy": allow_download
        })

        if ctx.obj['json']:
            click.echo(json.dumps({
                "success": True,
                "token": token,
                "permissions": {
                    "isPublic": public,
                    "allowCopy": allow_copy,
                    "allowCreateCopy": allow_download
                }
            }))
        else:
            click.echo("[OK] Permissions updated")
    except Exception as e:
        if ctx.obj['json']:
            click.echo(json.dumps({"success": False, "error": str(e)}))
        else:
            click.echo(f"[ERROR] Error: {e}")
        sys.exit(1)


# List command group
@cli.group()
@click.pass_context
def list_cmd(ctx):
    """List resources"""
    pass


@list_cmd.command('history')
@click.pass_context
def list_history(ctx):
    """Show upload history"""
    try:
        config_manager = ConfigManager()
        history = config_manager.load_history()

        if ctx.obj['json']:
            click.echo(json.dumps(history, indent=2, ensure_ascii=False))
        else:
            if not history:
                click.echo("No upload history")
                return

            click.echo(f"\n[HISTORY] Upload History ({len(history)} documents)")
            click.echo("-" * 50)

            for item in history:
                click.echo(f"\n  [DOC] {item.get('title', 'Unknown')}")
                click.echo(f"     Token: {item.get('docToken', 'Unknown')}")
                click.echo(f"     URL: {item.get('url', 'Unknown')}")
                click.echo(f"     Time: {item.get('uploadTime', 'Unknown')}")
                perms = item.get('permissions')
                if perms:
                    click.echo(f"     Permissions: public={perms.get('isPublic', False)}, "
                              f"copy={perms.get('allowCopy', False)}, "
                              f"download={perms.get('allowCreateCopy', False)}")
            click.echo()
    except Exception as e:
        if ctx.obj['json']:
            click.echo(json.dumps({"success": False, "error": str(e)}))
        else:
            click.echo(f"[ERROR] Error: {e}")
        sys.exit(1)


# Delete command
@cli.command()
@click.argument('token')
@click.pass_context
def delete(ctx, token):
    """Delete a document"""
    try:
        config_manager = ConfigManager()
        config = config_manager.load_config()

        if not config.is_complete():
            if ctx.obj['json']:
                click.echo(json.dumps({"success": False, "error": "Configuration not complete"}))
            else:
                click.echo("[ERROR] Configuration not complete")
            sys.exit(1)

        client = FeishuApiClient(config.app_id, config.app_secret)
        client.delete_document(token)

        # Remove from history
        config_manager.delete_history_item(token)

        if ctx.obj['json']:
            click.echo(json.dumps({"success": True, "token": token}))
        else:
            click.echo(f"[OK] Document {token} deleted")
    except Exception as e:
        if ctx.obj['json']:
            click.echo(json.dumps({"success": False, "error": str(e)}))
        else:
            click.echo(f"[ERROR] Error: {e}")
        sys.exit(1)


# Alias for list
cli.add_command(list_cmd, name='list')


def main():
    """Main entry point"""
    cli(obj={})


if __name__ == '__main__':
    main()
