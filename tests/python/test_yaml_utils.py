"""Tests for core.mcp.utils.load_profile — safe YAML loading."""
import pytest
from pathlib import Path

from core.mcp.utils import load_profile


# ── Basic loading ──────────────────────────────────────────────────────────

def test_basic_profile(tmp_path: Path) -> None:
    (tmp_path / "profile.yaml").write_text("name: Jane\ncareer_level: senior\n")
    result = load_profile(tmp_path / "profile.yaml")
    assert result["name"] == "Jane"
    assert result["career_level"] == "senior"


def test_returns_all_top_level_keys(tmp_path: Path) -> None:
    (tmp_path / "profile.yaml").write_text(
        "name: Sam\nrole: PM\ncompany_stage: startup\nonboarded: true\n"
    )
    result = load_profile(tmp_path / "profile.yaml")
    assert set(result.keys()) >= {"name", "role", "company_stage", "onboarded"}


# ── Edge cases the hand-rolled parser broke ────────────────────────────────

def test_value_with_colon(tmp_path: Path) -> None:
    """A value containing a colon broke the old line-splitting approach."""
    (tmp_path / "profile.yaml").write_text('company_domain: "acme: labs"\n')
    result = load_profile(tmp_path / "profile.yaml")
    assert result["company_domain"] == "acme: labs"


def test_value_with_colon_and_spaces(tmp_path: Path) -> None:
    (tmp_path / "profile.yaml").write_text('tagline: "Build: Ship: Learn"\n')
    result = load_profile(tmp_path / "profile.yaml")
    assert result["tagline"] == "Build: Ship: Learn"


def test_nested_mapping(tmp_path: Path) -> None:
    content = "communication:\n  formality: casual\n  directness: very-direct\n"
    (tmp_path / "profile.yaml").write_text(content)
    result = load_profile(tmp_path / "profile.yaml")
    assert result["communication"]["formality"] == "casual"
    assert result["communication"]["directness"] == "very-direct"


def test_list_value(tmp_path: Path) -> None:
    content = "interests:\n  - product\n  - ai\n  - coaching\n"
    (tmp_path / "profile.yaml").write_text(content)
    result = load_profile(tmp_path / "profile.yaml")
    assert result["interests"] == ["product", "ai", "coaching"]


def test_boolean_values(tmp_path: Path) -> None:
    (tmp_path / "profile.yaml").write_text("onboarded: true\ntelemetry: false\n")
    result = load_profile(tmp_path / "profile.yaml")
    assert result["onboarded"] is True
    assert result["telemetry"] is False


# ── Error handling ─────────────────────────────────────────────────────────

def test_missing_file() -> None:
    result = load_profile(Path("/nonexistent/profile.yaml"))
    assert result == {}


def test_empty_file(tmp_path: Path) -> None:
    (tmp_path / "profile.yaml").write_text("")
    result = load_profile(tmp_path / "profile.yaml")
    assert result == {}


def test_malformed_yaml_returns_empty(tmp_path: Path) -> None:
    """Malformed YAML must return {} rather than raising an exception."""
    (tmp_path / "profile.yaml").write_text("name: [\nnot closed")
    result = load_profile(tmp_path / "profile.yaml")
    assert result == {}


def test_non_mapping_yaml_returns_empty(tmp_path: Path) -> None:
    """A YAML file that contains a list at the top level isn't a valid profile."""
    (tmp_path / "profile.yaml").write_text("- item1\n- item2\n")
    result = load_profile(tmp_path / "profile.yaml")
    assert result == {}


def test_accepts_path_string(tmp_path: Path) -> None:
    """load_profile accepts both Path objects and plain strings."""
    (tmp_path / "profile.yaml").write_text("name: Alex\n")
    result = load_profile(str(tmp_path / "profile.yaml"))
    assert result["name"] == "Alex"
