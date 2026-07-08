import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box, Typography, Chip, TextField, MenuItem, Select, FormControl,
  InputLabel, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, CircularProgress, Tooltip, IconButton,
  InputAdornment, Avatar, Alert, Button, LinearProgress, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import SearchIcon          from '@mui/icons-material/Search';
import EmailIcon           from '@mui/icons-material/Email';
import PhoneIcon           from '@mui/icons-material/Phone';
import SwapHorizIcon       from '@mui/icons-material/SwapHoriz';
import PersonOffIcon       from '@mui/icons-material/PersonOff';
import CelebrationIcon     from '@mui/icons-material/Celebration';
import UploadFileIcon      from '@mui/icons-material/UploadFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import axios from 'axios';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STREAM_COLORS = {
  DTW:    { bg: '#dbeafe', color: '#1e40af' },
  MTC:    { bg: '#f3e8ff', color: '#6b21a8' },
  RTR:    { bg: '#dcfce7', color: '#166534' },
  STP:    { bg: '#fef9c3', color: '#854d0e' },
  'T&S':  { bg: '#fee2e2', color: '#991b1b' },
  All:    { bg: '#f1f5f9', color: '#334155' },
};

const STATUS_COLORS = {
  active:     { bg: 'rgba(22,163,74,0.12)',   color: '#16a34a', label: 'Active'     },
  on_leave:   { bg: 'rgba(234,179,8,0.15)',   color: '#a16207', label: 'On Leave'   },
  moved_away: { bg: 'rgba(148,163,184,0.15)', color: '#64748b', label: 'Moved Away' },
};

function StreamChip({ stream }) {
  const s = STREAM_COLORS[stream] || { bg: '#f1f5f9', color: '#334155' };
  return (
    <Chip label={stream || '—'} size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: '0.7rem', height: 20, '.MuiChip-label': { px: 1 } }} />
  );
}

