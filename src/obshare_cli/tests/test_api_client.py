"""Focused tests for the Feishu API client."""

from __future__ import annotations

import time
from unittest.mock import Mock, patch

from obshare_cli.core.api_client import FeishuApiClient, UploadResult


class FakeResponse:
    """Small response double for requests-based tests."""

    def __init__(self, status_code, payload, content_type="application/json"):
        self.status_code = status_code
        self._payload = payload
        self.headers = {"Content-Type": content_type}
        self.text = payload if isinstance(payload, str) else str(payload)

    def json(self):
        if isinstance(self._payload, str):
            raise ValueError("Response body is not JSON")
        return self._payload


def fake_response(status_code, payload, content_type="application/json"):
    """Return a requests-like fake response object."""
    return FakeResponse(status_code, payload, content_type=content_type)


@patch("obshare_cli.core.api_client.requests.post")
def test_create_import_task_uses_drive_v1_import_tasks(mock_post):
    client = FeishuApiClient("app", "secret")
    client.access_token = "token"
    client.token_expire_time = time.time() + 3600
    mock_post.return_value = fake_response(
        200,
        {"code": 0, "data": {"ticket": "ticket_123"}},
    )

    ticket = client.create_import_task("demo.md", "file_123", "fld_123")

    assert ticket == "ticket_123"
    assert mock_post.call_args.args[0].endswith("/drive/v1/import_tasks")


def test_parse_response_handles_html_error_page():
    response = fake_response(404, "<html>missing</html>", content_type="text/html")
    client = FeishuApiClient("app", "secret")

    try:
        client._parse_json_response(response, "import task")
    except Exception as exc:
        assert "404" in str(exc)
    else:
        raise AssertionError("Expected HTML error page parsing to fail")


def test_parse_response_handles_api_code_failure():
    response = fake_response(200, {"code": 999, "msg": "bad request"})
    client = FeishuApiClient("app", "secret")

    try:
        client._parse_json_response(response, "permission update")
    except Exception as exc:
        assert "bad request" in str(exc)
    else:
        raise AssertionError("Expected API code failure parsing to fail")


@patch("obshare_cli.core.api_client.requests.get")
def test_poll_import_task_accepts_nested_result_shape(mock_get):
    client = FeishuApiClient("app", "secret")
    client.access_token = "token"
    client.token_expire_time = time.time() + 3600
    mock_get.return_value = fake_response(
        200,
        {
            "code": 0,
            "data": {
                "result": {
                    "job_status": 0,
                    "token": "docx_1",
                    "url": "https://feishu.cn/docx/docx_1",
                    "title": "Demo",
                }
            },
        },
    )

    result = client.poll_import_task("ticket_123", poll_interval=0, max_retries=1)

    assert result.token == "docx_1"
    assert result.url == "https://feishu.cn/docx/docx_1"


@patch("obshare_cli.core.api_client.time.sleep", return_value=None)
@patch("obshare_cli.core.api_client.requests.get")
def test_poll_import_task_treats_status_two_as_processing(mock_get, _mock_sleep):
    client = FeishuApiClient("app", "secret")
    client.access_token = "token"
    client.token_expire_time = time.time() + 3600
    mock_get.side_effect = [
        fake_response(
            200,
            {"code": 0, "data": {"result": {"job_status": 2, "job_error_msg": ""}}},
        ),
        fake_response(
            200,
            {
                "code": 0,
                "data": {
                    "result": {
                        "job_status": 0,
                        "token": "docx_2",
                        "url": "https://feishu.cn/docx/docx_2",
                        "title": "Demo 2",
                    }
                },
            },
        ),
    ]

    result = client.poll_import_task("ticket_456", poll_interval=0, max_retries=2)

    assert result.token == "docx_2"


def test_upload_document_deletes_temp_file_after_import():
    client = FeishuApiClient("app", "secret")
    client.upload_temp_markdown_file = Mock(return_value="file_123")
    client.create_import_task = Mock(return_value="ticket_123")
    client.poll_import_task = Mock(
        return_value=UploadResult(
            "docx_123",
            "https://feishu.cn/docx/docx_123",
            "demo",
        )
    )
    client.delete_file = Mock(return_value=True)

    result = client.upload_document("demo.md", "# demo", "fld_123")

    assert result.token == "docx_123"
    client.delete_file.assert_called_once_with("file_123", file_type="file")


@patch("obshare_cli.core.api_client.requests.patch")
def test_set_document_permissions_uses_public_docx_endpoint(mock_patch):
    client = FeishuApiClient("app", "secret")
    client.access_token = "token"
    client.token_expire_time = time.time() + 3600
    mock_patch.return_value = fake_response(200, {"code": 0, "data": {}})

    client.set_document_permissions(
        "docx_123",
        is_public=True,
        allow_copy=True,
        allow_create_copy=True,
    )

    assert "/drive/v2/permissions/docx_123/public?type=docx" in mock_patch.call_args.args[0]


@patch("obshare_cli.core.api_client.requests.delete")
def test_delete_document_uses_docx_type(mock_delete):
    client = FeishuApiClient("app", "secret")
    client.access_token = "token"
    client.token_expire_time = time.time() + 3600
    mock_delete.return_value = fake_response(200, {"code": 0, "data": {}})

    client.delete_document("docx_123")

    assert mock_delete.call_args.args[0].endswith("/drive/v1/files/docx_123?type=docx")
