import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  Grid, Card, CardContent, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, Button, Chip, Stack,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import DownloadIcon  from '@mui/icons-material/Download';
import SmartToyIcon  from '@mui/icons-material/SmartToy';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import axios from 'axios';

const PIE_COLORS = ['#2563eb','#7c3aed','#0891b2','#16a34a','#d97706','#dc2626','#0284c7','#9333ea'];

const CustomTooltip = ({ active, payload, label }) => {
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

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (value < 3) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {value}
    </text>
  );
};

function AssistantReports() {
  const [weeks, setWeeks]               = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [assistantStats, setAssistantStats] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  useEffect(() => { fetchAvailableWeeks(); }, []);

  useEffect(() => {
    if (selectedWeek) fetchAssistantStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]);

  const fetchAvailableWeeks = async () => {
    try {
      const r = await axios.get('/api/available-weeks');
      setWeeks(r.data);
      if (r.data.length > 0) setSelectedWeek(r.data[0].startDate);
    } catch { setError('Failed to fetch weeks.'); }
  };

  const fetchAssistantStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const week = weeks.find(w => w.startDate === selectedWeek);
      if (!week) return;
      const r = await axios.get('/api/assistant-stats', {
        params: { startDate: week.startDate, endDate: week.endDate },
      });
      setAssistantStats(r.data);
    } catch { setError('Failed to fetch assistant statistics.'); }
    finally { setLoading(false); }
  };

  const exportToCSV = () => {
    const csv = [
      'Rank,Assistant Name,Usage Count,Unique Users,Avg per User',
      ...assistantStats.map((s, i) =>
        `${i + 1},"${s.assistant_name}",${s.usage_count},${s.user_count},${(s.usage_count / s.user_count).toFixed(1)}`
      ),
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `assistant-stats-${selectedWeek}.csv`;
    a.click();
  };

  const top10  = assistantStats.slice(0, 10);
  const top15  = assistantStats.slice(0, 15);
  const total  = assistantStats.reduce((s, r) => s + r.usage_count, 0);
  const pieData = top10.map(s => ({
    name: s.assistant_name.length > 22 ? s.assistant_name.slice(0, 22) + '…' : s.assistant_name,
    value: s.usage_count,
  }));

  return (
    <Box>
      {/* ── Controls ── */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Assistant Reports</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={exportToCSV}
            disabled={assistantStats.length === 0}
            sx={{ borderRadius: 2 }}
          >
            Export CSV
          </Button>
        </Stack>

        <FormControl fullWidth size="small" sx={{ mt: 2 }}>
          <InputLabel>Select Week</InputLabel>
          <Select value={selectedWeek} label="Select Week" onChange={e => setSelectedWeek(e.target.value)}>
            {weeks.map(w => <MenuItem key={w.startDate} value={w.startDate}>{w.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {loading && <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>}
      {error   && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {!loading && assistantStats.length > 0 && (
        <>
          {/* ── KPI cards ── */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={4}>
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>Distinct Assistants</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>{assistantStats.length}</Typography>
                    </Box>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <SmartToyIcon sx={{ color: '#2563eb', fontSize: 22 }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>Total Interactions</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>{total.toLocaleString()}</Typography>
                    </Box>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TrendingUpIcon sx={{ color: '#7c3aed', fontSize: 22 }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>
                    Most Popular
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {assistantStats[0]?.assistant_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {assistantStats[0]?.usage_count} interactions · {assistantStats[0]?.user_count} users
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* ── Charts ── */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            {/* Pie */}
            <Grid item xs={12} lg={5}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Share — Top 10</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={110}
                      dataKey="value" labelLine={false} label={<CustomPieLabel />}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Bar */}
            <Grid item xs={12} lg={7}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Top 15 — Usage vs Unique Users</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={top15} layout="vertical" barSize={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis
                      dataKey="assistant_name"
                      type="category"
                      width={160}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '0.8rem' }} />
                    <Bar dataKey="usage_count"  name="Total Usage"    fill="#2563eb" radius={[0, 3, 3, 0]} />
                    <Bar dataKey="user_count"   name="Unique Users"   fill="#7c3aed" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* ── Detail table ── */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">All Assistants</Typography>
              <Typography variant="body2" color="text.secondary">{assistantStats.length} total</Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 520 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {['#', 'Assistant', 'Interactions', 'Users', 'Avg / User'].map(h => (
                      <TableCell key={h} sx={{ bgcolor: '#f8fafc !important' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assistantStats.map((s, i) => (
                    <TableRow key={s.assistant_name} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      <TableCell sx={{ color: 'text.secondary', width: 40, fontSize: '0.82rem' }}>{i + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.85rem' }}>
                        {i < 3
                          ? <Chip label={s.assistant_name} size="small"
                              sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 600, fontSize: '0.78rem' }} />
                          : s.assistant_name}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#0f172a' }}>{s.usage_count}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>{s.user_count}</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary' }}>
                        {(s.usage_count / s.user_count).toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {!loading && assistantStats.length === 0 && selectedWeek && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>No assistant data for the selected week.</Alert>
      )}
    </Box>
  );
}

export default AssistantReports;

// Made with Bob
