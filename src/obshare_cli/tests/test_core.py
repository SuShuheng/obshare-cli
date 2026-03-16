"""
Unit tests for ObShare CLI
"""

import unittest
import tempfile
import os
from pathlib import Path
import json
from datetime import datetime

from obshare_cli.core.config import ConfigManager
from obshare_cli.core.api_client import FeishuApiClient
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
            folder_token="test_folder_token"
        )

        # Verify saved
        loaded_config = config.load_config()
        self.assertEqual(loaded_config.app_id, "test_app_id")
        self.assertEqual(loaded_config.app_secret, "test_app_secret")
        self.assertEqual(loaded_config.user_id, "test_user_id")
        self.assertEqual(loaded_config.folder_token, "test_folder_token")

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


if __name__ == "__main__":
    unittest.main()
