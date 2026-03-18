"""Mermaid diagram rendering helpers for ObShare CLI."""

from __future__ import annotations

import base64
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from ..core.obsidian_bridge import ObsidianMermaidBridge


@dataclass
class MermaidConversionResult:
    """Result of converting Mermaid content into images."""

    success: bool
    images: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None


class MermaidRenderer:
    """Render Mermaid diagrams through the Obsidian companion bridge."""

    def __init__(
        self,
        executable: Optional[str] = None,
        bridge: Optional[ObsidianMermaidBridge] = None,
    ):
        self._executable = executable
        self._bridge = bridge

    def is_installed(self) -> bool:
        """Return whether the Obsidian companion bridge is available."""
        return self._bridge is not None

    def render_mermaid_to_png(self, mermaid_content: str) -> MermaidConversionResult:
        """Render Mermaid content to a PNG image through the companion bridge."""
        if self._bridge:
            return self._render_with_bridge(mermaid_content)
        return MermaidConversionResult(
            success=False,
            error=(
                "Obsidian companion bridge is required for Mermaid rendering. "
                "Configure `obsidian_cli_command` and `obsidian_bridge_dir` first."
            ),
        )

    def _render_with_bridge(self, mermaid_content: str) -> MermaidConversionResult:
        """Render Mermaid content through the Obsidian companion bridge."""
        try:
            diagram_type = self._detect_diagram_type(mermaid_content)
            result = self._bridge.render_mermaid(
                mermaid_content,
                diagram_type,
                output_name=f"mermaid-{diagram_type}.png",
            )
            image_bytes = result.png_path.read_bytes()
            return MermaidConversionResult(
                success=True,
                images=[
                    {
                        "content": mermaid_content,
                        "file_name": result.png_path.name,
                        "base64": base64.b64encode(image_bytes).decode("ascii"),
                        "png_path": str(result.png_path),
                        "width": result.width,
                        "height": result.height,
                    }
                ],
            )
        except Exception as exc:
            return MermaidConversionResult(success=False, error=str(exc))

    @staticmethod
    def _detect_diagram_type(mermaid_content: str) -> str:
        """Infer the Mermaid diagram type from the first non-empty line."""
        for line in mermaid_content.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            return stripped.split()[0].split("-")[0]
        return "mermaid"
