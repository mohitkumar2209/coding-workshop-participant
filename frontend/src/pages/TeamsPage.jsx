import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Card, CardContent, CardActions, Typography, Button,
    TextField, Dialog, DialogTitle, DialogContent, DialogActions,
    CircularProgress, Alert, Chip, IconButton, InputAdornment,
    MenuItem, Select, FormControl, InputLabel, Tooltip,
} from '@mui/material';
import {
    Add as AddIcon, Search as SearchIcon, Edit as EditIcon,
    Delete as DeleteIcon, Groups as GroupsIcon, LocationOn as LocationIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import teamsService from '../services/teamsService';
import authService from '../services/authService';

const EMPTY_FORM = {
    name: '', description: '', location: '', department: '', organization_leader: '',
};

const TeamsPage = () => {
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    const canEdit = ['ADMIN', 'MANAGER'].includes(currentUser?.role);

    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filterLocation, setFilterLocation] = useState('');
    const [filterDept, setFilterDept] = useState('');

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);

    // Delete dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingTeam, setDeletingTeam] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchTeams();
    }, [filterLocation, filterDept]);

    const fetchTeams = async () => {
        try {
            setLoading(true);
            const filters = {};
            if (filterLocation) filters.location = filterLocation;
            if (filterDept) filters.department = filterDept;
            const data = await teamsService.getAll(filters);
            setTeams(data);
        } catch (err) {
            setError('Failed to load teams.');
        } finally {
            setLoading(false);
        }
    };

    const filteredTeams = teams.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(search.toLowerCase())
    );

    const locations = [...new Set(teams.map(t => t.location).filter(Boolean))];
    const departments = [...new Set(teams.map(t => t.department).filter(Boolean))];

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Team name is required';
        else if (formData.name.trim().length < 3) errors.name = 'At least 3 characters';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleOpenCreate = () => {
        setEditingTeam(null);
        setFormData(EMPTY_FORM);
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleOpenEdit = (team) => {
        setEditingTeam(team);
        setFormData({
            name: team.name || '',
            description: team.description || '',
            location: team.location || '',
            department: team.department || '',
            organization_leader: team.organization_leader || '',
        });
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            if (editingTeam) {
                await teamsService.update(editingTeam.id, formData);
            } else {
                await teamsService.create(formData);
            }
            setDialogOpen(false);
            fetchTeams();
        } catch (err) {
            setFormErrors({ submit: err.response?.data?.error || 'Failed to save team.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        setDeleting(true);
        try {
            await teamsService.delete(deletingTeam.id);
            setDeleteDialogOpen(false);
            fetchTeams();
        } catch (err) {
            setError('Failed to delete team.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Teams</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage your organization's teams
                    </Typography>
                </Box>
                {canEdit && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                        New Team
                    </Button>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <TextField
                    placeholder="Search teams..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    size="small"
                    sx={{ minWidth: 240 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                        ),
                    }}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Location</InputLabel>
                    <Select value={filterLocation} label="Location" onChange={e => setFilterLocation(e.target.value)}>
                        <MenuItem value="">All Locations</MenuItem>
                        {locations.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Department</InputLabel>
                    <Select value={filterDept} label="Department" onChange={e => setFilterDept(e.target.value)}>
                        <MenuItem value="">All Departments</MenuItem>
                        {departments.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                    </Select>
                </FormControl>
            </Box>

            {/* Teams Grid */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : filteredTeams.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <GroupsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No teams found</Typography>
                    {canEdit && (
                        <Button variant="contained" startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={handleOpenCreate}>
                            Create First Team
                        </Button>
                    )}
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {filteredTeams.map(team => (
                        <Grid item xs={12} sm={6} md={4} key={team.id}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}>
                                <CardContent sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography variant="h6" fontWeight={600}>{team.name}</Typography>
                                        {team.department && (
                                            <Chip label={team.department} size="small" color="primary" variant="outlined" />
                                        )}
                                    </Box>
                                    {team.description && (
                                        <Typography variant="body2" color="text.secondary" mb={2} sx={{
                                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                        }}>
                                            {team.description}
                                        </Typography>
                                    )}
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {team.location && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <LocationIcon fontSize="small" color="action" />
                                                <Typography variant="caption" color="text.secondary">{team.location}</Typography>
                                            </Box>
                                        )}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <PersonIcon fontSize="small" color="action" />
                                            <Typography variant="caption" color="text.secondary">
                                                {team.member_count || 0} members
                                                {team.non_direct_ratio > 0 && ` · ${team.non_direct_ratio.toFixed(0)}% non-direct`}
                                            </Typography>
                                        </Box>
                                        {team.organization_leader && (
                                            <Typography variant="caption" color="text.secondary">
                                                Org Leader: {team.organization_leader}
                                            </Typography>
                                        )}
                                    </Box>
                                </CardContent>
                                <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'space-between' }}>
                                    <Button size="small" onClick={() => navigate(`/teams/${team.id}`)}>
                                        View Details
                                    </Button>
                                    {canEdit && (
                                        <Box>
                                            <Tooltip title="Edit">
                                                <IconButton size="small" onClick={() => handleOpenEdit(team)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton size="small" color="error" onClick={() => { setDeletingTeam(team); setDeleteDialogOpen(true); }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    )}
                                </CardActions>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        {formErrors.submit && <Alert severity="error">{formErrors.submit}</Alert>}
                        <TextField
                            label="Team Name *"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            error={!!formErrors.name}
                            helperText={formErrors.name}
                            fullWidth
                        />
                        <TextField
                            label="Description"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            fullWidth
                            multiline
                            rows={3}
                        />
                        <TextField
                            label="Location"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            fullWidth
                            placeholder="e.g. New York, Remote"
                        />
                        <TextField
                            label="Department"
                            value={formData.department}
                            onChange={e => setFormData({ ...formData, department: e.target.value })}
                            fullWidth
                            placeholder="e.g. Engineering, Marketing"
                        />
                        <TextField
                            label="Organization Leader"
                            value={formData.organization_leader}
                            onChange={e => setFormData({ ...formData, organization_leader: e.target.value })}
                            fullWidth
                            placeholder="e.g. Jane Smith"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? <CircularProgress size={20} /> : editingTeam ? 'Save Changes' : 'Create Team'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Delete Team</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete <strong>{deletingTeam?.name}</strong>? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDeleteConfirm} disabled={deleting}>
                        {deleting ? <CircularProgress size={20} /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TeamsPage;
