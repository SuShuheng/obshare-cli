"""Mermaid diagram rendering helpers for ObShare CLI."""

from __future__ import annotations

import base64
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..core.obsidian_bridge import ObsidianMermaidBridge


@dataclass
class MermaidConversionResult:
    """Result of converting Mermaid content into images."""

    success: bool
    images: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None


class MermaidRenderer:
    """Render Mermaid diagrams through the optional `mmdc` CLI."""

    def __init__(
        self,
        executable: Optional[str] = None,
        bridge: Optional[ObsidianMermaidBridge] = None,
    ):
        self._executable = executable or shutil.which("mmdc")
        self._bridge = bridge

    def is_installed(self) -> bool:
        """Return whether the Mermaid CLI is available."""
        return bool(self._executable and Path(self._executable).exists())

    def render_mermaid_to_png(self, mermaid_content: str) -> MermaidConversionResult:
        """Render Mermaid content to a PNG image when `mmdc` is available."""
        if self._bridge:
            return self._render_with_bridge(mermaid_content)
        if not self.is_installed():
            return MermaidConversionResult(
                success=False,
                error="Mermaid CLI not installed. Install `mmdc` to enable rendering.",
            )

        with tempfile.TemporaryDirectory(prefix="obshare-mermaid-") as tmpdir:
            tmp_path = Path(tmpdir)
            input_path = tmp_path / "diagram.mmd"
            output_path = tmp_path / "diagram.png"

            input_path.write_text(mermaid_content, encoding="utf-8")

            try:
                completed = subprocess.run(
                    [self._executable, "-i", str(input_path), "-o", str(output_path)],
                    check=False,
                    capture_output=True,
                    text=True,
                )
            except OSError as exc:
                return MermaidConversionResult(success=False, error=str(exc))

            if completed.returncode != 0 or not output_path.exists():
                stderr = completed.stderr.strip() or completed.stdout.strip()
                return MermaidConversionResult(
                    success=False,
                    error=stderr or "Mermaid rendering failed.",
                )

            image_bytes = output_path.read_bytes()
            return MermaidConversionResult(
                success=True,
                images=[
                    {
                        "content": mermaid_content,
                        "file_name": output_path.name,
                        "base64": base64.b64encode(image_bytes).decode("ascii"),
                        "width": None,
                        "height": None,
                    }
                ],
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
