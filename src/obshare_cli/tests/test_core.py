"""
Unit tests for ObShare CLI
"""

import unittest
import tempfile
import os
from pathlib import Path
import json
from datetime import datetime
from unittest.mock import Mock

from obshare_cli.core.config import ConfigManager
from obshare_cli.core.api_client import FeishuApiClient, UploadResult
from obshare_cli.core.obsidian_bridge import MermaidBridgeResult
from obshare_cli.core.uploader import DocumentUploader
from obshare_cli.utils.crypto import CryptoUtils
from obshare_cli.utils.output import format_upload_result, format_error
from obshare_cli.utils.converter import MarkdownConverter
from obshare_cli.utils.mermaid import MermaidRenderer
from obshare_cli.core.history import HistoryManager


class TestConfig(unittest.TestCase):
    """Test configuration management"""

    def test_set_app_id(self):
        """Test set app ID"""
        config = ConfigManager(tempfile.mkdtemp())
        config.update_config(app_id="test_app_id")
        loaded_config = config.load_config()
        self.assertEqual(loaded_config.app_id, "test_app_id")

    def test_set_app_secret(self):
        """Test set app secret"""
        config = ConfigManager(tempfile.mkdtemp())
        config.update_config(app_secret="test_app_secret")
        loaded_config = config.load_config()
        self.assertEqual(loaded_config.app_secret, "test_app_secret")

    def test_set_user_id(self):
        """Test set user ID"""
        config = ConfigManager(tempfile.mkdtemp())
        config.update_config(user_id="test_user_id")
        loaded_config = config.load_config()
        self.assertEqual(loaded_config.user_id, "test_user_id")

    def test_set_folder(self):
        """Test set folder token"""
        config = ConfigManager(tempfile.mkdtemp())
        config.update_config(folder_token="test_folder_token")
        loaded_config = config.load_config()
        self.assertEqual(loaded_config.folder_token, "test_folder_token")

    def test_save_config(self):
        """Test save configuration"""
        config = ConfigManager(tempfile.mkdtemp())
        config.update_config(
            app_id="test_app_id",
            app_secret="test_app_secret",
            user_id="test_user_id",
            folder_token="test_folder_token",
            obsidian_cli_command="obsidian",
            obsidian_bridge_dir="/tmp/obshare-bridge",
            obsidian_render_command_id="obshare-cli:process-render-request",
        )

        # Verify saved
        loaded_config = config.load_config()
        self.assertEqual(loaded_config.app_id, "test_app_id")
        self.assertEqual(loaded_config.app_secret, "test_app_secret")
        self.assertEqual(loaded_config.user_id, "test_user_id")
        self.assertEqual(loaded_config.folder_token, "test_folder_token")
        self.assertEqual(loaded_config.obsidian_cli_command, "obsidian")
        self.assertEqual(loaded_config.obsidian_bridge_dir, "/tmp/obshare-bridge")
        self.assertEqual(
            loaded_config.obsidian_render_command_id,
            "obshare-cli:process-render-request",
        )

    def test_config_not_complete(self):
        """Test incomplete configuration validation"""
        config = ConfigManager(tempfile.mkdtemp())
        config.update_config(
            app_id="test_app_id",
            app_secret="test_app_secret"
        )
        loaded_config = config.load_config()
        # Missing user_id and folder_token
        self.assertFalse(loaded_config.is_complete())

    def test_obsidian_bridge_config_fields_round_trip(self):
        """Optional Obsidian bridge settings should be persisted and loaded."""
        config = ConfigManager(tempfile.mkdtemp())
        config.update_config(
            obsidian_cli_command="obsidian",
            obsidian_bridge_dir="/tmp/bridge",
            obsidian_render_command_id="obshare-cli:process-render-request",
        )

        loaded_config = config.load_config()

        self.assertEqual(loaded_config.obsidian_cli_command, "obsidian")
        self.assertEqual(loaded_config.obsidian_bridge_dir, "/tmp/bridge")
        self.assertEqual(
            loaded_config.obsidian_render_command_id,
            "obshare-cli:process-render-request",
        )


class TestConfigEncryption(unittest.TestCase):
    """Test configuration encryption"""

    def test_encryption(self):
        """Test that sensitive data is encrypted"""
        config = ConfigManager(tempfile.mkdtemp())
        config.update_config(
            app_id="test_app_id",
            app_secret="test_app_secret",
            user_id="test_user_id",
            folder_token="test_folder_token"
        )

        # Verify encrypted
        loaded_config = config.load_config()
        self.assertEqual(loaded_config.app_id, "test_app_id")
        self.assertEqual(loaded_config.app_secret, "test_app_secret")
        self.assertEqual(loaded_config.user_id, "test_user_id")
        self.assertEqual(loaded_config.folder_token, "test_folder_token")


class TestMarkdownConverter(unittest.TestCase):
    """Test Markdown converter"""

    def test_extract_images(self):
        """Test image extraction"""
        converter = MarkdownConverter()
        content = """
# Test Document

---
title: Test Document
date: 2024-01-01
tags:
  - test
  - obshare
---

## Content

This is a test paragraph.

![Test Image](test-image.png)
"""
        images = converter.extract_images(content)
        self.assertEqual(len(images), 1)

    def test_mermaid_extraction(self):
        """Test Mermaid extraction"""
        converter = MarkdownConverter()
        content = """
```mermaid
graph TD
    A --> B
```
"""
        mermaid_blocks = converter.extract_mermaid_blocks(content)
        self.assertEqual(len(mermaid_blocks), 1)


