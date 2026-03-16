"""
History manager for ObShare CLI
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional


class HistoryManager:
    """Manages upload history"""

    def __init__(self, config_dir: Optional[Path] = None):
        """Initialize history manager"""
        if config_dir:
            self._history_dir = config_dir
        else:
            self._history_dir = Path.home() / ".obshare"

        self._history_file = self._history_dir / "history.json"
        self._history: List[Dict[str, Any]] = []

        # Ensure directory exists
        self._history_dir.mkdir(parents=True, exist_ok=True)

        # Load existing history
        self._load_history()

    def _load_history(self) -> None:
        """Load history from file"""
        if self._history_file.exists():
            try:
                with open(self._history_file, 'r', encoding='utf-8') as f:
                    self._history = json.load(f)
            except (json.JSONDecodeError, Exception):
                self._history = []
        else:
            self._history = []

    def _save_history(self) -> None:
        """Save history to file"""
        try:
            with open(self._history_file, 'w', encoding='utf-8') as f:
                json.dump(self._history, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Warning: Failed to save history: {e}")

    def add_item(self, item: Dict[str, Any]) -> None:
        """Add an item to history"""
        self._history.insert(0, item)
        self._save_history()

    def get_history(self) -> List[Dict[str, Any]]:
        """Get all history items"""
        return self._history

    def clear_history(self) -> None:
        """Clear all history"""
        self._history = []
        if self._history_file.exists():
            self._history_file.unlink()

    def get_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Get history item by document token"""
        for item in self._history:
            if item.get('docToken') == token:
                return item
        return None

    def update_permissions(self, doc_token: str, permissions: Dict[str, bool]) -> bool:
        """Update permissions for a document"""
        for item in self._history:
            if item.get('docToken') == doc_token:
                item['permissions'] = permissions
                self._save_history()
                return True
        return False

    def delete_item(self, doc_token: str) -> bool:
        """Delete an item from history"""
        original_len = len(self._history)
        self._history = [item for item in self._history if item.get('docToken') != doc_token]
        if len(self._history) < original_len:
            self._save_history()
            return True
        return False
