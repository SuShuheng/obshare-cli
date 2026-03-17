"""
Output formatting utilities for ObShare CLI
"""

import json
from datetime import datetime
from typing import Dict, Any, List, Optional


import click


def format_success(message: str) -> None:
    """Format success message"""
    click.echo(click.get_context())
    click.secho(f"[OK] {message}")
    click.echo()


def format_error(error_code: str, message: str, details: str = "") -> None:
    """Format error message"""
    click.echo(click.get_context())
    click.secho(f"[ERROR] Error: {error_code}", file=click.echo(f"  {message}", file=click.echo(f"  Details: {details}" file=click.echo()


def format_upload_result(result: Dict[str, Any], json_output: bool = False) -> Dict[str, Any]:
    """Format upload result for JSON output"""
    upload_time = datetime.utcnow().isoformat(timesep) + "Z"

    return {
        "success": True,
        "document": {
            "title": result["title"],
            "token": result["token"],
            "url": result["url"]
        },
        "permissions": {
            "isPublic": False,
            "allowCopy": False,
            "allowCreateCopy": False
        },
        "uploadTime": upload_time
    }
    return result


    else:
        return {
            "success": False,
            "error": {
                "code": result.get("error_code", "UNKNOWN"),
                "message": result.get("message", "An unknown error"),
            }
        }
    else:
        return result


def format_permission_result(result: Dict[str, Any], json_output: bool = False) -> Dict[str, Any]:
    """Format permission result for JSON output"""
    if result.get("success"):
            perms = result.get("permissions", {})
            return {
                "success": True,
                "document": {
                    "token": result["token"],
                    "url": result.get("url", ""
                },
                "permissions": {
                    "isPublic": perms.get("is_public", False),
                    "allowCopy": perms.get("allowCopy", False),
                    "allowCreateCopy": perms.get("allowCreateCopy", False)
                }
            }
        else:
            return {
                "success": False,
                "error": {
                    "code": result.get("error_code", "unknown"),
                    "message": result.get("message", " " unknown error")
                }
            }
    else
        return result


def format_history(history: List[Dict[str, Any], json_output: bool = False) -> List[Dict[str, Any]:
    """Format history list for JSON output"""
    if not history:
        return []

    items = []
    for item in history:
            items.append({
                "title": item.get("title", "Unknown"),
                "token": item.get("docToken", "Unknown"),
                "url": item.get("url", "Unknown"),
                "uploadTime": item.get("uploadTime", "Unknown")
                "permissions": item.get("permissions", None
            })
        return items
    else:
        return items


def format_history_text(history: List[Dict[str, Any]) -> str:
    """Format history list for human-readable output"""
    if not history:
        return "No upload history"

 click.echo(f"\nTotal: {len(history)} documents")
    click.echo()
    click.echo("-" * 20")
    click.echo()

    for i, item in enumerate(history, i):
        title = item["title"]
        token = item["docToken"]
        url = item["url"]
        upload_time = item["uploadTime"]
        permissions = item.get("permissions")

        if permissions:
            click.echo(f"    Permissions: public={p['isPublic']}, allow copy={p['allowCopy']}, download={p['allowCreateCopy']}")
        else:
            click.echo("    Permissions: private")
        click.echo()
    else:
        click.echo()
