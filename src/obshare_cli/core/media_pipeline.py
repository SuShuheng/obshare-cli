"""Preprocess Markdown media references before Feishu upload."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from urllib.parse import unquote

from .converter import MarkdownConverter


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
    vault_root = _find_vault_root(Path(source_path).parent)

    for candidate in candidates:
        if candidate.exists():
            return candidate

    vault_match = _search_vault_for_media(
        normalized_path,
        Path(source_path),
        vault_root,
    )
    if vault_match is not None:
        return vault_match

    tried_paths = ", ".join(str(path) for path in candidates[:6])
    raise FileNotFoundError(
        "Local media file not found "
        f"for '{raw_path}' from '{source_path}': tried {tried_paths}"
    )


def _normalize_media_reference(raw_path: str) -> str:
    """Strip Obsidian display metadata from a media reference."""
    normalized = unquote(raw_path.strip()).replace("\\", "/")
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
                _load_attachment_config(plugin_config_path),
                source_path,
                vault_root,
                normalized_path,
            )
        )

    app_config_path = vault_root / ".obsidian" / "app.json" if vault_root else None
    if app_config_path:
        candidates.extend(
            _paths_from_attachment_config(
                _load_attachment_config(app_config_path),
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


def _load_attachment_config(config_path: Path) -> dict[str, str]:
    """Read the attachment resolver settings from an Obsidian JSON config file."""
    if not config_path.exists():
        return {}
    try:
        data = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}

    config: dict[str, str] = {}
    for key in (
        "attachmentFolderPath",
        "markdownUrlFormat",
        "generatedAttachmentFileName",
    ):
        value = data.get(key)
        if isinstance(value, str):
            config[key] = value
    return config


def _paths_from_attachment_config(
    attachment_config: dict[str, str],
    source_path: Path,
    vault_root: Optional[Path],
    normalized_path: str,
) -> list[Path]:
    """Build candidate paths from a configured attachment folder."""
    attachment_folder = attachment_config.get("attachmentFolderPath")
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
    candidates = [
        (resolved_folder / file_name).resolve(),
        (resolved_folder / normalized).resolve(),
    ]

    markdown_url_format = attachment_config.get("markdownUrlFormat")
    if markdown_url_format:
        configured_reference = _normalize_media_reference(
            _expand_markdown_template(
                markdown_url_format,
                source_path,
                file_name,
            )
        )
        if normalized_path == configured_reference or normalized_path == file_name:
            candidates.append((resolved_folder / file_name).resolve())

    return _dedupe_paths(candidates)


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


def _expand_markdown_template(
    template: str,
    source_path: Path,
    generated_file_name: str,
) -> str:
    """Expand the common attachment plugin URL template variables."""
    return (
        template.replace("${noteFileName}", source_path.stem)
        .replace("${generatedAttachmentFileName}", generated_file_name)
        .replace("\\", "/")
    )


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


def _search_vault_for_media(
    normalized_path: str,
    source_path: Path,
    vault_root: Optional[Path],
) -> Optional[Path]:
    """Search the vault for a matching media file when direct lookup fails."""
    if vault_root is None or not vault_root.exists():
        return None

    file_name = Path(normalized_path).name
    file_stem = Path(normalized_path).stem
    exact_relative = normalized_path.lstrip("./")
    all_files = [path.resolve() for path in vault_root.rglob("*") if path.is_file()]

    exact_matches = [
        path for path in all_files
        if path.relative_to(vault_root).as_posix() == exact_relative
    ]
    if exact_matches:
        return _select_best_vault_match(exact_matches, source_path)

    same_name_matches = [path for path in all_files if path.name == file_name]
    if same_name_matches:
        return _select_best_vault_match(same_name_matches, source_path)

    if "." not in file_name:
        stem_matches = [path for path in all_files if path.stem == file_stem]
        if stem_matches:
            return _select_best_vault_match(stem_matches, source_path)

    return None


def _select_best_vault_match(candidates: list[Path], source_path: Path) -> Path:
    """Pick the nearest vault match or raise if multiple are equally good."""
    ranked_candidates = sorted(
        (( _path_distance(source_path.parent, path.parent), str(path), path) for path in candidates),
        key=lambda item: (item[0], item[1]),
    )
    best_distance = ranked_candidates[0][0]
    best_candidates = [item[2] for item in ranked_candidates if item[0] == best_distance]

    if len(best_candidates) > 1:
        candidate_list = ", ".join(str(path) for path in best_candidates)
        raise ValueError(
            "Ambiguous local media file matches in vault: "
            f"{candidate_list}"
        )

    return best_candidates[0]


def _path_distance(source_dir: Path, target_dir: Path) -> int:
    """Measure directory distance using the shortest up/down path length."""
    source_parts = source_dir.resolve().parts
    target_parts = target_dir.resolve().parts
    common_length = 0

    for source_part, target_part in zip(source_parts, target_parts):
        if source_part != target_part:
            break
        common_length += 1

    return (len(source_parts) - common_length) + (len(target_parts) - common_length)


def _kind_for_path(path: Path) -> str:
    """Map a local asset path to its media kind."""
    if path.suffix.lower() == ".gif":
        return "local_gif"
    return "local_image"


def _placeholder_markdown_for_path(path: Path) -> str:
    """Build a standard Markdown image placeholder for a local media file."""
    return f"![{path.name}]({path.name})"


def prepare_markdown_for_upload(content: str, source_path: Path, mermaid_renderer) -> PreparedMarkdown:
    """Prepare Markdown content and collect media items for later backfill."""
    source_path = Path(source_path)
    media_items: list[PreparedMediaItem] = []
    mermaid_index = 0
    processed_parts: list[str] = []

    def render_mermaid(segment_start: int, mermaid_content: str) -> str:
        nonlocal mermaid_index
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
                position=segment_start,
                source_path=Path(image_info["png_path"]) if image_info.get("png_path") else None,
                base64_content=image_info.get("base64"),
                width=image_info.get("width"),
                height=image_info.get("height"),
            )
        )
        mermaid_index += 1
        return f"![{display_name}]({display_name})"

    for segment in MarkdownConverter.iter_segments(content):
        if segment.kind == "text":
            text_images = MarkdownConverter.extract_images(segment.text)
            if not text_images:
                processed_parts.append(segment.text)
                continue

            rewritten_text_parts: list[str] = []
            cursor = 0
            for image_info in text_images:
                resolved_path = _resolve_local_path(image_info["path"], source_path)
                media_items.append(
                    PreparedMediaItem(
                        kind=_kind_for_path(resolved_path),
                        display_name=resolved_path.name,
                        position=segment.start + image_info["position"],
                        source_path=resolved_path,
                    )
                )
                start = image_info["position"]
                end = image_info["end"]
                rewritten_text_parts.append(segment.text[cursor:start])
                if image_info["type"] == "obsidian":
                    rewritten_text_parts.append(
                        _placeholder_markdown_for_path(resolved_path)
                    )
                else:
                    rewritten_text_parts.append(segment.text[start:end])
                cursor = end
            rewritten_text_parts.append(segment.text[cursor:])
            processed_parts.append("".join(rewritten_text_parts))
            continue

        if segment.kind == "mermaid":
            processed_parts.append(
                render_mermaid(segment.start, segment.inner_text.strip())
            )
            continue

        processed_parts.append(segment.text)

    processed_content = "".join(processed_parts)
    media_items.sort(key=lambda item: item.position)
    return PreparedMarkdown(processed_content=processed_content, media_items=media_items)
