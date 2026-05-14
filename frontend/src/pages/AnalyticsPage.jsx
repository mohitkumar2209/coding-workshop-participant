import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Card, CardContent, Typography, CircularProgress,
    Alert, Chip, Divider, FormControl, InputLabel, Select, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    LinearProgress,
} from '@mui/material';
import {
    TrendingUp as TrendingUpIcon,
    Groups as GroupsIcon,
    EmojiEvents as AchievementsIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import teamsService from '../services/teamsService';
import achievementsService from '../services/achievementsService';
import usersService from '../services/usersService';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const AnalyticsPage = () => {
    const [teams, setTeams] = useState([]);
    const [achievements, setAchievements] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [teamsData, achievementsData, usersData] = await Promise.all([
                teamsService.getAll(),
                achievementsService.getAll(),
                usersService.getAll(),
            ]);
            setTeams(teamsData);
            setAchievements(achievementsData);
            setUsers(usersData);
        } catch (err) {
            setError('Failed to load analytics data.');
        } finally {
            setLoading(false);
        }
    };

    // Compute analytics
    const years = [...new Set(achievements.map(a => a.year))].sort((a, b) => b - a);
    const filteredAchievements = achievements.filter(a => a.year === selectedYear);

    // Achievements by month
    const achievementsByMonth = MONTHS.map((m, i) => ({
        month: m,
        count: filteredAchievements.filter(a => a.month === i + 1).length,
    }));
    const maxMonthCount = Math.max(...achievementsByMonth.map(m => m.count), 1);

    // Achievements by team
    const achievementsByTeam = teams.map(t => ({
        team: t,
        count: filteredAchievements.filter(a => a.team_id === t.id).length,
        critical: filteredAchievements.filter(a => a.team_id === t.id && a.impact_level === 'CRITICAL').length,
        high: filteredAchievements.filter(a => a.team_id === t.id && a.impact_level === 'HIGH').length,
    })).sort((a, b) => b.count - a.count);

    // Business questions answers
    const teamsLeaderNotColocated = teams.filter(t => {
        const leader = t.members?.find(m => m.user_id === t.team_leader_id);
        return leader && leader.location && leader.location !== t.location;
    });

    const teamsLeaderNonDirect = teams.filter(t => {
        const leader = t.members?.find(m => m.user_id === t.team_leader_id);
        return leader && !leader.is_direct_staff;
    });

    const teamsHighNonDirectRatio = teams.filter(t => (t.non_direct_ratio || 0) > 20);
    const teamsWithOrgLeader = teams.filter(t => t.organization_leader);

    // Impact distribution
    const impactCounts = {
        CRITICAL: filteredAchievements.filter(a => a.impact_level === 'CRITICAL').length,
        HIGH: filteredAchievements.filter(a => a.impact_level === 'HIGH').length,
        MEDIUM: filteredAchievements.filter(a => a.impact_level === 'MEDIUM').length,
        LOW: filteredAchievements.filter(a => a.impact_level === 'LOW').length,
    };
    const totalImpact = Object.values(impactCounts).reduce((s, v) => s + v, 0);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Analytics</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Organizational insights and performance metrics
                    </Typography>
                </Box>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Year</InputLabel>
                    <Select value={selectedYear} label="Year" onChange={e => setSelectedYear(e.target.value)}>
                        {years.length > 0
                            ? years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)
                            : <MenuItem value={new Date().getFullYear()}>{new Date().getFullYear()}</MenuItem>
                        }
                    </Select>
                </FormControl>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {/* Summary Cards */}
            <Grid container spacing={3} mb={4}>
                {[
                    { label: 'Total Teams', value: teams.length, icon: <GroupsIcon />, color: 'primary.main' },
                    { label: 'Total Employees', value: users.length, icon: <GroupsIcon />, color: 'secondary.main' },
                    { label: `Achievements (${selectedYear})`, value: filteredAchievements.length, icon: <AchievementsIcon />, color: 'success.main' },
                    { label: 'Teams with Org Leader', value: teamsWithOrgLeader.length, icon: <TrendingUpIcon />, color: 'warning.main' },
                ].map(card => (
                    <Grid item xs={12} sm={6} md={3} key={card.label}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                                        <Typography variant="h3" fontWeight={700} color={card.color}>{card.value}</Typography>
                                    </Box>
                                    <Box sx={{ color: card.color }}>{card.icon}</Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={3}>
                {/* Achievements by Month */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                Achievements by Month ({selectedYear})
                            </Typography>
                            <Divider sx={{ mb: 3 }} />
                            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 160 }}>
                                {achievementsByMonth.map(({ month, count }) => (
                                    <Box key={month} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">{count || ''}</Typography>
                                        <Box
                                            sx={{
                                                width: '100%',
                                                height: count > 0 ? `${(count / maxMonthCount) * 120}px` : '4px',
                                                bgcolor: count > 0 ? 'primary.main' : 'grey.200',
                                                borderRadius: '4px 4px 0 0',
                                                minHeight: 4,
                                                transition: 'height 0.3s',
                                            }}
                                        />
                                        <Typography variant="caption" color="text.secondary">{month}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Impact Distribution */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                Impact Distribution
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            {totalImpact === 0 ? (
                                <Typography color="text.secondary" variant="body2">No achievements for {selectedYear}.</Typography>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {Object.entries(impactCounts).map(([level, count]) => (
                                        <Box key={level}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                <Chip
                                                    label={level}
                                                    size="small"
                                                    color={level === 'CRITICAL' ? 'error' : level === 'HIGH' ? 'warning' : level === 'MEDIUM' ? 'primary' : 'default'}
                                                />
                                                <Typography variant="body2" fontWeight={600}>
                                                    {count} ({totalImpact > 0 ? ((count / totalImpact) * 100).toFixed(0) : 0}%)
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={totalImpact > 0 ? (count / totalImpact) * 100 : 0}
                                                color={level === 'CRITICAL' ? 'error' : level === 'HIGH' ? 'warning' : level === 'MEDIUM' ? 'primary' : 'inherit'}
                                                sx={{ height: 8, borderRadius: 4 }}
                                            />
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Business Questions */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                Business Questions Answered
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            {[
                                {
                                    question: 'Teams with leader not co-located with members',
                                    count: teamsLeaderNotColocated.length,
                                    teams: teamsLeaderNotColocated,
                                    isWarning: teamsLeaderNotColocated.length > 0,
                                },
                                {
                                    question: 'Teams with leader as non-direct staff',
                                    count: teamsLeaderNonDirect.length,
                                    teams: teamsLeaderNonDirect,
                                    isWarning: teamsLeaderNonDirect.length > 0,
                                },
                                {
                                    question: 'Teams with non-direct ratio above 20%',
                                    count: teamsHighNonDirectRatio.length,
                                    teams: teamsHighNonDirectRatio,
                                    isWarning: teamsHighNonDirectRatio.length > 0,
                                },
                                {
                                    question: 'Teams reporting to an organization leader',
                                    count: teamsWithOrgLeader.length,
                                    teams: teamsWithOrgLeader,
                                    isWarning: false,
                                },
                            ].map((item, idx) => (
                                <Box key={idx} sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {item.isWarning && <WarningIcon color="warning" fontSize="small" />}
                                            <Typography variant="body2">{item.question}</Typography>
                                        </Box>
                                        <Chip
                                            label={item.count}
                                            size="small"
                                            color={item.isWarning ? 'warning' : 'success'}
                                        />
                                    </Box>
                                    {item.teams.length > 0 && (
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', pl: 3 }}>
                                            {item.teams.map(t => (
                                                <Chip key={t.id} label={t.name} size="small" variant="outlined" />
                                            ))}
                                        </Box>
                                    )}
                                    {idx < 3 && <Divider sx={{ mt: 1.5 }} />}
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Achievements by Team */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                Achievements by Team ({selectedYear})
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                            {achievementsByTeam.length === 0 || achievementsByTeam.every(t => t.count === 0) ? (
                                <Typography color="text.secondary" variant="body2">No achievements for {selectedYear}.</Typography>
                            ) : (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Team</TableCell>
                                                <TableCell align="center">Total</TableCell>
                                                <TableCell align="center">Critical</TableCell>
                                                <TableCell align="center">High</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {achievementsByTeam.filter(t => t.count > 0).map(({ team, count, critical, high }) => (
                                                <TableRow key={team.id} hover>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={500}>{team.name}</Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip label={count} size="small" color="primary" />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {critical > 0 ? <Chip label={critical} size="small" color="error" /> : '—'}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {high > 0 ? <Chip label={high} size="small" color="warning" /> : '—'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AnalyticsPage;
