import apiClient from './apiClient';

const teamsService = {
    // Get all teams
    getAll: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await apiClient.get(`/team-service/teams${params ? `?${params}` : ''}`);
        return response.data;
    },

    // Get team by ID
    getById: async (id) => {
        const response = await apiClient.get(`/team-service/teams/${id}`);
        return response.data;
    },

    // Create new team
    create: async (teamData) => {
        const response = await apiClient.post('/team-service/teams', teamData);
        return response.data;
    },

    // Update team
    update: async (id, teamData) => {
        const response = await apiClient.put(`/team-service/teams/${id}`, teamData);
        return response.data;
    },

    // Delete team
    delete: async (id) => {
        const response = await apiClient.delete(`/team-service/teams/${id}`);
        return response.data;
    },

    // Add member to team
    addMember: async (teamId, memberData) => {
        const response = await apiClient.post(`/team-service/teams/${teamId}/members`, memberData);
        return response.data;
    },

    // Remove member from team
    removeMember: async (teamId, memberId) => {
        const response = await apiClient.delete(`/team-service/teams/${teamId}/members/${memberId}`);
        return response.data;
    },
};

export default teamsService;
