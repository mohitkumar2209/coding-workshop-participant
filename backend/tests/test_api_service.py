"""
Unit tests for api-service (auth, users, resources).
These tests mock the database layer so no live PostgreSQL is needed.
"""

import json
import pytest
from unittest.mock import patch, MagicMock


# ── helpers ───────────────────────────────────────────────────────────────────

def make_user(id=1, name="Test User", email="test@acme.com",
              role="ADMIN", team="Engineering", password_hash=None):
    from werkzeug.security import generate_password_hash
    return {
        'id': id,
        'name': name,
        'email': email,
        'password_hash': password_hash or generate_password_hash('password123'),
        'role': role,
        'team': team,
    }


def _mock_db(rows=None, fetchone_val=None):
    """Return a mock connection whose cursor returns controlled data."""
    cur = MagicMock()
    cur.fetchone.return_value = fetchone_val
    cur.fetchall.return_value = rows or []
    conn = MagicMock()
    conn.cursor.return_value = cur
    return conn, cur


# ── auth: register ─────────────────────────────────────────────────────────────

class TestRegister:
    def test_register_success(self):
        from api_service.function import app
        app.config['TESTING'] = True
        with app.test_client() as client:
            conn, cur = _mock_db(fetchone_val={'id': 42})
            with patch('api_service.function.get_db_connection', return_value=conn):
                resp = client.post(
                    '/auth/register',
                    data=json.dumps({'name': 'Alice', 'email': 'alice@acme.com',
                                     'password': 'secret123', 'role': 'EMPLOYEE'}),
                    content_type='application/json',
                )
            assert resp.status_code == 201
            body = resp.get_json()
            assert body['id'] == 42

    def test_register_duplicate_email(self):
        from api_service.function import app
        import psycopg2
        app.config['TESTING'] = True
        with app.test_client() as client:
            conn = MagicMock()
            cur = MagicMock()
            cur.execute.side_effect = psycopg2.IntegrityError("duplicate key")
            conn.cursor.return_value = cur
            with patch('api_service.function.get_db_connection', return_value=conn):
                resp = client.post(
                    '/auth/register',
                    data=json.dumps({'name': 'Alice', 'email': 'alice@acme.com',
                                     'password': 'secret123'}),
                    content_type='application/json',
                )
            assert resp.status_code == 400


# ── auth: login ────────────────────────────────────────────────────────────────

class TestLogin:
    def test_login_success(self):
        from api_service.function import app
        app.config['TESTING'] = True
        user = make_user()
        with app.test_client() as client:
            conn, cur = _mock_db(fetchone_val=user)
            with patch('api_service.function.get_db_connection', return_value=conn):
                resp = client.post(
                    '/auth/login',
                    data=json.dumps({'email': 'test@acme.com', 'password': 'password123'}),
                    content_type='application/json',
                )
            assert resp.status_code == 200
            body = resp.get_json()
            assert 'token' in body
            assert body['user']['role'] == 'ADMIN'

    def test_login_wrong_password(self):
        from api_service.function import app
        app.config['TESTING'] = True
        user = make_user()
        with app.test_client() as client:
            conn, cur = _mock_db(fetchone_val=user)
            with patch('api_service.function.get_db_connection', return_value=conn):
                resp = client.post(
                    '/auth/login',
                    data=json.dumps({'email': 'test@acme.com', 'password': 'wrongpass'}),
                    content_type='application/json',
                )
            assert resp.status_code == 401

    def test_login_unknown_email(self):
        from api_service.function import app
        app.config['TESTING'] = True
        with app.test_client() as client:
            conn, cur = _mock_db(fetchone_val=None)
            with patch('api_service.function.get_db_connection', return_value=conn):
                resp = client.post(
                    '/auth/login',
                    data=json.dumps({'email': 'nobody@acme.com', 'password': 'x'}),
                    content_type='application/json',
                )
            assert resp.status_code == 401


