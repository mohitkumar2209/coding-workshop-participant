import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    CircularProgress,
    Alert,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Divider,
    Button,
} from '@mui/material';
import {
    Groups as GroupsIcon,
    People as PeopleIcon,
    EmojiEvents as AchievementsIcon,
    TrendingUp as TrendingUpIcon,
    Warning as WarningIcon,
    CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import teamsService from '../services/teamsService';
import achievementsService from '../services/achievementsService';
import usersService from '../services/usersService';
import authService from '../services/authService';

// Stat card component
const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%' }}>
        <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        {title}
                    </Typography>
                    <Typography variant="h3" fontWeight={700} color={color || 'text.primary'}>
                        {value}
                    </Typography>
                    {subtitle && (
                        <Typography variant="caption" color="text.secondary">
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: `${color || 'primary'}.50`,
                        color: color || 'primary.main',
                        display: 'flex',
                    }}
                >
                    {icon}
                </Box>
            </Box>
        </CardContent>
    </Card>
);

// Insight card for business questions
const InsightCard = ({ title, value, status, description }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5 }}>
        {status === 'warning' ? (
            <WarningIcon color="warning" />
        ) : (
            <CheckCircleIcon color="success" />
        )}
        <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={500}>{title}</Typography>
            <Typography variant="caption" color="text.secondary">{description}</Typography>
        </Box>
        <Chip
            label={value}
            size="small"
            color={status === 'warning' ? 'warning' : 'success'}
            variant="outlined"
        />
    </Box>
);

