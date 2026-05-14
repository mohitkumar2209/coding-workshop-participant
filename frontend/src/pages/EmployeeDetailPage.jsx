import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Grid, Card, CardContent, Typography, Button, Chip, CircularProgress,
    Alert, Divider, Avatar, List, ListItem, ListItemText, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    FormControl, InputLabel, Select, MenuItem, Tab, Tabs,
} from '@mui/material';
import {
    ArrowBack as BackIcon, Add as AddIcon, Star as StarIcon,
    School as SchoolIcon, Assignment as PlanIcon, Psychology as SkillIcon,
} from '@mui/icons-material';
import usersService from '../services/usersService';
import authService from '../services/authService';

const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
        {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
);

const EmployeeDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    const canManage = ['ADMIN', 'MANAGER'].includes(currentUser?.role);

    const [allUsers, setAllUsers] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [plans, setPlans] = useState([]);
    const [competencies, setCompetencies] = useState([]);
    const [training, setTraining] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState(0);

    // Review dialog
    const [reviewDialog, setReviewDialog] = useState(false);
    const [reviewForm, setReviewForm] = useState({ rating: 5, feedback: '' });
    const [savingReview, setSavingReview] = useState(false);

    // Plan dialog
    const [planDialog, setPlanDialog] = useState(false);
    const [planForm, setPlanForm] = useState({ goal: '', status: 'IN_PROGRESS', target_date: '' });
    const [savingPlan, setSavingPlan] = useState(false);

    // Competency dialog
    const [compDialog, setCompDialog] = useState(false);
    const [compForm, setCompForm] = useState({ skill_name: '', skill_level: 3 });
    const [savingComp, setSavingComp] = useState(false);

    // Training dialog
    const [trainingDialog, setTrainingDialog] = useState(false);
    const [trainingForm, setTrainingForm] = useState({ training_name: '', completion_date: '', status: 'IN_PROGRESS' });
    const [savingTraining, setSavingTraining] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersData, reviewsData, plansData, compsData, trainingData] = await Promise.all([
                usersService.getAll(),
                usersService.getPerformanceReviews(id),
                usersService.getDevelopmentPlans(id),
                usersService.getCompetencies(id),
                usersService.getTrainingRecords(id),
            ]);
            setAllUsers(usersData);
            setReviews(reviewsData);
            setPlans(plansData);
            setCompetencies(compsData);
            setTraining(trainingData);
        } catch (err) {
            setError('Failed to load employee data.');
        } finally {
            setLoading(false);
        }
    };

    const employee = allUsers.find(u => u.id === parseInt(id));

    const handleAddReview = async () => {
        setSavingReview(true);
        try {
            await usersService.createPerformanceReview({
                user_id: parseInt(id),
                rating: parseInt(reviewForm.rating),
                feedback: reviewForm.feedback,
            });
            setReviewDialog(false);
            setReviewForm({ rating: 5, feedback: '' });
            fetchData();
        } catch (err) {
            setError('Failed to add review.');
        } finally {
            setSavingReview(false);
        }
    };

    const handleAddPlan = async () => {
        setSavingPlan(true);
        try {
            await usersService.createDevelopmentPlan({
                user_id: parseInt(id),
                goal: planForm.goal,
                status: planForm.status,
                target_date: planForm.target_date || null,
            });
            setPlanDialog(false);
            setPlanForm({ goal: '', status: 'IN_PROGRESS', target_date: '' });
            fetchData();
        } catch (err) {
            setError('Failed to add development plan.');
        } finally {
            setSavingPlan(false);
        }
    };

    const handleAddCompetency = async () => {
        setSavingComp(true);
        try {
            await usersService.createCompetency({
                user_id: parseInt(id),
                skill_name: compForm.skill_name,
                skill_level: parseInt(compForm.skill_level),
            });
            setCompDialog(false);
            setCompForm({ skill_name: '', skill_level: 3 });
            fetchData();
        } catch (err) {
            setError('Failed to add competency.');
        } finally {
            setSavingComp(false);
        }
    };

    const handleAddTraining = async () => {
        setSavingTraining(true);
        try {
            await usersService.createTrainingRecord({
                user_id: parseInt(id),
                training_name: trainingForm.training_name,
                completion_date: trainingForm.completion_date || null,
                status: trainingForm.status,
            });
            setTrainingDialog(false);
            setTrainingForm({ training_name: '', completion_date: '', status: 'IN_PROGRESS' });
            fetchData();
        } catch (err) {
            setError('Failed to add training record.');
        } finally {
            setSavingTraining(false);
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
    }

    const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <IconButton onClick={() => navigate('/employees')}><BackIcon /></IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" fontWeight={700}>
                        {employee?.name || `Employee #${id}`}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        {employee?.role && (
                            <Chip label={employee.role} size="small" color={employee.role === 'ADMIN' ? 'error' : employee.role === 'MANAGER' ? 'warning' : 'primary'} />
                        )}
                        {employee?.team && <Chip label={employee.team} size="small" variant="outlined" />}
                    </Box>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

            <Grid container spacing={3}>
                {/* Profile Card */}
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem', mx: 'auto', mb: 2 }}>
                                {employee?.name?.charAt(0) || '?'}
                            </Avatar>
                            <Typography variant="h6" fontWeight={600}>{employee?.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{employee?.email}</Typography>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'left' }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Reviews</Typography>
                                    <Typography variant="body2" fontWeight={600}>{reviews.length}</Typography>
                                </Box>
                                {avgRating && (
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">Avg Rating</Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                                            <Typography variant="body2" fontWeight={600}>{avgRating}/5</Typography>
                                        </Box>
                                    </Box>
                                )}
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Dev Plans</Typography>
                                    <Typography variant="body2" fontWeight={600}>{plans.length}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Skills</Typography>
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
                                <Tab icon={<StarIcon fontSize="small" />} iconPosition="start" label={`Reviews (${reviews.length})`} />
                                <Tab icon={<PlanIcon fontSize="small" />} iconPosition="start" label={`Dev Plans (${plans.length})`} />
                                <Tab icon={<SkillIcon fontSize="small" />} iconPosition="start" label={`Skills (${competencies.length})`} />
                                <Tab icon={<SchoolIcon fontSize="small" />} iconPosition="start" label={`Training (${training.length})`} />
                            </Tabs>
                        </Box>
                        <CardContent>
                            {/* Reviews Tab */}
                            <TabPanel value={tab} index={0}>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                                    {canManage && (
                                        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setReviewDialog(true)}>
                                            Add Review
                                        </Button>
                                    )}
                                </Box>
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

                            {/* Dev Plans Tab */}
                            <TabPanel value={tab} index={1}>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                                    {canManage && (
                                        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setPlanDialog(true)}>
                                            Add Plan
                                        </Button>
                                    )}
                                </Box>
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
                                                                <Chip
                                                                    label={p.status}
                                                                    size="small"
                                                                    color={p.status === 'COMPLETED' ? 'success' : p.status === 'IN_PROGRESS' ? 'primary' : 'default'}
                                                                />
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

                            {/* Skills Tab */}
                            <TabPanel value={tab} index={2}>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                                    {canManage && (
                                        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setCompDialog(true)}>
                                            Add Skill
                                        </Button>
                                    )}
                                </Box>
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
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        {[1, 2, 3, 4, 5].map(l => (
                                                            <Box key={l} sx={{
                                                                flex: 1, height: 8, borderRadius: 1,
                                                                bgcolor: l <= c.skill_level ? 'primary.main' : 'grey.200',
                                                            }} />
                                                        ))}
                                                    </Box>
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                )}
                            </TabPanel>

                            {/* Training Tab */}
                            <TabPanel value={tab} index={3}>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                                    {canManage && (
                                        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setTrainingDialog(true)}>
                                            Add Training
                                        </Button>
                                    )}
                                </Box>
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
                                                                <Chip
                                                                    label={t.status}
                                                                    size="small"
                                                                    color={t.status === 'COMPLETED' ? 'success' : t.status === 'IN_PROGRESS' ? 'primary' : 'default'}
                                                                />
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

            {/* Review Dialog */}
            <Dialog open={reviewDialog} onClose={() => setReviewDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Performance Review</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            label="Rating (1-5)"
                            type="number"
                            inputProps={{ min: 1, max: 5 }}
                            value={reviewForm.rating}
                            onChange={e => setReviewForm({ ...reviewForm, rating: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            label="Feedback"
                            value={reviewForm.feedback}
                            onChange={e => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                            fullWidth
                            multiline
                            rows={4}
                            required
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setReviewDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddReview} disabled={savingReview}>
                        {savingReview ? <CircularProgress size={20} /> : 'Submit Review'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dev Plan Dialog */}
            <Dialog open={planDialog} onClose={() => setPlanDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Development Plan</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            label="Goal *"
                            value={planForm.goal}
                            onChange={e => setPlanForm({ ...planForm, goal: e.target.value })}
                            fullWidth
                            multiline
                            rows={3}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select value={planForm.status} label="Status" onChange={e => setPlanForm({ ...planForm, status: e.target.value })}>
                                <MenuItem value="NOT_STARTED">Not Started</MenuItem>
                                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                                <MenuItem value="COMPLETED">Completed</MenuItem>
                                <MenuItem value="ON_HOLD">On Hold</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Target Date"
                            type="date"
                            value={planForm.target_date}
                            onChange={e => setPlanForm({ ...planForm, target_date: e.target.value })}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setPlanDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddPlan} disabled={savingPlan}>
                        {savingPlan ? <CircularProgress size={20} /> : 'Add Plan'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Competency Dialog */}
            <Dialog open={compDialog} onClose={() => setCompDialog(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Add Skill</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            label="Skill Name *"
                            value={compForm.skill_name}
                            onChange={e => setCompForm({ ...compForm, skill_name: e.target.value })}
                            fullWidth
                        />
                        <TextField
                            label="Skill Level (1-5)"
                            type="number"
                            inputProps={{ min: 1, max: 5 }}
                            value={compForm.skill_level}
                            onChange={e => setCompForm({ ...compForm, skill_level: e.target.value })}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setCompDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddCompetency} disabled={savingComp}>
                        {savingComp ? <CircularProgress size={20} /> : 'Add Skill'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Training Dialog */}
            <Dialog open={trainingDialog} onClose={() => setTrainingDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Training Record</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <TextField
                            label="Training Name *"
                            value={trainingForm.training_name}
                            onChange={e => setTrainingForm({ ...trainingForm, training_name: e.target.value })}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select value={trainingForm.status} label="Status" onChange={e => setTrainingForm({ ...trainingForm, status: e.target.value })}>
                                <MenuItem value="NOT_STARTED">Not Started</MenuItem>
                                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                                <MenuItem value="COMPLETED">Completed</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Completion Date"
                            type="date"
                            value={trainingForm.completion_date}
                            onChange={e => setTrainingForm({ ...trainingForm, completion_date: e.target.value })}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setTrainingDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddTraining} disabled={savingTraining}>
                        {savingTraining ? <CircularProgress size={20} /> : 'Add Training'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EmployeeDetailPage;
