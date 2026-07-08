import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Chip, CircularProgress, Alert, Avatar,
  TextField, Tooltip, IconButton, Divider, Paper,
} from '@mui/material';
import TodayIcon        from '@mui/icons-material/Today';
import EmailIcon        from '@mui/icons-material/Email';
import PhoneIcon        from '@mui/icons-material/Phone';
import SwapHorizIcon    from '@mui/icons-material/SwapHoriz';
import PersonOffIcon    from '@mui/icons-material/PersonOff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BeachAccessIcon  from '@mui/icons-material/BeachAccess';
import SickIcon         from '@mui/icons-material/Sick';
import CelebrationIcon  from '@mui/icons-material/Celebration';
import axios from 'axios';

// ── Constants ─────────────────────────────────────────────────────────────────

const LEAVE_STYLES = {
  vacation: { bg: 'rgba(234,179,8,0.15)',   color: '#a16207',  label: 'Vacation',  icon: <BeachAccessIcon sx={{ fontSize: 12 }} /> },
  sick:     { bg: 'rgba(220,38,38,0.12)',   color: '#dc2626',  label: 'Sick',       icon: <SickIcon       sx={{ fontSize: 12 }} /> },
  holiday:  { bg: 'rgba(37,99,235,0.10)',   color: '#2563eb',  label: 'Holiday',    icon: <CelebrationIcon sx={{ fontSize: 12 }} /> },
};

const STREAM_COLORS = {
  DTW:   { bg: '#dbeafe', color: '#1e40af' },
  MTC:   { bg: '#f3e8ff', color: '#6b21a8' },
  RTR:   { bg: '#dcfce7', color: '#166534' },
  STP:   { bg: '#fef9c3', color: '#854d0e' },
  'T&S': { bg: '#fee2e2', color: '#991b1b' },
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
function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── PersonCard ────────────────────────────────────────────────────────────────

function PersonCard({ entry, gapMap }) {
  const name = entry.member?.name || entry.member_name || '';
  const member = entry.member || {};
  const ls = LEAVE_STYLES[entry.leave_type] || LEAVE_STYLES.vacation;
  const sc = STREAM_COLORS[member.stream] || { bg: '#f1f5f9', color: '#334155' };
  const hasGap = gapMap[name.toUpperCase()];

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: hasGap ? '#dc2626' : 'divider',
        borderRadius: 2,
        p: 2,
        bgcolor: hasGap ? 'rgba(220,38,38,0.04)' : 'background.paper',
        position: 'relative',
      }}
    >
      {hasGap && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <WarningAmberIcon sx={{ fontSize: 13, color: '#dc2626' }} />
          <Typography sx={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600 }}>
            Backup also absent
          </Typography>
        </Box>
      )}

      {/* Member row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Avatar sx={{ width: 34, height: 34, fontSize: '0.76rem', fontWeight: 700, bgcolor: avatarColor(name), flexShrink: 0 }}>
          {initials(name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.2 }}>{name}</Typography>
            {member.stream && (
              <Chip label={member.stream} size="small"
                sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700, fontSize: '0.66rem', height: 18, '.MuiChip-label': { px: 0.75 } }} />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25, alignItems: 'center', flexWrap: 'wrap' }}>
            {member.location && (
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{member.location}</Typography>
            )}
            {member.role && (
              <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>· {member.role}</Typography>
            )}
          </Box>
        </Box>
        <Chip
          size="small"
          icon={ls.icon}
          label={ls.label}
          sx={{ bgcolor: ls.bg, color: ls.color, fontWeight: 700, fontSize: '0.7rem', height: 22, '.MuiChip-label': { pl: 0.25, pr: 1 } }}
        />
      </Box>

      {/* Backup row */}
      {member.backup_name ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: '#f8fafc', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, px: 1.25, py: 0.75 }}>
          <SwapHorizIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: hasGap ? '#dc2626' : 'text.primary' }}>
            {member.backup_name}
          </Typography>
          {hasGap && <Typography sx={{ fontSize: '0.7rem', color: '#dc2626' }}>(also out)</Typography>}
          <Box sx={{ display: 'flex', gap: 0.25, ml: 'auto' }}>
            {member.backup_email && (
              <Tooltip title={member.backup_email}>
                <IconButton size="small" href={`mailto:${member.backup_email}`} sx={{ color: '#2563eb', p: 0.4 }}>
                  <EmailIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            )}
            {member.backup_mobile && (
              <Tooltip title={member.backup_mobile}>
                <IconButton size="small" sx={{ color: '#16a34a', p: 0.4 }}>
                  <PhoneIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#f8fafc', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, px: 1.25, py: 0.75 }}>
          <PersonOffIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>No backup assigned</Typography>
        </Box>
      )}
    </Paper>
  );
}

