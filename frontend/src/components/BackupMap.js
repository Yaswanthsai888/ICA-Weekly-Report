import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Chip, TextField, InputAdornment, CircularProgress,
  Card, CardContent, Divider, Avatar, Tooltip,
} from '@mui/material';
import SearchIcon      from '@mui/icons-material/Search';
import SwapHorizIcon   from '@mui/icons-material/SwapHoriz';
import PersonOffIcon   from '@mui/icons-material/PersonOff';
import GroupsIcon      from '@mui/icons-material/Groups';
import LocationOnIcon  from '@mui/icons-material/LocationOn';
import CelebrationIcon from '@mui/icons-material/Celebration';
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

const AVATAR_PALETTE = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#9333ea'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
function initials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function StreamChip({ stream }) {
  const s = STREAM_COLORS[stream] || { bg: '#f1f5f9', color: '#334155' };
  return (
    <Chip label={stream || '—'} size="small"
      sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700, fontSize: '0.68rem', height: 20, '.MuiChip-label': { px: 0.75 } }} />
  );
}

// ── Member Card ───────────────────────────────────────────────────────────────

function MemberCard({ member, coveringFor = [], holidayToday }) {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: holidayToday ? 'rgba(37,99,235,0.35)' : 'divider', borderRadius: 2, overflow: 'visible' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, fontSize: '0.78rem', fontWeight: 700, bgcolor: avatarColor(member.name), flexShrink: 0 }}>
            {initials(member.name)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {member.name}
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {member.role || '—'}
            </Typography>
          </Box>
          <StreamChip stream={member.stream} />
        </Box>

        {/* Location row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.25 }}>
          <LocationOnIcon sx={{ fontSize: 13, color: 'text.disabled', flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.78rem', color: member.location ? 'text.primary' : 'text.disabled', fontWeight: member.location ? 500 : 400 }}>
            {member.location || 'No location set'}
          </Typography>
          {holidayToday && (
            <Tooltip title={`Holiday today: ${holidayToday}`}>
              <Chip
                size="small"
                icon={<CelebrationIcon sx={{ fontSize: 11, color: '#2563eb !important' }} />}
                label={holidayToday}
                sx={{ bgcolor: 'rgba(37,99,235,0.1)', color: '#2563eb', fontWeight: 700, fontSize: '0.64rem', height: 18, cursor: 'default', ml: 0.5, '.MuiChip-label': { px: 0.5 } }}
              />
            </Tooltip>
          )}
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* Backed up by */}
        <Box sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
            Backed up by
          </Typography>
          {member.backup_name ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 24, height: 24, fontSize: '0.6rem', fontWeight: 700, bgcolor: avatarColor(member.backup_name) }}>
                {initials(member.backup_name)}
              </Avatar>
              <Box>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{member.backup_name}</Typography>
                {member.backup_mobile && (
                  <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{member.backup_mobile}</Typography>
                )}
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <PersonOffIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>No backup assigned</Typography>
            </Box>
          )}
        </Box>

        {/* Also covers */}
        {coveringFor.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Divider sx={{ mb: 1 }} />
            <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75 }}>
              Also covers
            </Typography>
            {coveringFor.map(m => (
              <Box key={m.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <SwapHorizIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                <Avatar sx={{ width: 22, height: 22, fontSize: '0.58rem', fontWeight: 700, bgcolor: avatarColor(m.name) }}>
                  {initials(m.name)}
                </Avatar>
                <Typography sx={{ fontSize: '0.8rem' }}>{m.name}</Typography>
                <StreamChip stream={m.stream} />
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ── Stream Group ───────────────────────────────────────────────────────────────

function StreamGroup({ stream, members, allMembers, holidayByLocation }) {
  const color = STREAM_COLORS[stream] || { bg: '#f1f5f9', color: '#334155' };

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{ width: 4, height: 24, borderRadius: 2, bgcolor: color.color }} />
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: color.color }}>{stream}</Typography>
        <Chip label={`${members.length} members`} size="small"
          sx={{ bgcolor: color.bg, color: color.color, fontWeight: 600, fontSize: '0.7rem', height: 20, '.MuiChip-label': { px: 1 } }} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
        {members.map(m => {
          const coveringFor = allMembers.filter(
            other => other.id !== m.id && other.backup_name?.toLowerCase() === m.name?.toLowerCase()
          );
          const nat = holidayByLocation['__national__'];
          const holidayToday = nat || (m.location ? holidayByLocation[m.location.toLowerCase()] : null) || null;
          return (
            <MemberCard key={m.id} member={m} coveringFor={coveringFor} holidayToday={holidayToday} />
          );
        })}
      </Box>
    </Box>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function BackupMap() {
  const [members,  setMembers]  = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const today = todayStr();
    Promise.all([
      axios.get('/api/roster'),
      axios.get(`/api/holidays?startDate=${today}&endDate=${today}`),
    ])
      .then(([rr, hr]) => {
        setMembers(rr.data.filter(m => m.status !== 'moved_away'));
        setHolidays(hr.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // location (lowercase) → holiday name for today
  const holidayByLocation = useMemo(() => {
    const map = {};
    holidays.forEach(h => {
      if (h.is_national) {
        map['__national__'] = h.name;
      } else {
        const locs = Array.isArray(h.locations) ? h.locations : JSON.parse(h.locations || '[]');
        locs.forEach(l => { map[l.toLowerCase()] = h.name; });
      }
    });
    return map;
  }, [holidays]);

  const filtered = search
    ? members.filter(m =>
        m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.backup_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.stream?.toLowerCase().includes(search.toLowerCase()) ||
        m.location?.toLowerCase().includes(search.toLowerCase())
      )
    : members;

  const STREAM_ORDER = ['All', 'DTW', 'MTC', 'RTR', 'STP', 'T&S'];
  const grouped = {};
  filtered.forEach(m => { const s = m.stream || 'Other'; if (!grouped[s]) grouped[s] = []; grouped[s].push(m); });
  const streamKeys = [
    ...STREAM_ORDER.filter(s => grouped[s]),
    ...Object.keys(grouped).filter(s => !STREAM_ORDER.includes(s)),
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 2 }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">Loading backup map…</Typography>
      </Box>
    );
  }

  if (members.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 2, opacity: 0.5 }}>
        <GroupsIcon sx={{ fontSize: 52, color: 'text.disabled' }} />
        <Typography variant="h6" color="text.secondary">No team data loaded</Typography>
        <Typography variant="body2" color="text.secondary">Add members in the Manager tab to populate this view.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <TextField
          size="small" placeholder="Search by name, backup, stream or location…"
          value={search} onChange={e => setSearch(e.target.value)}
          sx={{ maxWidth: 360 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: 'text.disabled' }} /></InputAdornment> }}
        />
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
          {filtered.length} members · shows backup assignment and reverse coverage
        </Typography>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', ml: 'auto' }}>
          Read-only · edits managed in Manager tab
        </Typography>
      </Box>

      {streamKeys.map(stream => (
        <StreamGroup
          key={stream}
          stream={stream}
          members={grouped[stream]}
          allMembers={members}
          holidayByLocation={holidayByLocation}
        />
      ))}
    </Box>
  );
}

// Made with Bob
