"""Tests for the Markdown media preprocessing pipeline."""

from __future__ import annotations

from pathlib import Path

from obshare_cli.core.media_pipeline import prepare_markdown_for_upload
from obshare_cli.utils.mermaid import MermaidConversionResult


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


def test_prepare_markdown_raises_when_local_asset_is_missing(tmp_path):
    source = tmp_path / "notes" / "demo.md"
    source.parent.mkdir(parents=True)

    content = "![Missing](missing.png)"

    try:
        prepare_markdown_for_upload(content, source, StubMermaidRenderer())
    except FileNotFoundError as exc:
        assert "missing.png" in str(exc)
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
