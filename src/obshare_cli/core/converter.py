"""Markdown conversion helpers for ObShare CLI."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import yaml


@dataclass
class MarkdownSegment:
    """A typed Markdown slice with source offsets."""

    kind: str
    text: str
    start: int
    end: int
    language: str = ""
    inner_text: str = ""


class MarkdownConverter:
    """Extract markdown structures used by the uploader pipeline."""

    _OBSIDIAN_IMAGE_RE = re.compile(r"!\[\[([^\]]+)\]\]")
    _MARKDOWN_IMAGE_RE = re.compile(
        r'!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)'
    )
    _MERMAID_RE = re.compile(r"```mermaid\s*\n([\s\S]*?)\n```", re.MULTILINE)
    _FENCED_BLOCK_RE = re.compile(
        r"^```([^\n`]*)[^\n]*\n([\s\S]*?)^```[ \t]*(?:\n|$)",
        re.MULTILINE,
    )
    _CALLOUT_RE = re.compile(
        r"^> \[!([A-Za-z]+)\][^\n]*\n((?:>.*(?:\n|$))*)",
        re.MULTILINE,
    )
    _YAML_RE = re.compile(r"^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)")

    @staticmethod
    def extract_images(content: str) -> List[Dict[str, Any]]:
        """Extract Obsidian and standard Markdown image references."""
        images: List[Dict[str, Any]] = []

        for segment in MarkdownConverter.iter_segments(content):
            if segment.kind != "text":
                continue
            images.extend(
                MarkdownConverter._extract_images_from_text(
                    MarkdownConverter._mask_non_parseable_inline_content(segment.text),
                    offset=segment.start,
                )
            )

        images.sort(key=lambda item: item["position"])
        return images

    @staticmethod
    def extract_mermaid(content: str) -> List[Dict[str, str]]:
        """Extract Mermaid fenced code blocks."""
        blocks: List[Dict[str, str]] = []
        for segment in MarkdownConverter.iter_segments(content):
            if segment.kind != "mermaid":
                continue
            block_content = segment.inner_text.strip()
            blocks.append(
                {
                    "content": block_content,
                    "type": MarkdownConverter.detect_mermaid_type(block_content),
                    "position": str(segment.start),
                }
            )
        return blocks

    @staticmethod
    def extract_mermaid_blocks(content: str) -> List[Dict[str, str]]:
        """Backward-compatible alias used by tests and callers."""
        return MarkdownConverter.extract_mermaid(content)

    @staticmethod
    def detect_mermaid_type(content: str) -> str:
        """Detect a Mermaid diagram family from its first line."""
        first_line = content.splitlines()[0].strip().lower() if content.strip() else ""
        if not first_line:
            return "diagram"

        keywords = [
            "flowchart",
            "graph",
            "sequencediagram",
            "classdiagram",
            "statediagram",
            "erdiagram",
            "gantt",
            "pie",
            "journey",
            "gitgraph",
        ]
        for keyword in keywords:
            if keyword in first_line:
                return keyword
        return "diagram"

    @staticmethod
    def extract_callouts(content: str) -> List[Dict[str, str]]:
        """Extract Obsidian-style callout blocks."""
        callouts: List[Dict[str, str]] = []
        for match in MarkdownConverter._CALLOUT_RE.finditer(content):
            raw_body = match.group(2)
            body_lines = []
            for line in raw_body.splitlines():
                if line.startswith("> "):
                    body_lines.append(line[2:])
                elif line.startswith(">"):
                    body_lines.append(line[1:].lstrip())

            callouts.append(
                {
                    "type": match.group(1).upper(),
                    "content": "\n".join(body_lines).strip(),
                    "original_text": match.group(0),
                }
            )
        return callouts

    @staticmethod
    def extract_yaml(content: str) -> Optional[Dict[str, Any]]:
        """Extract YAML frontmatter from markdown content."""
        match = MarkdownConverter._YAML_RE.search(content)
        if not match:
            return None

        parsed = yaml.safe_load(match.group(1))
        return parsed if isinstance(parsed, dict) else None

    @staticmethod
    def iter_segments(content: str) -> List[MarkdownSegment]:
        """Split Markdown into parseable text and fenced code regions."""
        segments: List[MarkdownSegment] = []
        cursor = 0

        for match in MarkdownConverter._FENCED_BLOCK_RE.finditer(content):
            if match.start() > cursor:
                segments.append(
                    MarkdownSegment(
                        kind="text",
                        text=content[cursor:match.start()],
                        start=cursor,
                        end=match.start(),
                    )
                )

            language = (match.group(1) or "").strip().lower()
            kind = "mermaid" if language == "mermaid" else "code_fence"
            segments.append(
                MarkdownSegment(
                    kind=kind,
                    text=match.group(0),
                    start=match.start(),
                    end=match.end(),
                    language=language,
                    inner_text=match.group(2),
                )
            )
            cursor = match.end()

        if cursor < len(content):
            segments.append(
                MarkdownSegment(
                    kind="text",
                    text=content[cursor:],
                    start=cursor,
                    end=len(content),
                )
            )

        return segments

    @staticmethod
    def _extract_images_from_text(content: str, offset: int = 0) -> List[Dict[str, Any]]:
        """Extract image syntax from a parseable text segment."""
        images: List[Dict[str, Any]] = []

        for match in MarkdownConverter._OBSIDIAN_IMAGE_RE.finditer(content):
            images.append(
                {
                    "type": "obsidian",
                    "path": match.group(1),
                    "position": offset + match.start(),
                }
            )

        for match in MarkdownConverter._MARKDOWN_IMAGE_RE.finditer(content):
            images.append(
                {
                    "type": "markdown",
                    "alt": match.group(1) or "",
                    "path": match.group(2),
                    "title": match.group(3),
                    "position": offset + match.start(),
                }
            )

        return images

    @staticmethod
    def _mask_non_parseable_inline_content(content: str) -> str:
        """Replace inline code spans and indented code lines with spaces."""
        masked = MarkdownConverter._mask_inline_code_spans(content)
        return MarkdownConverter._mask_indented_code_lines(masked)

    @staticmethod
    def _mask_inline_code_spans(content: str) -> str:
        """Mask inline code spans while preserving string length."""
        chars = list(content)
        index = 0

        while index < len(content):
            if content[index] != "`":
                index += 1
                continue

            tick_count = 1
            while index + tick_count < len(content) and content[index + tick_count] == "`":
                tick_count += 1

            closing = content.find("`" * tick_count, index + tick_count)
            if closing == -1:
                index += tick_count
                continue

            for position in range(index, closing + tick_count):
                chars[position] = " "
            index = closing + tick_count

        return "".join(chars)

    @staticmethod
    def _mask_indented_code_lines(content: str) -> str:
        """Mask indented code lines while preserving source offsets."""
        lines = content.splitlines(keepends=True)
        masked_lines: List[str] = []

        for line in lines:
            stripped = line.lstrip(" ")
            leading_spaces = len(line) - len(stripped)
            if line.startswith("\t") or leading_spaces >= 4:
                masked_lines.append(" " * len(line))
            else:
                masked_lines.append(line)

        return "".join(masked_lines)
