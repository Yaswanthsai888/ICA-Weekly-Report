import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Select, FormControl,
  InputLabel, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Chip, Tooltip, IconButton, Alert,
  Snackbar, Avatar,
} from '@mui/material';
import AddIcon        from '@mui/icons-material/Add';
import EditIcon       from '@mui/icons-material/Edit';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import PersonOffIcon  from '@mui/icons-material/PersonOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios';

// ── Constants ─────────────────────────────────────────────────────────────────
const STREAMS   = ['DTW', 'MTC', 'RTR', 'STP', 'T&S', 'All'];
const ROLES     = [
  'Scrum Master and Technical Architect',
  'Scrum Master-Functional - Mfg',
  'Functional - Mfg',
  'Functional - Finance',
  'Functional - Distribution',
  'Scrum Master and Functional - Distribution',
  'Development',
  'CNC/Security',
];
const LOCATIONS = ['Bangalore', 'Hyderabad', 'Pune', 'Kolkata', 'Noida', 'Gurgaon', 'Mumbai', 'Chennai'];
const STATUSES  = [
  { value: 'active',     label: 'Active'     },
  { value: 'on_leave',   label: 'On Leave'   },
  { value: 'moved_away', label: 'Moved Away' },
];

const STATUS_COLORS = {
  active:     { bg: 'rgba(22,163,74,0.12)',  color: '#16a34a',  label: 'Active'     },
  on_leave:   { bg: 'rgba(234,179,8,0.15)',  color: '#a16207',  label: 'On Leave'   },
  moved_away: { bg: 'rgba(148,163,184,0.15)',color: '#64748b',  label: 'Moved Away' },
};

const AVATAR_PALETTE = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#9333ea'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── Empty form state ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', email: '', mobile: '', stream: '', role: '', location: '',
  backup_name: '', backup_email: '', backup_mobile: '', status: 'active',
};

