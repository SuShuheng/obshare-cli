"""Plugin-facing obshare-cli command execution helpers."""

from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional


OBSD_ENV_NAME = "obsd"


@dataclass
class CliRunResult:
    """Structured result from a plugin-triggered CLI invocation."""

    success: bool
    command: list[str]
    exit_code: int
    stdout: str
    stderr: str
    data: Optional[dict[str, Any]] = None


class ObShareCliRunner:
    """Build and execute obshare-cli commands for plugin integration."""

    def __init__(
        self,
        install_mode: str,
        python_executable: str = "python3",
        venv_path: Optional[Path] = None,
        cli_executable: Optional[str] = None,
        runtime_type: str = "",
        execution_mode: str = "",
        conda_executable: str = "conda",
        conda_env_name: str = OBSD_ENV_NAME,
        conda_python_executable: Optional[str] = None,
    ):
        self.install_mode = install_mode
        self.python_executable = python_executable
        self.venv_path = Path(venv_path) if venv_path else None
        self.cli_executable = cli_executable
        self.runtime_type = runtime_type
        self.execution_mode = execution_mode
        self.conda_executable = conda_executable
        self.conda_env_name = conda_env_name
        self.conda_python_executable = conda_python_executable

    def build_command(self, args: list[str]) -> list[str]:
        """Build a JSON-first obshare-cli command for the selected runtime."""
        if self.cli_executable:
            return [self.cli_executable, "--json", *args]

        if self.runtime_type == "conda":
            if self.conda_env_name != OBSD_ENV_NAME:
                raise ValueError(
                    f"Conda obshare-cli environments must use the fixed name {OBSD_ENV_NAME}"
                )
            if self.execution_mode == "conda-run":
                return [
                    self.conda_executable,
                    "run",
                    "-n",
                    self.conda_env_name,
                    "obshare-cli",
                    "--json",
                    *args,
                ]
            if self.execution_mode == "conda-python":
                if not self.conda_python_executable:
                    raise ValueError("Conda python execution requires a Python executable path")
                return [
                    self.conda_python_executable,
                    "-m",
                    "obshare_cli",
                    "--json",
                    *args,
                ]
            raise ValueError(f"Unsupported conda execution mode: {self.execution_mode}")

        if self.install_mode == "isolated":
            if not self.venv_path:
                raise ValueError("An isolated installation requires a virtual environment path")
            if self.venv_path.name != OBSD_ENV_NAME:
                raise ValueError(
                    f"Isolated obshare-cli environments must use the fixed name {OBSD_ENV_NAME}"
                )
            python_path = self._venv_python_path(self.venv_path)
            return [str(python_path), "-m", "obshare_cli", "--json", *args]

        return [self.python_executable, "-m", "obshare_cli", "--json", *args]

    def run(self, args: list[str]) -> CliRunResult:
        """Execute an obshare-cli command and return a structured result."""
        command = self.build_command(args)
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
        )

        data = None
        stdout = completed.stdout.strip()
        stderr = completed.stderr.strip()
        if stdout:
            try:
                data = json.loads(stdout)
            except json.JSONDecodeError:
                data = None

        return CliRunResult(
            success=completed.returncode == 0,
            command=command,
            exit_code=completed.returncode,
            stdout=stdout,
            stderr=stderr,
            data=data,
        )

    @staticmethod
    def _venv_python_path(venv_path: Path) -> Path:
        """Return the platform-specific Python path inside a virtual environment."""
        if os.name == "nt":
            return venv_path / "Scripts" / "python.exe"
        return venv_path / "bin" / "python"
