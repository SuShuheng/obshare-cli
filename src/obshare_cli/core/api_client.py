"""
Feishu API Client for ObShare CLI
"""

import json
import base64
import time
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from pathlib import Path

import requests

from .media_pipeline import prepare_markdown_for_upload
from ..utils.mermaid import MermaidRenderer


@dataclass
class UploadResult:
    """Upload result"""
    token: str
    url: str
    title: str


@dataclass
class FeishuApiClient:
    """Feishu API Client"""
    app_id: str
    app_secret: str
    mermaid_renderer: Optional[Any] = None
    access_token: Optional[str] = None
    token_expire_time: float = 0
    base_url: str = "https://open.feishu.cn/open-apis"

    # Rate limiting
    _request_queue: List = field(default_factory=list)
    _is_processing_queue: bool = False
    _last_request_time: float = 0
    REQUEST_INTERVAL: float = 0.35  # 350ms between requests

    def _auth_headers(self) -> Dict[str, str]:
        """Return standard JSON headers for authenticated requests."""
        return {
            "Authorization": f"Bearer {self.get_access_token()}",
            "Content-Type": "application/json; charset=utf-8",
        }

    def _parse_json_response(self, response: requests.Response, action: str) -> Dict[str, Any]:
        """Normalize Feishu API responses and surface useful errors."""
        content_type = response.headers.get("Content-Type", "")
        if "json" not in content_type.lower():
            raise Exception(
                f"{action} failed: HTTP {response.status_code}: {response.text[:200]}"
            )

        payload = response.json()
        if response.status_code >= 400:
            raise Exception(
                f"{action} failed: HTTP {response.status_code}: {payload.get('msg', payload)}"
            )
        if payload.get("code") != 0:
            raise Exception(f"{action} failed: {payload.get('msg', '')}")
        return payload

    def get_access_token(self) -> str:
        """Get tenant access token"""
        import time
        current_time = time.time()

        # Check if token is still valid (refresh 30 minutes before expiry)
        if self.access_token and current_time < self.token_expire_time - 30 * 60:
            return self.access_token

        # Request new token
        url = f"{self.base_url}/auth/v3/tenant_access_token/internal"

        try:
            response = requests.post(
                url,
                json={
                    "app_id": self.app_id,
                    "app_secret": self.app_secret
                },
                headers={"Content-Type": "application/json"},
                timeout=30
            )

            result = response.json()

            if result.get("code") != 0:
                raise Exception(f"Authentication failed: {result.get('msg', '')}")

            if not result.get("tenant_access_token"):
                raise Exception("Invalid API response: missing tenant_access_token")

            self.access_token = result["tenant_access_token"]
            self.token_expire_time = current_time + result["expire"]

            return self.access_token

        except requests.exceptions.RequestException as e:
            raise Exception(f"Network error: {e}")
        except Exception as e:
            raise Exception(f"Failed to get access token: {e}")

    def create_import_task(self, file_name: str, file_token: str, folder_token: str) -> str:
        """Create a Feishu import task that converts Markdown into a docx file."""
        url = f"{self.base_url}/drive/v1/import_tasks"
        request_body = {
            "file_extension": "md",
            "file_name": Path(file_name).stem,
            "type": "docx",
            "file_token": file_token,
        }
        if folder_token:
            request_body["point"] = {
                "mount_type": 1,
                "mount_key": folder_token,
            }

        response = requests.post(
            url,
            headers=self._auth_headers(),
            json=request_body,
            timeout=30,
        )
        payload = self._parse_json_response(response, "import task creation")
        ticket = payload.get("data", {}).get("ticket")
        if not ticket:
            raise Exception("Import task creation failed: missing ticket")
        return ticket

    def upload_temp_markdown_file(self, file_name: str, content: str, folder_token: str) -> str:
        """Upload a temporary Markdown file into Feishu drive storage."""
        file_bytes = content.encode("utf-8")
        response = requests.post(
            f"{self.base_url}/drive/v1/files/upload_all",
            headers={"Authorization": f"Bearer {self.get_access_token()}"},
            data={
                "file_name": file_name,
                "parent_type": "explorer",
                "parent_node": folder_token,
                "size": str(len(file_bytes)),
            },
            files={
                "file": (
                    Path(file_name).stem,
                    file_bytes,
                    "application/octet-stream",
                )
            },
            timeout=60,
        )
        payload = self._parse_json_response(response, "file upload")
        file_token = payload.get("data", {}).get("file_token")
        if not file_token:
            raise Exception("File upload failed: missing file_token")
        return file_token

    def poll_import_task(
        self,
        ticket: str,
        on_progress: Optional[callable] = None,
        poll_interval: float = 3.0,
        max_retries: int = 5,
    ) -> UploadResult:
        """Poll an import task until the final docx document is ready."""
        url = f"{self.base_url}/drive/v1/import_tasks/{ticket}"

        for _ in range(max_retries):
            if on_progress:
                on_progress("Checking import task status...")
            response = requests.get(
                url,
                headers=self._auth_headers(),
                timeout=30,
            )
            payload = self._parse_json_response(response, "import task polling")
            result = payload.get("data", {}).get("result", payload.get("data", {}))
            job_status = result.get("job_status")

            if job_status == 0:
                return UploadResult(
                    token=result["token"],
                    url=result["url"],
                    title=result.get("title") or "Untitled",
                )
            if job_status not in (1, 2):
                error_message = result.get("job_error_msg", "")
                raise Exception(
                    f"Import task polling failed: {error_message or f'unknown job status {job_status}'}"
                )
            time.sleep(poll_interval)

        raise Exception("Import task polling failed: timed out")

    def get_document_blocks(self, document_id: str) -> List[Dict[str, Any]]:
        """Return the block list for a Feishu docx document."""
        response = requests.get(
            f"{self.base_url}/docx/v1/documents/{document_id}/blocks",
            headers=self._auth_headers(),
            timeout=30,
        )
        payload = self._parse_json_response(response, "document block listing")
        items = payload.get("data", {}).get("items")
        if items is None:
            raise Exception("Document block listing failed: missing items")
        return items

    def upload_image_material(
        self,
        file_name: str,
        base64_content: str,
        document_id: str,
        block_id: str,
    ) -> str:
        """Upload an image or GIF into a docx image slot and return its file token."""
        image_bytes = base64.b64decode(base64_content)
        response = requests.post(
            f"{self.base_url}/drive/v1/medias/upload_all",
            headers={"Authorization": f"Bearer {self.get_access_token()}"},
            data={
                "file_name": file_name,
                "parent_type": "docx_image",
                "parent_node": block_id,
                "size": str(len(image_bytes)),
                "extra": json.dumps({"drive_route_token": document_id}),
            },
            files={
                "file": (
                    file_name,
                    image_bytes,
                    "application/octet-stream",
                )
            },
            timeout=60,
        )
        payload = self._parse_json_response(response, "image material upload")
        file_token = payload.get("data", {}).get("file_token")
        if not file_token:
            raise Exception("Image material upload failed: missing file_token")
        return file_token

    def replace_image_block(
        self,
        document_id: str,
        block_id: str,
        image_token: str,
        *,
        width: int = 800,
        height: int = 600,
    ) -> None:
        """Replace a docx image block with an uploaded media token."""
        response = requests.patch(
            (
                f"{self.base_url}/docx/v1/documents/{document_id}/blocks/"
                f"{block_id}?document_revision_id=-1"
            ),
            headers=self._auth_headers(),
            json={
                "replace_image": {
                    "token": image_token,
                    "width": width,
                    "height": height,
                    "align": 2,
                }
            },
            timeout=30,
        )
        self._parse_json_response(response, "image block replacement")

    def backfill_document_media(
        self,
        document_id: str,
        media_items: List[Any],
        on_progress: Optional[callable] = None,
    ) -> None:
        """Upload prepared media items and replace imported docx image blocks."""
        if not media_items:
            return

        image_blocks = [
            block for block in self.get_document_blocks(document_id)
            if block.get("block_type") == 27
        ]
        if len(media_items) != len(image_blocks):
            raise Exception(
                "Media backfill failed: "
                f"{len(media_items)} prepared media items but {len(image_blocks)} image blocks"
            )

        for media_item, image_block in zip(media_items, image_blocks):
            if on_progress:
                on_progress(f"Backfilling media: {media_item.display_name}")

            if media_item.base64_content:
                base64_content = media_item.base64_content
            elif media_item.source_path:
                base64_content = base64.b64encode(
                    Path(media_item.source_path).read_bytes()
                ).decode("ascii")
            else:
                raise Exception(
                    f"Media backfill failed: no data source for {media_item.display_name}"
                )

            image_token = self.upload_image_material(
                media_item.display_name,
                base64_content,
                document_id,
                image_block["block_id"],
            )

            if media_item.width and media_item.height:
                self.replace_image_block(
                    document_id,
                    image_block["block_id"],
                    image_token,
                    width=media_item.width,
                    height=media_item.height,
                )
            else:
                self.replace_image_block(
                    document_id,
                    image_block["block_id"],
                    image_token,
                )

    def upload_document(
        self,
        file_name: str,
        content: str,
        folder_token: str,
        source_path: Optional[Path] = None,
        on_progress: Optional[callable] = None
    ) -> UploadResult:
        """Upload a Markdown document to Feishu"""
        temp_file_token: Optional[str] = None
        try:
            processed_content = content
            media_items: List[Any] = []
            if source_path:
                if on_progress:
                    on_progress("Preparing local media before upload...")
                prepared = prepare_markdown_for_upload(
                    content,
                    Path(source_path),
                    self.mermaid_renderer or MermaidRenderer(),
                )
                processed_content = prepared.processed_content
                media_items = prepared.media_items

            if on_progress:
                on_progress("Uploading Markdown file to Feishu drive...")
            temp_file_token = self.upload_temp_markdown_file(
                file_name,
                processed_content,
                folder_token,
            )

            if on_progress:
                on_progress("Creating import task...")
            ticket = self.create_import_task(file_name, temp_file_token, folder_token)

            if on_progress:
                on_progress("Waiting for Feishu import task...")
            result = self.poll_import_task(ticket, on_progress=on_progress)

            if media_items:
                self.backfill_document_media(
                    result.token,
                    media_items,
                    on_progress=on_progress,
                )

            return result
        except Exception as e:
            raise Exception(f"Upload failed: {e}")
        finally:
            if temp_file_token:
                try:
                    self.delete_file(temp_file_token, file_type="file")
                except Exception:
                    pass

    def _poll_import_status(
        self,
        token: str,
        ticket: str,
        on_progress: Optional[callable] = None,
        max_retries: int = 10,
        poll_interval: float = 2.0
    ) -> UploadResult:
        """Poll for import task status"""
        url = f"{self.base_url}/docx/v1/documents/import_tasks/{ticket}"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        for attempt in range(max_retries):
            if on_progress:
                on_progress(f"Checking import status ({attempt + 1}/{max_retries})...")

            try:
                time.sleep(poll_interval)
                response = requests.get(url, headers=headers, timeout=30)
                result = response.json()

                job_status = result["data"]["job_status"]

                if job_status == 0:  # Success
                    return UploadResult(
                        token=result["data"]["token"],
                        url=result["data"]["url"],
                        title=result["data"]["title"] or "Untitled"
                    )
                elif job_status == 2:  # Failed
                    error_msg = result["data"].get("job_error_msg", "Import failed")
                    raise Exception(f"Import failed: {error_msg}")

                # Still processing, continue polling
                if on_progress:
                    on_progress("Processing document...")

            except requests.exceptions.RequestException:
                if attempt < max_retries - 1:
                    continue
                raise

        return self._poll_import_status(token, ticket, on_progress)

        raise Exception("Import task polling failed after maximum retries")

    def set_document_permissions(
        self,
        document_token: str,
        is_public: bool = False,
        allow_copy: bool = False,
        allow_create_copy: bool = False,
        user_id: Optional[str] = None
    ) -> bool:
        """Set document permissions"""
        try:
            if user_id:
                try:
                    self.transfer_document_ownership(document_token, user_id)
                except Exception:
                    pass

            url = f"{self.base_url}/drive/v2/permissions/{document_token}/public?type=docx"
            payload = {"external_access_entity": "open"}
            if is_public:
                payload["link_share_entity"] = "anyone_readable"
            if allow_copy:
                payload["copy_entity"] = "anyone_can_view"
            if allow_create_copy:
                payload["security_entity"] = "anyone_can_view"

            response = requests.patch(
                url,
                headers=self._auth_headers(),
                json=payload,
                timeout=30,
            )
            self._parse_json_response(response, "permission update")
            return True

        except Exception as e:
            raise Exception(f"Failed to set permissions: {e}")

    def transfer_document_ownership(self, document_token: str, user_id: str) -> bool:
        """Transfer ownership of a docx document to the configured user."""
        response = requests.post(
            (
                f"{self.base_url}/drive/v1/permissions/{document_token}/members/"
                "transfer_owner?need_notification=false&old_owner_perm=full_access"
                "&remove_old_owner=false&stay_put=true&type=docx"
            ),
            headers=self._auth_headers(),
            json={"member_id": user_id, "member_type": "userid"},
            timeout=30,
        )
        self._parse_json_response(response, "ownership transfer")
        return True

    def delete_file(self, document_token: str, file_type: str = "docx") -> bool:
        """Delete a Feishu file using an explicit type discriminator."""
        try:
            response = requests.delete(
                f"{self.base_url}/drive/v1/files/{document_token}?type={file_type}",
                headers=self._auth_headers(),
                timeout=30,
            )
            payload = self._parse_json_response(response, "file deletion")
            if payload.get("code") != 0:
                raise Exception(f"Delete failed: {payload.get('msg', '')}")
            return True
        except Exception as e:
            raise Exception(f"Failed to delete document: {e}")

    def delete_document(self, document_token: str) -> bool:
        """Delete a docx document."""
        return self.delete_file(document_token, file_type="docx")

    def test_connection(self) -> bool:
        """Test API connection"""
        try:
            self.get_access_token()
            return True
        except Exception:
            return False
