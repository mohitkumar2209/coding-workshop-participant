import React, { useState, useEffect } from 'react';
import {
    Box, Grid, Card, CardContent, CardActions, Typography, Button,
    TextField, Dialog, DialogTitle, DialogContent, DialogActions,
    CircularProgress, Alert, Chip, IconButton, InputAdornment,
    MenuItem, Select, FormControl, InputLabel, Tooltip, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
    Add as AddIcon, Search as SearchIcon, Edit as EditIcon,
    Delete as DeleteIcon, EmojiEvents as AchievementsIcon,
    ViewList as ListIcon, ViewModule as GridIcon,
} from '@mui/icons-material';
import achievementsService from '../services/achievementsService';
import teamsService from '../services/teamsService';
import authService from '../services/authService';

const IMPACT_COLORS = {
    CRITICAL: 'error', HIGH: 'warning', MEDIUM: 'primary', LOW: 'default',
};

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const EMPTY_FORM = {
    team_id: '', title: '', description: '', achievement_type: '',
    impact_level: 'MEDIUM', achievement_date: new Date().toISOString().split('T')[0],
};

const AchievementsPage = () => {
    const currentUser = authService.getCurrentUser();
    const canEdit = ['ADMIN', 'MANAGER'].includes(currentUser?.role);

    const [achievements, setAchievements] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filterTeam, setFilterTeam] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState('');
    const [filterImpact, setFilterImpact] = useState('');
    const [viewMode, setViewMode] = useState('grid');

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);

    // Delete dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingItem, setDeletingItem] = useState(null);

    useEffect(() => {
        fetchData();
    }, [filterTeam, filterMonth, filterYear, filterImpact]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const filters = {};
            if (filterTeam) filters.team_id = filterTeam;
            if (filterMonth) filters.month = filterMonth;
            if (filterYear) filters.year = filterYear;
            if (filterImpact) filters.impact_level = filterImpact;

            const [achievementsData, teamsData] = await Promise.all([
                achievementsService.getAll(filters),
                teamsService.getAll(),
            ]);
            setAchievements(achievementsData);
            setTeams(teamsData);
        } catch (err) {
            setError('Failed to load achievements.');
        } finally {
            setLoading(false);
        }
    };

    const filtered = achievements.filter(a =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        (a.description || '').toLowerCase().includes(search.toLowerCase())
    );

    const validateForm = () => {
        const errors = {};
        if (!formData.team_id) errors.team_id = 'Team is required';
        if (!formData.title.trim()) errors.title = 'Title is required';
        else if (formData.title.trim().length < 5) errors.title = 'At least 5 characters';
        if (!formData.achievement_date) errors.achievement_date = 'Date is required';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleOpenCreate = () => {
        setEditingItem(null);
        setFormData(EMPTY_FORM);
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setFormData({
            team_id: item.team_id || '',
            title: item.title || '',
            description: item.description || '',
            achievement_type: item.achievement_type || '',
            impact_level: item.impact_level || 'MEDIUM',
            achievement_date: item.achievement_date?.split('T')[0] || '',
        });
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            if (editingItem) {
                await achievementsService.update(editingItem.id, formData);
            } else {
                await achievementsService.create(formData);
            }
            setDialogOpen(false);
            fetchData();
        } catch (err) {
            setFormErrors({ submit: err.response?.data?.error || 'Failed to save.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            await achievementsService.delete(deletingItem.id);
            setDeleteDialogOpen(false);
            fetchData();
        } catch (err) {
            setError('Failed to delete achievement.');
        }
    };

    const getTeamName = (teamId) => teams.find(t => t.id === teamId)?.name || `Team #${teamId}`;

    const years = [...new Set(achievements.map(a => a.year))].sort((a, b) => b - a);

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Achievements</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Track monthly team achievements
                    </Typography>
                </Box>
                {canEdit && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                        New Achievement
                    </Button>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                    placeholder="Search achievements..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    size="small"
                    sx={{ minWidth: 220 }}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                    }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Team</InputLabel>
                    <Select value={filterTeam} label="Team" onChange={e => setFilterTeam(e.target.value)}>
                        <MenuItem value="">All Teams</MenuItem>
                        {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Month</InputLabel>
                    <Select value={filterMonth} label="Month" onChange={e => setFilterMonth(e.target.value)}>
                        <MenuItem value="">All Months</MenuItem>
                        {MONTHS.map((m, i) => <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Year</InputLabel>
                    <Select value={filterYear} label="Year" onChange={e => setFilterYear(e.target.value)}>
                        <MenuItem value="">All Years</MenuItem>
                        {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Impact</InputLabel>
                    <Select value={filterImpact} label="Impact" onChange={e => setFilterImpact(e.target.value)}>
                        <MenuItem value="">All Levels</MenuItem>
                        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                    </Select>
                </FormControl>
                <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
                    <ToggleButton value="grid"><GridIcon fontSize="small" /></ToggleButton>
                    <ToggleButton value="list"><ListIcon fontSize="small" /></ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Content */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : filtered.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <AchievementsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No achievements found</Typography>
                    {canEdit && (
                        <Button variant="contained" startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={handleOpenCreate}>
                            Add First Achievement
                        </Button>
                    )}
                </Box>
            ) : viewMode === 'grid' ? (
                <Grid container spacing={3}>
                    {filtered.map(item => (
                        <Grid item xs={12} sm={6} md={4} key={item.id}>
                            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}>
                                <CardContent sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Chip
                                            label={item.impact_level}
                                            size="small"
                                            color={IMPACT_COLORS[item.impact_level] || 'default'}
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            {MONTHS[item.month - 1]} {item.year}
                                        </Typography>
                                    </Box>
                                    <Typography variant="h6" fontWeight={600} gutterBottom>{item.title}</Typography>
                                    {item.description && (
                                        <Typography variant="body2" color="text.secondary" sx={{
                                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                        }}>
                                            {item.description}
                                        </Typography>
                                    )}
                                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip label={getTeamName(item.team_id)} size="small" variant="outlined" />
                                        {item.achievement_type && (
                                            <Chip label={item.achievement_type} size="small" variant="outlined" color="secondary" />
                                        )}
                                    </Box>
                                </CardContent>
                                {canEdit && (
                                    <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'flex-end' }}>
                                        <Tooltip title="Edit">
                                            <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton size="small" color="error" onClick={() => { setDeletingItem(item); setDeleteDialogOpen(true); }}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </CardActions>
                                )}
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Title</TableCell>
                                <TableCell>Team</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Impact</TableCell>
                                <TableCell>Date</TableCell>
                                {canEdit && <TableCell align="right">Actions</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.map(item => (
                                <TableRow key={item.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={500}>{item.title}</Typography>
                                        {item.description && (
                                            <Typography variant="caption" color="text.secondary">{item.description.substring(0, 60)}...</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>{getTeamName(item.team_id)}</TableCell>
                                    <TableCell>{item.achievement_type || '—'}</TableCell>
                                    <TableCell>
                                        <Chip label={item.impact_level} size="small" color={IMPACT_COLORS[item.impact_level] || 'default'} />
                                    </TableCell>
                                    <TableCell>{MONTHS[item.month - 1]} {item.year}</TableCell>
                                    {canEdit && (
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={() => handleOpenEdit(item)}><EditIcon fontSize="small" /></IconButton>
                                            <IconButton size="small" color="error" onClick={() => { setDeletingItem(item); setDeleteDialogOpen(true); }}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingItem ? 'Edit Achievement' : 'New Achievement'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        {formErrors.submit && <Alert severity="error">{formErrors.submit}</Alert>}
                        <FormControl fullWidth error={!!formErrors.team_id}>
                            <InputLabel>Team *</InputLabel>
                            <Select value={formData.team_id} label="Team *" onChange={e => setFormData({ ...formData, team_id: e.target.value })}>
                                {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Title *"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            error={!!formErrors.title}
                            helperText={formErrors.title}
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
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    label="Achievement Type"
                                    value={formData.achievement_type}
                                    onChange={e => setFormData({ ...formData, achievement_type: e.target.value })}
                                    fullWidth
                                    placeholder="e.g. Innovation, Delivery"
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Impact Level</InputLabel>
                                    <Select value={formData.impact_level} label="Impact Level" onChange={e => setFormData({ ...formData, impact_level: e.target.value })}>
                                        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                        <TextField
                            label="Achievement Date *"
                            type="date"
                            value={formData.achievement_date}
                            onChange={e => setFormData({ ...formData, achievement_date: e.target.value })}
                            error={!!formErrors.achievement_date}
                            helperText={formErrors.achievement_date}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? <CircularProgress size={20} /> : editingItem ? 'Save Changes' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Delete Achievement</DialogTitle>
                <DialogContent>
                    <Typography>Are you sure you want to delete <strong>{deletingItem?.title}</strong>?</Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AchievementsPage;
