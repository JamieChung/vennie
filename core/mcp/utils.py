"""
Shared utilities for Vennie MCP servers.

Centralises safe YAML loading so every server gets a consistent parser
with proper error handling rather than fragile hand-rolled line splitting.
"""

from pathlib import Path
from typing import Any


def load_profile(path: Path | str) -> dict[str, Any]:
    """Load a YAML file and return it as a dict.

    Uses yaml.safe_load() when pyyaml is available.  Returns an empty dict
    on any error (missing file, malformed YAML, import failure) so callers
    never need to guard against exceptions.
    """
    path = Path(path)
    if not path.exists():
        return {}

    try:
        import yaml  # type: ignore
        content = path.read_text(encoding="utf-8")
        result = yaml.safe_load(content)
        return result if isinstance(result, dict) else {}
    except Exception:
        return {}
