"""pytest configuration — adds the repo root to sys.path."""
import sys
from pathlib import Path

# Ensure `core` is importable as a top-level package
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
