"""Tests for the Markdown media preprocessing pipeline."""

from __future__ import annotations

import json
from pathlib import Path

from obshare_cli.core.media_pipeline import prepare_markdown_for_upload
from obshare_cli.utils.mermaid import MermaidConversionResult, MermaidRenderer


class StubMermaidRenderer:
    """Simple renderer double that returns a deterministic PNG payload."""

    def render_mermaid_to_png(self, mermaid_content: str) -> MermaidConversionResult:
        return MermaidConversionResult(
            success=True,
            images=[
                {
                    "content": mermaid_content,
                    "file_name": "ignored-by-pipeline.png",
                    "base64": "ZmFrZS1wbmc=",
                    "png_path": "/tmp/ignored-by-pipeline.png",
                    "width": 640,
                    "height": 360,
                }
            ],
        )


class FailingMermaidRenderer:
    """Renderer double that always fails."""

    def render_mermaid_to_png(self, mermaid_content: str) -> MermaidConversionResult:
        return MermaidConversionResult(success=False, error="boom")


def test_prepare_markdown_replaces_mermaid_and_preserves_media_order(tmp_path):
    source = tmp_path / "notes" / "demo.md"
    source.parent.mkdir(parents=True)
    (source.parent / "photo.png").write_bytes(b"png")
    (source.parent / "clip.gif").write_bytes(b"gif")

    content = """
![Config](photo.png)
![[clip.gif]]
```mermaid
flowchart TD
    A --> B
```
"""

    result = prepare_markdown_for_upload(content, source, StubMermaidRenderer())

    assert [item.kind for item in result.media_items] == [
        "local_image",
        "local_gif",
        "mermaid",
    ]
    assert result.media_items[0].display_name == "photo.png"
    assert result.media_items[1].display_name == "clip.gif"
    assert result.media_items[2].display_name == "mermaid-flowchart-0.png"
    assert "```mermaid" not in result.processed_content
    assert "![mermaid-flowchart-0.png](mermaid-flowchart-0.png)" in result.processed_content


def test_prepare_markdown_resolves_local_paths_relative_to_source(tmp_path):
    source = tmp_path / "vault" / "docs" / "demo.md"
    source.parent.mkdir(parents=True)
    image_dir = source.parent / "images"
    asset_dir = source.parent / "assets"
    image_dir.mkdir()
    asset_dir.mkdir()
    (image_dir / "diagram.png").write_bytes(b"png")
    (asset_dir / "walkthrough.gif").write_bytes(b"gif")

    content = """
![Diagram](./images/diagram.png)
![[assets/walkthrough.gif]]
"""

    result = prepare_markdown_for_upload(content, source, StubMermaidRenderer())

    assert result.media_items[0].source_path == image_dir / "diagram.png"
    assert result.media_items[1].source_path == asset_dir / "walkthrough.gif"


def test_prepare_markdown_resolves_from_custom_attachment_plugin_config(tmp_path):
    vault = tmp_path / "vault"
    source = vault / "notes" / "demo.md"
    source.parent.mkdir(parents=True)
    plugin_dir = (
        vault
        / ".obsidian"
        / "plugins"
        / "obsidian-custom-attachment-location"
    )
    plugin_dir.mkdir(parents=True)
    attachment_dir = source.parent / "assets" / source.stem
    attachment_dir.mkdir(parents=True)
    image_path = attachment_dir / "{ABC-123}.png"
    image_path.write_bytes(b"png")
    (plugin_dir / "data.json").write_text(
        json.dumps({"attachmentFolderPath": "./assets/${noteFileName}"}),
        encoding="utf-8",
    )

    result = prepare_markdown_for_upload(
        "![Plugin Asset]({ABC-123}.png)",
        source,
        StubMermaidRenderer(),
    )

    assert result.media_items[0].source_path == image_path


