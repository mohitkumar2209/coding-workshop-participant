"""
Seed script - Populates the database with sample data for development/testing.
Run: python backend/seed.py
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from werkzeug.security import generate_password_hash
from datetime import date, timedelta
import random

# DB config
config = {
    "host": os.environ.get("POSTGRES_HOST", "localhost"),
    "port": os.environ.get("POSTGRES_PORT", "5432"),
    "user": os.environ.get("POSTGRES_USER", "postgres"),
    "password": os.environ.get("POSTGRES_PASS", "postgres"),
    "dbname": os.environ.get("POSTGRES_NAME", "postgres"),
}

def get_conn():
    return psycopg2.connect(**config, cursor_factory=RealDictCursor)

def seed():
    conn = get_conn()
    cur = conn.cursor()

    print("🌱 Seeding database...")

    # ── Users ──────────────────────────────────────────────────────────────────
    users = [
        ("Admin User",    "admin@acme.com",    "ADMIN",    "Management"),
        ("Alice Manager", "alice@acme.com",    "MANAGER",  "Engineering"),
        ("Bob Manager",   "bob@acme.com",      "MANAGER",  "Marketing"),
        ("Carol Smith",   "carol@acme.com",    "EMPLOYEE", "Engineering"),
        ("David Jones",   "david@acme.com",    "EMPLOYEE", "Engineering"),
        ("Eve Wilson",    "eve@acme.com",      "EMPLOYEE", "Marketing"),
        ("Frank Brown",   "frank@acme.com",    "EMPLOYEE", "Marketing"),
        ("Grace Lee",     "grace@acme.com",    "EMPLOYEE", "Engineering"),
        ("Henry Taylor",  "henry@acme.com",    "EMPLOYEE", "Design"),
        ("Iris Chen",     "iris@acme.com",     "MANAGER",  "Design"),
    ]

    user_ids = []
    for name, email, role, team in users:
        cur.execute('SELECT id FROM users WHERE email = %s', (email,))
        existing = cur.fetchone()
        if existing:
            user_ids.append(existing['id'])
            print(f"  ↩ User already exists: {email}")
        else:
            cur.execute(
                'INSERT INTO users (name, email, password_hash, role, team) VALUES (%s,%s,%s,%s,%s) RETURNING id',
                (name, email, generate_password_hash('password123'), role, team)
            )
            uid = cur.fetchone()['id']
            user_ids.append(uid)
            print(f"  ✓ Created user: {name}")
    conn.commit()

    # ── Teams ──────────────────────────────────────────────────────────────────
    teams_data = [
        ("Alpha Engineering", "Core product engineering team", "New York",    "Engineering", user_ids[1], "VP Engineering"),
        ("Beta Marketing",    "Digital marketing team",        "San Francisco","Marketing",   user_ids[2], "VP Marketing"),
        ("Gamma Design",      "UX/UI design team",             "Remote",       "Design",      user_ids[9], "VP Product"),
        ("Delta DevOps",      "Infrastructure and DevOps",     "New York",     "Engineering", user_ids[1], "VP Engineering"),
    ]

    team_ids = []
    for name, desc, loc, dept, leader_id, org_leader in teams_data:
        cur.execute('SELECT id FROM teams WHERE name = %s', (name,))
        existing = cur.fetchone()
        if existing:
            team_ids.append(existing['id'])
            print(f"  ↩ Team already exists: {name}")
        else:
            cur.execute('''
                INSERT INTO teams (name, description, location, department, team_leader_id, organization_leader)
                VALUES (%s,%s,%s,%s,%s,%s) RETURNING id
            ''', (name, desc, loc, dept, leader_id, org_leader))
            tid = cur.fetchone()['id']
            team_ids.append(tid)
            print(f"  ✓ Created team: {name}")
    conn.commit()

    # ── Team Members ───────────────────────────────────────────────────────────
    members = [
        # Alpha Engineering
        (team_ids[0], user_ids[1], "LEAD",   True,  "New York"),
        (team_ids[0], user_ids[3], "SENIOR", True,  "New York"),
        (team_ids[0], user_ids[4], "MEMBER", True,  "Boston"),      # different location
        (team_ids[0], user_ids[7], "MEMBER", False, "New York"),    # non-direct
        # Beta Marketing
        (team_ids[1], user_ids[2], "LEAD",   True,  "San Francisco"),
        (team_ids[1], user_ids[5], "MEMBER", True,  "San Francisco"),
        (team_ids[1], user_ids[6], "MEMBER", False, "San Francisco"),# non-direct
        # Gamma Design
        (team_ids[2], user_ids[9], "LEAD",   True,  "Remote"),
        (team_ids[2], user_ids[8], "MEMBER", True,  "Remote"),
        # Delta DevOps
        (team_ids[3], user_ids[1], "LEAD",   False, "Chicago"),     # non-direct leader
        (team_ids[3], user_ids[3], "MEMBER", True,  "New York"),
    ]

    for team_id, user_id, role, is_direct, location in members:
        cur.execute('SELECT id FROM team_members WHERE team_id=%s AND user_id=%s', (team_id, user_id))
        if not cur.fetchone():
            cur.execute('''
                INSERT INTO team_members (team_id, user_id, role, is_direct_staff, location)
                VALUES (%s,%s,%s,%s,%s)
            ''', (team_id, user_id, role, is_direct, location))
    conn.commit()
    print("  ✓ Team members seeded")

    # ── Achievements ───────────────────────────────────────────────────────────
    today = date.today()
    achievements = [
        (team_ids[0], "Launched v2.0 API",          "Complete rewrite of core API",       "DELIVERY",   "CRITICAL", date(today.year, 1, 15)),
        (team_ids[0], "Reduced latency by 40%",     "Performance optimization sprint",    "PERFORMANCE","HIGH",     date(today.year, 2, 20)),
        (team_ids[0], "Zero downtime deployment",   "Implemented blue-green deployment",  "INNOVATION", "HIGH",     date(today.year, 3, 10)),
        (team_ids[1], "Q1 Campaign 200% ROI",       "Digital campaign exceeded targets",  "DELIVERY",   "CRITICAL", date(today.year, 1, 28)),
        (team_ids[1], "Brand refresh launched",     "New brand identity rolled out",      "INNOVATION", "HIGH",     date(today.year, 2, 14)),
        (team_ids[2], "Design system v1.0",         "Launched company design system",     "INNOVATION", "HIGH",     date(today.year, 3, 5)),
        (team_ids[2], "Accessibility audit passed", "WCAG 2.1 AA compliance achieved",   "QUALITY",    "MEDIUM",   date(today.year, 4, 1)),
        (team_ids[3], "99.99% uptime achieved",     "Infrastructure reliability goal met","RELIABILITY","CRITICAL", date(today.year, 2, 28)),
        (team_ids[3], "CI/CD pipeline upgraded",    "Deployment time cut by 60%",         "PERFORMANCE","HIGH",     date(today.year, 4, 15)),
        (team_ids[0], "Security audit passed",      "Zero critical vulnerabilities",      "QUALITY",    "HIGH",     date(today.year, 5, 1)),
    ]

    for team_id, title, desc, atype, impact, adate in achievements:
        cur.execute('SELECT id FROM achievements WHERE title=%s AND team_id=%s', (title, team_id))
        if not cur.fetchone():
            cur.execute('''
                INSERT INTO achievements
                (team_id, title, description, achievement_type, impact_level, achievement_date, month, year, created_by)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ''', (team_id, title, desc, atype, impact, adate, adate.month, adate.year, user_ids[0]))
    conn.commit()
    print("  ✓ Achievements seeded")

    # ── Performance Reviews ────────────────────────────────────────────────────
    reviews = [
        (user_ids[3], user_ids[1], 5, "Excellent work on the API rewrite. Highly proactive."),
        (user_ids[4], user_ids[1], 4, "Good performance, needs to improve documentation."),
        (user_ids[5], user_ids[2], 5, "Outstanding campaign results. Creative and driven."),
        (user_ids[6], user_ids[2], 3, "Meets expectations. Room for growth in analytics."),
        (user_ids[7], user_ids[1], 4, "Strong technical skills. Good team player."),
        (user_ids[8], user_ids[9], 5, "Exceptional design quality. Great attention to detail."),
    ]

    for user_id, reviewer_id, rating, feedback in reviews:
        cur.execute('SELECT id FROM performance_reviews WHERE user_id=%s AND reviewer_id=%s', (user_id, reviewer_id))
        if not cur.fetchone():
            cur.execute('''
                INSERT INTO performance_reviews (user_id, reviewer_id, rating, feedback)
                VALUES (%s,%s,%s,%s)
            ''', (user_id, reviewer_id, rating, feedback))
    conn.commit()
    print("  ✓ Performance reviews seeded")

    # ── Development Plans ──────────────────────────────────────────────────────
    plans = [
        (user_ids[3], "Complete AWS Solutions Architect certification", "IN_PROGRESS", date(today.year, 12, 31)),
        (user_ids[4], "Improve public speaking skills",                 "NOT_STARTED", date(today.year, 9, 30)),
        (user_ids[5], "Learn advanced data analytics",                  "IN_PROGRESS", date(today.year, 8, 31)),
        (user_ids[7], "Lead a cross-functional project",                "NOT_STARTED", date(today.year, 11, 30)),
        (user_ids[8], "Master Figma advanced prototyping",              "COMPLETED",   date(today.year, 3, 31)),
    ]

    for user_id, goal, status, target in plans:
        cur.execute('SELECT id FROM development_plans WHERE user_id=%s AND goal=%s', (user_id, goal))
        if not cur.fetchone():
            cur.execute('''
                INSERT INTO development_plans (user_id, goal, status, target_date)
                VALUES (%s,%s,%s,%s)
            ''', (user_id, goal, status, target))
    conn.commit()
    print("  ✓ Development plans seeded")

    # ── Competencies ───────────────────────────────────────────────────────────
    competencies = [
        (user_ids[3], "Python",         5),
        (user_ids[3], "PostgreSQL",     4),
        (user_ids[3], "AWS",            3),
        (user_ids[4], "JavaScript",     4),
        (user_ids[4], "React",          4),
        (user_ids[5], "SEO",            5),
        (user_ids[5], "Google Ads",     4),
        (user_ids[7], "Docker",         4),
        (user_ids[7], "Kubernetes",     3),
        (user_ids[8], "Figma",          5),
        (user_ids[8], "User Research",  4),
    ]

    for user_id, skill, level in competencies:
        cur.execute('SELECT id FROM competencies WHERE user_id=%s AND skill_name=%s', (user_id, skill))
        if not cur.fetchone():
            cur.execute('''
                INSERT INTO competencies (user_id, skill_name, skill_level)
                VALUES (%s,%s,%s)
            ''', (user_id, skill, level))
    conn.commit()
    print("  ✓ Competencies seeded")

    # ── Training Records ───────────────────────────────────────────────────────
    training = [
        (user_ids[3], "AWS Cloud Practitioner",     date(today.year, 2, 15), "COMPLETED"),
        (user_ids[3], "Advanced Python Patterns",   None,                    "IN_PROGRESS"),
        (user_ids[4], "React Advanced Patterns",    date(today.year, 1, 20), "COMPLETED"),
        (user_ids[5], "Google Analytics 4",         date(today.year, 3, 10), "COMPLETED"),
        (user_ids[7], "CKA - Kubernetes Admin",     None,                    "IN_PROGRESS"),
        (user_ids[8], "Design Thinking Workshop",   date(today.year, 2, 28), "COMPLETED"),
    ]

    for user_id, name, comp_date, status in training:
        cur.execute('SELECT id FROM training_records WHERE user_id=%s AND training_name=%s', (user_id, name))
        if not cur.fetchone():
            cur.execute('''
                INSERT INTO training_records (user_id, training_name, completion_date, status)
                VALUES (%s,%s,%s,%s)
            ''', (user_id, name, comp_date, status))
    conn.commit()
    print("  ✓ Training records seeded")

    cur.close()
    conn.close()
    print("\n✅ Database seeded successfully!")
    print("\nDemo login credentials:")
    print("  Admin:   admin@acme.com  / password123")
    print("  Manager: alice@acme.com  / password123")
    print("  Employee: carol@acme.com / password123")

if __name__ == "__main__":
    seed()
