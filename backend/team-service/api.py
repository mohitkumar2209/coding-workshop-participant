import json
from db import get_connection

def json_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
        "body": json.dumps(body, default=str)
    }

def handle_metadata(event, user):
    conn = get_connection()
    method = event.get('httpMethod', 'GET')
    path_params = event.get('pathParameters') or {}
    meta_id = path_params.get('id')
    
    if method == 'GET':
        with conn.cursor() as cur:
            if meta_id:
                cur.execute("SELECT * FROM metadata WHERE id = %s", (meta_id,))
                meta = cur.fetchone()
                if not meta:
                    return json_response(404, {"error": "Metadata not found"})
                return json_response(200, meta)
            else:
                query_params = event.get('queryStringParameters') or {}
                if 'entity_type' in query_params and 'entity_id' in query_params:
                    cur.execute("SELECT * FROM metadata WHERE entity_type = %s AND entity_id = %s", 
                                (query_params['entity_type'], query_params['entity_id']))
                else:
                    cur.execute("SELECT * FROM metadata")
                return json_response(200, cur.fetchall())
                
    elif method == 'POST':
        if user['role'] in ['Viewer']:
            return json_response(403, {"error": "Forbidden"})
        body = json.loads(event.get('body', '{}'))
        required = ['entity_type', 'entity_id', 'key', 'value']
        if not all(k in body for k in required):
            return json_response(400, {"error": "Missing required fields"})
            
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO metadata (entity_type, entity_id, key, value) VALUES (%s, %s, %s, %s) RETURNING *",
                (body['entity_type'], body['entity_id'], body['key'], body['value'])
            )
            meta = cur.fetchone()
            conn.commit()
            return json_response(201, meta)
            
    elif method == 'DELETE':
        if user['role'] not in ['Admin', 'Manager']:
            return json_response(403, {"error": "Forbidden"})
        if not meta_id:
            return json_response(400, {"error": "Missing metadata ID"})
            
        with conn.cursor() as cur:
            cur.execute("DELETE FROM metadata WHERE id = %s RETURNING id", (meta_id,))
            if not cur.fetchone():
                return json_response(404, {"error": "Metadata not found"})
            conn.commit()
            return json_response(204, {})
            
    return json_response(405, {"error": "Method not allowed"})



def handle_teams(event, user):
    conn = get_connection()
    method = event.get('httpMethod', 'GET')
    path_params = event.get('pathParameters') or {}
    team_id = path_params.get('id')
    
    if method == 'GET':
        with conn.cursor() as cur:
            if team_id:
                cur.execute("SELECT * FROM teams WHERE id = %s", (team_id,))
                team = cur.fetchone()
                if not team:
                    return json_response(404, {"error": "Team not found"})
                return json_response(200, team)
            else:
                cur.execute("SELECT * FROM teams")
                return json_response(200, cur.fetchall())
                
    elif method == 'POST':
        if user['role'] in ['Viewer']:
            return json_response(403, {"error": "Forbidden"})
        body = json.loads(event.get('body', '{}'))
        required = ['name', 'location']
        if not all(k in body for k in required):
            return json_response(400, {"error": "Missing required fields"})
            
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO teams (name, location, leader_id) VALUES (%s, %s, %s) RETURNING *",
                (body['name'], body['location'], body.get('leader_id'))
            )
            team = cur.fetchone()
            conn.commit()
            return json_response(201, team)
            
    elif method == 'PUT':
        if user['role'] in ['Viewer']:
            return json_response(403, {"error": "Forbidden"})
        if not team_id:
            return json_response(400, {"error": "Missing team ID"})
        body = json.loads(event.get('body', '{}'))
        
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM teams WHERE id = %s", (team_id,))
            if not cur.fetchone():
                return json_response(404, {"error": "Team not found"})
                
            cur.execute(
                "UPDATE teams SET name = COALESCE(%s, name), location = COALESCE(%s, location), leader_id = COALESCE(%s, leader_id) WHERE id = %s RETURNING *",
                (body.get('name'), body.get('location'), body.get('leader_id'), team_id)
            )
            team = cur.fetchone()
            conn.commit()
            return json_response(200, team)
            
    elif method == 'DELETE':
        if user['role'] not in ['Admin', 'Manager']:
            return json_response(403, {"error": "Forbidden"})
        if not team_id:
            return json_response(400, {"error": "Missing team ID"})
            
        with conn.cursor() as cur:
            cur.execute("DELETE FROM teams WHERE id = %s RETURNING id", (team_id,))
            if not cur.fetchone():
                return json_response(404, {"error": "Team not found"})
            conn.commit()
            return json_response(204, {})
            
    return json_response(405, {"error": "Method not allowed"})