// ── HolidayCard ───────────────────────────────────────────────────────────────

function HolidayBanner({ holiday }) {
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'rgba(37,99,235,0.25)', borderRadius: 2, p: 2, bgcolor: 'rgba(37,99,235,0.04)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <CelebrationIcon sx={{ fontSize: 16, color: '#2563eb' }} />
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#2563eb' }}>{holiday.name}</Typography>
        {holiday.is_national ? (
          <Chip label="National" size="small" sx={{ bgcolor: 'rgba(37,99,235,0.12)', color: '#2563eb', fontWeight: 700, fontSize: '0.65rem', height: 18, '.MuiChip-label': { px: 0.75 } }} />
        ) : (
          <Chip label="Regional" size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 600, fontSize: '0.65rem', height: 18, '.MuiChip-label': { px: 0.75 } }} />
        )}
      </Box>
      {!holiday.is_national && Array.isArray(holiday.locations) && (
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          Observed in: {holiday.locations.join(', ')}
        </Typography>
      )}
      {holiday.is_national && (
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>All locations</Typography>
      )}
    </Paper>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WhosOutToday() {
  const [selectedDate, setSelectedDate] = useState(toLocalDateStr(new Date()));
  const [leaveData,    setLeaveData]    = useState({ count: 0, members: [] });
  const [coverageData, setCoverageData] = useState({ coverage_gaps: [], coverage: [] });
  const [holidays,     setHolidays]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [leaveRes, coverageRes, holidayRes] = await Promise.all([
        axios.get(`/api/leave/today?date=${selectedDate}`),
        axios.get(`/api/coverage?date=${selectedDate}`),
        axios.get(`/api/holidays?startDate=${selectedDate}&endDate=${selectedDate}`),
      ]);
      setLeaveData(leaveRes.data);
      setCoverageData(coverageRes.data);
      setHolidays(holidayRes.data);
    } catch (err) {
      setError('Failed to load leave data. Is the server running?');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { load(); }, [load]);

  // Build a quick lookup: UPPERCASE name → true if coverage gap
  const gapMap = {};
  coverageData.coverage.forEach(c => {
    if (c.coverage_gap) gapMap[c.name.toUpperCase()] = true;
  });

  const gapCount = coverageData.coverage_gaps?.length || 0;
  const onLeaveCount = leaveData.count || 0;
  const presentCount = coverageData.coverage?.filter(c => c.status === 'present').length || 0;

  return (
    <Box>
      {/* Header + date picker */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>Who's Out Today</Typography>
          <Typography variant="body2" color="text.secondary">
            Leave and holiday absence for your team on the selected date.
          </Typography>
        </Box>
        <TextField
          type="date"
          size="small"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          sx={{ width: 180 }}
          InputProps={{ startAdornment: <TodayIcon sx={{ fontSize: 16, color: 'text.disabled', mr: 0.75 }} /> }}
        />
      </Box>

      {/* Summary stat tiles */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'On Leave',         value: onLeaveCount,  color: '#d97706' },
          { label: 'On Holiday',        value: holidays.length, color: '#2563eb' },
          { label: 'Present',           value: presentCount,  color: '#16a34a' },
          { label: 'Coverage Gaps',     value: gapCount,      color: '#dc2626' },
        ].map(c => (
          <Box key={c.label} sx={{ flex: '1 1 130px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
            <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.value}</Typography>
            <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary', mt: 0.5 }}>{c.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Coverage gap alert banner */}
      {gapCount > 0 && (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 2.5, fontSize: '0.84rem', borderRadius: 2 }}>
          <strong>{gapCount} coverage gap{gapCount > 1 ? 's' : ''} detected</strong> — the following people are out and their backup is also absent:{' '}
          {coverageData.coverage_gaps.map(g => g.name).join(', ')}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: 2 }}>
          <CircularProgress size={26} />
          <Typography color="text.secondary">Loading…</Typography>
        </Box>
      )}

      {error && !loading && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      {!loading && !error && (
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, alignItems: 'start' }}>

          {/* Left column — On Leave */}
          <Box>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
              On Leave ({onLeaveCount})
            </Typography>
            {leaveData.members.length === 0 ? (
              <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary" sx={{ fontSize: '0.85rem' }}>Nobody is on leave today 🎉</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {leaveData.members.map((entry, i) => (
                  <PersonCard key={i} entry={entry} gapMap={gapMap} />
                ))}
              </Box>
            )}
          </Box>

          {/* Right column — Public Holidays */}
          <Box>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
              Public Holidays ({holidays.length})
            </Typography>
            {holidays.length === 0 ? (
              <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary" sx={{ fontSize: '0.85rem' }}>No public holidays today</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {holidays.map((h, i) => (
                  <HolidayBanner key={i} holiday={h} />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// Made with Bob
