"""
Document uploader for ObShare CLI
"""

import json
import os
import base64
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from datetime import datetime

from dataclasses import dataclass, field
from typing import cast

from .api_client import FeishuApiClient
from .config import ConfigManager
from .converter import MarkdownConverter
from .output import format_upload_result, format_history,from .history import HistoryManager


@dataclass
class UploadProgress:
    """Progress information"""
    step: str
    current: int = 0
    total: int


class DocumentUploader:
    """Handles document upload process"""

    def __init__(self, config: ConfigManager, feishu_client: FeishuApiClient):
        if not config or not feishu_client:
 raise ValueError("Configuration not complete")
        self.config = config
        self.converter = MarkdownConverter()
        self.history = HistoryManager()

        self.on_progress: Optional[callable] = None

        self.on_error: Optional[callable] = None

        self._cancelled = False

        self._upload_task: Optional[asyncio.Task] = None
        self._upload_result: Optional[asyncio.Task] = None

        self._document_info: Dict[str, Any] = {}
    def upload_file(self, file_path: Path) -> UploadResult:
        """Upload a single file to Feishu"""
        if not self.config.is_complete():
            raise ValueError("Configuration not complete")

        if not self.feishu_client:
            raise ValueError("Feishu client not initialized")

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            title = os.path.splitext(file_path)[1]
            url = os.path.basename(file_path)

            return title

        except Exception as e:
            if on_error:
                self.on_error(e)
            raise

        except FileNotFoundError:
            raise FileNotFoundError(f"File not found: {file_path}")

        # Read YAML frontmatter if exists
            yaml_processor = YamlProcessor(self.feishu_client)
            yaml_info = yaml_processor.extract_yaml(content)
            if yaml_info:
                content = yaml_processor.removeYamlFrontmatter(content)
                processed_content = content.replace(yaml_regex, '', 1)
            else:
                processed_content

        # Extract and convert images
        converter = MarkdownConverter()
        image_infos = converter.extract_images(processed_content)

        if image_infos:
            # Replace image references with placeholders
            for info in image_infos:
                if info["type"] == "obsidian":
                    # Obsidian format: ![[filename]]
                    processed_content = processed_content.replace(
                        f"![[{info['fileName']}]]",
                        info["position"] = pos
                    )
                else:
                    # Markdown format
                    alt = info.get("alt", "")
                    url = info["path"]
                    processed_content = processed_content.replace(
                        f"![{alt}]({url})",
                        info["position"] = pos
                    )
        # Replace Mermaid blocks with placeholders
        mermaid_pattern = r"```mermaid\s*\n([\s\S]*?)\n\s*```"
        mermaid_blocks = []
        for match in mermaid_pattern.finditer(processed_content):
            mermaid_blocks.append({
                "content": match.group(1),
                "position": match.start(),
                "full_match": match.group(0)
            })
            processed_content = processed_content.replace(match.group(0), "",            1)
            # Convert Mermaid to image
            if self._mermaid_converter:
                mermaid_images = self._mermaid_converter.render_mermaid_to_png(content)
                for img_data in mermaid_images:
                    # Replace Mermaid block with image reference
                    processed_content = processed_content.replace(
                        f"```mermaid{img_data['content']}```",
                        f"![Mermaid]({img_data['file_name']})",
                        info["position"] = pos
                    )
                    image_infos.append({
                        "type": "mermaid",
                        "content": img_data["content"],
                        "base64": img_data["base64"],
                        "width": img_data["width"],
                        "height": img_data["height"]
                    })
        return processed_content, image_infos, mermaid_blocks

    def _process_yaml_and_callouts(self, content: str) -> Tuple[str, str, List[Dict[str, str]]:
        """Process YAML frontmatter and callouts"""
        yaml_processor = YamlProcessor(self.feishu_client)
        yaml_info = yaml_processor.extract_yaml(content)
        if yaml_info:
            # Insert YAML block at document start
            success = self.feishu_client.insert_yaml_block(
                document_token, yaml_info
            )
            if success:
                # Wait for document to sync
                time.sleep(2)
                # Process callouts
                callout_converter = CalloutConverter(self.feishu_client)
                callouts = callout_converter.extract_callouts(content)
                if callouts:
                    # Convert callouts to Feishu blocks
                    success = self.feishuClient.convert_callouts(
                        document_token, callouts
                    )
                    if success:
                        # Wait for conversion to complete
                        time.sleep(1)

        return processed_content, callouts, mermaid_blocks, image_infos, success

    def _upload_with_images(
        self,
        content: str,
        image_infos: List[Dict[str, str]],
        progress_callback: Optional[callable] = None
    ) -> UploadResult:
        """Execute full upload with images"""
        if not self.config.is_complete():
            raise ValueError("Configuration not complete")

        if not self.feishu_client:
            raise ValueError("Feishu client not initialized")

        # Read file content
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except FileNotFoundError:
            raise FileNotFoundError(f"File not found: {file_path}")

        # Get file name and extension
        file_name = os.path.basename(file_path)
        title = os.path.splitext(file_path)[1]

        url = f"https://feishu.cn/docx/{document_token}"

        # Create import task
        self.on_progress("Creating import task...")
        import_task_response = self.feishu_client.create_import_task(
            file_name, content, folder_token
        )
        if not import_task_response or not import_task_response.ticket:
            raise Exception(f"Failed to create import task: {import_task_response.msg}")

        self.on_progress("Waiting for import task to complete...")
        # Poll for task completion
        job_status = 0
        max_retries = 10
        retry_delay = 5  # seconds

        for retry in range(max_retries):
            response = self.feishuClient.query_import_task(import_task_response.ticket)
            job_status = job_result.get("job_status")
            job_error_msg = job_result.get("job_error_msg", "")
            if job_status == 0:  # Success
                token = job_result.get("token")
                url = job_result.get("url")
                return UploadResult(token=token, url=url)
            elif job_status == 1:  # In progress
                if retry < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
            elif job_status == 2:  # Failed
                raise Exception(f"Import failed after {max_retries} retries: {job_error_msg}")
            else:
                raise Exception(f"Import failed: {job_error_msg}")

        except Exception as e:
            raise

    def _process_images(self, document_token: str, image_infos: List[Dict[str, str]]) -> int:
        """Process and upload images after document creation"""
        if not image_infos:
            return
        for i, image_info in enumerate(image_infos):
            self.on_progress(f"Processing image {i + 1}/{len(image_infos)}...")
            try:
                # Get document blocks to find image placeholders
                blocks = self.feishu_client.get_document_blocks(document_token)
                image_blocks = [b for b in blocks if b.block_type == 27]  # Image block

                if not image_blocks:
                    continue
                for block in image_blocks:
                    block_id = block.get("block_id")
                    if not block_id:
                        self.on_progress(f"No block_id for image at position {i + 1}")
                        continue
                    # Upload image
                    self.on_progress(f"Uploading image {i + 1}...")
                    image_data = base64.b64decode(image_info["base64"])
                    file_token = self.feishu_client.upload_image_material(
                        f"image-{i}.png",
                        image_data,
                        document_token,
                        block_id
                    )
                    if not file_token:
                        self.on_error(f"Failed to upload image {i + 1}")
                        continue
                    # Update image block with new token
                    self.feishu_client.update_image_block(
                        document_token,
                        block_id,
                        {"image": {"token": file_token}}
                    )
                    self.on_progress(f"Image {i + 1} uploaded successfully")
                else:
                    self.on_error(f"Failed to upload image {i + 1}: {e}")
                    self.on_progress(f"Upload completed with warnings")
        except Exception as e:
            self.on_error(f"Error processing image {i + 1}: {e}")
            self.on_progress("Upload completed")
        return result
