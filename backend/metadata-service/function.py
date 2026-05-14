"""
Metadata Service - Manage team and individual metadata
Handles custom metadata fields for teams and individuals
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
    """Initialize database tables for metadata service"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Metadata table - flexible key-value storage
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
    
    # Create indexes for faster queries
    cur.execute('''
        CREATE INDEX IF NOT EXISTS idx_metadata_entity 
        ON metadata(entity_type, entity_id)
    ''')
    
    cur.execute('''
        CREATE INDEX IF NOT EXISTS idx_metadata_key 
        ON metadata(key)
    ''')
    
    conn.commit()
    cur.close()
    conn.close()

def validate_metadata(data, is_update=False):
    """Validate metadata"""
    errors = []
    
    if not is_update:
        if not data.get('entity_type'):
            errors.append('entity_type is required')
        if not data.get('entity_id'):
            errors.append('entity_id is required')
        if not data.get('key'):
            errors.append('key is required')
    
    if data.get('entity_type') and data['entity_type'] not in ['team', 'user', 'achievement']:
        errors.append('entity_type must be team, user, or achievement')
    
    if data.get('value_type') and data['value_type'] not in ['string', 'number', 'boolean', 'json', 'date']:
        errors.append('value_type must be string, number, boolean, json, or date')
    
    return errors

@app.route('/health', methods=['GET'])
@app.route('/api/metadata-service/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'metadata-service'}), 200

@app.route('/', methods=['GET'])
@app.route('/api/metadata-service', methods=['GET'])
def get_metadata():
    """Get metadata with optional filtering"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Build query with filters
        query = 'SELECT * FROM metadata WHERE 1=1'
        params = []
        
        # Filter by entity_type
        if request.args.get('entity_type'):
            query += ' AND entity_type = %s'
            params.append(request.args.get('entity_type'))
        
        # Filter by entity_id
        if request.args.get('entity_id'):
            query += ' AND entity_id = %s'
            params.append(int(request.args.get('entity_id')))
        
        # Filter by key
        if request.args.get('key'):
            query += ' AND key = %s'
            params.append(request.args.get('key'))
        
        # Filter by category
        if request.args.get('category'):
            query += ' AND category = %s'
            params.append(request.args.get('category'))
        
        # Filter by public/private
        if request.args.get('is_public'):
            query += ' AND is_public = %s'
            params.append(request.args.get('is_public').lower() == 'true')
        
        query += ' ORDER BY entity_type, entity_id, key'
        
        cur.execute(query, params)
        metadata = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return jsonify(metadata), 200
        
    except Exception as e:
        logger.error(f"Error fetching metadata: {str(e)}")
        return jsonify({'error': 'Failed to fetch metadata', 'message': str(e)}), 500

@app.route('/<int:metadata_id>', methods=['GET'])
@app.route('/api/metadata-service/<int:metadata_id>', methods=['GET'])
def get_metadata_by_id(metadata_id):
    """Get specific metadata by ID"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute('SELECT * FROM metadata WHERE id = %s', (metadata_id,))
        metadata = cur.fetchone()
        
        if not metadata:
            return jsonify({'error': 'Metadata not found'}), 404
        
        cur.close()
        conn.close()
        
        return jsonify(metadata), 200
        
    except Exception as e:
        logger.error(f"Error fetching metadata: {str(e)}")
        return jsonify({'error': 'Failed to fetch metadata', 'message': str(e)}), 500

@app.route('/', methods=['POST'])
@app.route('/api/metadata-service', methods=['POST'])
def create_metadata():
    """Create new metadata"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        
        # Validate data
        errors = validate_metadata(data)
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Insert metadata
        cur.execute('''
            INSERT INTO metadata 
            (entity_type, entity_id, key, value, value_type, category, is_public)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            data.get('entity_type'),
            data.get('entity_id'),
            data.get('key'),
            data.get('value'),
            data.get('value_type', 'string'),
            data.get('category'),
            data.get('is_public', True)
        ))
        
        metadata_id = cur.fetchone()['id']
        conn.commit()
        
        cur.close()
        conn.close()
        
        return jsonify({'id': metadata_id, 'message': 'Metadata created successfully'}), 201
        
    except psycopg2.IntegrityError:
        return jsonify({'error': 'Metadata with this key already exists for this entity'}), 400
    except Exception as e:
        logger.error(f"Error creating metadata: {str(e)}")
        return jsonify({'error': 'Failed to create metadata', 'message': str(e)}), 500

@app.route('/<int:metadata_id>', methods=['PUT'])
@app.route('/api/metadata-service/<int:metadata_id>', methods=['PUT'])
def update_metadata(metadata_id):
    """Update existing metadata"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        
        # Validate data
        errors = validate_metadata(data, is_update=True)
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if metadata exists
        cur.execute('SELECT id FROM metadata WHERE id = %s', (metadata_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Metadata not found'}), 404
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        for field in ['value', 'value_type', 'category', 'is_public']:
            if field in data:
                update_fields.append(f"{field} = %s")
                params.append(data[field])
        
        if update_fields:
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            params.append(metadata_id)
            
            query = f"UPDATE metadata SET {', '.join(update_fields)} WHERE id = %s"
            cur.execute(query, params)
            conn.commit()
        
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Metadata updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error updating metadata: {str(e)}")
        return jsonify({'error': 'Failed to update metadata', 'message': str(e)}), 500

@app.route('/<int:metadata_id>', methods=['DELETE'])
@app.route('/api/metadata-service/<int:metadata_id>', methods=['DELETE'])
def delete_metadata(metadata_id):
    """Delete metadata"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Check if metadata exists
        cur.execute('SELECT id FROM metadata WHERE id = %s', (metadata_id,))
        if not cur.fetchone():
            return jsonify({'error': 'Metadata not found'}), 404
        
        # Delete metadata
        cur.execute('DELETE FROM metadata WHERE id = %s', (metadata_id,))
        conn.commit()
        
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Metadata deleted successfully'}), 204
        
    except Exception as e:
        logger.error(f"Error deleting metadata: {str(e)}")
        return jsonify({'error': 'Failed to delete metadata', 'message': str(e)}), 500

@app.route('/bulk', methods=['POST'])
@app.route('/api/metadata-service/bulk', methods=['POST'])
def bulk_create_metadata():
    """Create multiple metadata entries at once"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        items = data.get('items', [])
        
        if not items:
            return jsonify({'error': 'No items provided'}), 400
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        created_ids = []
        errors = []
        
        for item in items:
            try:
                cur.execute('''
                    INSERT INTO metadata 
                    (entity_type, entity_id, key, value, value_type, category, is_public)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                ''', (
                    item.get('entity_type'),
                    item.get('entity_id'),
                    item.get('key'),
                    item.get('value'),
                    item.get('value_type', 'string'),
                    item.get('category'),
                    item.get('is_public', True)
                ))
                created_ids.append(cur.fetchone()['id'])
            except Exception as e:
                errors.append({'item': item, 'error': str(e)})
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'created_count': len(created_ids),
            'created_ids': created_ids,
            'errors': errors
        }), 201
        
    except Exception as e:
        logger.error(f"Error bulk creating metadata: {str(e)}")
        return jsonify({'error': 'Failed to bulk create metadata', 'message': str(e)}), 500

def handler(event, context):
    """Lambda handler function"""
    try:
        init_db()
    except Exception as e:
        logger.error(f"Database initialization error: {str(e)}")
    
    return serverless_wsgi.handle_request(app, event, context)

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5003)
