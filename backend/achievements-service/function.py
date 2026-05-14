"""
Achievements Service - Track monthly team achievements
Handles achievement creation, retrieval, updates, and deletion
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
    """Initialize database tables for achievements service"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Achievements table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS achievements (
            id SERIAL PRIMARY KEY,
            team_id INTEGER NOT NULL,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            achievement_type VARCHAR(50),
            impact_level VARCHAR(20),
            achievement_date DATE NOT NULL,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            metrics JSONB,
            created_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create index for faster queries
    cur.execute('''
        CREATE INDEX IF NOT EXISTS idx_achievements_team_date 
        ON achievements(team_id, year, month)
    ''')
    
    conn.commit()
    cur.close()
    conn.close()

def validate_achievement_data(data, is_update=False):
    """Validate achievement data"""
    errors = []
    
    if not is_update:
        if not data.get('team_id'):
            errors.append('team_id is required')
        if not data.get('title'):
            errors.append('title is required')
        if not data.get('achievement_date'):
            errors.append('achievement_date is required')
    
    if data.get('title') and len(data['title']) < 5:
        errors.append('title must be at least 5 characters')
    
    if data.get('impact_level') and data['impact_level'] not in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']:
        errors.append('impact_level must be LOW, MEDIUM, HIGH, or CRITICAL')
    
    # Validate date format
    if data.get('achievement_date'):
        try:
            datetime.strptime(data['achievement_date'], '%Y-%m-%d')
        except ValueError:
            errors.append('achievement_date must be in YYYY-MM-DD format')
    
    return errors

