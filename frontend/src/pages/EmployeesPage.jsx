import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, Button, TextField, Dialog,
    DialogTitle, DialogContent, DialogActions, CircularProgress, Alert,
    Chip, IconButton, InputAdornment, MenuItem, Select, FormControl,
    InputLabel, Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Paper, Avatar, Tooltip,
} from '@mui/material';
import {
    Add as AddIcon, Search as SearchIcon, Visibility as ViewIcon,
    People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import usersService from '../services/usersService';
import authService from '../services/authService';

const ROLE_COLORS = {
    ADMIN: 'error', MANAGER: 'warning', EMPLOYEE: 'primary',
};

const EMPTY_FORM = {
    name: '', email: '', password: '', role: 'EMPLOYEE', team: '',
};

const EmployeesPage = () => {
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    const isAdmin = currentUser?.role === 'ADMIN';

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await usersService.getAll();
            setUsers(data);
        } catch (err) {
            setError('Failed to load employees.');
        } finally {
            setLoading(false);
        }
    };

    const filtered = users.filter(u => {
        const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            (u.team || '').toLowerCase().includes(search.toLowerCase());
        const matchRole = !filterRole || u.role === filterRole;
        return matchSearch && matchRole;
    });

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = 'Name is required';
        if (!formData.email.trim()) errors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Invalid email format';
        if (!formData.password) errors.password = 'Password is required';
        else if (formData.password.length < 6) errors.password = 'At least 6 characters';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        setSaving(true);
        try {
            await authService.register(formData);
            setDialogOpen(false);
            setFormData(EMPTY_FORM);
            fetchUsers();
        } catch (err) {
            setFormErrors({ submit: err.response?.data?.message || 'Failed to create employee.' });
        } finally {
            setSaving(false);
        }
    };

    const roleStats = {
        ADMIN: users.filter(u => u.role === 'ADMIN').length,
        MANAGER: users.filter(u => u.role === 'MANAGER').length,
        EMPLOYEE: users.filter(u => u.role === 'EMPLOYEE').length,
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>Employees</Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage your organization's workforce
                    </Typography>
                </Box>
                {isAdmin && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setFormData(EMPTY_FORM); setFormErrors({}); setDialogOpen(true); }}>
                        Add Employee
                    </Button>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

            {/* Stats Row */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                {Object.entries(roleStats).map(([role, count]) => (
                    <Card key={role} sx={{ minWidth: 140 }}>
                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="h4" fontWeight={700}>{count}</Typography>
                            <Chip label={role} size="small" color={ROLE_COLORS[role] || 'default'} />
                        </CardContent>
                    </Card>
                ))}
                <Card sx={{ minWidth: 140 }}>
                    <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="h4" fontWeight={700}>{users.length}</Typography>
                        <Typography variant="caption" color="text.secondary">Total</Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <TextField
                    placeholder="Search by name, email, team..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    size="small"
                    sx={{ minWidth: 280 }}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
                    }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Role</InputLabel>
                    <Select value={filterRole} label="Role" onChange={e => setFilterRole(e.target.value)}>
                        <MenuItem value="">All Roles</MenuItem>
                        <MenuItem value="ADMIN">Admin</MenuItem>
                        <MenuItem value="MANAGER">Manager</MenuItem>
                        <MenuItem value="EMPLOYEE">Employee</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {/* Table */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : filtered.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <PeopleIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">No employees found</Typography>
                </Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Employee</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Team</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filtered.map(user => (
                                <TableRow key={user.id} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: '0.9rem' }}>
                                                {user.name.charAt(0).toUpperCase()}
                                            </Avatar>
                                            <Typography variant="body2" fontWeight={500}>{user.name}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={user.role} size="small" color={ROLE_COLORS[user.role] || 'default'} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{user.team || '—'}</Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="View Profile">
                                            <IconButton size="small" onClick={() => navigate(`/employees/${user.id}`)}>
                                                <ViewIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Add Employee Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        {formErrors.submit && <Alert severity="error">{formErrors.submit}</Alert>}
                        <TextField
                            label="Full Name *"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            error={!!formErrors.name}
                            helperText={formErrors.name}
                            fullWidth
                        />
                        <TextField
                            label="Email Address *"
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            error={!!formErrors.email}
                            helperText={formErrors.email}
                            fullWidth
                        />
                        <TextField
                            label="Password *"
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            error={!!formErrors.password}
                            helperText={formErrors.password}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>Role</InputLabel>
                            <Select value={formData.role} label="Role" onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                <MenuItem value="EMPLOYEE">Employee</MenuItem>
                                <MenuItem value="MANAGER">Manager</MenuItem>
                                {isAdmin && <MenuItem value="ADMIN">Admin</MenuItem>}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Team"
                            value={formData.team}
                            onChange={e => setFormData({ ...formData, team: e.target.value })}
                            fullWidth
                            placeholder="e.g. Engineering"
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? <CircularProgress size={20} /> : 'Add Employee'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EmployeesPage;
