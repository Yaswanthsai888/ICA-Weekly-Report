import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Chip, CircularProgress, Alert,
  FormControl, InputLabel, Select, MenuItem, Tooltip, Paper,
} from '@mui/material';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import SickIcon        from '@mui/icons-material/Sick';
import CelebrationIcon from '@mui/icons-material/Celebration';
import axios from 'axios';

// ── Constants ─────────────────────────────────────────────────────────────────

const STREAM_COLORS = {
  DTW:   { bg: '#dbeafe', color: '#1e40af' },
  MTC:   { bg: '#f3e8ff', color: '#6b21a8' },
  RTR:   { bg: '#dcfce7', color: '#166534' },
  STP:   { bg: '#fef9c3', color: '#854d0e' },
  'T&S': { bg: '#fee2e2', color: '#991b1b' },
};

// Months with data in the DB (will be supplemented by fetched distinct months)
const KNOWN_MONTHS = ['2026-06', '2026-07'];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Cell background/border for each day type
function dayStyle(type) {
  switch (type) {
    case 'vacation': return { bg: 'rgba(234,179,8,0.18)',  border: '#a16207',  label: 'V' };
    case 'sick':     return { bg: 'rgba(220,38,38,0.14)',  border: '#dc2626',  label: 'S' };
    case 'holiday':  return { bg: 'rgba(37,99,235,0.13)',  border: '#93c5fd',  label: 'H' };
    case 'weekend':  return { bg: '#f1f5f9',               border: '#e2e8f0',  label: ''  };
    default:         return { bg: '#ffffff',               border: '#e2e8f0',  label: ''  };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDaysInMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m, 0).getDate(); // day-0 trick = last day of month
}

function getDayOfWeek(yearMonth, day) {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m - 1, day).getDay(); // 0=Sun, 6=Sat
}

