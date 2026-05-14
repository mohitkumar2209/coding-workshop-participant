import apiClient from './apiClient';

const achievementsService = {
    // Get all achievements
    getAll: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await apiClient.get(`/team-service/achievements${params ? `?${params}` : ''}`);
        return response.data;
    },

    // Get achievement by ID
    getById: async (id) => {
        const response = await apiClient.get(`/team-service/achievements/${id}`);
        return response.data;
    },

    // Create new achievement
    create: async (achievementData) => {
        const response = await apiClient.post('/team-service/achievements', achievementData);
        return response.data;
    },

    // Update achievement
    update: async (id, achievementData) => {
        const response = await apiClient.put(`/team-service/achievements/${id}`, achievementData);
        return response.data;
    },

    // Delete achievement
    delete: async (id) => {
        const response = await apiClient.delete(`/team-service/achievements/${id}`);
        return response.data;
    },

    // Get achievement statistics
    getStats: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await apiClient.get(`/team-service/achievements/stats${params ? `?${params}` : ''}`);
        return response.data;
    },
};

export default achievementsService;