// ── Member Form Dialog ────────────────────────────────────────────────────────
function MemberDialog({ open, member, allMembers, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (open) {
      setForm(member
        ? { ...EMPTY_FORM, ...member }
        : EMPTY_FORM
      );
      setError('');
    }
  }, [open, member]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  // Auto-fill backup details when backup name is chosen from existing members
  const handleBackupNameChange = (e) => {
    const chosen = allMembers.find(m => m.name === e.target.value);
    setForm(f => ({
      ...f,
      backup_name:   chosen?.name   || e.target.value,
      backup_email:  chosen?.email  || f.backup_email,
      backup_mobile: chosen?.mobile || f.backup_mobile,
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      if (member?.id) {
        await axios.put(`/api/roster/${member.id}`, form);
      } else {
        await axios.post('/api/roster', form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>
        {member?.id ? 'Edit Team Member' : 'Add New Team Member'}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {error && <Alert severity="error" sx={{ mb: 2, fontSize: '0.82rem' }}>{error}</Alert>}

        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1, mt: 1 }}>
          Personal Details
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
          <TextField label="Full Name *" size="small" value={form.name} onChange={set('name')} fullWidth />
          <TextField label="Email" size="small" value={form.email} onChange={set('email')} fullWidth type="email" />
          <TextField label="Mobile" size="small" value={form.mobile} onChange={set('mobile')} fullWidth />
          <FormControl size="small" fullWidth>
            <InputLabel>Location</InputLabel>
            <Select value={form.location} label="Location" onChange={set('location')}>
              <MenuItem value=""><em>Select location</em></MenuItem>
              {LOCATIONS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
          Role & Stream
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Stream</InputLabel>
            <Select value={form.stream} label="Stream" onChange={set('stream')}>
              <MenuItem value=""><em>Select stream</em></MenuItem>
              {STREAMS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>Role</InputLabel>
            <Select value={form.role} label="Role" onChange={set('role')}>
              <MenuItem value=""><em>Select role</em></MenuItem>
              {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
          Backup Person
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Backup Name</InputLabel>
            <Select value={form.backup_name} label="Backup Name" onChange={handleBackupNameChange}>
              <MenuItem value=""><em>None</em></MenuItem>
              {allMembers
                .filter(m => m.name !== form.name && m.status !== 'moved_away')
                .map(m => <MenuItem key={m.id} value={m.name}>{m.name} ({m.stream})</MenuItem>)
              }
            </Select>
          </FormControl>
          <TextField label="Backup Mobile" size="small" value={form.backup_mobile} onChange={set('backup_mobile')} fullWidth />
        </Box>

        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
          Status
        </Typography>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Status</InputLabel>
          <Select value={form.status} label="Status" onChange={set('status')}>
            {STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : (member?.id ? 'Save Changes' : 'Add Member')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Status Change Confirmation ────────────────────────────────────────────────
function StatusDialog({ open, member, targetStatus, onConfirm, onClose }) {
  const [saving, setSaving] = useState(false);
  const sc = STATUS_COLORS[targetStatus] || {};
  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm();
    setSaving(false);
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 0 }}>Confirm Status Change</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: '0.88rem', mt: 1 }}>
          Change <strong>{member?.name}</strong>'s status to{' '}
          <Chip label={sc.label} size="small" sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700, fontSize: '0.72rem', height: 20 }} />?
        </Typography>
        {targetStatus === 'moved_away' && (
          <Alert severity="warning" sx={{ mt: 2, fontSize: '0.82rem' }}>
            This person will be greyed out across all views. Their data is kept for history.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={saving}
          sx={{ bgcolor: sc.color, '&:hover': { bgcolor: sc.color, filter: 'brightness(0.9)' } }}>
          {saving ? 'Updating…' : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ManageMembers() {
  const [members,  setMembers]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editMember, setEditMember] = useState(null);   // null = add, object = edit
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusDialog, setStatusDialog] = useState({ open: false, member: null, targetStatus: '' });
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const load = useCallback(() => {
    setLoading(true);
    axios.get('/api/roster')
      .then(r => setMembers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showSnack = (message, severity = 'success') => setSnack({ open: true, message, severity });

  const handleSave = () => {
    setDialogOpen(false);
    load();
    showSnack(editMember?.id ? 'Member updated successfully.' : 'New member added successfully.');
  };

  const handleStatusChange = async () => {
    const { member, targetStatus } = statusDialog;
    try {
      await axios.patch(`/api/roster/${member.id}/status`, { status: targetStatus });
      setStatusDialog({ open: false, member: null, targetStatus: '' });
      load();
      showSnack(`${member.name} marked as ${STATUS_COLORS[targetStatus]?.label}.`);
    } catch (err) {
      showSnack(err.response?.data?.error || 'Failed to update status.', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 2 }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">Loading…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Manage Team Members</Typography>
          <Typography variant="body2" color="text.secondary">
            Add new members, edit details, or mark someone as moved away.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditMember(null); setDialogOpen(true); }}>
          Add Member
        </Button>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f7f8fa' }}>
              <TableCell>Member</TableCell>
              <TableCell>Stream / Role</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Backup</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map(m => {
              const sc = STATUS_COLORS[m.status] || STATUS_COLORS.active;
              return (
                <TableRow key={m.id} sx={{ opacity: m.status === 'moved_away' ? 0.45 : 1, '&:hover': { bgcolor: 'rgba(37,99,235,0.03)' } }}>
                  {/* Member */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: '0.68rem', fontWeight: 700, bgcolor: avatarColor(m.name) }}>
                        {initials(m.name)}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: '0.84rem', fontWeight: 600 }}>{m.name}</Typography>
                        <Typography sx={{ fontSize: '0.71rem', color: 'text.secondary' }}>{m.email || '—'}</Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Stream / Role */}
                  <TableCell>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{m.stream || '—'}</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{m.role || '—'}</Typography>
                  </TableCell>

                  {/* Location */}
                  <TableCell>
                    <Typography sx={{ fontSize: '0.82rem' }}>{m.location || '—'}</Typography>
                  </TableCell>

                  {/* Backup */}
                  <TableCell>
                    <Typography sx={{ fontSize: '0.82rem' }}>{m.backup_name || '—'}</Typography>
                    {m.backup_mobile && (
                      <Typography sx={{ fontSize: '0.71rem', color: 'text.secondary' }}>{m.backup_mobile}</Typography>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Chip label={sc.label} size="small"
                      sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.7rem', height: 20, '.MuiChip-label': { px: 1 } }} />
                  </TableCell>

                  {/* Actions */}
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Tooltip title="Edit member">
                        <IconButton size="small" onClick={() => { setEditMember(m); setDialogOpen(true); }}
                          sx={{ color: '#2563eb', '&:hover': { bgcolor: 'rgba(37,99,235,0.08)' } }}>
                          <EditIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>

                      {m.status !== 'active' && (
                        <Tooltip title="Mark as Active">
                          <IconButton size="small"
                            onClick={() => setStatusDialog({ open: true, member: m, targetStatus: 'active' })}
                            sx={{ color: '#16a34a', '&:hover': { bgcolor: 'rgba(22,163,74,0.08)' } }}>
                            <CheckCircleIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      )}

                      {m.status !== 'on_leave' && m.status !== 'moved_away' && (
                        <Tooltip title="Mark as On Leave">
                          <IconButton size="small"
                            onClick={() => setStatusDialog({ open: true, member: m, targetStatus: 'on_leave' })}
                            sx={{ color: '#d97706', '&:hover': { bgcolor: 'rgba(217,119,6,0.08)' } }}>
                            <MoveToInboxIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      )}

                      {m.status !== 'moved_away' && (
                        <Tooltip title="Mark as Moved Away">
                          <IconButton size="small"
                            onClick={() => setStatusDialog({ open: true, member: m, targetStatus: 'moved_away' })}
                            sx={{ color: '#64748b', '&:hover': { bgcolor: 'rgba(100,116,139,0.08)' } }}>
                            <PersonOffIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <MemberDialog
        open={dialogOpen}
        member={editMember}
        allMembers={members}
        onSave={handleSave}
        onClose={() => setDialogOpen(false)}
      />

      {/* Status Change Dialog */}
      <StatusDialog
        open={statusDialog.open}
        member={statusDialog.member}
        targetStatus={statusDialog.targetStatus}
        onConfirm={handleStatusChange}
        onClose={() => setStatusDialog({ open: false, member: null, targetStatus: '' })}
      />

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} sx={{ fontSize: '0.84rem' }} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// Made with Bob