@app.route('/health', methods=['GET'])
@app.route('/api/achievements-service/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'achievements-service'}), 200

@app.route('/', methods=['GET'])
@app.route('/api/achievements-service', methods=['GET'])
def get_achievements():
    """Get all achievements with optional filtering"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Build query with filters
        query = 'SELECT * FROM achievements WHERE 1=1'
        params = []
        
        # Filter by team_id
        if request.args.get('team_id'):
            query += ' AND team_id = %s'
            params.append(int(request.args.get('team_id')))
        
        # Filter by year
        if request.args.get('year'):
            query += ' AND year = %s'
            params.append(int(request.args.get('year')))
        
        # Filter by month
        if request.args.get('month'):
            query += ' AND month = %s'
            params.append(int(request.args.get('month')))
        
        # Filter by achievement_type
        if request.args.get('achievement_type'):
            query += ' AND achievement_type = %s'
            params.append(request.args.get('achievement_type'))
        
        # Filter by impact_level
        if request.args.get('impact_level'):
            query += ' AND impact_level = %s'
            params.append(request.args.get('impact_level'))
        
        query += ' ORDER BY achievement_date DESC, created_at DESC'
        
        cur.execute(query, params)
        achievements = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return jsonify(achievements), 200
        
    except Exception as e:
        logger.error(f"Error fetching achievements: {str(e)}")
        return jsonify({'error': 'Failed to fetch achievements', 'message': str(e)}), 500

@app.route('/<int:achievement_id>', methods=['GET'])
@app.route('/api/achievements-service/<int:achievement_id>', methods=['GET'])
def get_achievement(achievement_id):
    """Get a specific achievement by ID"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute('SELECT * FROM achievements WHERE id = %s', (achievement_id,))
        achievement = cur.fetchone()
        
        if not achievement:
            return jsonify({'error': 'Achievement not found'}), 404
        
        cur.close()
        conn.close()
        
        return jsonify(achievement), 200
        
    except Exception as e:
        logger.error(f"Error fetching achievement: {str(e)}")
        return jsonify({'error': 'Failed to fetch achievement', 'message': str(e)}), 500

@app.route('/', methods=['POST'])
@app.route('/api/achievements-service', methods=['POST'])
def create_achievement():
    """Create a new achievement"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        
        # Validate data
        errors = validate_achievement_data(data)
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400
        
        # Parse date to extract month and year
        achievement_date = datetime.strptime(data['achievement_date'], '%Y-%m-%d')
        month = achievement_date.month
        year = achievement_date.year
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Insert achievement
        cur.execute('''
            INSERT INTO achievements 
            (team_id, title, description, achievement_type, impact_level, 
             achievement_date, month, year, metrics, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            data.get('team_id'),
            data.get('title'),
            data.get('description'),
            data.get('achievement_type'),
            data.get('impact_level', 'MEDIUM'),
            data.get('achievement_date'),
            month,
            year,
            json.dumps(data.get('metrics', {})),
            data.get('created_by')
        ))
        
        achievement_id = cur.fetchone()['id']
        conn.commit()
        
        cur.close()
        conn.close()
        
        return jsonify({'id': achievement_id, 'message': 'Achievement created successfully'}), 201
        
    except Exception as e:
        logger.error(f"Error creating achievement: {str(e)}")
        return jsonify({'error': 'Failed to create achievement', 'message': str(e)}), 500

@app.route('/<int:achievement_id>', methods=['PUT'])
@app.route('/api/achievements-service/<int:achievement_id>', methods=['PUT'])
def update_achievement(achievement_id):
    """Update an existing achievement"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        
        # Validate data
        errors = validate_achievement_data(data, is_update=True)
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if achievement exists
        cur.execute('SELECT id FROM achievements WHERE id = %s', (achievement_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Achievement not found'}), 404
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        for field in ['team_id', 'title', 'description', 'achievement_type', 'impact_level', 'created_by']:
            if field in data:
                update_fields.append(f"{field} = %s")
                params.append(data[field])
        
        # Handle achievement_date separately to update month/year
        if 'achievement_date' in data:
            achievement_date = datetime.strptime(data['achievement_date'], '%Y-%m-%d')
            update_fields.extend(['achievement_date = %s', 'month = %s', 'year = %s'])
            params.extend([data['achievement_date'], achievement_date.month, achievement_date.year])
        
        # Handle metrics JSON field
        if 'metrics' in data:
            update_fields.append('metrics = %s')
            params.append(json.dumps(data['metrics']))
        
        if update_fields:
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            params.append(achievement_id)
            
            query = f"UPDATE achievements SET {', '.join(update_fields)} WHERE id = %s"
            cur.execute(query, params)
            conn.commit()
        
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Achievement updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error updating achievement: {str(e)}")
        return jsonify({'error': 'Failed to update achievement', 'message': str(e)}), 500

@app.route('/<int:achievement_id>', methods=['DELETE'])
@app.route('/api/achievements-service/<int:achievement_id>', methods=['DELETE'])
def delete_achievement(achievement_id):
    """Delete an achievement"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if achievement exists
        cur.execute('SELECT id FROM achievements WHERE id = %s', (achievement_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Achievement not found'}), 404
        
        # Delete achievement
        cur.execute('DELETE FROM achievements WHERE id = %s', (achievement_id,))
        conn.commit()
        
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Achievement deleted successfully'}), 204
        
    except Exception as e:
        logger.error(f"Error deleting achievement: {str(e)}")
        return jsonify({'error': 'Failed to delete achievement', 'message': str(e)}), 500

@app.route('/stats', methods=['GET'])
@app.route('/api/achievements-service/stats', methods=['GET'])
def get_achievement_stats():
    """Get achievement statistics"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Get stats by team
        team_id = request.args.get('team_id')
        year = request.args.get('year')
        
        query = '''
            SELECT 
                team_id,
                COUNT(*) as total_achievements,
                COUNT(CASE WHEN impact_level = 'CRITICAL' THEN 1 END) as critical_count,
                COUNT(CASE WHEN impact_level = 'HIGH' THEN 1 END) as high_count,
                COUNT(CASE WHEN impact_level = 'MEDIUM' THEN 1 END) as medium_count,
                COUNT(CASE WHEN impact_level = 'LOW' THEN 1 END) as low_count
            FROM achievements
            WHERE 1=1
        '''
        params = []
        
        if team_id:
            query += ' AND team_id = %s'
            params.append(int(team_id))
        
        if year:
            query += ' AND year = %s'
            params.append(int(year))
        
        query += ' GROUP BY team_id'
        
        cur.execute(query, params)
        stats = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"Error fetching achievement stats: {str(e)}")
        return jsonify({'error': 'Failed to fetch achievement stats', 'message': str(e)}), 500

def handler(event, context):
    """Lambda handler function"""
    try:
        init_db()
    except Exception as e:
        logger.error(f"Database initialization error: {str(e)}")
    
    return serverless_wsgi.handle_request(app, event, context)

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5002)