def test_prepare_markdown_resolves_from_obsidian_app_config(tmp_path):
    vault = tmp_path / "vault"
    source = vault / "docs" / "demo.md"
    source.parent.mkdir(parents=True)
    obsidian_dir = vault / ".obsidian"
    obsidian_dir.mkdir(parents=True)
    attachment_dir = vault / "attachments"
    attachment_dir.mkdir()
    image_path = attachment_dir / "shared.png"
    image_path.write_bytes(b"png")
    (obsidian_dir / "app.json").write_text(
        json.dumps({"attachmentFolderPath": "attachments"}),
        encoding="utf-8",
    )

    result = prepare_markdown_for_upload(
        "![Shared](shared.png)",
        source,
        StubMermaidRenderer(),
    )

    assert result.media_items[0].source_path == image_path


def test_prepare_markdown_falls_back_to_note_named_subfolder(tmp_path):
    source = tmp_path / "vault" / "posts" / "demo.md"
    source.parent.mkdir(parents=True)
    attachment_dir = source.parent / source.stem
    attachment_dir.mkdir()
    image_path = attachment_dir / "nested.png"
    image_path.write_bytes(b"png")

    result = prepare_markdown_for_upload(
        "![Nested](nested.png)",
        source,
        StubMermaidRenderer(),
    )

    assert result.media_items[0].source_path == image_path


def test_prepare_markdown_normalizes_obsidian_wikilink_media_path(tmp_path):
    source = tmp_path / "notes" / "demo.md"
    source.parent.mkdir(parents=True)
    image_path = source.parent / "photo.png"
    image_path.write_bytes(b"png")

    result = prepare_markdown_for_upload(
        "![[photo.png|100]]",
        source,
        StubMermaidRenderer(),
    )

    assert result.media_items[0].source_path == image_path


def test_prepare_markdown_raises_when_local_asset_is_missing(tmp_path):
    source = tmp_path / "notes" / "demo.md"
    source.parent.mkdir(parents=True)

    content = "![Missing](missing.png)"

    try:
        prepare_markdown_for_upload(content, source, StubMermaidRenderer())
    except FileNotFoundError as exc:
        assert "missing.png" in str(exc)
        assert str(source) in str(exc)
    else:
        raise AssertionError("Expected missing local asset to raise FileNotFoundError")


def test_prepare_markdown_raises_when_mermaid_render_fails(tmp_path):
    source = tmp_path / "notes" / "demo.md"
    source.parent.mkdir(parents=True)

    content = """
```mermaid
flowchart TD
    A --> B
```
"""

    try:
        prepare_markdown_for_upload(content, source, FailingMermaidRenderer())
    except ValueError as exc:
        assert "boom" in str(exc)
    else:
        raise AssertionError("Expected Mermaid render failure to raise ValueError")


def test_prepare_markdown_reads_mermaid_png_path_from_bridge_output(tmp_path):
    source = tmp_path / "notes" / "demo.md"
    source.parent.mkdir(parents=True)
    output_png = tmp_path / "rendered-mermaid.png"
    output_png.write_bytes(b"bridge-png")

    class BridgeMermaidRenderer:
        def render_mermaid_to_png(self, mermaid_content: str) -> MermaidConversionResult:
            return MermaidConversionResult(
                success=True,
                images=[
                    {
                        "content": mermaid_content,
                        "file_name": output_png.name,
                        "png_path": str(output_png),
                        "width": 1024,
                        "height": 768,
                    }
                ],
            )

    content = """
```mermaid
flowchart TD
    A --> B
```
"""

    result = prepare_markdown_for_upload(content, source, BridgeMermaidRenderer())

    assert result.media_items[0].kind == "mermaid"
    assert result.media_items[0].source_path == output_png
    assert result.media_items[0].base64_content is None
    assert result.media_items[0].width == 1024
    assert result.media_items[0].height == 768


def test_prepare_markdown_without_mermaid_does_not_require_bridge(tmp_path):
    source = tmp_path / "notes" / "demo.md"
    source.parent.mkdir(parents=True)
    image_path = source.parent / "photo.png"
    image_path.write_bytes(b"png")

    result = prepare_markdown_for_upload(
        "![Photo](photo.png)",
        source,
        MermaidRenderer(),
    )

    assert len(result.media_items) == 1
    assert result.media_items[0].source_path == image_path


