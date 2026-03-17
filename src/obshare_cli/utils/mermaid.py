"""Mermaid diagram rendering helpers for ObShare CLI."""

from __future__ import annotations

import base64
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class MermaidConversionResult:
    """Result of converting Mermaid content into images."""

    success: bool
    images: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None


class MermaidRenderer:
    """Render Mermaid diagrams through the optional `mmdc` CLI."""

    def __init__(self, executable: Optional[str] = None):
        self._executable = executable or shutil.which("mmdc")

    def is_installed(self) -> bool:
        """Return whether the Mermaid CLI is available."""
        return bool(self._executable)

    def render_mermaid_to_png(self, mermaid_content: str) -> MermaidConversionResult:
        """Render Mermaid content to a PNG image when `mmdc` is available."""
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
