import apiClient from './apiClient';

const metadataService = {
    // Get all metadata
    getAll: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await apiClient.get(`/team-service/metadata${params ? `?${params}` : ''}`);
        return response.data;
    },

    // Get metadata by ID
    getById: async (id) => {
        const response = await apiClient.get(`/team-service/metadata/${id}`);
        return response.data;
    },

    // Create new metadata
    create: async (metadataData) => {
        const response = await apiClient.post('/team-service/metadata', metadataData);
        return response.data;
    },

    // Update metadata
    update: async (id, metadataData) => {
        const response = await apiClient.put(`/team-service/metadata/${id}`, metadataData);
        return response.data;
    },

    // Delete metadata
    delete: async (id) => {
        const response = await apiClient.delete(`/team-service/metadata/${id}`);
        return response.data;
    },

    // Bulk create metadata
    bulkCreate: async (items) => {
        const response = await apiClient.post('/team-service/metadata/bulk', { items });
        return response.data;
    },
};

export default metadataService;
