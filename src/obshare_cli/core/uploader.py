"""Document upload orchestration for ObShare CLI."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

from .api_client import FeishuApiClient, UploadResult
from .config import ConfigManager
from .history import HistoryManager


@dataclass
class UploadProgress:
    """Progress information for a document upload."""

    step: str
    current: int = 0
    total: int = 0


class DocumentUploader:
    """High-level wrapper around the Feishu client used by tests and callers."""

    def __init__(self, config: ConfigManager, feishu_client: FeishuApiClient):
        if config is None or feishu_client is None:
            raise ValueError("Configuration not complete")

        self.config = config
        self.feishu_client = feishu_client
        self.history = HistoryManager(getattr(config, "config_dir", None))
        self.on_progress: Optional[Callable[[str], None]] = None
        self.on_error: Optional[Callable[[Exception], None]] = None

    def upload_file(self, file_path: Path) -> UploadResult:
        """Upload a Markdown file using the configured API client."""
        loaded_config = self.config.load_config()
        if not loaded_config.is_complete():
            raise ValueError("Configuration not complete")

        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        try:
            content = path.read_text(encoding="utf-8")
            if self.on_progress:
                self.on_progress("Uploading document...")

            result = self.feishu_client.upload_document(
                path.name,
                content,
                loaded_config.folder_token,
                on_progress=self.on_progress,
            )

            self.history.add_item(
                {
                    "title": path.stem,
                    "url": result.url,
                    "docToken": result.token,
                    "uploadTime": "",
                    "permissions": {
                        "isPublic": False,
                        "allowCopy": False,
                        "allowCreateCopy": False,
                    },
                }
            )
            return result
        except Exception as exc:
            if self.on_error:
                self.on_error(exc)
            raise