def test_prepare_markdown_resolves_plugin_format_note_subfolder_path(tmp_path):
    vault = tmp_path / "vault"
    source = vault / "notes" / "demo.md"
    source.parent.mkdir(parents=True)
    plugin_dir = (
        vault
        / ".obsidian"
        / "plugins"
        / "obsidian-custom-attachment-location"
    )
    plugin_dir.mkdir(parents=True)
    attachment_dir = source.parent / source.stem
    attachment_dir.mkdir()
    image_path = attachment_dir / "file-20260318120000000.png"
    image_path.write_bytes(b"png")
    (plugin_dir / "data.json").write_text(
        json.dumps(
            {
                "attachmentFolderPath": "./${noteFileName}",
                "markdownUrlFormat": "./${noteFileName}/${generatedAttachmentFileName}",
                "generatedAttachmentFileName": "file-${date:YYYYMMDDHHmmssSSS}",
            }
        ),
        encoding="utf-8",
    )

    result = prepare_markdown_for_upload(
        "![Plugin Asset](./demo/file-20260318120000000.png)",
        source,
        StubMermaidRenderer(),
    )

    assert result.media_items[0].source_path == image_path


def test_prepare_markdown_resolves_plugin_format_assets_note_subfolder_path(tmp_path):
    vault = tmp_path / "vault"
    source = vault / "notes" / "demo.md"
    source.parent.mkdir(parents=True)
    plugin_dir = (
        vault
        / ".obsidian"
        / "plugins"
        / "obsidian-custom-attachment-location"
    )
    plugin_dir.mkdir(parents=True)
    attachment_dir = vault / "assets" / source.stem
    attachment_dir.mkdir(parents=True)
    image_path = attachment_dir / "file-20260318120000000.png"
    image_path.write_bytes(b"png")
    (plugin_dir / "data.json").write_text(
        json.dumps(
            {
                "attachmentFolderPath": "assets/${noteFileName}",
                "markdownUrlFormat": "assets/${noteFileName}/${generatedAttachmentFileName}",
                "generatedAttachmentFileName": "file-${date:YYYYMMDDHHmmssSSS}",
            }
        ),
        encoding="utf-8",
    )

    result = prepare_markdown_for_upload(
        "![Plugin Asset](assets/demo/file-20260318120000000.png)",
        source,
        StubMermaidRenderer(),
    )

    assert result.media_items[0].source_path == image_path


def test_prepare_markdown_resolves_plugin_format_shared_assets_path(tmp_path):
    vault = tmp_path / "vault"
    source = vault / "notes" / "demo.md"
    source.parent.mkdir(parents=True)
    plugin_dir = (
        vault
        / ".obsidian"
        / "plugins"
        / "obsidian-custom-attachment-location"
    )
    plugin_dir.mkdir(parents=True)
    attachment_dir = vault / "assets"
    attachment_dir.mkdir(parents=True)
    image_path = attachment_dir / "file-20260318120000000.png"
    image_path.write_bytes(b"png")
    (plugin_dir / "data.json").write_text(
        json.dumps(
            {
                "attachmentFolderPath": "assets",
                "markdownUrlFormat": "assets/${generatedAttachmentFileName}",
                "generatedAttachmentFileName": "file-${date:YYYYMMDDHHmmssSSS}",
            }
        ),
        encoding="utf-8",
    )

    result = prepare_markdown_for_upload(
        "![Plugin Asset](assets/file-20260318120000000.png)",
        source,
        StubMermaidRenderer(),
    )

    assert result.media_items[0].source_path == image_path


def test_prepare_markdown_decodes_uri_encoded_media_paths(tmp_path):
    source = tmp_path / "notes" / "demo.md"
    source.parent.mkdir(parents=True)
    image_path = source.parent / "你好 世界.png"
    image_path.write_bytes(b"png")

    result = prepare_markdown_for_upload(
        "![Encoded](%E4%BD%A0%E5%A5%BD%20%E4%B8%96%E7%95%8C.png)",
        source,
        StubMermaidRenderer(),
    )

    assert result.media_items[0].source_path == image_path


