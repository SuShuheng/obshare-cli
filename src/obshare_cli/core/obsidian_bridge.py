"""File-based bridge for Mermaid rendering through Obsidian CLI."""

from __future__ import annotations

import json
import subprocess
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from .config import DEFAULT_OBSIDIAN_RENDER_COMMAND_ID


@dataclass
class MermaidBridgeResult:
    """Metadata returned by the Obsidian companion renderer."""

    png_path: Path
    width: Optional[int] = None
    height: Optional[int] = None


class ObsidianMermaidBridge:
    """Trigger an Obsidian companion command through a request/result bridge."""

    def __init__(
        self,
        cli_command: Optional[list[str]] = None,
        bridge_dir: Optional[Path] = None,
        command_id: str = DEFAULT_OBSIDIAN_RENDER_COMMAND_ID,
        poll_interval: float = 0.1,
        timeout: float = 15.0,
    ):
        self.cli_command = cli_command or ["obsidian"]
        self.bridge_dir = Path(bridge_dir or ".obshare-obsidian-bridge")
        self.command_id = command_id
        self.poll_interval = poll_interval
        self.timeout = timeout

    def render_mermaid(
        self,
        mermaid_content: str,
        diagram_type: str,
        output_name: Optional[str] = None,
    ) -> MermaidBridgeResult:
        """Write a render request, invoke Obsidian CLI, and wait for a result."""
        self.bridge_dir.mkdir(parents=True, exist_ok=True)

        request_id = uuid.uuid4().hex
        request_path = self.bridge_dir / f"{request_id}.request.json"
        result_path = self.bridge_dir / f"{request_id}.result.json"
        output_name = output_name or f"{request_id}.png"
        output_png_path = self.bridge_dir / output_name

        request_path.write_text(
            json.dumps(
                {
                    "requestId": request_id,
                    "diagramType": diagram_type,
                    "mermaid": mermaid_content,
                    "outputName": output_name,
                    "outputPngPath": str(output_png_path),
                    "resultPath": str(result_path),
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        completed = subprocess.run(
            [*self.cli_command, "command", f"id={self.command_id}"],
            check=False,
            capture_output=True,
            text=True,
        )
        if completed.returncode != 0:
            stderr = completed.stderr.strip() or completed.stdout.strip()
            raise RuntimeError(stderr or "Failed to invoke Obsidian CLI render command")

        deadline = time.monotonic() + self.timeout
        while time.monotonic() < deadline:
            if result_path.exists():
                return self._read_result(result_path)
            time.sleep(self.poll_interval)

        raise TimeoutError(
            f"Timed out waiting for Obsidian render result: {result_path.name}"
        )

    def _read_result(self, result_path: Path) -> MermaidBridgeResult:
        """Load bridge result metadata and remove the consumed result file."""
        result_data = json.loads(result_path.read_text(encoding="utf-8"))
        result_path.unlink(missing_ok=True)

        if result_data.get("status") != "success":
            error = result_data.get("error") or "Obsidian companion render failed"
            raise RuntimeError(error)

        png_path = Path(result_data["pngPath"])
        if not png_path.exists():
            raise RuntimeError(f"Rendered PNG not found: {png_path}")

        return MermaidBridgeResult(
            png_path=png_path,
            width=result_data.get("width"),
            height=result_data.get("height"),
        )