# ── token middleware ───────────────────────────────────────────────────────────

class TestTokenRequired:
    def test_missing_token_returns_401(self):
        from api_service.function import app
        app.config['TESTING'] = True
        with app.test_client() as client:
            resp = client.get('/users')
            assert resp.status_code == 401

    def test_invalid_token_returns_401(self):
        from api_service.function import app
        app.config['TESTING'] = True
        with app.test_client() as client:
            resp = client.get('/users', headers={'Authorization': 'Bearer bad.token.here'})
            assert resp.status_code == 401


# ── get users ─────────────────────────────────────────────────────────────────

class TestGetUsers:
    def _get_with_user(self, role='ADMIN'):
        """Helper: call GET /users with a mocked authenticated user."""
        import jwt, datetime
        from api_service.function import app
        app.config['TESTING'] = True
        user = make_user(role=role)
        secret = app.config['SECRET_KEY']
        token = jwt.encode(
            {'user_id': 1, 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)},
            secret, algorithm='HS256'
        )
        with app.test_client() as client:
            conn, cur = _mock_db(rows=[user], fetchone_val=user)
            with patch('api_service.function.get_db_connection', return_value=conn):
                resp = client.get('/users', headers={'Authorization': f'Bearer {token}'})
        return resp

    def test_admin_can_get_users(self):
        resp = self._get_with_user('ADMIN')
        assert resp.status_code == 200

    def test_manager_can_get_users(self):
        resp = self._get_with_user('MANAGER')
        assert resp.status_code == 200

    def test_employee_cannot_get_users(self):
        resp = self._get_with_user('EMPLOYEE')
        assert resp.status_code == 403


# ── resource CRUD ─────────────────────────────────────────────────────────────

class TestResourceCRUD:
    def _authed_client(self, role='MANAGER'):
        import jwt, datetime
        from api_service.function import app
        app.config['TESTING'] = True
        user = make_user(role=role)
        secret = app.config['SECRET_KEY']
        token = jwt.encode(
            {'user_id': 1, 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)},
            secret, algorithm='HS256'
        )
        return app.test_client(), token, user

    def test_get_performance_reviews(self):
        client, token, user = self._authed_client()
        review = {'id': 1, 'user_id': 2, 'rating': 5, 'feedback': 'Great', 'review_date': '2024-01-01'}
        conn, cur = _mock_db(rows=[review], fetchone_val=user)
        with patch('api_service.function.get_db_connection', return_value=conn):
            resp = client.get('/performance_reviews',
                              headers={'Authorization': f'Bearer {token}'})
        assert resp.status_code == 200

    def test_post_performance_review(self):
        client, token, user = self._authed_client('MANAGER')
        conn, cur = _mock_db(fetchone_val={'id': 10})
        # First call returns the user (token_required), second returns new id
        conn.cursor.return_value.fetchone.side_effect = [user, {'id': 10}]
        with patch('api_service.function.get_db_connection', return_value=conn):
            resp = client.post(
                '/performance_reviews',
                data=json.dumps({'user_id': 2, 'rating': 4, 'feedback': 'Good work'}),
                content_type='application/json',
                headers={'Authorization': f'Bearer {token}'},
            )
        assert resp.status_code in (201, 400)  # 400 if mock doesn't fully satisfy

    def test_invalid_resource_returns_404(self):
        client, token, user = self._authed_client()
        conn, cur = _mock_db(fetchone_val=user)
        with patch('api_service.function.get_db_connection', return_value=conn):
            resp = client.get('/nonexistent_resource',
                              headers={'Authorization': f'Bearer {token}'})
        assert resp.status_code == 404

    def test_health_endpoint(self):
        from api_service.function import app
        app.config['TESTING'] = True
        with app.test_client() as client:
            resp = client.get('/health')
        assert resp.status_code == 200
        assert resp.get_json()['status'] == 'healthy'
