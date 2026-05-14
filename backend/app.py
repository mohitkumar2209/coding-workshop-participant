"""
Database initialization script - creates all tables across all services.
Run locally: python backend/app.py
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor

config = {
    "host": os.environ.get("POSTGRES_HOST", "localhost"),
    "port": os.environ.get("POSTGRES_PORT", "5432"),
    "user": os.environ.get("POSTGRES_USER", "postgres"),
    "password": os.environ.get("POSTGRES_PASS", "postgres"),
    "dbname": os.environ.get("POSTGRES_NAME", "postgres"),
}

def init_all():
    conn = psycopg2.connect(**config, cursor_factory=RealDictCursor)
    cur = conn.cursor()

    print("Initializing all database tables...")

    # ── api-service tables ─────────────────────────────────────────────────────
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(200) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE',
            team VARCHAR(50)
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS performance_reviews (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            reviewer_id INTEGER REFERENCES users(id),
            rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
            feedback TEXT,
            review_date DATE DEFAULT CURRENT_DATE
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS development_plans (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            goal TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
            target_date DATE
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS competencies (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            skill_name VARCHAR(50) NOT NULL,
            skill_level INTEGER NOT NULL CHECK (skill_level BETWEEN 1 AND 5)
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS training_records (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            training_name VARCHAR(100) NOT NULL,
            completion_date DATE,
            status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED'
        )
    ''')

    # ── teams-service tables ───────────────────────────────────────────────────
    cur.execute('''
        CREATE TABLE IF NOT EXISTS teams (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            location VARCHAR(100),
            department VARCHAR(100),
            team_leader_id INTEGER,
            organization_leader VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS team_members (
            id SERIAL PRIMARY KEY,
            team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL,
            role VARCHAR(50) DEFAULT 'MEMBER',
            is_direct_staff BOOLEAN DEFAULT TRUE,
            location VARCHAR(100),
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(team_id, user_id)
        )
    ''')

    # ── achievements-service tables ────────────────────────────────────────────
    cur.execute('''
        CREATE TABLE IF NOT EXISTS achievements (
            id SERIAL PRIMARY KEY,
            team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            achievement_type VARCHAR(50),
            impact_level VARCHAR(20) DEFAULT 'MEDIUM',
            achievement_date DATE NOT NULL,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            metrics JSONB,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cur.execute('CREATE INDEX IF NOT EXISTS idx_achievements_team_date ON achievements(team_id, year, month)')

    # ── metadata-service tables ────────────────────────────────────────────────
    cur.execute('''
        CREATE TABLE IF NOT EXISTS metadata (
            id SERIAL PRIMARY KEY,
            entity_type VARCHAR(50) NOT NULL,
            entity_id INTEGER NOT NULL,
            key VARCHAR(100) NOT NULL,
            value TEXT,
            value_type VARCHAR(20) DEFAULT 'string',
            category VARCHAR(50),
            is_public BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(entity_type, entity_id, key)
        )
    ''')

    cur.execute('CREATE INDEX IF NOT EXISTS idx_metadata_entity ON metadata(entity_type, entity_id)')

    conn.commit()
    cur.close()
    conn.close()
    print("✅ All tables initialized successfully!")

if __name__ == "__main__":
    init_all()
