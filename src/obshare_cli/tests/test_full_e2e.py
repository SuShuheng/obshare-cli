"""
E2E tests for ObShare CLI
"""

import json
import os
import tempfile
import unittest
from pathlib import Path
from datetime import datetime

from obshare_cli.core.config import ConfigManager
from obshare_cli.core.uploader import DocumentUploader
from obshare_cli.core.api_client import FeishuApiClient
from obshare_cli.utils.output import format_upload_result
from obshare_cli.utils.converter import MarkdownConverter
from obshare_cli.utils.mermaid import MermaidRenderer


class TestUpload(unittest.TestCase):
    """Test upload functionality"""

    def setUp(self):
        """Set up test fixtures"""
        self.config_dir = tempfile.mkdtemp()
        self.config = ConfigManager(self.config_dir)

    def test_config_manager(self):
        """Test config manager"""
        config = ConfigManager(tempfile.mkdtemp())
        config.update_config(
            app_id="test_app_id",
            app_secret="test_app_secret",
            user_id="test_user_id",
            folder_token="test_folder_token"
        )
        loaded_config = config.load_config()
        self.assertTrue(loaded_config.is_complete())

    def test_upload_document_mock(self):
        """Test upload document with mock"""
        # This is a placeholder test
        # In a real e2e test, you would mock the Feishu API
        config = ConfigManager(tempfile.mkdtemp())
        config.update_config(
            app_id="test_app_id",
            app_secret="test_app_secret",
            user_id="test_user_id",
            folder_token="test_folder_token"
        )
        loaded_config = config.load_config()
        self.assertTrue(loaded_config.is_complete())


class TestMermaidRenderer(unittest.TestCase):
    """Test Mermaid rendering"""

    def test_mermaid_block_extraction(self):
        """Test Mermaid block extraction"""
        converter = MarkdownConverter()
        content = """```mermaid
graph TD
    A --> B
```"""
        blocks = converter.extract_mermaid_blocks(content)
        self.assertEqual(len(blocks), 1)


class TestConverter(unittest.TestCase):
    """Test Markdown converter"""

    def test_extract_images(self):
        """Test image extraction"""
        converter = MarkdownConverter()

        # Test with markdown image
        content = """
![Test Image](test-image.png)
"""
        images = converter.extract_images(content)
        self.assertEqual(len(images), 1)
        self.assertEqual(images[0]["type"], "markdown")
        self.assertEqual(images[0]["path"], "test-image.png")

    def test_extract_callouts(self):
        """Test callout extraction"""
        converter = MarkdownConverter()
        content = """
> [!NOTE]
> This is a note callout.
"""
        callouts = converter.extract_callouts(content)
        self.assertEqual(len(callouts), 1)
        self.assertEqual(callouts[0]["type"], "NOTE")


class TestOutputFormatting(unittest.TestCase):
    """Test output formatting"""

    def test_format_upload_result(self):
        """Test format upload result"""
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


if __name__ == "__main__":
    unittest.main()
