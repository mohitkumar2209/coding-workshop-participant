import apiClient from './apiClient';

const usersService = {
    // Get all users
    getAll: async () => {
        const response = await apiClient.get('/team-service/individuals');
        return response.data;
    },

    // Create a new individual (HR record)
    createIndividual: async (individualData) => {
        const response = await apiClient.post('/team-service/individuals', individualData);
        return response.data;
    },

    // Get performance reviews
    getPerformanceReviews: async (userId = null) => {
        return [];
    },

    // Create performance review
    createPerformanceReview: async (reviewData) => {
        return { id: Date.now(), ...reviewData };
    },

    // Get development plans
    getDevelopmentPlans: async (userId = null) => {
        return [];
    },

    // Create development plan
    createDevelopmentPlan: async (planData) => {
        return { id: Date.now(), ...planData };
    },

    // Get competencies
    getCompetencies: async (userId = null) => {
        return [];
    },

    // Create competency
    createCompetency: async (competencyData) => {
        return { id: Date.now(), ...competencyData };
    },

    // Get training records
    getTrainingRecords: async (userId = null) => {
        return [];
    },

    // Create training record
    createTrainingRecord: async (trainingData) => {
        return { id: Date.now(), ...trainingData };
    },
};

export default usersService;
