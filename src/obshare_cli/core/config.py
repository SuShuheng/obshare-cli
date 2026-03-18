"""
Configuration management for ObShare CLI
"""

import json
import os
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass, field, asdict

from ..utils.crypto import CryptoUtils
from .shared_state import get_obshare_home, get_shared_config_path, get_shared_history_path

DEFAULT_OBSIDIAN_RENDER_COMMAND_ID = "obshare-cli:process-render-request"


@dataclass
class ObShareConfig:
    """Configuration data class"""
    app_id: str = ""
    app_secret: str = ""
    user_id: str = ""
    folder_token: str = ""
    obsidian_cli_command: str = ""
    obsidian_bridge_dir: str = ""
    obsidian_render_command_id: str = DEFAULT_OBSIDIAN_RENDER_COMMAND_ID

    def is_complete(self) -> bool:
        """Check if all required fields are set"""
        return all([
            self.app_id,
            self.app_secret,
            self.user_id,
            self.folder_token
        ])

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ObShareConfig':
        """Create from dictionary"""
        return cls(
            app_id=data.get('appId', data.get('app_id', '')),
            app_secret=data.get('appSecret', data.get('app_secret', '')),
            user_id=data.get('userId', data.get('user_id', '')),
            folder_token=data.get('folderToken', data.get('folder_token', '')),
            obsidian_cli_command=data.get(
                'obsidianCliCommand',
                data.get('obsidian_cli_command', '')
            ),
            obsidian_bridge_dir=data.get(
                'obsidianBridgeDir',
                data.get('obsidian_bridge_dir', '')
            ),
            obsidian_render_command_id=data.get(
                'obsidianRenderCommandId',
                data.get('obsidian_render_command_id', DEFAULT_OBSIDIAN_RENDER_COMMAND_ID)
            ),
        )


class ConfigManager:
    """Manages configuration storage and retrieval"""

    CONFIG_DIR_NAME = '.obshare'
    CONFIG_FILE_NAME = 'config.json'
    HISTORY_FILE_NAME = 'history.json'

    def __init__(self, config_dir: Optional[Path] = None):
        """Initialize config manager"""
        if config_dir:
            self.config_dir = Path(config_dir)
            self.config_file = self.config_dir / self.CONFIG_FILE_NAME
            self.history_file = self.config_dir / self.HISTORY_FILE_NAME
        else:
            self.config_dir = get_obshare_home()
            self.config_file = get_shared_config_path()
            self.history_file = get_shared_history_path()

        # Ensure config directory exists
        self.config_dir.mkdir(parents=True, exist_ok=True)

    def load_config(self) -> ObShareConfig:
        """Load configuration from file"""
        if not self.config_file.exists():
            return ObShareConfig()

        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Decrypt sensitive fields
            decrypted_data = CryptoUtils.decrypt_sensitive_settings(data)
            return ObShareConfig.from_dict(decrypted_data)

        except Exception as e:
            print(f"Warning: Failed to load config: {e}")
            return ObShareConfig()

    def save_config(self, config: ObShareConfig) -> None:
        """Save configuration to file"""
        try:
            data = config.to_dict()
            # Convert to camelCase for compatibility
            data = {
                'appId': data['app_id'],
                'appSecret': data['app_secret'],
                'userId': data['user_id'],
                'folderToken': data['folder_token'],
                'obsidianCliCommand': data['obsidian_cli_command'],
                'obsidianBridgeDir': data['obsidian_bridge_dir'],
                'obsidianRenderCommandId': data['obsidian_render_command_id'],
            }

            # Encrypt sensitive fields
            encrypted_data = CryptoUtils.encrypt_sensitive_settings(data)

            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(encrypted_data, f, indent=2)

        except Exception as e:
            raise RuntimeError(f"Failed to save config: {e}")

    def update_config(self, **kwargs) -> ObShareConfig:
        """Update specific config fields"""
        config = self.load_config()

        # Map field names
        field_mapping = {
            'app_id': 'app_id',
            'app_secret': 'app_secret',
            'user_id': 'user_id',
            'folder_token': 'folder_token'
        }

        for key, value in kwargs.items():
            if hasattr(config, key):
                setattr(config, key, value)

        self.save_config(config)
        return config

    def clear_config(self) -> None:
        """Clear all configuration"""
        if self.config_file.exists():
            self.config_file.unlink()

    def load_history(self) -> list:
        """Load upload history"""
        if not self.history_file.exists():
            return []

        try:
            with open(self.history_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

    def save_history(self, history: list) -> None:
        """Save upload history"""
        try:
            with open(self.history_file, 'w', encoding='utf-8') as f:
                json.dump(history, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Warning: Failed to save history: {e}")

    def add_history_item(self, item: Dict[str, Any]) -> None:
        """Add an item to upload history"""
        history = self.load_history()
        history.insert(0, item)  # Add to beginning
        self.save_history(history)

    def update_history_permissions(self, doc_token: str, permissions: Dict[str, bool]) -> None:
        """Update permissions in history for a document"""
        history = self.load_history()
        for item in history:
            if item.get('docToken') == doc_token:
                item['permissions'] = permissions
                break
        self.save_history(history)

    def delete_history_item(self, doc_token: str) -> None:
        """Delete an item from history"""
        history = self.load_history()
        history = [item for item in history if item.get('docToken') != doc_token]
        self.save_history(history)
