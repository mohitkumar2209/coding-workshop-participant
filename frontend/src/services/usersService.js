import apiClient from './apiClient';

const usersService = {
    // Get all users
    getAll: async () => {
        const response = await apiClient.get('/team-service/individuals');
        return response.data;
    },

    // Get performance reviews
    getPerformanceReviews: async (userId = null) => {
        const url = userId
            ? `/team-service/performance_reviews?user_id=${userId}`
            : '/team-service/performance_reviews';
        const response = await apiClient.get(url);
        return response.data;
    },

    // Create performance review
    createPerformanceReview: async (reviewData) => {
        const response = await apiClient.post('/team-service/performance_reviews', reviewData);
        return response.data;
    },

    // Get development plans
    getDevelopmentPlans: async (userId = null) => {
        const url = userId
            ? `/team-service/development_plans?user_id=${userId}`
            : '/team-service/development_plans';
        const response = await apiClient.get(url);
        return response.data;
    },

    // Create development plan
    createDevelopmentPlan: async (planData) => {
        const response = await apiClient.post('/team-service/development_plans', planData);
        return response.data;
    },

    // Get competencies
    getCompetencies: async (userId = null) => {
        const url = userId
            ? `/team-service/competencies?user_id=${userId}`
            : '/team-service/competencies';
        const response = await apiClient.get(url);
        return response.data;
    },

    // Create competency
    createCompetency: async (competencyData) => {
        const response = await apiClient.post('/team-service/competencies', competencyData);
        return response.data;
    },

    // Get training records
    getTrainingRecords: async (userId = null) => {
        const url = userId
            ? `/team-service/training_records?user_id=${userId}`
            : '/team-service/training_records';
        const response = await apiClient.get(url);
        return response.data;
    },

    // Create training record
    createTrainingRecord: async (trainingData) => {
        const response = await apiClient.post('/team-service/training_records', trainingData);
        return response.data;
    },
};

export default usersService;
