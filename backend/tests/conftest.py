"""
Shared pytest fixtures for all backend service tests.
Uses an in-memory SQLite-compatible approach via monkeypatching psycopg2
so tests run without a live PostgreSQL instance.
"""

import pytest
import json
import sys
import os

# ── make backend packages importable ──────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# ── Minimal psycopg2 stub so imports don't fail without the real driver ───────
import types

class _FakeConn:
    def cursor(self): return _FakeCursor()
    def commit(self): pass
    def rollback(self): pass
    def close(self): pass
    def __enter__(self): return self
    def __exit__(self, *a): pass

class _FakeCursor:
    def __init__(self):
        self._rows = []
        self.rowcount = 0
    def execute(self, *a, **kw): pass
    def fetchone(self): return self._rows[0] if self._rows else None
    def fetchall(self): return self._rows
    def close(self): pass
    def __enter__(self): return self
    def __exit__(self, *a): pass

# Only stub if psycopg2 is not installed
try:
    import psycopg2
except ImportError:
    psycopg2_stub = types.ModuleType('psycopg2')
    psycopg2_stub.connect = lambda **kw: _FakeConn()
    psycopg2_stub.IntegrityError = Exception
    extras_stub = types.ModuleType('psycopg2.extras')
    extras_stub.RealDictCursor = dict
    sys.modules['psycopg2'] = psycopg2_stub
    sys.modules['psycopg2.extras'] = extras_stub


@pytest.fixture
def api_client():
    """Flask test client for api-service."""
    from api_service.function import app
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def teams_client():
    """Flask test client for teams-service."""
    from teams_service.function import app
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def achievements_client():
    """Flask test client for achievements-service."""
    from achievements_service.function import app
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def auth_headers():
    """Return a dummy Bearer token header (unit tests mock DB so token is not validated)."""
    return {'Authorization': 'Bearer test-token', 'Content-Type': 'application/json'}