def handle_individuals(event, user):
    conn = get_connection()
    method = event.get('httpMethod', 'GET')
    path_params = event.get('pathParameters') or {}
    ind_id = path_params.get('id')
    
    if method == 'GET':
        with conn.cursor() as cur:
            if ind_id:
                cur.execute("SELECT * FROM individuals WHERE id = %s", (ind_id,))
                ind = cur.fetchone()
                if not ind:
                    return json_response(404, {"error": "Individual not found"})
                return json_response(200, ind)
            else:
                query_params = event.get('queryStringParameters') or {}
                if 'team_id' in query_params:
                    cur.execute("SELECT * FROM individuals WHERE team_id = %s", (query_params['team_id'],))
                else:
                    cur.execute("SELECT * FROM individuals")
                return json_response(200, cur.fetchall())
                
    elif method == 'POST':
        if user['role'] in ['Viewer']:
            return json_response(403, {"error": "Forbidden"})
        body = json.loads(event.get('body', '{}'))
        required = ['name', 'role', 'email', 'location']
        if not all(k in body for k in required):
            return json_response(400, {"error": "Missing required fields"})
            
        with conn.cursor() as cur:
            try:
                cur.execute(
                    "INSERT INTO individuals (name, role, email, team_id, location, is_direct_staff) VALUES (%s, %s, %s, %s, %s, %s) RETURNING *",
                    (body['name'], body['role'], body['email'], body.get('team_id'), body['location'], body.get('is_direct_staff', True))
                )
                ind = cur.fetchone()
                conn.commit()
                return json_response(201, ind)
            except Exception as e:
                conn.rollback()
                return json_response(400, {"error": str(e)})
            
    elif method == 'PUT':
        if user['role'] in ['Viewer']:
            return json_response(403, {"error": "Forbidden"})
        if not ind_id:
            return json_response(400, {"error": "Missing individual ID"})
        body = json.loads(event.get('body', '{}'))
        
        with conn.cursor() as cur:
            try:
                cur.execute("SELECT * FROM individuals WHERE id = %s", (ind_id,))
                if not cur.fetchone():
                    return json_response(404, {"error": "Individual not found"})
                    
                cur.execute(
                    "UPDATE individuals SET name = COALESCE(%s, name), role = COALESCE(%s, role), email = COALESCE(%s, email), team_id = %s, location = COALESCE(%s, location), is_direct_staff = COALESCE(%s, is_direct_staff) WHERE id = %s RETURNING *",
                    (body.get('name'), body.get('role'), body.get('email'), body.get('team_id'), body.get('location'), body.get('is_direct_staff'), ind_id)
                )
                ind = cur.fetchone()
                conn.commit()
                return json_response(200, ind)
            except Exception as e:
                conn.rollback()
                return json_response(400, {"error": str(e)})
            
    elif method == 'DELETE':
        if user['role'] not in ['Admin', 'Manager']:
            return json_response(403, {"error": "Forbidden"})
        if not ind_id:
            return json_response(400, {"error": "Missing individual ID"})
            
        with conn.cursor() as cur:
            cur.execute("DELETE FROM individuals WHERE id = %s RETURNING id", (ind_id,))
            if not cur.fetchone():
                return json_response(404, {"error": "Individual not found"})
            conn.commit()
            return json_response(204, {})
            
    return json_response(405, {"error": "Method not allowed"})

def handle_achievements(event, user):
    conn = get_connection()
    method = event.get('httpMethod', 'GET')
    path_params = event.get('pathParameters') or {}
    ach_id = path_params.get('id')
    
    if method == 'GET':
        with conn.cursor() as cur:
            if ach_id:
                cur.execute("SELECT * FROM achievements WHERE id = %s", (ach_id,))
                ach = cur.fetchone()
                if not ach:
                    return json_response(404, {"error": "Achievement not found"})
                return json_response(200, ach)
            else:
                query_params = event.get('queryStringParameters') or {}
                if 'team_id' in query_params:
                    cur.execute("SELECT * FROM achievements WHERE team_id = %s", (query_params['team_id'],))
                else:
                    cur.execute("SELECT * FROM achievements")
                return json_response(200, cur.fetchall())
                
    elif method == 'POST':
        if user['role'] in ['Viewer']:
            return json_response(403, {"error": "Forbidden"})
        body = json.loads(event.get('body', '{}'))
        required = ['team_id', 'month', 'year', 'description']
        if not all(k in body for k in required):
            return json_response(400, {"error": "Missing required fields"})
            
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO achievements (team_id, month, year, description) VALUES (%s, %s, %s, %s) RETURNING *",
                (body['team_id'], body['month'], body['year'], body['description'])
            )
            ach = cur.fetchone()
            conn.commit()
            return json_response(201, ach)
            
    elif method == 'DELETE':
        if user['role'] not in ['Admin', 'Manager']:
            return json_response(403, {"error": "Forbidden"})
        if not ach_id:
            return json_response(400, {"error": "Missing achievement ID"})
            
        with conn.cursor() as cur:
            cur.execute("DELETE FROM achievements WHERE id = %s RETURNING id", (ach_id,))
            if not cur.fetchone():
                return json_response(404, {"error": "Achievement not found"})
            conn.commit()
            return json_response(204, {})
            
    return json_response(405, {"error": "Method not allowed"})
