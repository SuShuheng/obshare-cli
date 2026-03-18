"""Tests for plugin-facing obshare-cli command execution."""

from __future__ import annotations

import json
from pathlib import Path
from subprocess import CompletedProcess
from unittest.mock import patch

from obshare_cli.core.cli_runner import ObShareCliRunner


def test_runner_builds_system_python_command():
    runner = ObShareCliRunner(
        install_mode="system",
        python_executable="python3",
    )

    command = runner.build_command(["config", "test"])

    assert command == ["python3", "-m", "obshare_cli", "--json", "config", "test"]


def test_runner_builds_isolated_obsd_command(tmp_path):
    env_dir = tmp_path / "obsd"
    env_dir.mkdir()

    runner = ObShareCliRunner(
        install_mode="isolated",
        venv_path=env_dir,
    )

    command = runner.build_command(["delete", "doc_123"])

    assert command == [
        str(env_dir / "bin" / "python"),
        "-m",
        "obshare_cli",
        "--json",
        "delete",
        "doc_123",
    ]


def test_runner_requires_fixed_obsd_name_for_isolated_env(tmp_path):
    env_dir = tmp_path / "other-env"
    env_dir.mkdir()

    runner = ObShareCliRunner(
        install_mode="isolated",
        venv_path=env_dir,
    )

    try:
        runner.build_command(["config", "test"])
    except ValueError as exc:
        assert "obsd" in str(exc)
    else:
        raise AssertionError("Expected isolated env runner to enforce the obsd name")


def test_runner_surfaces_structured_failure():
    runner = ObShareCliRunner(
        install_mode="system",
        python_executable="python3",
    )

    with patch(
        "obshare_cli.core.cli_runner.subprocess.run",
        return_value=CompletedProcess(
            ["python3"], 1, stdout='{"success": false}', stderr="boom"
        ),
    ):
        result = runner.run(["config", "test"])

    assert result.success is False
    assert result.exit_code == 1
    assert result.stderr == "boom"
    assert result.command == ["python3", "-m", "obshare_cli", "--json", "config", "test"]


def test_runner_parses_json_success():
    runner = ObShareCliRunner(
        install_mode="system",
        python_executable="python3",
    )

    with patch(
        "obshare_cli.core.cli_runner.subprocess.run",
        return_value=CompletedProcess(
            ["python3"], 0, stdout=json.dumps({"success": True, "value": 1}), stderr=""
        ),
    ):
        result = runner.run(["config", "test"])

    assert result.success is True
    assert result.data == {"success": True, "value": 1}
