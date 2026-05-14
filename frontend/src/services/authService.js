import apiClient from './apiClient';

const authService = {
    // Login user
    login: async (email, password) => {
        const response = await apiClient.post('/team-service/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    // Register new user
    register: async (userData) => {
        const response = await apiClient.post('/team-service/auth/register', userData);
        return response.data;
    },

    // Logout user
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    // Get current user
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    // Check if user has specific role
    hasRole: (roles) => {
        const user = authService.getCurrentUser();
        if (!user) return false;
        return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles;
    },
};

export default authService;
