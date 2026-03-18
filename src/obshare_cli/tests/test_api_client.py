"""Focused tests for the Feishu API client."""

from __future__ import annotations

import time
from pathlib import Path
from unittest.mock import Mock, patch

from obshare_cli.core.api_client import FeishuApiClient, UploadResult
from obshare_cli.core.media_pipeline import PreparedMarkdown, PreparedMediaItem


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


@patch("obshare_cli.core.api_client.requests.get")
def test_get_document_blocks_uses_docx_blocks_endpoint(mock_get):
    client = FeishuApiClient("app", "secret")
    client.access_token = "token"
    client.token_expire_time = time.time() + 3600
    mock_get.return_value = fake_response(
        200,
        {"code": 0, "data": {"items": [{"block_id": "blk_1", "block_type": 27}]}},
    )

    blocks = client.get_document_blocks("docx_123")

    assert blocks == [{"block_id": "blk_1", "block_type": 27}]
    assert "/docx/v1/documents/docx_123/blocks" in mock_get.call_args.args[0]


@patch("obshare_cli.core.api_client.requests.post")
def test_upload_image_material_uses_docx_media_upload(mock_post):
    client = FeishuApiClient("app", "secret")
    client.access_token = "token"
    client.token_expire_time = time.time() + 3600
    mock_post.return_value = fake_response(
        200,
        {"code": 0, "data": {"file_token": "img_123"}},
    )

    image_token = client.upload_image_material("demo.png", "Zm9v", "docx_1", "block_1")

    assert image_token == "img_123"
    assert mock_post.call_args.args[0].endswith("/drive/v1/medias/upload_all")
    assert mock_post.call_args.kwargs["data"]["parent_type"] == "docx_image"
    assert mock_post.call_args.kwargs["data"]["parent_node"] == "block_1"
    assert mock_post.call_args.kwargs["data"]["extra"] == '{"drive_route_token": "docx_1"}'
    assert mock_post.call_args.kwargs["data"]["size"] == "3"
    assert mock_post.call_args.kwargs["files"]["file"][0] == "demo.png"


@patch("obshare_cli.core.api_client.requests.patch")
def test_replace_image_block_uses_docx_replace_image_payload(mock_patch):
    client = FeishuApiClient("app", "secret")
    client.access_token = "token"
    client.token_expire_time = time.time() + 3600
    mock_patch.return_value = fake_response(200, {"code": 0, "data": {}})

    client.replace_image_block("docx_1", "block_1", "img_123", width=100, height=50)

    assert (
        mock_patch.call_args.args[0]
        == "https://open.feishu.cn/open-apis/docx/v1/documents/docx_1/blocks/block_1?document_revision_id=-1"
    )
    assert mock_patch.call_args.kwargs["json"] == {
        "replace_image": {
            "token": "img_123",
            "width": 100,
            "height": 50,
            "align": 2,
        }
    }


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


@patch("obshare_cli.core.api_client.prepare_markdown_for_upload", create=True)
def test_upload_document_backfills_media_after_import(mock_prepare):
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
    client.get_document_blocks = Mock(return_value=[{"block_type": 27, "block_id": "blk_1"}])
    client.upload_image_material = Mock(return_value="img_123")
    client.replace_image_block = Mock()
    client.delete_file = Mock(return_value=True)
    mock_prepare.return_value = PreparedMarkdown(
        processed_content="# processed",
        media_items=[
            PreparedMediaItem(
                kind="mermaid",
                display_name="mermaid-flowchart-0.png",
                position=0,
                base64_content="Zm9v",
            )
        ],
    )

    result = client.upload_document(
        "demo.md",
        "# original",
        "fld_123",
        source_path=Path("/tmp/demo.md"),
    )

    assert result.token == "docx_123"
    mock_prepare.assert_called_once()
    client.upload_temp_markdown_file.assert_called_once_with("demo.md", "# processed", "fld_123")
    client.upload_image_material.assert_called_once_with(
        "mermaid-flowchart-0.png",
        "Zm9v",
        "docx_123",
        "blk_1",
    )
    client.replace_image_block.assert_called_once_with("docx_123", "blk_1", "img_123")
    client.delete_file.assert_called_once_with("file_123", file_type="file")


@patch("obshare_cli.core.api_client.prepare_markdown_for_upload", create=True)
def test_upload_document_raises_when_media_count_mismatches_image_blocks(mock_prepare):
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
    client.get_document_blocks = Mock(return_value=[])
    client.delete_file = Mock(return_value=True)
    mock_prepare.return_value = PreparedMarkdown(
        processed_content="# processed",
        media_items=[
            PreparedMediaItem(
                kind="mermaid",
                display_name="mermaid-flowchart-0.png",
                position=0,
                base64_content="Zm9v",
            )
        ],
    )

    try:
        client.upload_document(
            "demo.md",
            "# original",
            "fld_123",
            source_path=Path("/tmp/demo.md"),
        )
    except Exception as exc:
        assert "Media backfill failed" in str(exc)
        assert "1 prepared media items but 0 image blocks" in str(exc)
    else:
        raise AssertionError("Expected media/image-block mismatch to fail upload")


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