const DashboardPage = () => {
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    const isEmployee = currentUser?.role === 'EMPLOYEE';

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({
        totalTeams: 0,
        totalEmployees: 0,
        totalAchievements: 0,
        teamsLeaderNotColocated: 0,
        teamsLeaderNonDirect: 0,
        teamsHighNonDirectRatio: 0,
        teamsReportingToOrgLeader: 0,
    });
    const [recentAchievements, setRecentAchievements] = useState([]);
    const [myReviews, setMyReviews] = useState([]);

    useEffect(() => {
        if (isEmployee) {
            fetchEmployeeData();
        } else {
            fetchDashboardData();
        }
    }, []);

    const fetchEmployeeData = async () => {
        try {
            setLoading(true);
            const reviews = await usersService.getPerformanceReviews();
            setMyReviews(reviews);
        } catch (err) {
            setError('Failed to load your data.');
        } finally {
            setLoading(false);
        }
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [teams, users, achievements] = await Promise.all([
                teamsService.getAll(),
                usersService.getAll(),
                achievementsService.getAll(),
            ]);

            // Calculate business insights
            const teamsLeaderNotColocated = teams.filter(t => {
                const leader = t.members?.find(m => m.user_id === t.team_leader_id);
                return leader && leader.location !== t.location;
            }).length;

            const teamsLeaderNonDirect = teams.filter(t => {
                const leader = t.members?.find(m => m.user_id === t.team_leader_id);
                return leader && !leader.is_direct_staff;
            }).length;

            const teamsHighNonDirectRatio = teams.filter(t => (t.non_direct_ratio || 0) > 20).length;
            const teamsReportingToOrgLeader = teams.filter(t => t.organization_leader).length;

            setStats({
                totalTeams: teams.length,
                totalEmployees: users.length,
                totalAchievements: achievements.length,
                teamsLeaderNotColocated,
                teamsLeaderNonDirect,
                teamsHighNonDirectRatio,
                teamsReportingToOrgLeader,
            });

            // Get recent achievements (last 5)
            setRecentAchievements(achievements.slice(0, 5));
        } catch (err) {
            setError('Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    // Employee view
    if (isEmployee) {
        return (
            <Box>
                <Typography variant="h4" fontWeight={700} gutterBottom>
                    Welcome back, {currentUser?.name}!
                </Typography>
                <Typography variant="body1" color="text.secondary" mb={4}>
                    Here's your performance overview.
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    My Performance Reviews
                                </Typography>
                                {myReviews.length === 0 ? (
                                    <Typography color="text.secondary">No reviews yet.</Typography>
                                ) : (
                                    <List disablePadding>
                                        {myReviews.map((review, idx) => (
                                            <React.Fragment key={review.id}>
                                                <ListItem disablePadding sx={{ py: 1 }}>
                                                    <ListItemText
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <Typography variant="body2" fontWeight={600}>
                                                                    Rating: {review.rating}/5
                                                                </Typography>
                                                                <Chip
                                                                    label={review.rating >= 4 ? 'Excellent' : review.rating >= 3 ? 'Good' : 'Needs Improvement'}
                                                                    size="small"
                                                                    color={review.rating >= 4 ? 'success' : review.rating >= 3 ? 'primary' : 'warning'}
                                                                />
                                                            </Box>
                                                        }
                                                        secondary={
                                                            <>
                                                                <Typography variant="body2" color="text.secondary">{review.feedback}</Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {new Date(review.review_date).toLocaleDateString()}
                                                                </Typography>
                                                            </>
                                                        }
                                                    />
                                                </ListItem>
                                                {idx < myReviews.length - 1 && <Divider />}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    Quick Actions
                                </Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <Button variant="outlined" onClick={() => navigate('/my-profile')}>
                                        View My Profile
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        );
    }

    // Admin / Manager view
    return (
        <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
                Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
                Overview of your organization's team management.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Stats Row */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Teams"
                        value={stats.totalTeams}
                        icon={<GroupsIcon />}
                        color="primary"
                        subtitle="Active teams"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Total Employees"
                        value={stats.totalEmployees}
                        icon={<PeopleIcon />}
                        color="secondary"
                        subtitle="Registered users"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Achievements"
                        value={stats.totalAchievements}
                        icon={<AchievementsIcon />}
                        color="success"
                        subtitle="All time"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Reporting to Org Leader"
                        value={stats.teamsReportingToOrgLeader}
                        icon={<TrendingUpIcon />}
                        color="warning"
                        subtitle="Teams with org leader"
                    />
                </Grid>
            </Grid>

            {/* Business Insights + Recent Achievements */}
            <Grid container spacing={3}>
                {/* Business Insights */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                Organizational Insights
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                                Key metrics answering business questions
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            <InsightCard
                                title="Teams with leader not co-located"
                                value={stats.teamsLeaderNotColocated}
                                status={stats.teamsLeaderNotColocated > 0 ? 'warning' : 'ok'}
                                description="Team leader in different location than team"
                            />
                            <Divider />
                            <InsightCard
                                title="Teams with non-direct leader"
                                value={stats.teamsLeaderNonDirect}
                                status={stats.teamsLeaderNonDirect > 0 ? 'warning' : 'ok'}
                                description="Team leader is a non-direct staff member"
                            />
                            <Divider />
                            <InsightCard
                                title="Teams with >20% non-direct ratio"
                                value={stats.teamsHighNonDirectRatio}
                                status={stats.teamsHighNonDirectRatio > 0 ? 'warning' : 'ok'}
                                description="Non-direct staff to employee ratio above 20%"
                            />
                            <Divider />
                            <InsightCard
                                title="Teams reporting to org leader"
                                value={stats.teamsReportingToOrgLeader}
                                status="ok"
                                description="Teams with an assigned organization leader"
                            />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Achievements */}
                <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight={600}>
                                    Recent Achievements
                                </Typography>
                                <Button size="small" onClick={() => navigate('/achievements')}>
                                    View All
                                </Button>
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            {recentAchievements.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <AchievementsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                    <Typography color="text.secondary">No achievements yet.</Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        sx={{ mt: 2 }}
                                        onClick={() => navigate('/achievements')}
                                    >
                                        Add Achievement
                                    </Button>
                                </Box>
                            ) : (
                                <List disablePadding>
                                    {recentAchievements.map((achievement, idx) => (
                                        <React.Fragment key={achievement.id}>
                                            <ListItem disablePadding sx={{ py: 1 }}>
                                                <ListItemAvatar>
                                                    <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
                                                        <AchievementsIcon fontSize="small" />
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={achievement.title}
                                                    secondary={
                                                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                                            <Chip
                                                                label={achievement.impact_level}
                                                                size="small"
                                                                color={
                                                                    achievement.impact_level === 'CRITICAL' ? 'error' :
                                                                        achievement.impact_level === 'HIGH' ? 'warning' :
                                                                            achievement.impact_level === 'MEDIUM' ? 'primary' : 'default'
                                                                }
                                                            />
                                                            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                                                                {new Date(achievement.achievement_date).toLocaleDateString()}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                            {idx < recentAchievements.length - 1 && <Divider />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default DashboardPage;
