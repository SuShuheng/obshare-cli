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
    access_token: Optional[str] = None
    token_expire_time: float = 0
    base_url: str = "https://open.feishu.cn/open-apis"

    # Rate limiting
    _request_queue: List = field(default_factory=list)
    _is_processing_queue: bool = False
    _last_request_time: float = 0
    REQUEST_INTERVAL: float = 0.35  # 350ms between requests

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

    def upload_document(
        self,
        file_name: str,
        content: str,
        folder_token: str,
        on_progress: Optional[callable] = None
    ) -> UploadResult:
        """Upload a Markdown document to Feishu"""

        # Get access token
        token = self.get_access_token()

        # Create import task
        url = f"{self.base_url}/docx/v1/documents/import_tasks"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        # Create document in folder first (required for import)
        create_url = f"{self.base_url}/drive/v1/files/upload_all"

        # Prepare file content as base64
        file_content_base64 = base64.b64encode(content.encode('utf-8')).decode('utf-8')

        # Generate boundary
        boundary = f"obshare-boundary-{int(time.time() * 1000)}"

        # Build multipart body
        body_parts = []

        # file_name
        body_parts.append(f"--{boundary}\r\n")
        body_parts.append(f'Content-Disposition: form-data; name="file_name"\r\n\r\n')
        body_parts.append(f"{file_name}\r\n")

        # parent_type
        body_parts.append(f"--{boundary}\r\n")
        body_parts.append(f'Content-Disposition: form-data; name="parent_type"\r\n\r\n')
        body_parts.append(f"explorer\r\n")

        # parent_node
        body_parts.append(f"--{boundary}\r\n")
        body_parts.append(f'Content-Disposition: form-data; name="parent_node"\r\n\r\n')
        body_parts.append(f"{folder_token}\r\n")

        # size
        file_bytes = content.encode('utf-8')
        body_parts.append(f"--{boundary}\r\n")
        body_parts.append(f'Content-Disposition: form-data; name="size"\r\n\r\n')
        body_parts.append(f"{len(file_bytes)}\r\n")

        # file content
        body_parts.append(f"--{boundary}\r\n")
        body_parts.append(f'Content-Disposition: form-data; name="file"; filename="{file_name}"\r\n')
        body_parts.append(f"Content-Type: text/markdown\r\n\r\n")
        body_parts.append(content)

        body_parts.append(f"\r\n")

        # End boundary
        body_parts.append(f"--{boundary}--\r\n")

        body = "".join(body_parts).encode('utf-8')

        try:
            # Upload file
            upload_response = requests.post(
                create_url,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": f"multipart/form-data; boundary={boundary}"
                },
                data=body,
                timeout=60
            )

            upload_result = upload_response.json()
            if upload_result.get("code") != 0:
                raise Exception(f"File upload failed: {upload_result.get('msg')}")

            file_token = upload_result["data"]["file_token"]

            # Create import task
            import_response = requests.post(
                url,
                headers=headers,
                json={
                    "file_extension": "md",
                    "file_token": file_token,
                    "type": "docx",
                    "file_name": file_name,
                    "parent_node": folder_token,
                    "parent_type": "explorer"
                }
            )

            if import_response.status_code != 200:
                raise Exception(f"Import task creation failed: {import_response.text}")

            ticket = import_response.json()["data"]["ticket"]

            # Poll for import status
            on_progress and on_progress("Creating import task...") if on_progress else None

            return self._poll_import_status(token, ticket, on_progress)

        except Exception as e:
            raise Exception(f"Upload failed: {e}")

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
        access_token = self.get_access_token()
        url = f"{self.base_url}/drive/v1/permissions/{document_token}/members"

        # Build permission settings
        permissions = {
            "is_public": is_public,
            "allow_copy": allow_copy,
            "allow_create_copy": allow_create_copy,
        }

        # If making public, set additional parameters
        if is_public:
            permissions["copy_entity"] = "anyone_can_view" if allow_copy else "only_full_access"
            permissions["security_entity"] = "anyone_can_view" if allow_create_copy else "only_full_access"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.patch(
                url,
                headers=headers,
                json={"permissions": permissions}
            )

            result = response.json()

            if result.get("code") != 0:
                raise Exception(f"Permission setting failed: {result.get('msg')}")

            # Transfer ownership if user_id provided
            if user_id:
                self._transfer_ownership(document_token, user_id)

            return True

        except Exception as e:
            raise Exception(f"Failed to set permissions: {e}")

    def _transfer_ownership(self, document_token: str, user_id: str) -> None:
        """Transfer document ownership"""
        access_token = self.get_access_token()
        url = f"{self.base_url}/drive/v1/permissions/{document_token}/members"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        try:
            # First get current members
            response = requests.get(url, headers=headers)
            result = response.json()

            if result.get("code") != 0:
                # If no members, that's OK
                pass
            else:
                # Transfer ownership to specified user
                transfer_url = f"{url}/transfer_ownership"
                transfer_response = requests.post(
                    transfer_url,
                    headers=headers,
                    json={"owner_id": user_id}
                )

                if transfer_response.status_code != 200:
                    pass  # Non-critical error

        except Exception:
            pass  # Non-critical error

    def delete_document(self, document_token: str) -> bool:
        """Delete a document"""
        access_token = self.get_access_token()
        url = f"{self.base_url}/drive/v1/files/{document_token}"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }

        try:
            response = requests.delete(url, headers=headers)
            result = response.json()

            if result.get("code") != 0:
                # 404 is OK (already deleted)
                if "file not found" not in result.get("msg", ""):
                    raise Exception(f"Delete failed: {result.get('msg')}")

            return True

        except Exception as e:
            raise Exception(f"Failed to delete document: {e}")

    def test_connection(self) -> bool:
        """Test API connection"""
        try:
            self.get_access_token()
            return True
        except Exception:
            return False
