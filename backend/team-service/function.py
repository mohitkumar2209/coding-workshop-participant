import json
import logging
from db import init_db
from auth import login_user, register_user, require_auth
from api import handle_teams, handle_individuals, handle_achievements, handle_metadata, json_response

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DB on cold start
try:
    init_db()
    db_initialized = True
except Exception as e:
    logger.error(f"Failed to initialize database: {e}")
    db_initialized = False

def handler(event, context=None):
    logger.info("Received event: %s", event)
    
    if not db_initialized:
        return json_response(500, {"error": "Database initialization failed"})
        
    path = event.get('path', event.get('rawPath', ''))
    method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', 'GET'))
    
    # Normalize event httpMethod
    event['httpMethod'] = method
    
    # Extract headers
    headers = event.get('headers', {})
    
    try:
        # Auth Routes
        if path.endswith('/auth/login') and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return json_response(*login_user(body.get('email'), body.get('password')))
            
        if path.endswith('/auth/register') and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return json_response(*register_user(body.get('email'), body.get('password'), body.get('role', 'Viewer')))
            
        # Require authentication for all other routes
        user, err = require_auth(headers)
        if err:
            return json_response(401, err)
            
        # API Routes
        if '/teams' in path:
            return handle_teams(event, user)
        elif '/individuals' in path:
            return handle_individuals(event, user)
        elif '/achievements' in path:
            return handle_achievements(event, user)
        elif '/metadata' in path:
            return handle_metadata(event, user)
            
        return json_response(404, {"error": "Not Found", "path": path})
        
    except json.JSONDecodeError:
        return json_response(400, {"error": "Invalid JSON in request body"})
    except Exception as e:
        logger.error(f"Error handling request: {e}", exc_info=True)
        return json_response(500, {"error": str(e)})

if __name__ == "__main__":
    print("Testing locally")