def test_prepare_markdown_falls_back_to_vault_wide_filename_search(tmp_path):
    vault = tmp_path / "vault"
    source = vault / "notes" / "demo.md"
    source.parent.mkdir(parents=True)
    (vault / ".obsidian").mkdir()
    image_path = vault / "assets" / "shared.png"
    image_path.parent.mkdir(parents=True)
    image_path.write_bytes(b"png")

    result = prepare_markdown_for_upload(
        "![Shared](shared.png)",
        source,
        StubMermaidRenderer(),
    )

    assert result.media_items[0].source_path == image_path


def test_prepare_markdown_prefers_nearest_vault_match(tmp_path):
    vault = tmp_path / "vault"
    source = vault / "posts" / "topic" / "demo.md"
    source.parent.mkdir(parents=True)
    (vault / ".obsidian").mkdir()

    nearest = vault / "posts" / "topic" / "images" / "shared.png"
    farther = vault / "archive" / "images" / "shared.png"
    nearest.parent.mkdir(parents=True)
    farther.parent.mkdir(parents=True)
    nearest.write_bytes(b"nearest")
    farther.write_bytes(b"farther")

    result = prepare_markdown_for_upload(
        "![Shared](shared.png)",
        source,
        StubMermaidRenderer(),
    )

    assert result.media_items[0].source_path == nearest


def test_prepare_markdown_raises_for_ambiguous_vault_matches(tmp_path):
    vault = tmp_path / "vault"
    source = vault / "notes" / "demo.md"
    source.parent.mkdir(parents=True)
    (vault / ".obsidian").mkdir()

    candidate_one = vault / "branch-a" / "shared.png"
    candidate_two = vault / "branch-b" / "shared.png"
    candidate_one.parent.mkdir(parents=True)
    candidate_two.parent.mkdir(parents=True)
    candidate_one.write_bytes(b"one")
    candidate_two.write_bytes(b"two")

    try:
        prepare_markdown_for_upload(
            "![Shared](shared.png)",
            source,
            StubMermaidRenderer(),
        )
    except ValueError as exc:
        assert "Ambiguous local media file" in str(exc)
        assert str(candidate_one) in str(exc)
        assert str(candidate_two) in str(exc)
    else:
        raise AssertionError("Expected ambiguous vault matches to raise ValueError")


def test_prepare_markdown_ignores_image_syntax_inside_code_fences(tmp_path):
    source = tmp_path / "notes" / "demo.md"
    source.parent.mkdir(parents=True)
    real_image = source.parent / "real.png"
    real_image.write_bytes(b"png")

    content = """
```python
print(\"![fake](fake.png)\")
```
![Real](real.png)
"""

    result = prepare_markdown_for_upload(content, source, StubMermaidRenderer())

    assert len(result.media_items) == 1
    assert result.media_items[0].source_path == real_image


def test_prepare_markdown_ignores_image_syntax_inside_inline_code(tmp_path):
    source = tmp_path / "notes" / "demo.md"
    source.parent.mkdir(parents=True)
    real_image = source.parent / "real.png"
    real_image.write_bytes(b"png")

    content = "Use `![[fake.png]]` as an example, then embed ![[real.png]]."

    result = prepare_markdown_for_upload(content, source, StubMermaidRenderer())

    assert len(result.media_items) == 1
    assert result.media_items[0].source_path == real_image


def test_prepare_markdown_extracts_mermaid_but_ignores_other_fences(tmp_path):
    source = tmp_path / "notes" / "demo.md"
    source.parent.mkdir(parents=True)
    real_image = source.parent / "real.png"
    real_image.write_bytes(b"png")

    content = """
```bash
cat <<'EOF'
![[fake.png]]
EOF
```

```mermaid
flowchart TD
    A --> B
```

![Real](real.png)
"""

    result = prepare_markdown_for_upload(content, source, StubMermaidRenderer())

    assert [item.kind for item in result.media_items] == ["mermaid", "local_image"]
    assert result.media_items[1].source_path == real_image
