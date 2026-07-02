import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  Grid, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress, Alert,
  TextField, Chip, Button, Stack,
} from '@mui/material';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import DownloadIcon from '@mui/icons-material/Download';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TimelineIcon from '@mui/icons-material/Timeline';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const CHART_COLORS = {
  primary:   '#2563eb',
  secondary: '#7c3aed',
  success:   '#16a34a',
  cyan:      '#0891b2',
  area:      'rgba(37,99,235,0.15)',
};

function KpiCard({ icon, label, value, sub, accent = '#2563eb' }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
              {label}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1, color: 'text.primary' }}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {sub}
              </Typography>
            )}
          </Box>
          <Box sx={{
            width: 42, height: 42, borderRadius: 2,
            bgcolor: `${accent}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {React.cloneElement(icon, { sx: { color: accent, fontSize: 22 } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

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

function UsageExplorer() {
  const [allUsage, setAllUsage]       = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  const [selectedUser, setSelectedUser]           = useState('all');
  const [selectedAssistant, setSelectedAssistant] = useState('all');
  const [startDate, setStartDate]                 = useState('');
  const [endDate, setEndDate]                     = useState('');
  const [searchTerm, setSearchTerm]               = useState('');

  useEffect(() => { fetchAllData(); }, []);

  useEffect(() => { applyFilters(); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedUser, selectedAssistant, startDate, endDate, searchTerm, allUsage]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, usageRes] = await Promise.all([
        axios.get('/api/users'),
        axios.get('/api/usage', { params: { startDate: '2000-01-01', endDate: '2099-12-31' } }),
      ]);
      setUsers(usersRes.data);
      setAllUsage(usageRes.data);
      if (usageRes.data.length > 0) {
        const dates = usageRes.data.map(r => r.date).sort();
        setStartDate(dates[0]);
        setEndDate(dates[dates.length - 1]);
      }
    } catch (err) {
      setError('Failed to fetch data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let f = [...allUsage];
    if (selectedUser !== 'all')      f = f.filter(r => r.email === selectedUser);
    if (selectedAssistant !== 'all') f = f.filter(r => r.assistant_name === selectedAssistant);
    if (startDate) f = f.filter(r => r.date >= startDate);
    if (endDate)   f = f.filter(r => r.date <= endDate);
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      f = f.filter(r =>
        r.name.toLowerCase().includes(t) ||
        r.assistant_name.toLowerCase().includes(t) ||
        r.email.toLowerCase().includes(t)
      );
    }
    setFilteredData(f);
  };

  const clearFilters = () => {
    setSelectedUser('all');
    setSelectedAssistant('all');
    setSearchTerm('');
    if (allUsage.length > 0) {
      const dates = allUsage.map(r => r.date).sort();
      setStartDate(dates[0]);
      setEndDate(dates[dates.length - 1]);
    }
  };

  const uniqueAssistants = [...new Set(allUsage.map(r => r.assistant_name))].sort();
  const hasActiveFilter  = selectedUser !== 'all' || selectedAssistant !== 'all' || searchTerm;

  const exportToCSV = () => {
    const rows = filteredData.slice(0, 500);
    const csv = [
      'Date,User,Email,Assistant',
      ...rows.map(r => `${r.date},"${r.name}","${r.email}","${r.assistant_name}"`),
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const suffix = startDate && endDate ? `${startDate}_${endDate}` : 'all';
    a.download = `usage-explorer-${suffix}.csv`;
    a.click();
  };

  // KPI calculations
  const totalRecords    = filteredData.length;
  const uniqueUsers     = new Set(filteredData.map(r => r.email)).size;
  const uniqueAssts     = new Set(filteredData.map(r => r.assistant_name)).size;
  const avgPerUser      = uniqueUsers > 0 ? (totalRecords / uniqueUsers).toFixed(1) : '—';

  // Daily trend
  const dailyMap = {};
  filteredData.forEach(r => { dailyMap[r.date] = (dailyMap[r.date] || 0) + 1; });
  const dailyChartData = Object.entries(dailyMap)
    .map(([date, count]) => ({ date: format(parseISO(date), 'MMM dd'), count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top users
  const userMap = {};
  filteredData.forEach(r => {
    if (!userMap[r.name]) userMap[r.name] = { name: r.name, count: 0, unique: new Set() };
    userMap[r.name].count++;
    userMap[r.name].unique.add(r.assistant_name);
  });
  const topUsers = Object.values(userMap)
    .map(u => ({ name: u.name.split(' ')[0], fullName: u.name, count: u.count, unique: u.unique.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top assistants
  const asstMap = {};
  filteredData.forEach(r => { asstMap[r.assistant_name] = (asstMap[r.assistant_name] || 0) + 1; });
  const topAssistants = Object.entries(asstMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return (
    <Box>
      {/* ── Filters ── */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <FilterListIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
          <Typography variant="subtitle1">Filters</Typography>
          <Box sx={{ flexGrow: 1 }} />
          {hasActiveFilter && (
            <Button size="small" startIcon={<ClearIcon />} onClick={clearFilters}
              sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>
              Clear
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={exportToCSV}
            disabled={filteredData.length === 0}
            sx={{ borderRadius: 2 }}
          >
            Export CSV
          </Button>
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>User</InputLabel>
              <Select value={selectedUser} label="User" onChange={e => setSelectedUser(e.target.value)}>
                <MenuItem value="all">All Users</MenuItem>
                {users.map(u => <MenuItem key={u.id} value={u.email}>{u.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Assistant</InputLabel>
              <Select value={selectedAssistant} label="Assistant" onChange={e => setSelectedAssistant(e.target.value)}>
                <MenuItem value="all">All Assistants</MenuItem>
                {uniqueAssistants.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField fullWidth size="small" type="date" label="From"
              value={startDate} onChange={e => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }} />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField fullWidth size="small" type="date" label="To"
              value={endDate} onChange={e => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }} />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField fullWidth size="small" label="Search"
              placeholder="Name, assistant…"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </Grid>
        </Grid>

        {hasActiveFilter && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
            {selectedUser !== 'all' && (
              <Chip size="small" label={`User: ${users.find(u => u.email === selectedUser)?.name}`}
                onDelete={() => setSelectedUser('all')} />
            )}
            {selectedAssistant !== 'all' && (
              <Chip size="small" label={`Assistant: ${selectedAssistant}`}
                onDelete={() => setSelectedAssistant('all')} />
            )}
            {searchTerm && (
              <Chip size="small" label={`"${searchTerm}"`} onDelete={() => setSearchTerm('')} />
            )}
          </Stack>
        )}
      </Paper>

      {loading && <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>}
      {error   && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {!loading && filteredData.length > 0 && (
        <>
          {/* ── KPI Cards ── */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KpiCard icon={<TrendingUpIcon />} label="Total Usage" value={totalRecords.toLocaleString()} accent="#2563eb" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard icon={<GroupIcon />} label="Active Users" value={uniqueUsers} accent="#7c3aed" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard icon={<SmartToyIcon />} label="Assistants Used" value={uniqueAssts} accent="#0891b2" />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard icon={<TimelineIcon />} label="Avg / User" value={avgPerUser} accent="#16a34a" />
            </Grid>
          </Grid>

          {/* ── Charts row 1 ── */}
          <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
            <Grid item xs={12} lg={7}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Typography variant="h6" sx={{ mb: 2.5 }}>Daily Usage Trend</Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={dailyChartData}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="count" name="Usage"
                      stroke={CHART_COLORS.primary} strokeWidth={2}
                      fill="url(#areaGrad)" dot={{ r: 3, fill: CHART_COLORS.primary }} />
                  </AreaChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={5}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2.5 }}>Top Users</Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topUsers} layout="vertical" barSize={10}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Usage" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="unique" name="Unique Assts" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* ── Top Assistants chart ── */}
          <Paper elevation={0} sx={{ p: 3, mb: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2.5 }}>Top Assistants</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topAssistants} layout="vertical" barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis dataKey="name" type="category" width={190} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Total Usage" fill={CHART_COLORS.cyan} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          {/* ── Records table ── */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">Records</Typography>
              <Typography variant="body2" color="text.secondary">
                {filteredData.length > 500
                  ? `Showing 500 of ${filteredData.length.toLocaleString()}`
                  : `${filteredData.length.toLocaleString()} records`}
              </Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 480 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {['Date', 'User', 'Email', 'Assistant'].map(h => (
                      <TableCell key={h} sx={{ bgcolor: '#f8fafc !important' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredData.slice(0, 500).map((record, i) => (
                    <TableRow key={i} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>
                        {format(parseISO(record.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.85rem' }}>{record.name}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.82rem' }}>{record.email}</TableCell>
                      <TableCell>
                        <Chip label={record.assistant_name} size="small"
                          sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 500, fontSize: '0.75rem', height: 22 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {!loading && filteredData.length === 0 && allUsage.length > 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>No records match the current filters.</Alert>
      )}
      {!loading && allUsage.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>No data available. Upload a CSV first.</Alert>
      )}
    </Box>
  );
}

export default UsageExplorer;

// Made with Bob