function StatusChip({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.active;
  return (
    <Chip label={s.label} size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: '0.7rem', height: 20, '.MuiChip-label': { px: 1 } }} />
  );
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_PALETTE = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#9333ea'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ── Upload Team Dialog (mirrors ManagerTab) ────────────────────────────────────
function UploadTeamDialog({ open, onClose, onSuccess }) {
  const [file,      setFile]      = useState(null);
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result,    setResult]    = useState(null);
  const inputRef = useRef();

  useEffect(() => {
    if (open) { setFile(null); setResult(null); setDragging(false); }
  }, [open]);

  const acceptFile = (f) => {
    if (f?.name.endsWith('.csv')) { setFile(f); setResult(null); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    acceptFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setResult(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post('/api/upload-team-backup', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { inserted, total } = res.data;
      setResult({ ok: true, message: `✓ ${inserted} member${inserted !== 1 ? 's' : ''} imported (${total} rows processed)` });
      setFile(null);
      onSuccess();
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.error || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={!uploading ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>Upload Team CSV</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
          Expected columns (in order): <strong>Sno, Stream, Role, Name, Email, Mobile, Backup Name, Backup Email, Backup Mobile</strong>.
          Rows with duplicate names are skipped; existing members are not overwritten.
        </Alert>
        <Box
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => !file && inputRef.current.click()}
          sx={{
            border: '1.5px dashed',
            borderColor: dragging ? '#2563eb' : file ? '#16a34a' : 'divider',
            borderRadius: 2, p: 3, textAlign: 'center', cursor: 'pointer',
            bgcolor: dragging ? 'rgba(37,99,235,0.04)' : file ? 'rgba(22,163,74,0.04)' : 'background.paper',
            transition: 'all 0.15s',
            '&:hover': { borderColor: '#2563eb', bgcolor: 'rgba(37,99,235,0.04)' },
          }}
        >
          <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={(e) => acceptFile(e.target.files[0])} />
          {file ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <InsertDriveFileIcon sx={{ fontSize: 18, color: '#16a34a' }} />
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{file.name}</Typography>
              <Box component="span"
                onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                sx={{ ml: 1, fontSize: '0.75rem', color: 'text.disabled', cursor: 'pointer', '&:hover': { color: 'error.main' } }}>
                ✕
              </Box>
            </Box>
          ) : (
            <Box>
              <UploadFileIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                Drop a CSV file here, or <Box component="span" sx={{ color: '#2563eb', fontWeight: 600 }}>browse</Box>
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', mt: 0.5 }}>Only .csv files are accepted</Typography>
            </Box>
          )}
        </Box>
        {uploading && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}
        {result && (
          <Alert severity={result.ok ? 'success' : 'error'} sx={{ mt: 2, fontSize: '0.82rem' }}>
            {result.message}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={uploading} sx={{ color: 'text.secondary' }}>
          {result?.ok ? 'Close' : 'Cancel'}
        </Button>
        <Button variant="contained" onClick={handleUpload} disabled={!file || uploading} startIcon={<UploadFileIcon />}>
          {uploading ? 'Importing…' : 'Import Team'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TeamRoster() {
  const [members,      setMembers]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [holidays,     setHolidays]     = useState([]);
  const [search,       setSearch]       = useState('');
  const [filterStream, setFilterStream] = useState('all');
  const [filterRole,   setFilterRole]   = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [uploadOpen,   setUploadOpen]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const today = todayStr();
    Promise.all([
      axios.get('/api/roster'),
      axios.get(`/api/holidays?startDate=${today}&endDate=${today}`),
    ])
      .then(([rr, hr]) => { setMembers(rr.data); setHolidays(hr.data); })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build location → holiday name lookup for today
  const todayHolidayByLocation = useMemo(() => {
    const map = {};   // location (lowercase) → holiday name
    holidays.forEach(h => {
      if (h.is_national) {
        // mark a special key so all locations get it
        map['__national__'] = h.name;
      } else {
        const locs = Array.isArray(h.locations) ? h.locations : JSON.parse(h.locations || '[]');
        locs.forEach(l => { map[l.toLowerCase()] = h.name; });
      }
    });
    return map;
  }, [holidays]);

  function getHolidayForMember(m) {
    if (!m.location) return null;
    const nat = todayHolidayByLocation['__national__'];
    if (nat) return nat;
    return todayHolidayByLocation[m.location.toLowerCase()] || null;
  }

  // Derived filter options
  const streams = ['all', ...new Set(members.map(m => m.stream).filter(Boolean).sort())];
  const roles   = ['all', ...new Set(members.map(m => m.role).filter(Boolean).sort())];

  const filtered = members.filter(m => {
    if (filterStatus !== 'all' && m.status !== filterStatus) return false;
    if (filterStream !== 'all' && m.stream !== filterStream) return false;
    if (filterRole   !== 'all' && m.role   !== filterRole)   return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.backup_name?.toLowerCase().includes(q) ||
        m.location?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 2 }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">Loading roster…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Empty-state banner — shown when roster has no members */}
      {members.length === 0 && (
        <Alert
          severity="info"
          sx={{ mb: 3, fontSize: '0.85rem' }}
          action={
            <Button
              size="small"
              startIcon={<UploadFileIcon />}
              onClick={() => setUploadOpen(true)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Upload Team CSV
            </Button>
          }
        >
          No team members found. Upload your team CSV to get started.
        </Alert>
      )}

      {/* Upload button — always visible in the top-right */}
      {members.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => setUploadOpen(true)}
            sx={{ fontSize: '0.8rem', borderColor: '#2563eb', color: '#2563eb', '&:hover': { borderColor: '#1d4ed8', bgcolor: 'rgba(37,99,235,0.05)' } }}
          >
            Upload Team CSV
          </Button>
        </Box>
      )}

      {/* Upload dialog */}
      <UploadTeamDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => load()}
      />

      {/* Summary tiles */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Members', value: members.length,                                             color: '#2563eb' },
          { label: 'Active',        value: members.filter(m => m.status === 'active').length,          color: '#16a34a' },
          { label: 'On Leave',      value: members.filter(m => m.status === 'on_leave').length,        color: '#d97706' },
          { label: 'Moved Away',    value: members.filter(m => m.status === 'moved_away').length,      color: '#64748b' },
          { label: "On Holiday Today", value: members.filter(m => m.status === 'active' && getHolidayForMember(m)).length, color: '#2563eb' },
        ].map(c => (
          <Box key={c.label} sx={{ flex: '1 1 130px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
            <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.value}</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.5 }}>{c.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small" placeholder="Search name, email, backup, location…"
          value={search} onChange={e => setSearch(e.target.value)}
          sx={{ flex: '1 1 220px', minWidth: 180 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment> }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Stream</InputLabel>
          <Select value={filterStream} label="Stream" onChange={e => setFilterStream(e.target.value)}>
            {streams.map(s => <MenuItem key={s} value={s}>{s === 'all' ? 'All Streams' : s}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Role</InputLabel>
          <Select value={filterRole} label="Role" onChange={e => setFilterRole(e.target.value)}>
            {roles.map(r => <MenuItem key={r} value={r}>{r === 'all' ? 'All Roles' : r}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
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
      <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#f7f8fa' }}>
              <TableCell>Member</TableCell>
              <TableCell>Stream</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Backup</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                  No members match the current filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map(m => {
              const holidayToday = getHolidayForMember(m);
              return (
                <TableRow
                  key={m.id}
                  sx={{
                    opacity: m.status === 'moved_away' ? 0.45 : 1,
                    '&:hover': { bgcolor: 'rgba(37,99,235,0.03)' },
                    transition: 'opacity 0.15s',
                  }}
                >
                  {/* Member */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 30, height: 30, fontSize: '0.72rem', fontWeight: 700, bgcolor: avatarColor(m.name), flexShrink: 0 }}>
                        {initials(m.name)}
                      </Avatar>
                      <Box>
                        <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.2 }}>{m.name}</Typography>
                        {m.email && (
                          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{m.email}</Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>

                  {/* Stream */}
                  <TableCell><StreamChip stream={m.stream} /></TableCell>

                  {/* Role */}
                  <TableCell>
                    <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>{m.role || '—'}</Typography>
                  </TableCell>

                  {/* Location — with today's holiday badge */}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: '0.82rem' }}>{m.location || '—'}</Typography>
                      {holidayToday && (
                        <Tooltip title={`Holiday today: ${holidayToday}`}>
                          <Chip
                            size="small"
                            icon={<CelebrationIcon sx={{ fontSize: 11, color: '#2563eb !important' }} />}
                            label="Holiday"
                            sx={{ bgcolor: 'rgba(37,99,235,0.1)', color: '#2563eb', fontWeight: 700, fontSize: '0.64rem', height: 18, cursor: 'default', '.MuiChip-label': { px: 0.5 } }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>

                  {/* Contact */}
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {m.email && (
                        <Tooltip title={m.email}>
                          <IconButton size="small" href={`mailto:${m.email}`} sx={{ color: '#2563eb', p: 0.5 }}>
                            <EmailIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {m.mobile && (
                        <Tooltip title={m.mobile}>
                          <IconButton size="small" sx={{ color: '#16a34a', p: 0.5 }}>
                            <PhoneIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>

                  {/* Backup */}
                  <TableCell>
                    {m.backup_name ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <SwapHorizIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Box>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 500 }}>{m.backup_name}</Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25 }}>
                            {m.backup_email && (
                              <Tooltip title={m.backup_email}>
                                <IconButton size="small" href={`mailto:${m.backup_email}`} sx={{ color: '#2563eb', p: 0.25 }}>
                                  <EmailIcon sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {m.backup_mobile && (
                              <Tooltip title={m.backup_mobile}>
                                <IconButton size="small" sx={{ color: '#16a34a', p: 0.25 }}>
                                  <PhoneIcon sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonOffIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>No backup</Typography>
                      </Box>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell><StatusChip status={m.status} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography sx={{ mt: 1.5, fontSize: '0.72rem', color: 'text.disabled', textAlign: 'right' }}>
        Read-only view · Member edits and bulk import are available in the Manager tab
      </Typography>
    </Box>
  );
}

// Made with Bob
