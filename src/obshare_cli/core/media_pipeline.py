"""Preprocess Markdown media references before Feishu upload."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from .converter import MarkdownConverter


_MERMAID_BLOCK_RE = re.compile(r"```mermaid\s*\n([\s\S]*?)\n```", re.MULTILINE)


@dataclass
class PreparedMediaItem:
    """A media item extracted from Markdown in source order."""

    kind: str
    display_name: str
    position: int
    source_path: Optional[Path] = None
    base64_content: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None


@dataclass
class PreparedMarkdown:
    """Processed Markdown plus the ordered media items to backfill later."""

    processed_content: str
    media_items: list[PreparedMediaItem]


def _resolve_local_path(raw_path: str, source_path: Path) -> Path:
    """Resolve a Markdown media path relative to the source document."""
    path = Path(raw_path)
    if path.is_absolute():
        resolved = path
    else:
        resolved = (source_path.parent / path).resolve()
    if not resolved.exists():
        raise FileNotFoundError(f"Local media file not found: {resolved}")
    return resolved


def _kind_for_path(path: Path) -> str:
    """Map a local asset path to its media kind."""
    if path.suffix.lower() == ".gif":
        return "local_gif"
    return "local_image"


def prepare_markdown_for_upload(content: str, source_path: Path, mermaid_renderer) -> PreparedMarkdown:
    """Prepare Markdown content and collect media items for later backfill."""
    source_path = Path(source_path)
    media_items: list[PreparedMediaItem] = []

    for image_info in MarkdownConverter.extract_images(content):
        resolved_path = _resolve_local_path(image_info["path"], source_path)
        media_items.append(
            PreparedMediaItem(
                kind=_kind_for_path(resolved_path),
                display_name=resolved_path.name,
                position=image_info["position"],
                source_path=resolved_path,
            )
        )

    mermaid_index = 0

    def replace_mermaid(match: re.Match[str]) -> str:
        nonlocal mermaid_index
        mermaid_content = match.group(1).strip()
        mermaid_type = MarkdownConverter.detect_mermaid_type(mermaid_content)
        display_name = f"mermaid-{mermaid_type}-{mermaid_index}.png"
        result = mermaid_renderer.render_mermaid_to_png(mermaid_content)
        if not result.success or not result.images:
            error = result.error or "Mermaid rendering failed."
            raise ValueError(error)

        image_info = result.images[0]
        media_items.append(
            PreparedMediaItem(
                kind="mermaid",
                display_name=display_name,
                position=match.start(),
                source_path=Path(image_info["png_path"]) if image_info.get("png_path") else None,
                base64_content=image_info.get("base64"),
                width=image_info.get("width"),
                height=image_info.get("height"),
            )
        )
        mermaid_index += 1
        return f"![{display_name}]({display_name})"

    processed_content = _MERMAID_BLOCK_RE.sub(replace_mermaid, content)
    media_items.sort(key=lambda item: item.position)
    return PreparedMarkdown(processed_content=processed_content, media_items=media_items)
