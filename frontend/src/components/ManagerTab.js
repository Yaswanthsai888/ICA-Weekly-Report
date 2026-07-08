import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Select, FormControl,
  InputLabel, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Chip, Tooltip, IconButton, Alert,
  Snackbar, Avatar, Divider, InputAdornment, Tab, Tabs,
} from '@mui/material';
import AddIcon              from '@mui/icons-material/Add';
import EditIcon             from '@mui/icons-material/Edit';
import DeleteIcon           from '@mui/icons-material/Delete';
import CheckCircleIcon      from '@mui/icons-material/CheckCircle';
import EventBusyIcon        from '@mui/icons-material/EventBusy';
import PersonOffIcon        from '@mui/icons-material/PersonOff';
import SearchIcon           from '@mui/icons-material/Search';
import LocationOnIcon       from '@mui/icons-material/LocationOn';
import ManageAccountsIcon   from '@mui/icons-material/ManageAccounts';
import AccessTimeIcon       from '@mui/icons-material/AccessTime';
import axios from 'axios';

// ── Constants ─────────────────────────────────────────────────────────────────

const STREAMS   = ['All', 'DTW', 'MTC', 'RTR', 'STP', 'T&S'];
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

const STATUS_COLORS = {
  active:     { bg: 'rgba(22,163,74,0.12)',   color: '#16a34a', label: 'Active'     },
  on_leave:   { bg: 'rgba(234,179,8,0.15)',   color: '#a16207', label: 'On Leave'   },
  moved_away: { bg: 'rgba(148,163,184,0.15)', color: '#64748b', label: 'Moved Away' },
};

const STREAM_COLORS = {
  DTW:   { bg: '#dbeafe', color: '#1e40af' },
  MTC:   { bg: '#f3e8ff', color: '#6b21a8' },
  RTR:   { bg: '#dcfce7', color: '#166534' },
  STP:   { bg: '#fef9c3', color: '#854d0e' },
  'T&S': { bg: '#fee2e2', color: '#991b1b' },
  All:   { bg: '#f1f5f9', color: '#334155' },
};

const AVATAR_PALETTE = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#9333ea'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
function initials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const EMPTY_FORM = {
  name: '', email: '', mobile: '', stream: '', role: '', location: '',
  backup_name: '', backup_email: '', backup_mobile: '', status: 'active',
};

// ── Month helpers ─────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function currentMonthYear() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthYear(my) {
  if (!my) return '';
  const [yr, mo] = my.split('-');
  return `${MONTH_NAMES[parseInt(mo, 10) - 1]} ${yr}`;
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1, mt: 1.5 }}>
      {children}
    </Typography>
  );
}

