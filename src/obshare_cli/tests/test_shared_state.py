"""Tests for shared CLI/plugin state path helpers."""

from __future__ import annotations

from pathlib import Path

from obshare_cli.core.shared_state import (
    get_obshare_home,
    get_shared_config_path,
    get_shared_history_path,
)


def test_shared_paths_live_under_obshare_home(monkeypatch, tmp_path):
    fake_home = tmp_path / "home"
    fake_home.mkdir()
    monkeypatch.setattr(Path, "home", lambda: fake_home)

    assert get_obshare_home() == fake_home / ".obshare"
    assert get_shared_config_path() == fake_home / ".obshare" / "config.json"
    assert get_shared_history_path() == fake_home / ".obshare" / "history.json"


def test_shared_paths_are_separate_from_plugin_private_state(monkeypatch, tmp_path):
    fake_home = tmp_path / "home"
    fake_home.mkdir()
    monkeypatch.setattr(Path, "home", lambda: fake_home)

    plugin_private_root = tmp_path / "vault" / ".obsidian" / "plugins" / "obshare-cli"

    assert get_shared_config_path() != plugin_private_root / "config.json"
    assert get_shared_history_path() != plugin_private_root / "history.json"
