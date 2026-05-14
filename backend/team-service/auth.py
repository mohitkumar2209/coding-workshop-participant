import os
import jwt
import datetime
import bcrypt
from db import get_connection

JWT_SECRET = os.getenv('JWT_SECRET', 'super_secret_dev_key')

def hash_password(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def generate_token(user_id, role):
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def decode_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def register_user(email, password, role='Viewer'):
    conn = get_connection()
    hashed = hash_password(password)
    with conn.cursor() as cur:
        # Check if exists
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cur.fetchone():
            return {"error": "User already exists"}, 400
        
        cur.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s) RETURNING id",
            (email, hashed, role)
        )
        new_user = cur.fetchone()
        conn.commit()
        return {"id": new_user['id'], "email": email, "role": role}, 201

def login_user(email, password):
    conn = get_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT id, password_hash, role FROM users WHERE email = %s", (email,))
        user = cur.fetchone()
        if not user or not verify_password(password, user['password_hash']):
            return {"error": "Invalid credentials"}, 401
        
        token = generate_token(user['id'], user['role'])
        return {"token": token, "user": {"id": user['id'], "email": email, "role": user['role']}}, 200

def require_auth(headers):
    auth_header = headers.get('Authorization') or headers.get('authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, {"error": "Missing or invalid authorization header"}
    
    token = auth_header.split(' ')[1]
    payload = decode_token(token)
    if not payload:
        return None, {"error": "Invalid or expired token"}
    
    return payload, None
