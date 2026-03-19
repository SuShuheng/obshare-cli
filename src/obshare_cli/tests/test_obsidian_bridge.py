"""Tests for the Obsidian CLI Mermaid bridge."""

from __future__ import annotations

import json
from pathlib import Path
from subprocess import CompletedProcess
from unittest.mock import patch

from obshare_cli.core.obsidian_bridge import ObsidianMermaidBridge


def test_bridge_checks_command_visibility_before_invoking_render_command(tmp_path):
    bridge = ObsidianMermaidBridge(
        cli_command=["obsidian"],
        bridge_dir=tmp_path,
        poll_interval=0.01,
        timeout=0.2,
    )

    calls = []

    def fake_run(cmd, check, capture_output, text):
        calls.append(cmd)
        if cmd == ["obsidian", "commands", "filter=obshare-cli"]:
            return CompletedProcess(cmd, 0, stdout="obshare-cli:process-render-request\n", stderr="")

        request_path = next(tmp_path.glob("*.request.json"))
        request_data = json.loads(request_path.read_text(encoding="utf-8"))
        Path(request_data["outputPngPath"]).write_bytes(b"png-bytes")
        Path(request_data["resultPath"]).write_text(
            json.dumps({"status": "success", "pngPath": request_data["outputPngPath"]}),
            encoding="utf-8",
        )
        return CompletedProcess(cmd, 0, stdout="", stderr="")

    with patch("obshare_cli.core.obsidian_bridge.subprocess.run", side_effect=fake_run):
        bridge.render_mermaid("flowchart TD\nA-->B", "flowchart")

    assert calls == [
        ["obsidian", "commands", "filter=obshare-cli"],
        ["obsidian", "command", "id=obshare-cli:process-render-request"],
    ]


def test_bridge_raises_clear_error_when_render_command_is_not_listed(tmp_path):
    bridge = ObsidianMermaidBridge(
        cli_command=["obsidian"],
        bridge_dir=tmp_path,
        poll_interval=0.01,
        timeout=0.2,
    )

    with patch(
        "obshare_cli.core.obsidian_bridge.subprocess.run",
        return_value=CompletedProcess(
            ["obsidian", "commands", "filter=obshare-cli"],
            0,
            stdout="",
            stderr="",
        ),
    ):
        try:
            bridge.render_mermaid("flowchart TD\nA-->B", "flowchart")
        except RuntimeError as exc:
            assert "obshare-cli:process-render-request" in str(exc)
            assert "obsidian commands filter=obshare-cli" in str(exc)
        else:
            raise AssertionError("Expected missing Obsidian command to raise RuntimeError")


def test_bridge_uses_default_obshare_cli_render_command(tmp_path):
    bridge = ObsidianMermaidBridge(
        cli_command=["obsidian"],
        bridge_dir=tmp_path,
        poll_interval=0.01,
        timeout=0.2,
    )

    def fake_run(cmd, check, capture_output, text):
        if cmd == ["obsidian", "commands", "filter=obshare-cli"]:
            return CompletedProcess(cmd, 0, stdout="obshare-cli:process-render-request\n", stderr="")

        request_path = next(tmp_path.glob("*.request.json"))
        request_data = json.loads(request_path.read_text(encoding="utf-8"))
        Path(request_data["outputPngPath"]).write_bytes(b"png-bytes")
        Path(request_data["resultPath"]).write_text(
            json.dumps({"status": "success", "pngPath": request_data["outputPngPath"]}),
            encoding="utf-8",
        )
        return CompletedProcess(cmd, 0, stdout="", stderr="")

    with patch("obshare_cli.core.obsidian_bridge.subprocess.run", side_effect=fake_run) as mock_run:
        bridge.render_mermaid("flowchart TD\nA-->B", "flowchart")

    assert mock_run.call_args_list == [
        (
            (["obsidian", "commands", "filter=obshare-cli"],),
            {"check": False, "capture_output": True, "text": True},
        ),
        (
            (["obsidian", "command", "id=obshare-cli:process-render-request"],),
            {"check": False, "capture_output": True, "text": True},
        ),
    ]


def test_bridge_writes_request_and_reads_success_result(tmp_path):
    bridge = ObsidianMermaidBridge(
        cli_command=["obsidian"],
        bridge_dir=tmp_path,
        command_id="obshare-cli:process-render-request",
        poll_interval=0.01,
        timeout=0.2,
    )

    def fake_run(cmd, check, capture_output, text):
        if cmd == ["obsidian", "commands", "filter=obshare-cli"]:
            return CompletedProcess(cmd, 0, stdout="obshare-cli:process-render-request\n", stderr="")

        request_path = next(tmp_path.glob("*.request.json"))
        request_data = json.loads(request_path.read_text(encoding="utf-8"))
        assert request_data["mermaid"] == "flowchart TD\nA-->B"
        assert request_data["diagramType"] == "flowchart"
        assert request_data["outputName"] == "mermaid-flowchart.png"

        result_path = Path(request_data["resultPath"])
        png_path = Path(request_data["outputPngPath"])
        png_path.write_bytes(b"png-bytes")
        result_path.write_text(
            json.dumps(
                {
                    "status": "success",
                    "pngPath": str(png_path),
                    "width": 800,
                    "height": 600,
                }
            ),
            encoding="utf-8",
        )
        return CompletedProcess(cmd, 0, stdout="", stderr="")

    with patch("obshare_cli.core.obsidian_bridge.subprocess.run", side_effect=fake_run) as mock_run:
        result = bridge.render_mermaid(
            "flowchart TD\nA-->B",
            "flowchart",
            output_name="mermaid-flowchart.png",
        )

    assert result.png_path.read_bytes() == b"png-bytes"
    assert result.width == 800
    assert result.height == 600
    request_files = list(tmp_path.glob("*.request.json"))
    assert len(request_files) == 1
    assert not list(tmp_path.glob("*.result.json"))
    assert mock_run.call_args_list == [
        (
            (["obsidian", "commands", "filter=obshare-cli"],),
            {"check": False, "capture_output": True, "text": True},
        ),
        (
            (["obsidian", "command", "id=obshare-cli:process-render-request"],),
            {"check": False, "capture_output": True, "text": True},
        ),
    ]


def test_bridge_raises_timeout_when_result_never_appears(tmp_path):
    bridge = ObsidianMermaidBridge(
        cli_command=["obsidian"],
        bridge_dir=tmp_path,
        command_id="obshare-cli:process-render-request",
        poll_interval=0.01,
        timeout=0.05,
    )

    with patch(
        "obshare_cli.core.obsidian_bridge.subprocess.run",
        side_effect=[
            CompletedProcess(
                ["obsidian", "commands", "filter=obshare-cli"],
                0,
                stdout="obshare-cli:process-render-request\n",
                stderr="",
            ),
            CompletedProcess(["obsidian"], 0, stdout="", stderr=""),
        ],
    ):
        try:
            bridge.render_mermaid("flowchart TD\nA-->B", "flowchart")
        except TimeoutError as exc:
            assert "Timed out waiting for Obsidian render result" in str(exc)
        else:
            raise AssertionError("Expected bridge timeout when result file never appears")
