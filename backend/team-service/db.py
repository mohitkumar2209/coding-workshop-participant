import os
from psycopg import connect
from psycopg.rows import dict_row

PG_CONN = None

def get_config():
    return (
        f"host={os.getenv('POSTGRES_HOST', 'localhost')} "
        f"port={os.getenv('POSTGRES_PORT', '5432')} "
        f"user={os.getenv('POSTGRES_USER', 'test')} "
        f"password={os.getenv('POSTGRES_PASS', 'test')} "
        f"dbname={os.getenv('POSTGRES_NAME', 'test')} "
        f"connect_timeout=15"
    )

def get_connection():
    global PG_CONN
    if PG_CONN is None or PG_CONN.closed:
        PG_CONN = connect(get_config(), row_factory=dict_row)
    return PG_CONN

def init_db():
    conn = get_connection()
    with conn.cursor() as cur:
        # Create users table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL
            );
        """)
        # Create teams table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS teams (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                location VARCHAR(255) NOT NULL,
                leader_id INTEGER
            );
        """)
        # Create individuals table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS individuals (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                role VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
                location VARCHAR(255) NOT NULL,
                is_direct_staff BOOLEAN DEFAULT true
            );
        """)
        # Add foreign key constraint to teams leader_id after individuals is created
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'teams_leader_id_fkey'
                ) THEN
                    ALTER TABLE teams ADD CONSTRAINT teams_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES individuals(id) ON DELETE SET NULL;
                END IF;
            END $$;
        """)
        # Create achievements table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS achievements (
                id SERIAL PRIMARY KEY,
                team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
                month VARCHAR(50) NOT NULL,
                year INTEGER NOT NULL,
                description TEXT NOT NULL
            );
        """)
        # Create metadata table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS metadata (
                id SERIAL PRIMARY KEY,
                entity_type VARCHAR(50) NOT NULL,
                entity_id INTEGER NOT NULL,
                key VARCHAR(255) NOT NULL,
                value TEXT NOT NULL
            );
        """)
        # Create performance_reviews table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS performance_reviews (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES individuals(id) ON DELETE CASCADE,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                feedback TEXT NOT NULL,
                review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # Create competencies table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS competencies (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES individuals(id) ON DELETE CASCADE,
                skill_name VARCHAR(255) NOT NULL,
                skill_level INTEGER NOT NULL CHECK (skill_level >= 1 AND skill_level <= 5),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # Create development_plans table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS development_plans (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES individuals(id) ON DELETE CASCADE,
                goal TEXT NOT NULL,
                status VARCHAR(50) NOT NULL,
                target_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        # Create training_records table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS training_records (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES individuals(id) ON DELETE CASCADE,
                training_name VARCHAR(255) NOT NULL,
                status VARCHAR(50) NOT NULL,
                completion_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Fix foreign keys in case tables already existed pointing to users(id) instead of individuals(id)
        cur.execute("""
            DO $$
            BEGIN
                -- Fix performance_reviews
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'performance_reviews_user_id_fkey') THEN
                    ALTER TABLE performance_reviews DROP CONSTRAINT performance_reviews_user_id_fkey;
                    ALTER TABLE performance_reviews ADD CONSTRAINT performance_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES individuals(id) ON DELETE CASCADE;
                END IF;
                
                -- Fix competencies
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'competencies_user_id_fkey') THEN
                    ALTER TABLE competencies DROP CONSTRAINT competencies_user_id_fkey;
                    ALTER TABLE competencies ADD CONSTRAINT competencies_user_id_fkey FOREIGN KEY (user_id) REFERENCES individuals(id) ON DELETE CASCADE;
                END IF;
                
                -- Fix development_plans
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'development_plans_user_id_fkey') THEN
                    ALTER TABLE development_plans DROP CONSTRAINT development_plans_user_id_fkey;
                    ALTER TABLE development_plans ADD CONSTRAINT development_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES individuals(id) ON DELETE CASCADE;
                END IF;
                
                -- Fix training_records
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_records_user_id_fkey') THEN
                    ALTER TABLE training_records DROP CONSTRAINT training_records_user_id_fkey;
                    ALTER TABLE training_records ADD CONSTRAINT training_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES individuals(id) ON DELETE CASCADE;
                END IF;
            END $$;
        """)
        
        # Add missing columns to achievements to match frontend
        cur.execute("""
            ALTER TABLE achievements ADD COLUMN IF NOT EXISTS title VARCHAR(255);
            ALTER TABLE achievements ADD COLUMN IF NOT EXISTS achievement_type VARCHAR(100);
            ALTER TABLE achievements ADD COLUMN IF NOT EXISTS impact_level VARCHAR(50);
            ALTER TABLE achievements ADD COLUMN IF NOT EXISTS achievement_date DATE;
        """)
        
        # Ensure default admin user exists
        try:
            from auth import hash_password
            cur.execute("SELECT id FROM users WHERE email = 'admin@acme.com'")
            if not cur.fetchone():
                hashed = hash_password('admin123')
                cur.execute(
                    "INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, %s, %s)",
                    ("Admin", "admin@acme.com", hashed, "ADMIN")
                )
        except Exception as e:
            print("Failed to seed admin user:", e)
        
        conn.commit()
