"""Shared state path helpers for CLI and Obsidian plugin integration."""

from __future__ import annotations

import os
from pathlib import Path


def get_obshare_home() -> Path:
    """Return the shared ObShare home directory."""
    if os.name == "nt":
        base_dir = Path(os.environ.get("USERPROFILE", "~"))
    else:
        base_dir = Path.home()
    return base_dir / ".obshare"


def get_shared_config_path() -> Path:
    """Return the shared config file path."""
    return get_obshare_home() / "config.json"


def get_shared_history_path() -> Path:
    """Return the shared history file path."""
    return get_obshare_home() / "history.json"
