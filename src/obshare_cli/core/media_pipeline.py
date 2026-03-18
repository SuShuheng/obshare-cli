"""Preprocess Markdown media references before Feishu upload."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from .converter import MarkdownConverter


_MERMAID_BLOCK_RE = re.compile(r"```mermaid\s*\n([\s\S]*?)\n```", re.MULTILINE)
_WINDOWS_ABSOLUTE_RE = re.compile(r"^[A-Za-z]:[\\/]")


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
    normalized_path = _normalize_media_reference(raw_path)
    candidates = _build_candidate_paths(normalized_path, source_path)

    for candidate in candidates:
        if candidate.exists():
            return candidate

    tried_paths = ", ".join(str(path) for path in candidates[:6])
    raise FileNotFoundError(
        "Local media file not found "
        f"for '{raw_path}' from '{source_path}': tried {tried_paths}"
    )


def _normalize_media_reference(raw_path: str) -> str:
    """Strip Obsidian display metadata from a media reference."""
    normalized = raw_path.strip().replace("\\", "/")
    normalized = normalized.split("|", 1)[0]
    normalized = normalized.split("#", 1)[0]
    return normalized.strip()


def _build_candidate_paths(normalized_path: str, source_path: Path) -> list[Path]:
    """Generate candidate local file paths in priority order."""
    source_path = Path(source_path)
    vault_root = _find_vault_root(source_path.parent)
    note_name = source_path.stem
    normalized = Path(normalized_path)
    file_name = Path(normalized_path).name
    candidates: list[Path] = []

    if normalized.is_absolute() or _WINDOWS_ABSOLUTE_RE.match(normalized_path):
        candidates.append(Path(normalized_path))
    else:
        candidates.append((source_path.parent / normalized).resolve())

    plugin_config_path = (
        vault_root
        / ".obsidian"
        / "plugins"
        / "obsidian-custom-attachment-location"
        / "data.json"
        if vault_root
        else None
    )
    if plugin_config_path:
        candidates.extend(
            _paths_from_attachment_config(
                _load_attachment_folder_setting(plugin_config_path),
                source_path,
                vault_root,
                normalized_path,
            )
        )

    app_config_path = vault_root / ".obsidian" / "app.json" if vault_root else None
    if app_config_path:
        candidates.extend(
            _paths_from_attachment_config(
                _load_attachment_folder_setting(app_config_path),
                source_path,
                vault_root,
                normalized_path,
            )
        )

    candidates.extend(
        [
            (source_path.parent / note_name / file_name).resolve(),
            (source_path.parent / "attachments" / file_name).resolve(),
            (source_path.parent / note_name / "attachments" / file_name).resolve(),
        ]
    )
    if vault_root:
        candidates.append((vault_root / "attachments" / file_name).resolve())

    return _dedupe_paths(candidates)


def _find_vault_root(start_dir: Path) -> Optional[Path]:
    """Walk upward until a directory containing .obsidian is found."""
    current = start_dir.resolve()
    for directory in [current, *current.parents]:
        if (directory / ".obsidian").is_dir():
            return directory
    return None


def _load_attachment_folder_setting(config_path: Path) -> Optional[str]:
    """Read attachmentFolderPath from an Obsidian JSON config file."""
    if not config_path.exists():
        return None
    try:
        data = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    attachment_folder = data.get("attachmentFolderPath")
    return attachment_folder if isinstance(attachment_folder, str) else None


def _paths_from_attachment_config(
    attachment_folder: Optional[str],
    source_path: Path,
    vault_root: Optional[Path],
    normalized_path: str,
) -> list[Path]:
    """Build candidate paths from a configured attachment folder."""
    if not attachment_folder:
        return []

    resolved_folder = _resolve_attachment_folder(
        attachment_folder,
        source_path,
        vault_root,
    )
    if resolved_folder is None:
        return []

    normalized = Path(normalized_path)
    file_name = normalized.name
    return _dedupe_paths(
        [
            (resolved_folder / file_name).resolve(),
            (resolved_folder / normalized).resolve(),
        ]
    )


def _resolve_attachment_folder(
    attachment_folder: str,
    source_path: Path,
    vault_root: Optional[Path],
) -> Optional[Path]:
    """Resolve an Obsidian attachment folder template into a concrete path."""
    expanded = attachment_folder.replace("${noteFileName}", source_path.stem).replace(
        "\\",
        "/",
    )

    if not expanded:
        return None

    if _WINDOWS_ABSOLUTE_RE.match(expanded):
        return Path(expanded)

    path = Path(expanded)
    if path.is_absolute():
        return path

    if expanded.startswith("./"):
        return (source_path.parent / expanded[2:]).resolve()

    if expanded.startswith("../"):
        return (source_path.parent / path).resolve()

    if vault_root:
        return (vault_root / path).resolve()

    return (source_path.parent / path).resolve()


def _dedupe_paths(paths: list[Path]) -> list[Path]:
    """Preserve order while removing duplicate candidate paths."""
    unique_paths: list[Path] = []
    seen: set[str] = set()
    for path in paths:
        key = str(path)
        if key in seen:
            continue
        seen.add(key)
        unique_paths.append(path)
    return unique_paths


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