class TestOutputFormatting(unittest.TestCase):
    """Test output formatting"""

    def test_format_upload_result(self):
        """Test format upload result"""
        from obshare_cli.utils.output import format_upload_result, format_error
        from datetime import datetime

        # Test format_upload_result
        result = {
            "success": True,
            "document": {
                "title": "Test Document",
                "token": "doxcnTest123",
                "url": "https://feishu.cn/docx/doxcnTest123",
            },
            "permissions": {
                "isPublic": True,
                "allowCopy": True,
                "allowCreateCopy": True
            },
            "uploadTime": "2024-01-01T00:00:00"
        }
        output = format_upload_result(result)
        self.assertTrue(output["success"])
        self.assertEqual(output["document"]["token"], "doxcnTest123")
        self.assertEqual(output["document"]["url"], "https://feishu.cn/docx/doxcnTest123")


class TestHistory(unittest.TestCase):
    """Test history management"""

    def test_add_history_item(self):
        """Test adding history items"""
        config = ConfigManager(tempfile.mkdtemp())

        # Add some history items
        now = datetime.now()
        config.add_history_item({
            "title": "Doc 1",
            "url": "https://feishu.cn/docx/doc1",
            "docToken": "token1",
            "uploadTime": now.strftime("%Y-%m-%d %H:%M"),
            "permissions": {
                "isPublic": True,
                "allowCopy": False,
                "allowCreateCopy": False
            }
        })

        # Get all history
        all_history = config.load_history()
        self.assertEqual(len(all_history), 1)

    def test_delete_history_item(self):
        """Test deleting history item"""
        config = ConfigManager(tempfile.mkdtemp())

        # Add history item
        config.add_history_item({
            "title": "Doc 1",
            "url": "https://feishu.cn/docx/doc1",
            "docToken": "token1",
            "uploadTime": "2024-01-01 12:00",
            "permissions": {}
        })

        # Delete the item
        config.delete_history_item("token1")
        all_history = config.load_history()
        self.assertEqual(len(all_history), 0)

    def test_document_uploader_records_final_docx_metadata(self):
        """DocumentUploader should persist final docx token, URL, and upload time."""
        config = ConfigManager(tempfile.mkdtemp())
        config.update_config(
            app_id="test_app_id",
            app_secret="test_app_secret",
            user_id="test_user_id",
            folder_token="test_folder_token",
        )

        temp_dir = Path(tempfile.mkdtemp())
        markdown_file = temp_dir / "demo.md"
        markdown_file.write_text("# Demo\n", encoding="utf-8")

        feishu_client = Mock()
        feishu_client.upload_document.return_value = UploadResult(
            token="docx_123",
            url="https://feishu.cn/docx/docx_123",
            title="demo",
        )

        uploader = DocumentUploader(config, feishu_client)
        result = uploader.upload_file(markdown_file)

        history = config.load_history()
        self.assertEqual(result.token, "docx_123")
        self.assertEqual(history[0]["docToken"], "docx_123")
        self.assertEqual(history[0]["url"], "https://feishu.cn/docx/docx_123")
        self.assertTrue(history[0]["uploadTime"])
        feishu_client.upload_document.assert_called_once_with(
            "demo.md",
            "# Demo\n",
            "test_folder_token",
            source_path=markdown_file,
            on_progress=None,
        )


class TestMermaidRenderer(unittest.TestCase):
    """Test Mermaid rendering"""

    def test_extract_mermaid_blocks(self):
        """Test Mermaid block extraction"""
        converter = MarkdownConverter()
        content = """
```mermaid
graph TD
    A --> B
```
"""
        blocks = converter.extract_mermaid_blocks(content)
        self.assertEqual(len(blocks), 1)

    def test_render_mermaid_to_png_fails_without_mmdc(self):
        """Mermaid renderer should return a structured failure when mmdc is missing."""
        renderer = MermaidRenderer(executable="/definitely/missing/mmdc")

        result = renderer.render_mermaid_to_png("flowchart TD\nA-->B")

        self.assertFalse(result.success)
        self.assertIn("Mermaid CLI not installed", result.error)

    def test_render_mermaid_to_png_with_obsidian_bridge(self):
        """Bridge-backed Mermaid rendering should return PNG metadata."""
        temp_dir = Path(tempfile.mkdtemp())
        png_path = temp_dir / "diagram.png"
        png_path.write_bytes(b"png")

        bridge = Mock()
        bridge.render_mermaid.return_value = MermaidBridgeResult(
            png_path=png_path,
            width=640,
            height=360,
        )

        renderer = MermaidRenderer(bridge=bridge)
        result = renderer.render_mermaid_to_png("flowchart TD\nA-->B")

        self.assertTrue(result.success)
        self.assertEqual(result.images[0]["base64"], "cG5n")
        self.assertEqual(result.images[0]["png_path"], str(png_path))
        self.assertEqual(result.images[0]["width"], 640)
        self.assertEqual(result.images[0]["height"], 360)
        bridge.render_mermaid.assert_called_once_with(
            "flowchart TD\nA-->B",
            "flowchart",
            output_name="mermaid-flowchart.png",
        )

    def test_render_mermaid_to_png_surfaces_bridge_failure(self):
        """Bridge failures should be returned as structured Mermaid errors."""
        bridge = Mock()
        bridge.render_mermaid.side_effect = RuntimeError("bridge boom")

        renderer = MermaidRenderer(bridge=bridge)
        result = renderer.render_mermaid_to_png("flowchart TD\nA-->B")

        self.assertFalse(result.success)
        self.assertIn("bridge boom", result.error)


if __name__ == "__main__":
    unittest.main()
