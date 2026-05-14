"""
Teams Service - CRUD operations for team management
Handles team creation, retrieval, updates, and deletion
"""

import os
import json
import logging
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, request, jsonify
from flask_cors import CORS
import serverless_wsgi

app = Flask(__name__)
CORS(app)

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def get_db_connection():
    """Create and return a PostgreSQL database connection"""
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
    """Initialize database tables for teams service"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Teams table
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
    
    # Team members junction table
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
    
    conn.commit()
    cur.close()
    conn.close()

def validate_team_data(data, is_update=False):
    """Validate team data"""
    errors = []
    
    if not is_update and not data.get('name'):
        errors.append('Team name is required')
    
    if data.get('name') and len(data['name']) < 3:
        errors.append('Team name must be at least 3 characters')
    
    return errors

@app.route('/health', methods=['GET'])
@app.route('/api/teams-service/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'teams-service'}), 200

@app.route('/', methods=['GET'])
@app.route('/api/teams-service', methods=['GET'])
def get_teams():
    """Get all teams with optional filtering"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Build query with filters
        query = 'SELECT * FROM teams WHERE 1=1'
        params = []
        
        # Filter by location
        if request.args.get('location'):
            query += ' AND location = %s'
            params.append(request.args.get('location'))
        
        # Filter by department
        if request.args.get('department'):
            query += ' AND department = %s'
            params.append(request.args.get('department'))
        
        # Filter by organization leader
        if request.args.get('organization_leader'):
            query += ' AND organization_leader = %s'
            params.append(request.args.get('organization_leader'))
        
        query += ' ORDER BY name'
        
        cur.execute(query, params)
        teams = cur.fetchall()
        
        # Get member counts for each team
        for team in teams:
            cur.execute('''
                SELECT COUNT(*) as member_count,
                       SUM(CASE WHEN is_direct_staff = FALSE THEN 1 ELSE 0 END) as non_direct_count
                FROM team_members 
                WHERE team_id = %s
            ''', (team['id'],))
            counts = cur.fetchone()
            team['member_count'] = counts['member_count'] or 0
            team['non_direct_count'] = counts['non_direct_count'] or 0
            team['non_direct_ratio'] = (counts['non_direct_count'] / counts['member_count'] * 100) if counts['member_count'] > 0 else 0
        
        cur.close()
        conn.close()
        
        return jsonify(teams), 200
        
    except Exception as e:
        logger.error(f"Error fetching teams: {str(e)}")
        return jsonify({'error': 'Failed to fetch teams', 'message': str(e)}), 500

