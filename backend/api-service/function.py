import os
import jwt
from datetime import datetime, timedelta
from functools import wraps
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify
from flask_cors import CORS
import serverless_wsgi
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'acme_secret_key_123')

def get_db_connection():
    config = {
        "host": os.environ.get("POSTGRES_HOST", "localhost"),
        "port": os.environ.get("POSTGRES_PORT", "5432"),
        "user": os.environ.get("POSTGRES_USER", "postgres"),
        "password": os.environ.get("POSTGRES_PASS", "postgres"),
        "dbname": os.environ.get("POSTGRES_NAME", "postgres")
    }
    if os.environ.get("IS_LOCAL", "true").lower() == "false":
        config["sslmode"] = "require"
    return psycopg2.connect(**config, cursor_factory=RealDictCursor)

def init_db():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(200) NOT NULL,
            role VARCHAR(20) NOT NULL,
            team VARCHAR(50)
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS performance_reviews (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            reviewer_id INTEGER REFERENCES users(id),
            rating INTEGER NOT NULL,
            feedback TEXT,
            review_date DATE DEFAULT CURRENT_DATE
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS development_plans (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            goal TEXT NOT NULL,
            status VARCHAR(20) NOT NULL,
            target_date DATE
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS competencies (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            skill_name VARCHAR(50) NOT NULL,
            skill_level INTEGER NOT NULL
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS training_records (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            training_name VARCHAR(100) NOT NULL,
            completion_date DATE,
            status VARCHAR(20) NOT NULL
        )
    ''')
    
    cur.execute('SELECT COUNT(*) FROM users')
    if cur.fetchone()['count'] == 0:
        hashed_pw = generate_password_hash('password123')
        cur.execute(
            'INSERT INTO users (name, email, password_hash, role, team) VALUES (%s, %s, %s, %s, %s)',
            ('Admin User', 'admin@acme.com', hashed_pw, 'ADMIN', 'Management')
        )

    conn.commit()
    cur.close()
    conn.close()

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        try:
            token = token.split(" ")[1]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute('SELECT * FROM users WHERE id = %s', (data['user_id'],))
            current_user = cur.fetchone()
            cur.close()
            conn.close()
            if not current_user:
                return jsonify({'message': 'User not found'}), 401
        except:
            return jsonify({'message': 'Token is invalid'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

def role_required(roles):
    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            if current_user['role'] not in roles:
                return jsonify({'message': 'Unauthorized'}), 403
            return f(current_user, *args, **kwargs)
        return decorated
    return decorator

@app.route('/api/api-service/auth/register', methods=['POST'])
@app.route('/auth/register', methods=['POST'])
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json(force=True, silent=True) or {}
    hashed_pw = generate_password_hash(data.get('password', ''))
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            'INSERT INTO users (name, email, password_hash, role, team) VALUES (%s, %s, %s, %s, %s) RETURNING id',
            (data.get('name'), data.get('email'), hashed_pw, data.get('role', 'EMPLOYEE'), data.get('team', 'General'))
        )
        user_id = cur.fetchone()['id']
        conn.commit()
        return jsonify({'message': 'Registered successfully', 'id': user_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'message': str(e)}), 400
    finally:
        cur.close()
        conn.close()

@app.route('/api/api-service/auth/login', methods=['POST'])
@app.route('/auth/login', methods=['POST'])
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json(force=True, silent=True) or {}
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('SELECT * FROM users WHERE email = %s', (data.get('email'),))
    user = cur.fetchone()
    cur.close()
    conn.close()
    if user and check_password_hash(user['password_hash'], data.get('password', '')):
        token = jwt.encode({'user_id': user['id'], 'exp': datetime.utcnow() + timedelta(hours=24)}, app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({'token': token, 'user': {'id': user['id'], 'name': user['name'], 'role': user['role']}})
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/api-service/users', methods=['GET'])
@app.route('/users', methods=['GET'])
@app.route('/api/users', methods=['GET'])
@token_required
@role_required(['ADMIN', 'MANAGER'])
def get_users(current_user):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('SELECT id, name, email, role, team FROM users')
    users = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(users)

@app.route('/api/api-service/<resource>', methods=['GET', 'POST'])
@app.route('/<resource>', methods=['GET', 'POST'])
@app.route('/api/<resource>', methods=['GET', 'POST'])
@token_required
def handle_resource(current_user, resource):
    valid_resources = ['performance_reviews', 'development_plans', 'competencies', 'training_records']
    if resource not in valid_resources:
        return jsonify({'message': 'Invalid resource'}), 404
    conn = get_db_connection()
    cur = conn.cursor()
    if request.method == 'POST':
        data = request.get_json(force=True, silent=True) or {}
        target_user = data.get('user_id', current_user['id'])
        if current_user['role'] == 'EMPLOYEE' and target_user != current_user['id']:
            return jsonify({'message': 'Unauthorized'}), 403
        if resource == 'performance_reviews' and current_user['role'] == 'EMPLOYEE':
            return jsonify({'message': 'Only managers can create performance reviews'}), 403
        columns = list(data.keys())
        values = list(data.values())
        if resource == 'performance_reviews' and 'reviewer_id' not in columns:
            columns.append('reviewer_id')
            values.append(current_user['id'])
        cols_str = ', '.join(columns)
        vars_str = ', '.join(['%s'] * len(values))
        try:
            cur.execute(f'INSERT INTO {resource} ({cols_str}) VALUES ({vars_str}) RETURNING id', tuple(values))
            new_id = cur.fetchone()['id']
            conn.commit()
            return jsonify({'id': new_id}), 201
        except Exception as e:
            conn.rollback()
            return jsonify({'message': str(e)}), 400
        finally:
            cur.close()
            conn.close()
    user_id = request.args.get('user_id')
    if current_user['role'] == 'EMPLOYEE':
        user_id = current_user['id']
    if user_id:
        cur.execute(f'SELECT * FROM {resource} WHERE user_id = %s', (user_id,))
    else:
        cur.execute(f'SELECT * FROM {resource}')
    results = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(results)

@app.route('/api/api-service/<resource>/<int:record_id>', methods=['GET', 'PUT', 'DELETE'])
@app.route('/<resource>/<int:record_id>', methods=['GET', 'PUT', 'DELETE'])
@app.route('/api/<resource>/<int:record_id>', methods=['GET', 'PUT', 'DELETE'])
@token_required
def handle_resource_by_id(current_user, resource, record_id):
    """Handle GET, PUT, DELETE for a specific resource record"""
    valid_resources = ['performance_reviews', 'development_plans', 'competencies', 'training_records']
    if resource not in valid_resources:
        return jsonify({'message': 'Invalid resource'}), 404

    conn = get_db_connection()
    cur = conn.cursor()

    # Fetch the record first
    cur.execute(f'SELECT * FROM {resource} WHERE id = %s', (record_id,))
    record = cur.fetchone()
    if not record:
        cur.close()
        conn.close()
        return jsonify({'message': 'Record not found'}), 404

    # Employees can only access their own records
    if current_user['role'] == 'EMPLOYEE' and record.get('user_id') != current_user['id']:
        cur.close()
        conn.close()
        return jsonify({'message': 'Unauthorized'}), 403

    if request.method == 'GET':
        cur.close()
        conn.close()
        return jsonify(record), 200

    if request.method == 'PUT':
        if current_user['role'] == 'EMPLOYEE':
            cur.close()
            conn.close()
            return jsonify({'message': 'Employees cannot update records'}), 403
        data = request.get_json(force=True, silent=True) or {}
        # Build update query from provided fields (exclude id, user_id)
        allowed = {k: v for k, v in data.items() if k not in ('id', 'user_id')}
        if not allowed:
            cur.close()
            conn.close()
            return jsonify({'message': 'No fields to update'}), 400
        set_clause = ', '.join([f"{k} = %s" for k in allowed.keys()])
        values = list(allowed.values()) + [record_id]
        try:
            cur.execute(f'UPDATE {resource} SET {set_clause} WHERE id = %s', values)
            conn.commit()
            return jsonify({'message': 'Updated successfully'}), 200
        except Exception as e:
            conn.rollback()
            return jsonify({'message': str(e)}), 400
        finally:
            cur.close()
            conn.close()

    if request.method == 'DELETE':
        if current_user['role'] not in ['ADMIN', 'MANAGER']:
            cur.close()
            conn.close()
            return jsonify({'message': 'Unauthorized'}), 403
        try:
            cur.execute(f'DELETE FROM {resource} WHERE id = %s', (record_id,))
            conn.commit()
            cur.close()
            conn.close()
            return jsonify({'message': 'Deleted successfully'}), 204
        except Exception as e:
            conn.rollback()
            cur.close()
            conn.close()
            return jsonify({'message': str(e)}), 500

@app.route('/api/api-service/health', methods=['GET'])
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'api-service'}), 200

def handler(event, context):
    try:
        init_db()
    except Exception:
        pass
    return serverless_wsgi.handle_request(app, event, context)
