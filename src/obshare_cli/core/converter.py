"""Markdown conversion helpers for ObShare CLI."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

import yaml


class MarkdownConverter:
    """Extract markdown structures used by the uploader pipeline."""

    _OBSIDIAN_IMAGE_RE = re.compile(r"!\[\[([^\]]+)\]\]")
    _MARKDOWN_IMAGE_RE = re.compile(
        r'!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)'
    )
    _MERMAID_RE = re.compile(r"```mermaid\s*\n([\s\S]*?)\n```", re.MULTILINE)
    _CALLOUT_RE = re.compile(
        r"^> \[!([A-Za-z]+)\][^\n]*\n((?:>.*(?:\n|$))*)",
        re.MULTILINE,
    )
    _YAML_RE = re.compile(r"^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)")

    @staticmethod
    def extract_images(content: str) -> List[Dict[str, Any]]:
        """Extract Obsidian and standard Markdown image references."""
        images: List[Dict[str, Any]] = []

        for match in MarkdownConverter._OBSIDIAN_IMAGE_RE.finditer(content):
            images.append(
                {
                    "type": "obsidian",
                    "path": match.group(1),
                    "position": match.start(),
                }
            )

        for match in MarkdownConverter._MARKDOWN_IMAGE_RE.finditer(content):
            images.append(
                {
                    "type": "markdown",
                    "alt": match.group(1) or "",
                    "path": match.group(2),
                    "title": match.group(3),
                    "position": match.start(),
                }
            )

        images.sort(key=lambda item: item["position"])
        return images

    @staticmethod
    def extract_mermaid(content: str) -> List[Dict[str, str]]:
        """Extract Mermaid fenced code blocks."""
        blocks: List[Dict[str, str]] = []
        for match in MarkdownConverter._MERMAID_RE.finditer(content):
            block_content = match.group(1).strip()
            blocks.append(
                {
                    "content": block_content,
                    "type": MarkdownConverter.detect_mermaid_type(block_content),
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
