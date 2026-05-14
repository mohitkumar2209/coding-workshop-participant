import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Card, CardContent, Typography, Chip, CircularProgress,
    Alert, Divider, Avatar, List, ListItem, ListItemText, Tab, Tabs,
    LinearProgress,
} from '@mui/material';
import { Star as StarIcon } from '@mui/icons-material';
import usersService from '../services/usersService';
import authService from '../services/authService';

const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
        {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
);

const MyProfilePage = () => {
    const currentUser = authService.getCurrentUser();
    const [reviews, setReviews] = useState([]);
    const [plans, setPlans] = useState([]);
    const [competencies, setCompetencies] = useState([]);
    const [training, setTraining] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState(0);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [reviewsData, plansData, compsData, trainingData] = await Promise.all([
                usersService.getPerformanceReviews(),
                usersService.getDevelopmentPlans(),
                usersService.getCompetencies(),
                usersService.getTrainingRecords(),
            ]);
            console.log("PROFILE RAW DATA:", { reviewsData, plansData, compsData, trainingData });
            setReviews(Array.isArray(reviewsData) ? reviewsData : []);
            setPlans(Array.isArray(plansData) ? plansData : []);
            setCompetencies(Array.isArray(compsData) ? compsData : []);
            setTraining(Array.isArray(trainingData) ? trainingData : []);
        } catch (err) {
            setError('Failed to load your profile data.');
        } finally {
            setLoading(false);
        }
    };

    const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>My Profile</Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Grid container spacing={3}>
                {/* Profile Summary */}
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem', mx: 'auto', mb: 2 }}>
                                {currentUser?.name?.charAt(0)}
                            </Avatar>
                            <Typography variant="h6" fontWeight={600}>{currentUser?.name}</Typography>
                            <Chip label={currentUser?.role} size="small" color="primary" sx={{ mt: 0.5 }} />
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, textAlign: 'left' }}>
                                {avgRating && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Average Rating</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <StarIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                                            <Typography variant="body1" fontWeight={700}>{avgRating}/5</Typography>
                                        </Box>
                                    </Box>
                                )}
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Reviews Received</Typography>
                                    <Typography variant="body2" fontWeight={600}>{reviews.length}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Development Plans</Typography>
                                    <Typography variant="body2" fontWeight={600}>{plans.length}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Skills Tracked</Typography>
                                    <Typography variant="body2" fontWeight={600}>{competencies.length}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Trainings</Typography>
                                    <Typography variant="body2" fontWeight={600}>{training.length}</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Tabs */}
                <Grid item xs={12} md={9}>
                    <Card>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                                <Tab label={`Reviews (${reviews.length})`} />
                                <Tab label={`Dev Plans (${plans.length})`} />
                                <Tab label={`Skills (${competencies.length})`} />
                                <Tab label={`Training (${training.length})`} />
                            </Tabs>
                        </Box>
                        <CardContent>
                            {/* Reviews */}
                            <TabPanel value={tab} index={0}>
                                {reviews.length === 0 ? (
                                    <Typography color="text.secondary">No performance reviews yet.</Typography>
                                ) : (
                                    <List disablePadding>
                                        {reviews.map((r, idx) => (
                                            <React.Fragment key={r.id}>
                                                <ListItem disablePadding sx={{ py: 1.5 }}>
                                                    <ListItemText
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                {[1, 2, 3, 4, 5].map(s => (
                                                                    <StarIcon key={s} sx={{ fontSize: 18, color: s <= r.rating ? 'warning.main' : 'grey.300' }} />
                                                                ))}
                                                                <Typography variant="body2" fontWeight={600}>{r.rating}/5</Typography>
                                                            </Box>
                                                        }
                                                        secondary={
                                                            <>
                                                                <Typography variant="body2" sx={{ mt: 0.5 }}>{r.feedback}</Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {new Date(r.review_date).toLocaleDateString()}
                                                                </Typography>
                                                            </>
                                                        }
                                                    />
                                                </ListItem>
                                                {idx < reviews.length - 1 && <Divider />}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                )}
                            </TabPanel>

                            {/* Dev Plans */}
                            <TabPanel value={tab} index={1}>
                                {plans.length === 0 ? (
                                    <Typography color="text.secondary">No development plans yet.</Typography>
                                ) : (
                                    <List disablePadding>
                                        {plans.map((p, idx) => (
                                            <React.Fragment key={p.id}>
                                                <ListItem disablePadding sx={{ py: 1.5 }}>
                                                    <ListItemText
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Typography variant="body2" fontWeight={500}>{p.goal}</Typography>
                                                                <Chip label={p.status} size="small"
                                                                    color={p.status === 'COMPLETED' ? 'success' : p.status === 'IN_PROGRESS' ? 'primary' : 'default'} />
                                                            </Box>
                                                        }
                                                        secondary={p.target_date ? `Target: ${new Date(p.target_date).toLocaleDateString()}` : null}
                                                    />
                                                </ListItem>
                                                {idx < plans.length - 1 && <Divider />}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                )}
                            </TabPanel>

                            {/* Skills */}
                            <TabPanel value={tab} index={2}>
                                {competencies.length === 0 ? (
                                    <Typography color="text.secondary">No skills recorded yet.</Typography>
                                ) : (
                                    <Grid container spacing={2}>
                                        {competencies.map(c => (
                                            <Grid item xs={12} sm={6} key={c.id}>
                                                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                        <Typography variant="body2" fontWeight={600}>{c.skill_name}</Typography>
                                                        <Typography variant="body2" color="text.secondary">Level {c.skill_level}/5</Typography>
                                                    </Box>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={(c.skill_level / 5) * 100}
                                                        sx={{ height: 8, borderRadius: 4 }}
                                                    />
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                )}
                            </TabPanel>

                            {/* Training */}
                            <TabPanel value={tab} index={3}>
                                {training.length === 0 ? (
                                    <Typography color="text.secondary">No training records yet.</Typography>
                                ) : (
                                    <List disablePadding>
                                        {training.map((t, idx) => (
                                            <React.Fragment key={t.id}>
                                                <ListItem disablePadding sx={{ py: 1.5 }}>
                                                    <ListItemText
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Typography variant="body2" fontWeight={500}>{t.training_name}</Typography>
                                                                <Chip label={t.status} size="small"
                                                                    color={t.status === 'COMPLETED' ? 'success' : t.status === 'IN_PROGRESS' ? 'primary' : 'default'} />
                                                            </Box>
                                                        }
                                                        secondary={t.completion_date ? `Completed: ${new Date(t.completion_date).toLocaleDateString()}` : null}
                                                    />
                                                </ListItem>
                                                {idx < training.length - 1 && <Divider />}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                )}
                            </TabPanel>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default MyProfilePage;
