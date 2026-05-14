import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
    (response) => {
        // Axios sometimes leaves data as a string if Content-Type is missing
        let data = response.data;
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                // Ignore parse errors, leave as string
            }
        }

        // Handle raw Lambda proxy payload from LocalStack
        if (data && typeof data === 'object' && 'statusCode' in data && 'body' in data) {
            const statusCode = data.statusCode;
            let body = data.body;
            try {
                if (typeof body === 'string') body = JSON.parse(body);
            } catch (e) {
                // Keep as string
            }
            
            if (statusCode >= 400) {
                const error = new Error(body?.error || 'API Error');
                error.response = { status: statusCode, data: body };
                
                if (statusCode === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
            
            response.status = statusCode;
            response.data = body;
        } else {
            response.data = data; // Assign the parsed JSON if it wasn't wrapped
        }
        return response;
    },

    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default apiClient;