@app.route('/<int:team_id>', methods=['GET'])
@app.route('/api/teams-service/<int:team_id>', methods=['GET'])
def get_team(team_id):
    """Get a specific team by ID with members"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get team details
        cur.execute('SELECT * FROM teams WHERE id = %s', (team_id,))
        team = cur.fetchone()
        
        if not team:
            return jsonify({'error': 'Team not found'}), 404
        
        # Get team members
        cur.execute('''
            SELECT tm.*, tm.user_id, tm.role, tm.is_direct_staff, tm.location
            FROM team_members tm
            WHERE tm.team_id = %s
            ORDER BY tm.joined_at
        ''', (team_id,))
        members = cur.fetchall()
        
        team['members'] = members
        team['member_count'] = len(members)
        team['non_direct_count'] = sum(1 for m in members if not m['is_direct_staff'])
        team['non_direct_ratio'] = (team['non_direct_count'] / team['member_count'] * 100) if team['member_count'] > 0 else 0
        
        cur.close()
        conn.close()
        
        return jsonify(team), 200
        
    except Exception as e:
        logger.error(f"Error fetching team: {str(e)}")
        return jsonify({'error': 'Failed to fetch team', 'message': str(e)}), 500

@app.route('/', methods=['POST'])
@app.route('/api/teams-service', methods=['POST'])
def create_team():
    """Create a new team"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        
        # Validate data
        errors = validate_team_data(data)
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Insert team
        cur.execute('''
            INSERT INTO teams (name, description, location, department, team_leader_id, organization_leader)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            data.get('name'),
            data.get('description'),
            data.get('location'),
            data.get('department'),
            data.get('team_leader_id'),
            data.get('organization_leader')
        ))
        
        team_id = cur.fetchone()['id']
        conn.commit()
        
        # Add team members if provided
        if data.get('members'):
            for member in data['members']:
                cur.execute('''
                    INSERT INTO team_members (team_id, user_id, role, is_direct_staff, location)
                    VALUES (%s, %s, %s, %s, %s)
                ''', (
                    team_id,
                    member.get('user_id'),
                    member.get('role', 'MEMBER'),
                    member.get('is_direct_staff', True),
                    member.get('location')
                ))
            conn.commit()
        
        cur.close()
        conn.close()
        
        return jsonify({'id': team_id, 'message': 'Team created successfully'}), 201
        
    except psycopg2.IntegrityError as e:
        logger.error(f"Integrity error: {str(e)}")
        return jsonify({'error': 'Team name already exists or invalid reference'}), 400
    except Exception as e:
        logger.error(f"Error creating team: {str(e)}")
        return jsonify({'error': 'Failed to create team', 'message': str(e)}), 500

@app.route('/<int:team_id>', methods=['PUT'])
@app.route('/api/teams-service/<int:team_id>', methods=['PUT'])
def update_team(team_id):
    """Update an existing team"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        
        # Validate data
        errors = validate_team_data(data, is_update=True)
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if team exists
        cur.execute('SELECT id FROM teams WHERE id = %s', (team_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Team not found'}), 404
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        for field in ['name', 'description', 'location', 'department', 'team_leader_id', 'organization_leader']:
            if field in data:
                update_fields.append(f"{field} = %s")
                params.append(data[field])
        
        if update_fields:
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            params.append(team_id)
            
            query = f"UPDATE teams SET {', '.join(update_fields)} WHERE id = %s"
            cur.execute(query, params)
            conn.commit()
        
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Team updated successfully'}), 200
        
    except psycopg2.IntegrityError as e:
        logger.error(f"Integrity error: {str(e)}")
        return jsonify({'error': 'Team name already exists or invalid reference'}), 400
    except Exception as e:
        logger.error(f"Error updating team: {str(e)}")
        return jsonify({'error': 'Failed to update team', 'message': str(e)}), 500

@app.route('/<int:team_id>', methods=['DELETE'])
@app.route('/api/teams-service/<int:team_id>', methods=['DELETE'])
def delete_team(team_id):
    """Delete a team"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if team exists
        cur.execute('SELECT id FROM teams WHERE id = %s', (team_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Team not found'}), 404
        
        # Delete team (cascade will delete members)
        cur.execute('DELETE FROM teams WHERE id = %s', (team_id,))
        conn.commit()
        
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Team deleted successfully'}), 204
        
    except Exception as e:
        logger.error(f"Error deleting team: {str(e)}")
        return jsonify({'error': 'Failed to delete team', 'message': str(e)}), 500

@app.route('/<int:team_id>/members', methods=['POST'])
@app.route('/api/teams-service/<int:team_id>/members', methods=['POST'])
def add_team_member(team_id):
    """Add a member to a team"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        
        if not data.get('user_id'):
            return jsonify({'error': 'user_id is required'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if team exists
        cur.execute('SELECT id FROM teams WHERE id = %s', (team_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Team not found'}), 404
        
        # Add member
        cur.execute('''
            INSERT INTO team_members (team_id, user_id, role, is_direct_staff, location)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            team_id,
            data.get('user_id'),
            data.get('role', 'MEMBER'),
            data.get('is_direct_staff', True),
            data.get('location')
        ))
        
        member_id = cur.fetchone()['id']
        conn.commit()
        
        cur.close()
        conn.close()
        
        return jsonify({'id': member_id, 'message': 'Member added successfully'}), 201
        
    except psycopg2.IntegrityError:
        return jsonify({'error': 'Member already exists in this team'}), 400
    except Exception as e:
        logger.error(f"Error adding team member: {str(e)}")
        return jsonify({'error': 'Failed to add team member', 'message': str(e)}), 500

@app.route('/<int:team_id>/members/<int:member_id>', methods=['DELETE'])
@app.route('/api/teams-service/<int:team_id>/members/<int:member_id>', methods=['DELETE'])
def remove_team_member(team_id, member_id):
    """Remove a member from a team"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Delete member
        cur.execute('DELETE FROM team_members WHERE id = %s AND team_id = %s', (member_id, team_id))
        
        if cur.rowcount == 0:
            return jsonify({'error': 'Member not found in this team'}), 404
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Member removed successfully'}), 204
        
    except Exception as e:
        logger.error(f"Error removing team member: {str(e)}")
        return jsonify({'error': 'Failed to remove team member', 'message': str(e)}), 500

def handler(event, context):
    """Lambda handler function"""
    try:
        init_db()
    except Exception as e:
        logger.error(f"Database initialization error: {str(e)}")
    
    return serverless_wsgi.handle_request(app, event, context)

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5001)
