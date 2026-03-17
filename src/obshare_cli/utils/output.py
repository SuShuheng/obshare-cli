"""Output formatting utilities for ObShare CLI."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

import click


def format_success(message: str) -> None:
    """Print a human-readable success message."""
    click.secho(f"[OK] {message}", fg="green")


def format_error(error_code: str, message: str, details: str = "") -> None:
    """Print a human-readable error message."""
    click.secho(f"[ERROR] Error: {error_code}", fg="red", err=True)
    click.echo(f"  {message}", err=True)
    if details:
        click.echo(f"  Details: {details}", err=True)


def format_upload_result(
    result: Dict[str, Any], json_output: bool = False
) -> Dict[str, Any]:
    """Normalize upload results into a stable dictionary shape."""
    if not json_output:
        return result

    if result.get("success", True):
        document = result.get("document", {})
        permissions = result.get("permissions", {})
        return {
            "success": True,
            "document": {
                "title": document.get("title", result.get("title", "")),
                "token": document.get("token", result.get("token", "")),
                "url": document.get("url", result.get("url", "")),
            },
            "permissions": {
                "isPublic": permissions.get("isPublic", False),
                "allowCopy": permissions.get("allowCopy", False),
                "allowCreateCopy": permissions.get("allowCreateCopy", False),
            },
            "uploadTime": result.get(
                "uploadTime", datetime.utcnow().isoformat(timespec="seconds") + "Z"
            ),
        }

    return {
        "success": False,
        "error": {
            "code": result.get("error_code", "UNKNOWN"),
            "message": result.get("message", "An unknown error"),
        },
    }


def format_permission_result(
    result: Dict[str, Any], json_output: bool = False
) -> Dict[str, Any]:
    """Normalize permission results into a stable dictionary shape."""
    if not json_output:
        return result

    if result.get("success", True):
        permissions = result.get("permissions", {})
        return {
            "success": True,
            "document": {
                "token": result.get("token", ""),
                "url": result.get("url", ""),
            },
            "permissions": {
                "isPublic": permissions.get("is_public", permissions.get("isPublic", False)),
                "allowCopy": permissions.get("allowCopy", False),
                "allowCreateCopy": permissions.get("allowCreateCopy", False),
            },
        }

    return {
        "success": False,
        "error": {
            "code": result.get("error_code", "UNKNOWN"),
            "message": result.get("message", "An unknown error"),
        },
    }


def format_history(
    history: List[Dict[str, Any]], json_output: bool = False
) -> List[Dict[str, Any]]:
    """Normalize upload history entries."""
    items: List[Dict[str, Any]] = []
    for item in history:
        items.append(
            {
                "title": item.get("title", "Unknown"),
                "token": item.get("docToken", item.get("token", "Unknown")),
                "url": item.get("url", "Unknown"),
                "uploadTime": item.get("uploadTime", "Unknown"),
                "permissions": item.get("permissions"),
            }
        )

    return items if json_output else history


def format_history_text(history: List[Dict[str, Any]]) -> str:
    """Return a human-readable history summary."""
    if not history:
        return "No upload history"

    lines = [f"Total: {len(history)} documents", "-" * 20]
    for index, item in enumerate(history, start=1):
        title = item.get("title", "Unknown")
        token = item.get("docToken", item.get("token", "Unknown"))
        url = item.get("url", "Unknown")
        upload_time = item.get("uploadTime", "Unknown")
        permissions: Optional[Dict[str, Any]] = item.get("permissions")

        lines.append(f"{index}. {title}")
        lines.append(f"   Token: {token}")
        lines.append(f"   URL: {url}")
        lines.append(f"   Upload Time: {upload_time}")
        if permissions:
            lines.append(
                "   Permissions: "
                f"public={permissions.get('isPublic', False)}, "
                f"allowCopy={permissions.get('allowCopy', False)}, "
                f"allowCreateCopy={permissions.get('allowCreateCopy', False)}"
            )
        else:
            lines.append("   Permissions: private")

    return "\n".join(lines)
