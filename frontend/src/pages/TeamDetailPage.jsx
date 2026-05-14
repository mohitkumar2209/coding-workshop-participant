import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Card, CardContent, Typography, Button, Grid, Chip,
    CircularProgress, Alert, Divider, Avatar, List, ListItem,
    ListItemAvatar, ListItemText, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, MenuItem, Select,
    FormControl, InputLabel, Tooltip, LinearProgress,
} from '@mui/material';
import {
    ArrowBack as BackIcon, Add as AddIcon, Delete as DeleteIcon,
    LocationOn as LocationIcon, Person as PersonIcon, Edit as EditIcon,
    EmojiEvents as AchievementsIcon,
} from '@mui/icons-material';
import teamsService from '../services/teamsService';
import achievementsService from '../services/achievementsService';
import usersService from '../services/usersService';
import authService from '../services/authService';

const TeamDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    const canEdit = ['ADMIN', 'MANAGER'].includes(currentUser?.role);

    const [team, setTeam] = useState(null);
    const [achievements, setAchievements] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Add member dialog
    const [memberDialogOpen, setMemberDialogOpen] = useState(false);
    const [memberForm, setMemberForm] = useState({ user_id: '', role: 'MEMBER', is_direct_staff: true, location: '' });
    const [savingMember, setSavingMember] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [teamData, achievementsData, usersData] = await Promise.all([
                teamsService.getById(id),
                achievementsService.getAll({ team_id: id }),
                usersService.getAll(),
            ]);
            setTeam(teamData);
            setAchievements(achievementsData);
            setAllUsers(usersData);
        } catch (err) {
            setError('Failed to load team details.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async () => {
        if (!memberForm.user_id) return;
        setSavingMember(true);
        try {
            await teamsService.addMember(id, memberForm);
            setMemberDialogOpen(false);
            setMemberForm({ user_id: '', role: 'MEMBER', is_direct_staff: true, location: '' });
            fetchData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add member.');
        } finally {
            setSavingMember(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        try {
            await teamsService.removeMember(id, memberId);
            fetchData();
        } catch (err) {
            setError('Failed to remove member.');
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!team) {
        return (
            <Box>
                <Alert severity="error">Team not found.</Alert>
                <Button startIcon={<BackIcon />} onClick={() => navigate('/teams')} sx={{ mt: 2 }}>
                    Back to Teams
                </Button>
            </Box>
        );
    }

    const nonDirectRatio = team.member_count > 0
        ? ((team.non_direct_count / team.member_count) * 100).toFixed(1)
        : 0;

    const teamMembers = allUsers.filter(u => u.team_id == team.id);
    
    // Users not already in team
    const availableUsers = allUsers.filter(u => u.team_id != team.id);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <IconButton onClick={() => navigate('/teams')}>
                    <BackIcon />
                </IconButton>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" fontWeight={700}>{team.name}</Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        {team.department && <Chip label={team.department} size="small" color="primary" variant="outlined" />}
                        {team.location && (
                            <Chip icon={<LocationIcon />} label={team.location} size="small" variant="outlined" />
                        )}
                    </Box>
                </Box>
                {canEdit && (
                    <Button variant="outlined" startIcon={<EditIcon />} onClick={() => navigate('/teams')}>
                        Edit Team
                    </Button>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

            <Grid container spacing={3}>
                {/* Team Info */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" fontWeight={600} gutterBottom>Team Info</Typography>
                            <Divider sx={{ mb: 2 }} />
                            {team.description && (
                                <Typography variant="body2" color="text.secondary" mb={2}>{team.description}</Typography>
                            )}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Location</Typography>
                                    <Typography variant="body2">{team.location || '—'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Department</Typography>
                                    <Typography variant="body2">{team.department || '—'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Organization Leader</Typography>
                                    <Typography variant="body2">{team.organization_leader || '—'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Total Members</Typography>
                                    <Typography variant="body2">{team.member_count}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        Non-Direct Staff Ratio
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.min(parseFloat(nonDirectRatio), 100)}
                                            color={parseFloat(nonDirectRatio) > 20 ? 'warning' : 'primary'}
                                            sx={{ flex: 1, height: 8, borderRadius: 4 }}
                                        />
                                        <Typography variant="body2" fontWeight={600}>{nonDirectRatio}%</Typography>
                                    </Box>
                                    {parseFloat(nonDirectRatio) > 20 && (
                                        <Chip label="Above 20% threshold" size="small" color="warning" sx={{ mt: 0.5 }} />
                                    )}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>

                    {/* Achievements Summary */}
                    <Card sx={{ mt: 2 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="h6" fontWeight={600}>Achievements</Typography>
                                <Chip label={achievements.length} color="primary" size="small" />
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            {achievements.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">No achievements yet.</Typography>
                            ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(level => {
                                        const count = achievements.filter(a => a.impact_level === level).length;
                                        if (count === 0) return null;
                                        return (
                                            <Box key={level} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Chip
                                                    label={level}
                                                    size="small"
                                                    color={level === 'CRITICAL' ? 'error' : level === 'HIGH' ? 'warning' : level === 'MEDIUM' ? 'primary' : 'default'}
                                                />
                                                <Typography variant="body2">{count}</Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Members */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight={600}>
                                    Team Members ({teamMembers.length})
                                </Typography>
                                {canEdit && (
                                    <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setMemberDialogOpen(true)}>
                                        Add Member
                                    </Button>
                                )}
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            {teamMembers.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <PersonIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                    <Typography color="text.secondary">No members yet.</Typography>
                                </Box>
                            ) : (
                                <List disablePadding>
                                    {teamMembers.map((user, idx) => {
                                        const isLeader = user.id === team.leader_id;
                                        const isNotColocated = user.location && user.location !== team.location;
                                        return (
                                            <React.Fragment key={user.id}>
                                                <ListItem
                                                    disablePadding
                                                    sx={{ py: 1.5 }}
                                                    secondaryAction={
                                                        canEdit && (
                                                            <Tooltip title="Remove member">
                                                                <IconButton edge="end" size="small" color="error" onClick={() => handleRemoveMember(user.id)}>
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )
                                                    }
                                                >
                                                    <ListItemAvatar>
                                                        <Avatar sx={{ bgcolor: isLeader ? 'primary.main' : 'grey.300' }}>
                                                            {user.name.charAt(0)}
                                                        </Avatar>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                                <Typography variant="body2" fontWeight={600}>
                                                                    {user.name}
                                                                </Typography>
                                                                {isLeader && <Chip label="Team Leader" size="small" color="primary" />}
                                                                {!user.is_direct_staff && <Chip label="Non-Direct" size="small" color="warning" variant="outlined" />}
                                                                {isNotColocated && <Chip label="Remote" size="small" color="info" variant="outlined" />}
                                                            </Box>
                                                        }
                                                        secondary={
                                                            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                                                <Typography variant="caption" color="text.secondary">{user.role}</Typography>
                                                                {user.location && (
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        📍 {user.location}
                                                                    </Typography>
                                                                )}
                                                                <Typography variant="caption" color="text.secondary">
                                                                    ✉️ {user.email}
                                                                </Typography>
                                                            </Box>
                                                        }
                                                    />
                                                </ListItem>
                                                {idx < teamMembers.length - 1 && <Divider />}
                                            </React.Fragment>
                                        );
                                    })}
                                </List>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Achievements */}
                    <Card sx={{ mt: 2 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" fontWeight={600}>Recent Achievements</Typography>
                                <Button size="small" onClick={() => navigate('/achievements')}>View All</Button>
                            </Box>
                            <Divider sx={{ mb: 2 }} />
                            {achievements.length === 0 ? (
                                <Typography color="text.secondary" variant="body2">No achievements recorded.</Typography>
                            ) : (
                                <List disablePadding>
                                    {achievements.slice(0, 5).map((a, idx) => (
                                        <React.Fragment key={a.id}>
                                            <ListItem disablePadding sx={{ py: 1 }}>
                                                <ListItemAvatar>
                                                    <Avatar sx={{ bgcolor: 'success.light', width: 36, height: 36 }}>
                                                        <AchievementsIcon fontSize="small" />
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={a.title}
                                                    secondary={
                                                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                                            <Chip
                                                                label={a.impact_level}
                                                                size="small"
                                                                color={a.impact_level === 'CRITICAL' ? 'error' : a.impact_level === 'HIGH' ? 'warning' : 'primary'}
                                                            />
                                                            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                                                                {new Date(a.achievement_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                            {idx < Math.min(achievements.length, 5) - 1 && <Divider />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Add Member Dialog */}
            <Dialog open={memberDialogOpen} onClose={() => setMemberDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        <FormControl fullWidth>
                            <InputLabel>Select Employee *</InputLabel>
                            <Select
                                value={memberForm.user_id}
                                label="Select Employee *"
                                onChange={e => setMemberForm({ ...memberForm, user_id: e.target.value })}
                            >
                                {availableUsers.map(u => (
                                    <MenuItem key={u.id} value={u.id}>{u.name} ({u.email})</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select
                                value={memberForm.role}
                                label="Role"
                                onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}
                            >
                                {['MEMBER', 'LEAD', 'SENIOR', 'JUNIOR', 'INTERN'].map(r => (
                                    <MenuItem key={r} value={r}>{r}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel>Staff Type</InputLabel>
                            <Select
                                value={memberForm.is_direct_staff}
                                label="Staff Type"
                                onChange={e => setMemberForm({ ...memberForm, is_direct_staff: e.target.value })}
                            >
                                <MenuItem value={true}>Direct Staff</MenuItem>
                                <MenuItem value={false}>Non-Direct Staff</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Location"
                            value={memberForm.location}
                            onChange={e => setMemberForm({ ...memberForm, location: e.target.value })}
                            fullWidth
                            placeholder="e.g. New York, Remote"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setMemberDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddMember} disabled={savingMember || !memberForm.user_id}>
                        {savingMember ? <CircularProgress size={20} /> : 'Add Member'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TeamDetailPage;
