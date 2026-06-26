import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Switch,
  Alert,
  CircularProgress,
  Tooltip,
  TextField,
  InputAdornment,
  Divider,
} from '@mui/material';
import PeopleIcon        from '@mui/icons-material/People';
import SearchIcon        from '@mui/icons-material/Search';
import WifiIcon          from '@mui/icons-material/Wifi';
import WifiOffIcon       from '@mui/icons-material/WifiOff';
import axios from 'axios';

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusChip({ isActive }) {
  return (
    <Chip
      icon={isActive
        ? <WifiIcon    sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />
        : <WifiOffIcon sx={{ fontSize: '13px !important', color: '#94a3b8 !important' }} />}
      label={isActive ? 'Online' : 'Offline'}
      size="small"
      sx={{
        height: 22,
        fontSize: '0.72rem',
        fontWeight: 600,
        bgcolor:  isActive ? 'rgba(22,163,74,0.1)'   : 'rgba(148,163,184,0.1)',
        color:    isActive ? '#16a34a'                : '#64748b',
        border:   `1px solid ${isActive ? 'rgba(22,163,74,0.3)' : 'rgba(148,163,184,0.25)'}`,
        '.MuiChip-label': { px: 0.75 },
        '.MuiChip-icon':  { ml: 0.5 },
      }}
    />
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────
function SummaryBar({ total, active, inactive }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {[
        { label: 'Total Members', value: total,    color: '#3b82f6' },
        { label: 'Online',        value: active,   color: '#16a34a' },
        { label: 'Offline',       value: inactive, color: '#94a3b8' },
      ].map((s) => (
        <Paper key={s.label} elevation={0} sx={{ px: 2.5, py: 1.5, border: '1px solid', borderColor: 'divider', minWidth: 110, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: s.color, lineHeight: 1.1 }}>
            {s.value}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.25 }}>
            {s.label}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TeamManager({ refreshKey }) {
  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [saving, setSaving]     = useState({});   // { [userId]: true } while PATCH is in-flight
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all'); // 'all' | 'online' | 'offline'

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/team-members');
      setMembers(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers, refreshKey]);

  const handleToggle = async (member) => {
    const newStatus = member.is_active === 0 ? true : false;
    // Optimistic update
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: newStatus ? 1 : 0 } : m));
    setSaving(prev => ({ ...prev, [member.id]: true }));
    try {
      await axios.patch(`/api/users/${member.id}/status`, { is_active: newStatus });
    } catch (err) {
      // Revert on failure
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: member.is_active } : m));
      setError(`Failed to update ${member.name}: ${err.response?.data?.error || err.message}`);
    } finally {
      setSaving(prev => { const next = { ...prev }; delete next[member.id]; return next; });
    }
  };

  // Derived filtered list
  const filtered = members.filter(m => {
    const matchSearch = search.trim() === '' || [m.name, m.email, m.scrum_master, m.track]
      .filter(Boolean).some(v => v.toLowerCase().includes(search.toLowerCase()));
    const matchFilter =
      filter === 'all'     ? true :
      filter === 'online'  ? m.is_active === 1 :
      /* offline */           m.is_active === 0;
    return matchSearch && matchFilter;
  });

  const totalActive   = members.filter(m => m.is_active === 1).length;
  const totalInactive = members.filter(m => m.is_active === 0).length;

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <PeopleIcon sx={{ color: '#3b82f6', fontSize: 26 }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Team Manager</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Mark team members as <strong>Online</strong> (active on project) or <strong>Offline</strong>
          (on leave / moved out). Offline members are excluded from Send Reminders checks.
        </Typography>
      </Box>

      {/* Summary */}
      {!loading && !error && (
        <Box sx={{ mb: 3 }}>
          <SummaryBar total={members.length} active={totalActive} inactive={totalInactive} />
        </Box>
      )}

      {/* Info banner */}
      <Alert
        severity="info"
        icon={<WifiOffIcon fontSize="small" />}
        sx={{ mb: 2.5, fontSize: '0.82rem' }}
      >
        <strong>Offline members are hidden from Send Reminders.</strong> If someone left the project
        or is on extended leave, toggle them Offline — they will no longer appear in the missed-users
        list and won't receive automated reminder emails.
      </Alert>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, fontSize: '0.85rem' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search name, email, scrum master…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
          sx={{ flex: '1 1 240px', maxWidth: 380 }}
        />
        {/* Filter pills */}
        <Box sx={{ display: 'flex', gap: 0.75 }}>
          {[
            { id: 'all',     label: 'All' },
            { id: 'online',  label: 'Online only' },
            { id: 'offline', label: 'Offline only' },
          ].map((f) => (
            <Chip
              key={f.id}
              label={f.label}
              size="small"
              clickable
              onClick={() => setFilter(f.id)}
              sx={{
                fontWeight: filter === f.id ? 700 : 400,
                bgcolor: filter === f.id ? 'primary.main' : 'transparent',
                color:   filter === f.id ? '#fff' : 'text.secondary',
                border:  '1px solid',
                borderColor: filter === f.id ? 'primary.main' : 'divider',
                '&:hover': { bgcolor: filter === f.id ? 'primary.dark' : 'action.hover' },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Table */}
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 8, gap: 1.5 }}>
            <CircularProgress size={22} />
            <Typography color="text.secondary" fontSize="0.9rem">Loading members…</Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography color="text.secondary" fontSize="0.9rem">
              {search || filter !== 'all' ? 'No members match your search / filter.' : 'No team members found. Upload a CSV first.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Scrum Master</TableCell>
                  <TableCell>Track</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Toggle</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((member) => {
                  const isActive  = member.is_active === 1;
                  const isSaving  = Boolean(saving[member.id]);
                  return (
                    <TableRow
                      key={member.id}
                      hover
                      sx={{ opacity: isActive ? 1 : 0.6, transition: 'opacity 0.2s' }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>{member.name}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{member.email}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{member.scrum_master || '—'}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{member.track || '—'}</TableCell>
                      <TableCell align="center">
                        <StatusChip isActive={isActive} />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={isActive ? 'Set Offline (exclude from reminders)' : 'Set Online (include in reminders)'}>
                          <span>
                            {isSaving ? (
                              <CircularProgress size={18} sx={{ display: 'block', mx: 'auto' }} />
                            ) : (
                              <Switch
                                checked={isActive}
                                onChange={() => handleToggle(member)}
                                size="small"
                                color="success"
                              />
                            )}
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Footer note */}
        {!loading && filtered.length > 0 && (
          <>
            <Divider />
            <Box sx={{ px: 2, py: 1 }}>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
                Showing {filtered.length} of {members.length} member{members.length !== 1 ? 's' : ''}.
                Toggle the switch to change a member's status — changes take effect immediately.
              </Typography>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
}

// Made with Bob
