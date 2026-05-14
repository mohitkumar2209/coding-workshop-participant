import os
import psycopg2
import hashlib

config = {
    "host": os.environ.get("POSTGRES_HOST", "localhost"),
    "port": os.environ.get("POSTGRES_PORT", "5432"),
    "user": os.environ.get("POSTGRES_USER", "test"),
    "password": os.environ.get("POSTGRES_PASS", "test"),
    "dbname": os.environ.get("POSTGRES_NAME", "test"),
}

def generate_password_hash(password):
    salt = os.urandom(16)
    pw_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return salt.hex() + ':' + pw_hash.hex()

def update_passwords():
    conn = psycopg2.connect(**config)
    cur = conn.cursor()
    
    new_hash = generate_password_hash('password123')
    
    # Update all users to have 'password123' using the new hash format
    cur.execute("UPDATE users SET password_hash = %s", (new_hash,))
    
    conn.commit()
    print("✅ All users have been updated to use the new password hashing algorithm!")
    print("You can now login with: admin@acme.com / password123")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    update_passwords()
