import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress,
  Alert, IconButton, Stack, Tooltip, Grid, Card, CardContent,
} from '@mui/material';
import ChevronLeftIcon   from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon  from '@mui/icons-material/ChevronRight';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupIcon         from '@mui/icons-material/Group';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import QueryStatsIcon    from '@mui/icons-material/QueryStats';
import BarChartIcon      from '@mui/icons-material/BarChart';
import axios from 'axios';
import {
  format, parseISO, addMonths, subMonths,
} from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// ── Dark custom tooltip for recharts ──────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: '#0f172a', borderRadius: 2, p: 1.5, border: '1px solid #1e293b' }}>
      <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', mb: 0.5 }}>{label}</Typography>
      {payload.map((p, i) => (
        <Typography key={i} sx={{ color: p.color, fontSize: '0.82rem', fontWeight: 600 }}>
          {p.name}: {p.value}
        </Typography>
      ))}
    </Box>
  );
};

// ── Small KPI card ─────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, accent }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
              {label}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
              {value}
            </Typography>
          </Box>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            bgcolor: `${accent}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {React.cloneElement(icon, { sx: { color: accent, fontSize: 22 } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Weekly bar chart – top N users for the selected week ──────────────────────
function WeeklyBar({ weeks, selectedWeekIdx, monthRows }) {
  if (!weeks?.length || !monthRows?.length) return null;

  const ws = weeks[selectedWeekIdx];
  const chartData = monthRows
    .filter(r => r.weekCounts[ws])
    .map(r => ({ name: r.name.split(' ')[0], count: r.weekCounts[ws] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const weekOf = format(parseISO(ws), 'MMM dd, yyyy');

  return (
    <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
        <BarChartIcon sx={{ color: 'primary.main', fontSize: 20 }} />
        <Typography variant="h6">Week of {weekOf} — User Breakdown</Typography>
      </Stack>
      {chartData.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No usage data for this week.</Typography>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <RTooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name="Interactions" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={i === 0 ? '#2563eb' : i === 1 ? '#3b82f6' : '#93c5fd'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
}

// ── Main Dashboard component ───────────────────────────────────────────────────
function Dashboard() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  // Which week column is "selected" for the bar chart (default = most recent)
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);

  const fetchMonthData = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/monthly-summary', {
        params: { year: date.getFullYear(), month: date.getMonth() + 1 },
      });
      setData(res.data);
      // Default to the last (most recent) week column
      if (res.data?.weeks?.length > 0) {
        setSelectedWeekIdx(res.data.weeks.length - 1);
      }
    } catch (err) {
      setError('Failed to fetch dashboard data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMonthData(currentDate); }, [currentDate, fetchMonthData]);

  const handlePrev = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNext = () => setCurrentDate(prev => addMonths(prev, 1));

  const isCurrentMonth =
    currentDate.getFullYear() === today.getFullYear() &&
    currentDate.getMonth()    === today.getMonth();

  const monthLabel = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const weekLabel  = ws => format(parseISO(ws), 'MMM dd');
  const hasData    = data?.rows?.length > 0;

  return (
    <Box>

      {/* ── Month navigator ── */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <CalendarMonthIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Monthly Usage Dashboard</Typography>

          <Tooltip title="Previous month">
            <IconButton onClick={handlePrev} size="small"
              sx={{ bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#e2e8f0' } }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Box sx={{
            px: 3, py: 0.75, borderRadius: 2,
            border: '1px solid', borderColor: 'primary.light',
            bgcolor: '#eff6ff', minWidth: 180, textAlign: 'center',
          }}>
            <Typography sx={{ fontWeight: 700, color: 'primary.dark', fontSize: '1rem' }}>
              {monthLabel}
            </Typography>
          </Box>

          <Tooltip title={isCurrentMonth ? 'Already on current month' : 'Next month'}>
            <span>
              <IconButton onClick={handleNext} size="small" disabled={isCurrentMonth}
                sx={{ bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#e2e8f0' }, '&.Mui-disabled': { opacity: 0.4 } }}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Click any week column header to see the per-user breakdown chart below.
        </Typography>
      </Paper>

      {loading && <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>}
      {error   && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

      {!loading && !error && !hasData && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No usage data for {monthLabel}. Navigate to another month or upload a CSV.
        </Alert>
      )}

      {!loading && hasData && (
        <>
          {/* ── KPI strip ── */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KpiCard icon={<TrendingUpIcon />} label="Total Interactions" value={data.grandTotal.toLocaleString()} accent="#2563eb" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard icon={<GroupIcon />} label="Active Users" value={data.rows.length} accent="#7c3aed" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard icon={<QueryStatsIcon />} label="Weeks in Month" value={data.weeks.length} accent="#0891b2" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard
                icon={<BarChartIcon />}
                label="Avg / User"
                value={(data.grandTotal / data.rows.length).toFixed(1)}
                accent="#16a34a"
              />
            </Grid>
          </Grid>

          {/* ── Pivot table ── */}
          <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{
                      bgcolor: '#0f172a !important', color: '#e2e8f0', fontWeight: 700,
                      minWidth: 200, fontSize: '0.78rem', letterSpacing: '0.06em',
                      borderRight: '1px solid #1e293b', py: 1.5,
                    }}>
                      NAME
                    </TableCell>

                    {data.weeks.map((ws, i) => (
                      <TableCell
                        key={ws}
                        align="right"
                        onClick={() => setSelectedWeekIdx(i)}
                        sx={{
                          bgcolor: selectedWeekIdx === i ? '#1e3a5f !important' : '#0f172a !important',
                          color: selectedWeekIdx === i ? '#93c5fd' : '#94a3b8',
                          fontWeight: 600, minWidth: 90, fontSize: '0.78rem',
                          letterSpacing: '0.04em', borderRight: '1px solid #1e293b',
                          py: 1.5, cursor: 'pointer',
                          '&:hover': { bgcolor: '#1e3a5f !important', color: '#bfdbfe' },
                        }}
                      >
                        {weekLabel(ws)}
                        {selectedWeekIdx === i && (
                          <Box component="span" sx={{ display: 'block', fontSize: '0.6rem', color: '#60a5fa', mt: 0.25 }}>
                            ▼ chart
                          </Box>
                        )}
                      </TableCell>
                    ))}

                    <TableCell align="right" sx={{
                      bgcolor: '#1e293b !important', color: '#e2e8f0', fontWeight: 700,
                      minWidth: 100, fontSize: '0.78rem', letterSpacing: '0.06em', py: 1.5,
                    }}>
                      TOTAL
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {data.rows.map((row, idx) => (
                    <TableRow key={row.email} hover
                      sx={{ bgcolor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.85rem', color: '#0f172a', borderRight: '1px solid #e2e8f0', py: 1.25 }}>
                        {row.name}
                      </TableCell>

                      {data.weeks.map((ws, i) => {
                        const val = row.weekCounts[ws];
                        return (
                          <TableCell key={ws} align="right" sx={{
                            fontSize: '0.85rem',
                            fontWeight: val ? 600 : 400,
                            color: val ? (selectedWeekIdx === i ? '#1d4ed8' : '#0f172a') : '#cbd5e1',
                            bgcolor: selectedWeekIdx === i ? 'rgba(37,99,235,0.04)' : 'inherit',
                            borderRight: '1px solid #e2e8f0', py: 1.25,
                          }}>
                            {val || '–'}
                          </TableCell>
                        );
                      })}

                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#2563eb', bgcolor: '#eff6ff', py: 1.25 }}>
                        {row.total}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Grand Total footer */}
                  <TableRow sx={{ bgcolor: '#0f172a' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#e2e8f0', borderRight: '1px solid #1e293b', py: 1.5 }}>
                      Grand Total
                    </TableCell>
                    {data.weeks.map((ws, i) => (
                      <TableCell key={ws} align="right" sx={{
                        fontWeight: 700,
                        color: selectedWeekIdx === i ? '#93c5fd' : '#94a3b8',
                        bgcolor: selectedWeekIdx === i ? '#1e3a5f' : 'inherit',
                        borderRight: '1px solid #1e293b', fontSize: '0.88rem', py: 1.5,
                      }}>
                        {data.grandTotals[ws] || 0}
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#60a5fa', bgcolor: '#1e293b', fontSize: '0.95rem', py: 1.5 }}>
                      {data.grandTotal}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* ── Weekly bar chart (driven by selected column) ── */}
          <WeeklyBar weeks={data.weeks} selectedWeekIdx={selectedWeekIdx} monthRows={data.rows} />
        </>
      )}
    </Box>
  );
}

export default Dashboard;

// Made with Bob