function isWeekend(dayOfWeek) {
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function formatMonthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

// ── Legend pill ───────────────────────────────────────────────────────────────

function LegendPill({ color, label, icon }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: color, border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>{label}</Typography>
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LeaveCalendar() {
  const [monthYear,   setMonthYear]   = useState(KNOWN_MONTHS[0]);
  const [filterStream,setFilterStream]= useState('all');
  const [roster,      setRoster]      = useState([]);
  const [leaveRecs,   setLeaveRecs]   = useState([]);
  const [holidays,    setHolidays]    = useState([]);
  const [availMonths, setAvailMonths] = useState(KNOWN_MONTHS);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  // Load available months from distinct leave records
  useEffect(() => {
    axios.get('/api/leave')
      .then(r => {
        const months = [...new Set(r.data.map(rec => rec.month_year))].sort();
        if (months.length) {
          setAvailMonths(months);
          setMonthYear(months[months.length - 1]);
        }
      })
      .catch(() => {}); // fallback to KNOWN_MONTHS
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [y, m] = monthYear.split('-').map(Number);
      const startDate = `${monthYear}-01`;
      const days = getDaysInMonth(monthYear);
      const endDate = `${monthYear}-${String(days).padStart(2, '0')}`;

      const [rosterRes, leaveRes, holidayRes] = await Promise.all([
        axios.get('/api/roster'),
        axios.get(`/api/leave?monthYear=${monthYear}`),
        axios.get(`/api/holidays?startDate=${startDate}&endDate=${endDate}`),
      ]);
      setRoster(rosterRes.data);
      setLeaveRecs(leaveRes.data);
      setHolidays(holidayRes.data);
    } catch (err) {
      setError('Failed to load calendar data.');
    } finally {
      setLoading(false);
    }
  }, [monthYear]);

  useEffect(() => { load(); }, [load]);

  // Derived: days in selected month
  const daysInMonth = getDaysInMonth(monthYear);
  const dayNumbers  = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Build holiday date → locations lookup
  const holidayMap = useMemo(() => {
    const map = {};
    holidays.forEach(h => {
      map[h.holiday_date] = h;
    });
    return map;
  }, [holidays]);

  // Build (member_name_upper, date) → leave_type lookup
  const leaveMap = useMemo(() => {
    const map = {};
    leaveRecs.forEach(r => {
      map[`${r.member_name.toUpperCase()}|${r.leave_date}`] = r.leave_type;
    });
    return map;
  }, [leaveRecs]);

  // Filter roster by stream
  const filteredRoster = useMemo(() => {
    return roster
      .filter(m => m.status !== 'moved_away')
      .filter(m => filterStream === 'all' || m.stream === filterStream);
  }, [roster, filterStream]);

  const streams = ['all', ...new Set(roster.map(m => m.stream).filter(Boolean).sort())];

  // Summary stats
  const summaryStats = useMemo(() => {
    let vacation = 0, sick = 0, holiday = 0;
    const perPerson = {};
    leaveRecs.forEach(r => {
      if (r.leave_type === 'vacation') vacation++;
      if (r.leave_type === 'sick')     sick++;
      const key = r.member_name.toLowerCase();
      perPerson[key] = (perPerson[key] || 0) + 1;
    });
    holidays.forEach(() => { holiday++; });
    const topPerson = Object.entries(perPerson).sort((a, b) => b[1] - a[1])[0];
    return { vacation, sick, holiday: holiday, topPerson };
  }, [leaveRecs, holidays]);

  // Determine cell type for (member, day)
  function getCellType(member, day) {
    const dateStr = `${monthYear}-${String(day).padStart(2, '0')}`;
    const dow = getDayOfWeek(monthYear, day);
    if (isWeekend(dow)) return 'weekend';
    const lt = leaveMap[`${member.name.toUpperCase()}|${dateStr}`];
    if (lt) return lt;
    // holiday for this member's location?
    const h = holidayMap[dateStr];
    if (h) {
      const locs = Array.isArray(h.locations) ? h.locations : JSON.parse(h.locations || '[]');
      if (h.is_national || locs.some(l => l.toLowerCase() === (member.location || '').toLowerCase())) {
        return 'holiday';
      }
    }
    return 'working';
  }

  const CELL_W = 28;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>Monthly Leave Calendar</Typography>
        <Typography variant="body2" color="text.secondary">
          Visual grid of leave, holidays, and weekends for the whole team.
        </Typography>
      </Box>

      {/* Summary stat tiles */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Vacation Days',  value: summaryStats.vacation, color: '#a16207',  icon: <BeachAccessIcon sx={{ fontSize: 15 }} /> },
          { label: 'Sick Days',      value: summaryStats.sick,     color: '#dc2626',  icon: <SickIcon        sx={{ fontSize: 15 }} /> },
          { label: 'Public Holidays',value: summaryStats.holiday,  color: '#2563eb',  icon: <CelebrationIcon sx={{ fontSize: 15 }} /> },
          {
            label: 'Most Leave',
            value: summaryStats.topPerson
              ? `${summaryStats.topPerson[0].split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ')} (${summaryStats.topPerson[1]}d)`
              : '—',
            color: '#64748b',
            noNum: true,
          },
        ].map(c => (
          <Box key={c.label} sx={{ flex: '1 1 140px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: c.color }}>
              {c.icon}
              <Typography sx={{ fontSize: c.noNum ? '0.85rem' : '1.55rem', fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.value}</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{c.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Month</InputLabel>
          <Select value={monthYear} label="Month" onChange={e => setMonthYear(e.target.value)}>
            {availMonths.map(m => (
              <MenuItem key={m} value={m}>{formatMonthLabel(m)}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Stream</InputLabel>
          <Select value={filterStream} label="Stream" onChange={e => setFilterStream(e.target.value)}>
            {streams.map(s => <MenuItem key={s} value={s}>{s === 'all' ? 'All Streams' : s}</MenuItem>)}
          </Select>
        </FormControl>
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', ml: 'auto' }}>
          {filteredRoster.length} members · {formatMonthLabel(monthYear)}
        </Typography>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <LegendPill color="rgba(234,179,8,0.35)"  label="Vacation" />
        <LegendPill color="rgba(220,38,38,0.28)"  label="Sick" />
        <LegendPill color="rgba(37,99,235,0.25)"  label="Holiday" />
        <LegendPill color="#f1f5f9"               label="Weekend" />
        <LegendPill color="#ffffff"               label="Working" />
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: 2 }}>
          <CircularProgress size={26} />
          <Typography color="text.secondary">Loading calendar…</Typography>
        </Box>
      )}
      {error && !loading && <Alert severity="error">{error}</Alert>}

      {/* Calendar grid */}
      {!loading && !error && (
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 900 }}>

            {/* Header row — day numbers + day names */}
            <Box sx={{ display: 'flex', mb: 0 }}>
              {/* Name column spacer */}
              <Box sx={{ width: 180, flexShrink: 0 }} />
              <Box sx={{ width: 80, flexShrink: 0 }} />

              {dayNumbers.map(day => {
                const dow = getDayOfWeek(monthYear, day);
                const weekend = isWeekend(dow);
                const dateStr = `${monthYear}-${String(day).padStart(2, '0')}`;
                const isHol = !!holidayMap[dateStr];
                return (
                  <Tooltip key={day} title={`${DAY_NAMES[dow]} ${day}`} placement="top">
                    <Box sx={{
                      width: CELL_W,
                      flexShrink: 0,
                      textAlign: 'center',
                      pb: 0.5,
                      bgcolor: weekend ? '#f1f5f9' : (isHol ? 'rgba(37,99,235,0.06)' : 'transparent'),
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                    }}>
                      <Typography sx={{ fontSize: '0.62rem', color: weekend ? '#94a3b8' : (isHol ? '#2563eb' : 'text.disabled'), fontWeight: 600 }}>
                        {DAY_NAMES[dow].slice(0, 1)}
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: weekend ? '#94a3b8' : (isHol ? '#2563eb' : 'text.primary') }}>
                        {day}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>

            {/* Member rows */}
            {filteredRoster.length === 0 && (
              <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                No members match the current filter.
              </Box>
            )}
            {filteredRoster.map((member, mi) => {
              const sc = STREAM_COLORS[member.stream] || { bg: '#f1f5f9', color: '#334155' };
              const rowBg = mi % 2 === 0 ? '#ffffff' : '#fafbfc';
              return (
                <Box key={member.id} sx={{ display: 'flex', alignItems: 'center', '&:hover': { bgcolor: 'rgba(37,99,235,0.03)' } }}>
                  {/* Name */}
                  <Box sx={{ width: 180, flexShrink: 0, py: 0.5, pr: 1.5, borderRight: '1px solid', borderColor: 'divider', bgcolor: rowBg }}>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {member.name}
                    </Typography>
                  </Box>
                  {/* Stream + Location */}
                  <Box sx={{ width: 80, flexShrink: 0, px: 1, py: 0.5, borderRight: '1px solid', borderColor: 'divider', bgcolor: rowBg }}>
                    <Chip label={member.stream || '?'} size="small"
                      sx={{ bgcolor: sc.bg, color: sc.color, fontWeight: 700, fontSize: '0.62rem', height: 16, '.MuiChip-label': { px: 0.5 } }} />
                    <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', mt: 0.15 }}>{member.location || ''}</Typography>
                  </Box>

                  {/* Day cells */}
                  {dayNumbers.map(day => {
                    const cellType = getCellType(member, day);
                    const ds = dayStyle(cellType);
                    return (
                      <Tooltip
                        key={day}
                        title={
                          cellType === 'working' ? '' :
                          cellType === 'weekend' ? 'Weekend' :
                          cellType === 'holiday' ? `Holiday — ${holidayMap[`${monthYear}-${String(day).padStart(2,'0')}`]?.name || ''}` :
                          cellType === 'vacation' ? 'Vacation' :
                          cellType === 'sick' ? 'Sick leave' : ''
                        }
                        placement="top"
                      >
                        <Box sx={{
                          width: CELL_W,
                          height: 32,
                          flexShrink: 0,
                          bgcolor: ds.bg,
                          borderRight: '1px solid',
                          borderBottom: '1px solid',
                          borderColor: ds.border,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: cellType !== 'working' && cellType !== 'weekend' ? 'default' : 'default',
                        }}>
                          {ds.label && (
                            <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, color: ds.border, opacity: 0.8 }}>
                              {ds.label}
                            </Typography>
                          )}
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// Made with Bob