// ── Add / Edit Dialog ─────────────────────────────────────────────────────────
function MemberDialog({ open, member, allMembers, onSave, onClose }) {
  const [form,   setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (open) {
      setForm(member ? { ...EMPTY_FORM, ...member } : EMPTY_FORM);
      setError('');
    }
  }, [open, member]);

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleBackupChange = e => {
    const chosen = allMembers.find(m => m.name === e.target.value);
    setForm(f => ({
      ...f,
      backup_name:   chosen?.name   || e.target.value,
      backup_email:  chosen?.email  || f.backup_email,
      backup_mobile: chosen?.mobile || f.backup_mobile,
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Full name is required.'); return; }
    setSaving(true); setError('');
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
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ManageAccountsIcon sx={{ fontSize: 20, color: '#2563eb' }} />
        {member?.id ? 'Edit Team Member' : 'Add New Team Member'}
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 1.5 }}>
        {error && <Alert severity="error" sx={{ mb: 1.5, fontSize: '0.82rem' }}>{error}</Alert>}

        <SectionLabel>Personal Details</SectionLabel>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 0.5 }}>
          <TextField label="Full Name *" size="small" value={form.name} onChange={set('name')} fullWidth />
          <TextField label="Email" size="small" value={form.email} onChange={set('email')} fullWidth type="email" />
          <TextField label="Mobile" size="small" value={form.mobile} onChange={set('mobile')} fullWidth />
          <FormControl size="small" fullWidth>
            <InputLabel>Location</InputLabel>
            <Select value={form.location} label="Location" onChange={set('location')}>
              <MenuItem value=""><em>Select location</em></MenuItem>
              {LOCATIONS.map(l => (
                <MenuItem key={l} value={l}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <LocationOnIcon sx={{ fontSize: 14, color: '#2563eb' }} />
                    {l}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <SectionLabel>Role &amp; Stream</SectionLabel>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 0.5 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Stream</InputLabel>
            <Select value={form.stream} label="Stream" onChange={set('stream')}>
              <MenuItem value=""><em>Select stream</em></MenuItem>
              {STREAMS.map(s => {
                const sc = STREAM_COLORS[s] || {};
                return (
                  <MenuItem key={s} value={s}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: sc.color || '#94a3b8' }} />
                      {s}
                    </Box>
                  </MenuItem>
                );
              })}
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

        <SectionLabel>Backup Person</SectionLabel>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 0.5 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Backup Name</InputLabel>
            <Select value={form.backup_name} label="Backup Name" onChange={handleBackupChange}>
              <MenuItem value=""><em>None</em></MenuItem>
              {allMembers
                .filter(m => m.name !== form.name && m.status !== 'moved_away')
                .map(m => (
                  <MenuItem key={m.id} value={m.name}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Avatar sx={{ width: 20, height: 20, fontSize: '0.55rem', fontWeight: 700, bgcolor: avatarColor(m.name) }}>
                        {initials(m.name)}
                      </Avatar>
                      {m.name}
                      {m.location && (
                        <Typography component="span" sx={{ fontSize: '0.72rem', color: 'text.disabled', ml: 0.5 }}>
                          ({m.location})
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <TextField label="Backup Mobile" size="small" value={form.backup_mobile} onChange={set('backup_mobile')} fullWidth />
        </Box>
        {form.backup_name && (
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mb: 1 }}>
            Backup email is auto-filled from roster: {form.backup_email || '—'}
          </Typography>
        )}

        <SectionLabel>Status</SectionLabel>
        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel>Status</InputLabel>
          <Select value={form.status} label="Status" onChange={set('status')}>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="on_leave">On Leave</MenuItem>
            <MenuItem value="moved_away">Moved Away</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} disabled={saving} sx={{ color: 'text.secondary' }}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : (member?.id ? 'Save Changes' : 'Add Member')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Confirm Dialog (status change OR delete) ──────────────────────────────────
function ConfirmDialog({ open, title, message, severity, confirmLabel, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const handleConfirm = async () => {
    setBusy(true);
    await onConfirm();
    setBusy(false);
  };
  const colors = {
    error:   { btn: '#dc2626', hover: '#b91c1c' },
    warning: { btn: '#d97706', hover: '#b45309' },
    success: { btn: '#16a34a', hover: '#15803d' },
  };
  const c = colors[severity] || colors.warning;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 0 }}>{title}</DialogTitle>
      <DialogContent>
        <Alert severity={severity === 'error' ? 'error' : severity === 'success' ? 'success' : 'warning'} sx={{ mt: 1.5, fontSize: '0.84rem' }}>
          {message}
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy} sx={{ color: 'text.secondary' }}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm} disabled={busy}
          sx={{ bgcolor: c.btn, '&:hover': { bgcolor: c.hover }, boxShadow: 'none' }}>
          {busy ? 'Processing…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Working Hours Tab ─────────────────────────────────────────────────────────

function WorkingHoursTab() {
  const [monthYear,   setMonthYear]   = useState(currentMonthYear());
  const [hoursData,   setHoursData]   = useState(null);
  const [snapshots,   setSnapshots]   = useState([]);
  const [loading,     setLoading]     = useState(false);
  // Editable hrs/day — local draft before save
  const [hpdDraft,    setHpdDraft]    = useState('');
  const [hpdSaving,   setHpdSaving]   = useState(false);
  const [hpdEditing,  setHpdEditing]  = useState(false);

  const loadSnapshots = useCallback(() => {
    axios.get('/api/leave/snapshots')
      .then(r => setSnapshots(r.data))
      .catch(() => {});
  }, []);

  const loadHours = useCallback((my) => {
    if (!my) return;
    setLoading(true);
    axios.get(`/api/working-hours?monthYear=${my}`)
      .then(r => {
        setHoursData(r.data);
        setHpdDraft(String(r.data.hoursPerDay ?? 9));
      })
      .catch(err => { console.error(err); setHoursData(null); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSnapshots();
    loadHours(monthYear);
  }, [loadSnapshots, loadHours, monthYear]);

  // Save custom hrs/day and reload
  const saveHpd = async () => {
    const val = parseFloat(hpdDraft);
    if (isNaN(val) || val <= 0 || val > 24) return;
    setHpdSaving(true);
    try {
      await axios.put('/api/working-hours/settings', { monthYear, hoursPerDay: val });
      setHpdEditing(false);
      loadHours(monthYear);
    } finally {
      setHpdSaving(false);
    }
  };

  const snapMap = {};
  snapshots.forEach(s => {
    if (!snapMap[s.month_year]) snapMap[s.month_year] = {};
    snapMap[s.month_year][s.snapshot] = s;
  });

  const allMonths = Array.from(new Set([currentMonthYear(), ...snapshots.map(s => s.month_year)])).sort().reverse();

  const startData = hoursData?.start;
  const endData   = hoursData?.end;

  const memberNames = Array.from(new Set([
    ...(startData?.members || []).map(m => m.name),
    ...(endData?.members   || []).map(m => m.name),
  ])).sort();

  const startByName = {};
  const endByName   = {};
  (startData?.members || []).forEach(m => { startByName[m.name] = m; });
  (endData?.members   || []).forEach(m => { endByName[m.name]   = m; });

  const hasStart = (snapMap[monthYear] || {}).start;
  const hasEnd   = (snapMap[monthYear] || {}).end;

  const weekdays   = startData?.weekdays || endData?.weekdays || 0;
  const hoursPerDay = hoursData?.hoursPerDay ?? 9;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTimeIcon sx={{ fontSize: 20, color: '#2563eb' }} />
            Working Hours Tracker
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hrs/day × (weekdays − holidays − leave days). Leave data comes from <strong>Leave Monitoring → Upload Leave Data</strong>.
          </Typography>
        </Box>
      </Box>

      {/* Month picker + snapshot status + editable hrs/day */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>View Month</InputLabel>
          <Select value={monthYear} label="View Month" onChange={e => { setMonthYear(e.target.value); setHpdEditing(false); }}>
            {allMonths.map(m => (
              <MenuItem key={m} value={m}>
                {formatMonthYear(m)}
                {snapMap[m]?.start && snapMap[m]?.end && ' ✓✓'}
                {snapMap[m]?.start && !snapMap[m]?.end && ' ✓'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Editable hours/day */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: '#f7f8fa', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, px: 1.5, py: 0.75 }}>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>Hrs / day:</Typography>
          {hpdEditing ? (
            <>
              <TextField
                size="small"
                value={hpdDraft}
                onChange={e => setHpdDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveHpd(); if (e.key === 'Escape') setHpdEditing(false); }}
                inputProps={{ style: { width: 48, textAlign: 'center', padding: '2px 6px', fontSize: '0.82rem', fontWeight: 700 } }}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
              />
              <Button size="small" variant="contained" onClick={saveHpd} disabled={hpdSaving}
                sx={{ minWidth: 0, px: 1, py: 0.25, fontSize: '0.72rem', height: 24 }}>
                {hpdSaving ? '…' : 'Save'}
              </Button>
              <Button size="small" onClick={() => setHpdEditing(false)}
                sx={{ minWidth: 0, px: 0.75, py: 0.25, fontSize: '0.72rem', height: 24, color: 'text.secondary' }}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#2563eb' }}>{hoursPerDay}</Typography>
              <Tooltip title="Click to change hrs/day for this month">
                <IconButton size="small" onClick={() => setHpdEditing(true)}
                  sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: '#2563eb' } }}>
                  <EditIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip size="small"
            label={
              hasStart
                ? hasStart.uploaded_at
                  ? `Start uploaded ${new Date(hasStart.uploaded_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}`
                  : `Start · ${hasStart.leave_days} leave day${hasStart.leave_days !== 1 ? 's' : ''}`
                : 'No start upload'
            }
            sx={{ bgcolor: hasStart ? 'rgba(22,163,74,0.12)' : 'rgba(148,163,184,0.12)', color: hasStart ? '#16a34a' : '#64748b', fontWeight: 600, fontSize: '0.72rem' }}
          />
          <Chip size="small"
            label={hasEnd ? `End uploaded ${new Date(hasEnd.uploaded_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}` : 'No end upload yet'}
            sx={{ bgcolor: hasEnd ? 'rgba(37,99,235,0.12)' : 'rgba(148,163,184,0.12)', color: hasEnd ? '#2563eb' : '#64748b', fontWeight: 600, fontSize: '0.72rem' }}
          />
        </Box>

        {weekdays > 0 && (
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', ml: 'auto' }}>
            {formatMonthYear(monthYear)} — <strong>{weekdays} weekdays</strong> × {hoursPerDay} hrs = <strong>{weekdays * hoursPerDay} hrs max/person</strong>
          </Typography>
        )}
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
          <CircularProgress size={22} />
          <Typography color="text.secondary" fontSize="0.85rem">Loading working hours…</Typography>
        </Box>
      )}

      {!loading && !hoursData && (
        <Alert severity="info" sx={{ fontSize: '0.84rem' }}>
          No leave data uploaded for {formatMonthYear(monthYear)} yet. Upload a CSV in Leave Monitoring to get started.
        </Alert>
      )}

      {!loading && hoursData && (
        <>
          {/* Team summary cards */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            {[
              {
                label: 'Team Max Hours',
                sub: 'Weekdays − holidays only',
                value: startData ? `${startData.team.possible_hours.toLocaleString()} hrs` : '—',
                color: '#2563eb',
                detail: startData ? `${startData.team.active_count} active · ${hoursPerDay}h/day · holidays deducted` : '',
              },
              {
                label: 'Planned Working Hours',
                sub: 'Start-of-month',
                value: startData ? `${startData.team.working_hours.toLocaleString()} hrs` : '—',
                color: '#16a34a',
                detail: startData ? `${startData.team.total_leave_days} leave days + ${startData.team.total_holiday_days ?? 0} holiday days deducted` : 'No data uploaded',
                dim: !hasStart,
              },
              {
                label: 'Actual Working Hours',
                sub: 'End-of-month',
                value: endData && hasEnd ? `${endData.team.working_hours.toLocaleString()} hrs` : '—',
                color: '#7c3aed',
                detail: endData && hasEnd ? `${endData.team.total_leave_days} leave days + ${endData.team.total_holiday_days ?? 0} holiday days deducted` : 'Upload end-of-month CSV',
                dim: !hasEnd,
              },
              {
                label: 'Variance',
                sub: 'Planned − Actual',
                value: (startData && endData && hasStart && hasEnd)
                  ? (() => {
                      const diff = startData.team.working_hours - endData.team.working_hours;
                      return `${diff > 0 ? '−' : diff < 0 ? '+' : ''}${Math.abs(diff).toLocaleString()} hrs`;
                    })()
                  : '—',
                color: (() => {
                  if (!startData || !endData || !hasStart || !hasEnd) return '#64748b';
                  const diff = startData.team.working_hours - endData.team.working_hours;
                  return diff > 0 ? '#dc2626' : diff < 0 ? '#16a34a' : '#64748b';
                })(),
                detail: (startData && endData && hasStart && hasEnd)
                  ? (() => {
                      const diff = startData.team.working_hours - endData.team.working_hours;
                      return diff > 0 ? 'More leaves than planned' : diff < 0 ? 'Fewer leaves than planned' : 'No change';
                    })()
                  : 'Need both snapshots',
                dim: !hasStart || !hasEnd,
              },
            ].map(c => (
              <Box key={c.label} sx={{ flex: '1 1 180px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, opacity: c.dim ? 0.6 : 1 }}>
                <Typography sx={{ fontSize: '1.45rem', fontWeight: 700, color: c.color, lineHeight: 1.1 }}>{c.value}</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: 'text.primary', mt: 0.5 }}>{c.label}</Typography>
                <Typography sx={{ fontSize: '0.69rem', color: 'text.secondary' }}>{c.sub}</Typography>
                {c.detail && <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', mt: 0.5 }}>{c.detail}</Typography>}
              </Box>
            ))}
          </Box>

          {/* Per-person table — 9 columns: Member, Stream, Holidays, Max, Planned, LeavePlan, Actual, LeaveActual, Δ */}
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f7f8fa' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Member</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Stream</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                    Holidays
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 400, color: 'text.disabled', display: 'block' }}>location-based</Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Max Hours</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: 'rgba(22,163,74,0.06)' }}>
                    Planned Hours
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 400, color: 'text.disabled', display: 'block' }}>start-of-month</Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                    Leave Days
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 400, color: 'text.disabled', display: 'block' }}>planned</Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: 'rgba(124,58,237,0.06)' }}>
                    Actual Hours
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 400, color: 'text.disabled', display: 'block' }}>end-of-month</Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                    Leave Days
                    <Typography sx={{ fontSize: '0.62rem', fontWeight: 400, color: 'text.disabled', display: 'block' }}>actual</Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Δ Hours</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {memberNames.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>No team members found.</TableCell>
                  </TableRow>
                )}
                {memberNames.map(name => {
                  const sm = startByName[name];
                  const em = endByName[name];
                  const holDays = sm?.holiday_days ?? em?.holiday_days ?? 0;
                  const maxHrs  = (sm || em)?.total_possible_hours ?? 0;
                  const planHrs = sm?.working_hours ?? null;
                  const planLv  = sm?.leave_days ?? 0;
                  const actHrs  = (em && hasEnd) ? em.working_hours : null;
                  const actLv   = (em && hasEnd) ? em.leave_days : null;
                  const delta   = (planHrs !== null && actHrs !== null) ? (actHrs - planHrs) : null;
                  const status  = sm?.status || em?.status || 'active';
                  const stream  = sm?.stream || em?.stream || '';
                  const streamC = STREAM_COLORS[stream] || { bg: '#f1f5f9', color: '#334155' };

                  return (
                    <TableRow key={name}
                      sx={{ opacity: status === 'moved_away' ? 0.5 : 1, '&:hover': { bgcolor: 'rgba(37,99,235,0.025)' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 26, height: 26, fontSize: '0.62rem', fontWeight: 700, bgcolor: avatarColor(name), flexShrink: 0 }}>
                            {initials(name)}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{name}</Typography>
                            {(sm || em)?.location && (
                              <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled' }}>{(sm || em).location}</Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {stream ? (
                          <Chip label={stream} size="small"
                            sx={{ bgcolor: streamC.bg, color: streamC.color, fontWeight: 700, fontSize: '0.65rem', height: 18, '.MuiChip-label': { px: 0.6 } }} />
                        ) : <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>—</Typography>}
                      </TableCell>
                      {/* Holiday days */}
                      <TableCell align="center">
                        <Chip label={`${holDays}d`} size="small"
                          sx={{ bgcolor: holDays > 0 ? 'rgba(37,99,235,0.12)' : 'rgba(241,245,249,1)', color: holDays > 0 ? '#1e40af' : '#94a3b8', fontWeight: 700, fontSize: '0.68rem', height: 18, '.MuiChip-label': { px: 0.6 } }} />
                      </TableCell>
                      {/* Max hours */}
                      <TableCell align="center">
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#2563eb' }}>{maxHrs}</Typography>
                      </TableCell>
                      {/* Planned hours */}
                      <TableCell align="center" sx={{ bgcolor: 'rgba(22,163,74,0.03)' }}>
                        {planHrs !== null
                          ? <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#16a34a' }}>{planHrs}</Typography>
                          : <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>—</Typography>}
                      </TableCell>
                      {/* Planned leave days */}
                      <TableCell align="center">
                        {planHrs !== null
                          ? <Chip label={`${planLv}d`} size="small"
                              sx={{ bgcolor: planLv > 0 ? 'rgba(234,179,8,0.15)' : 'rgba(22,163,74,0.1)', color: planLv > 0 ? '#a16207' : '#16a34a', fontWeight: 700, fontSize: '0.68rem', height: 18, '.MuiChip-label': { px: 0.6 } }} />
                          : <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>—</Typography>}
                      </TableCell>
                      {/* Actual hours */}
                      <TableCell align="center" sx={{ bgcolor: 'rgba(124,58,237,0.03)' }}>
                        {actHrs !== null
                          ? <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#7c3aed' }}>{actHrs}</Typography>
                          : <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>—</Typography>}
                      </TableCell>
                      {/* Actual leave days */}
                      <TableCell align="center">
                        {actLv !== null
                          ? <Chip label={`${actLv}d`} size="small"
                              sx={{ bgcolor: actLv > 0 ? 'rgba(234,179,8,0.15)' : 'rgba(22,163,74,0.1)', color: actLv > 0 ? '#a16207' : '#16a34a', fontWeight: 700, fontSize: '0.68rem', height: 18, '.MuiChip-label': { px: 0.6 } }} />
                          : <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>—</Typography>}
                      </TableCell>
                      {/* Delta */}
                      <TableCell align="center">
                        {delta !== null
                          ? <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: delta < 0 ? '#dc2626' : delta > 0 ? '#16a34a' : '#64748b' }}>
                              {delta > 0 ? `+${delta}` : delta}
                            </Typography>
                          : <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>—</Typography>}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Team total row */}
                {memberNames.length > 0 && (
                  <TableRow sx={{ bgcolor: '#f7f8fa', borderTop: '2px solid', borderColor: 'divider' }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 700, fontSize: '0.82rem' }}>
                      Team Total ({(startData || endData)?.team.active_count || 0} active)
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e40af' }}>
                      {startData ? `${startData.team.total_holiday_days ?? 0}d` : '—'}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.84rem', color: '#2563eb' }}>
                      {startData ? startData.team.possible_hours.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.84rem', color: '#16a34a', bgcolor: 'rgba(22,163,74,0.03)' }}>
                      {startData ? startData.team.working_hours.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.84rem', color: '#a16207' }}>
                      {startData ? `${startData.team.total_leave_days}d` : '—'}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.84rem', color: '#7c3aed', bgcolor: 'rgba(124,58,237,0.03)' }}>
                      {endData && hasEnd ? endData.team.working_hours.toLocaleString() : '—'}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.84rem', color: '#a16207' }}>
                      {endData && hasEnd ? `${endData.team.total_leave_days}d` : '—'}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.84rem' }}>
                      {startData && endData && hasEnd ? (() => {
                        const d = endData.team.working_hours - startData.team.working_hours;
                        return (
                          <Typography sx={{ fontSize: '0.84rem', fontWeight: 700, color: d < 0 ? '#dc2626' : d > 0 ? '#16a34a' : '#64748b' }}>
                            {d > 0 ? `+${d}` : d}
                          </Typography>
                        );
                      })() : '—'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography sx={{ fontSize: '0.69rem', color: 'text.disabled', mt: 1.5 }}>
            Formula: Working Hours = (Weekdays − Holiday days − Leave days) × {hoursPerDay} hrs/day. Holidays are location-based. Only active members included in team totals.
          </Typography>
        </>
      )}
    </Box>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ManagerTab() {
  const [tab,         setTab]         = useState(0);
  const [members,     setMembers]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterStream,setFilterStream]= useState('all');
  const [filterStatus,setFilterStatus]= useState('all');

  const [editOpen,    setEditOpen]    = useState(false);
  const [editMember,  setEditMember]  = useState(null);

  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', severity: 'warning', confirmLabel: '', onConfirm: null });

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

  const closeConfirm = () => setConfirm(c => ({ ...c, open: false }));

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleSaved = () => {
    setEditOpen(false);
    load();
    showSnack(editMember?.id ? 'Member updated.' : 'New member added.');
  };

  const askStatusChange = (member, targetStatus) => {
    const sc = STATUS_COLORS[targetStatus];
    setConfirm({
      open: true,
      title: 'Change Status',
      severity: targetStatus === 'moved_away' ? 'warning' : (targetStatus === 'on_leave' ? 'warning' : 'success'),
      message: `Set ${member.name} to "${sc.label}"?${targetStatus === 'moved_away' ? ' They will be greyed out everywhere but their data is kept.' : ''}`,
      confirmLabel: `Set ${sc.label}`,
      onConfirm: async () => {
        await axios.patch(`/api/roster/${member.id}/status`, { status: targetStatus });
        closeConfirm();
        load();
        showSnack(`${member.name} marked as ${sc.label}.`);
      },
    });
  };

  const askDelete = (member) => {
    setConfirm({
      open: true,
      title: 'Remove Member',
      severity: 'error',
      message: `Permanently remove ${member.name} from the roster? Leave records linked to this person will be unaffected but their team entry will be deleted.`,
      confirmLabel: 'Delete',
      onConfirm: async () => {
        await axios.delete(`/api/roster/${member.id}`);
        closeConfirm();
        load();
        showSnack(`${member.name} has been removed.`, 'info');
      },
    });
  };

  // ── Filtering ────────────────────────────────────────────────────────────────

  const streams = ['all', ...new Set(members.map(m => m.stream).filter(Boolean).sort())];

  const filtered = members.filter(m => {
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    if (filterStream !== 'all' && m.stream !== filterStream) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.location?.toLowerCase().includes(q) ||
        m.role?.toLowerCase().includes(q) ||
        m.backup_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

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
      {/* Tab switcher */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}
        TabIndicatorProps={{ style: { backgroundColor: '#2563eb' } }}
      >
        <Tab
          label="Team Roster"
          icon={<ManageAccountsIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          sx={{ fontSize: '0.82rem', fontWeight: 600, textTransform: 'none', minHeight: 44, color: tab === 0 ? '#2563eb' : 'text.secondary' }}
        />
        <Tab
          label="Working Hours"
          icon={<AccessTimeIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          sx={{ fontSize: '0.82rem', fontWeight: 600, textTransform: 'none', minHeight: 44, color: tab === 1 ? '#2563eb' : 'text.secondary' }}
        />
      </Tabs>

      {/* ── Tab 0: Team Roster ── */}
      {tab === 0 && (
        <Box>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>Team Member Management</Typography>
              <Typography variant="body2" color="text.secondary">
                Single place to add, edit, change status, or remove team members. All views across the app reflect changes made here.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditMember(null); setEditOpen(true); }}
            >
              Add Member
            </Button>
          </Box>

          {/* Summary tiles */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            {[
              { label: 'Total',      value: members.length,                                             color: '#2563eb' },
              { label: 'Active',     value: members.filter(m => m.status === 'active').length,          color: '#16a34a' },
              { label: 'On Leave',   value: members.filter(m => m.status === 'on_leave').length,        color: '#d97706' },
              { label: 'Moved Away', value: members.filter(m => m.status === 'moved_away').length,      color: '#64748b' },
              { label: 'No Location',value: members.filter(m => !m.location).length,                   color: '#dc2626' },
              { label: 'No Backup',  value: members.filter(m => !m.backup_name && m.status === 'active').length, color: '#d97706' },
            ].map(c => (
              <Box key={c.label} sx={{ flex: '1 1 100px', bgcolor: 'background.paper', border: '1px solid', borderColor: c.label === 'No Location' || c.label === 'No Backup' ? (c.value > 0 ? 'rgba(220,38,38,0.3)' : 'divider') : 'divider', borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: '1.55rem', fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.value}</Typography>
                <Typography sx={{ fontSize: '0.73rem', color: 'text.secondary', mt: 0.5 }}>{c.label}</Typography>
              </Box>
            ))}
          </Box>

          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small" placeholder="Search name, email, role, location, backup…"
              value={search} onChange={e => setSearch(e.target.value)}
              sx={{ flex: '1 1 240px', minWidth: 200 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment> }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Stream</InputLabel>
              <Select value={filterStream} label="Stream" onChange={e => setFilterStream(e.target.value)}>
                {streams.map(s => <MenuItem key={s} value={s}>{s === 'all' ? 'All Streams' : s}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={filterStatus} label="Status" onChange={e => setFilterStatus(e.target.value)}>
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="on_leave">On Leave</MenuItem>
                <MenuItem value="moved_away">Moved Away</MenuItem>
              </Select>
            </FormControl>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', ml: 'auto' }}>
              {filtered.length} of {members.length} members
            </Typography>
          </Box>

          {/* Table */}
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f7f8fa' }}>
                  <TableCell>Member</TableCell>
                  <TableCell>Stream</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Backup</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" sx={{ pr: 2 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      No members match the current filters.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(m => {
                  const sc = STATUS_COLORS[m.status] || STATUS_COLORS.active;
                  const streamC = STREAM_COLORS[m.stream] || { bg: '#f1f5f9', color: '#334155' };
                  return (
                    <TableRow
                      key={m.id}
                      sx={{
                        opacity: m.status === 'moved_away' ? 0.5 : 1,
                        '&:hover': { bgcolor: 'rgba(37,99,235,0.025)' },
                      }}
                    >
                      {/* Member */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 30, height: 30, fontSize: '0.7rem', fontWeight: 700, bgcolor: avatarColor(m.name), flexShrink: 0 }}>
                            {initials(m.name)}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.2 }}>{m.name}</Typography>
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                              {m.email || '—'}
                              {m.mobile ? ` · ${m.mobile}` : ''}
                            </Typography>
                            <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled' }}>{m.role || '—'}</Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Stream */}
                      <TableCell>
                        <Chip label={m.stream || '—'} size="small"
                          sx={{ bgcolor: streamC.bg, color: streamC.color, fontWeight: 700, fontSize: '0.68rem', height: 20, '.MuiChip-label': { px: 0.75 } }} />
                      </TableCell>

                      {/* Location */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOnIcon sx={{ fontSize: 13, color: m.location ? '#2563eb' : 'text.disabled' }} />
                          <Typography sx={{ fontSize: '0.82rem', color: m.location ? 'text.primary' : '#dc2626', fontWeight: m.location ? 400 : 500 }}>
                            {m.location || 'Not set'}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Backup */}
                      <TableCell>
                        {m.backup_name ? (
                          <Box>
                            <Typography sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{m.backup_name}</Typography>
                            {m.backup_mobile && (
                              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{m.backup_mobile}</Typography>
                            )}
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PersonOffIcon sx={{ fontSize: 13, color: m.status === 'active' ? '#dc2626' : 'text.disabled' }} />
                            <Typography sx={{ fontSize: '0.78rem', color: m.status === 'active' ? '#dc2626' : 'text.disabled', fontWeight: 500 }}>
                              {m.status === 'active' ? 'No backup' : '—'}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Chip label={sc.label} size="small"
                          sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 600, fontSize: '0.7rem', height: 20, '.MuiChip-label': { px: 1 } }} />
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}>
                          {/* Edit */}
                          <Tooltip title="Edit member">
                            <IconButton size="small"
                              onClick={() => { setEditMember(m); setEditOpen(true); }}
                              sx={{ color: '#2563eb', '&:hover': { bgcolor: 'rgba(37,99,235,0.08)' } }}>
                              <EditIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>

                          {/* → Active */}
                          {m.status !== 'active' && (
                            <Tooltip title="Mark as Active">
                              <IconButton size="small"
                                onClick={() => askStatusChange(m, 'active')}
                                sx={{ color: '#16a34a', '&:hover': { bgcolor: 'rgba(22,163,74,0.08)' } }}>
                                <CheckCircleIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          )}

                          {/* → On Leave */}
                          {m.status === 'active' && (
                            <Tooltip title="Mark as On Leave">
                              <IconButton size="small"
                                onClick={() => askStatusChange(m, 'on_leave')}
                                sx={{ color: '#d97706', '&:hover': { bgcolor: 'rgba(217,119,6,0.08)' } }}>
                                <EventBusyIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          )}

                          {/* → Moved Away */}
                          {m.status !== 'moved_away' && (
                            <Tooltip title="Mark as Moved Away">
                              <IconButton size="small"
                                onClick={() => askStatusChange(m, 'moved_away')}
                                sx={{ color: '#64748b', '&:hover': { bgcolor: 'rgba(100,116,139,0.08)' } }}>
                                <PersonOffIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          )}

                          {/* Delete */}
                          <Tooltip title="Remove member permanently">
                            <IconButton size="small"
                              onClick={() => askDelete(m)}
                              sx={{ color: '#dc2626', '&:hover': { bgcolor: 'rgba(220,38,38,0.08)' } }}>
                              <DeleteIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── Tab 1: Working Hours ── */}
      {tab === 1 && <WorkingHoursTab />}

      {/* Add/Edit Dialog */}
      <MemberDialog
        open={editOpen}
        member={editMember}
        allMembers={members}
        onSave={handleSaved}
        onClose={() => setEditOpen(false)}
      />

      {/* Confirm Dialog (status / delete) */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        severity={confirm.severity}
        confirmLabel={confirm.confirmLabel}
        onConfirm={confirm.onConfirm || (() => {})}
        onClose={closeConfirm}
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
