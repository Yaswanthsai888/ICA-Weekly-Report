import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, FormControl, InputLabel, Select, MenuItem,
  Grid, Card, CardContent, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, Alert, Chip, Stack,
} from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import PersonIcon    from '@mui/icons-material/Person';
import SmartToyIcon  from '@mui/icons-material/SmartToy';
import EventNoteIcon from '@mui/icons-material/EventNote';
import axios from 'axios';
import { format } from 'date-fns';

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

function UserReports() {
  const [users, setUsers]             = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [weeks, setWeeks]             = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [userUsage, setUserUsage]     = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchAvailableWeeks();
  }, []);

  useEffect(() => {
    if (selectedUser && selectedWeek) fetchUserUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, selectedWeek]);

  const fetchUsers = async () => {
    try {
      const r = await axios.get('/api/users');
      setUsers(r.data);
      if (r.data.length > 0) setSelectedUser(r.data[0].id);
    } catch { setError('Failed to fetch users.'); }
  };

  const fetchAvailableWeeks = async () => {
    try {
      const r = await axios.get('/api/available-weeks');
      setWeeks(r.data);
      if (r.data.length > 0) setSelectedWeek(r.data[0].startDate);
    } catch { setError('Failed to fetch weeks.'); }
  };

  const fetchUserUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const week = weeks.find(w => w.startDate === selectedWeek);
      if (!week) return;
      const r = await axios.get(`/api/user-usage/${selectedUser}`, {
        params: { startDate: week.startDate, endDate: week.endDate },
      });
      setUserUsage(r.data);
    } catch { setError('Failed to fetch user usage.'); }
    finally { setLoading(false); }
  };

  // Derived data
  const usageByDate = userUsage.reduce((acc, r) => {
    acc[r.date] = acc[r.date] || [];
    acc[r.date].push(r.assistant_name);
    return acc;
  }, {});

  const dailyData = Object.keys(usageByDate).sort().map(d => ({
    date: format(new Date(d), 'MMM dd'),
    count: usageByDate[d].length,
  }));

  const assistantFreq = userUsage.reduce((acc, r) => {
    acc[r.assistant_name] = (acc[r.assistant_name] || 0) + 1;
    return acc;
  }, {});
  const topAssistants = Object.entries(assistantFreq)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const selectedUserData = users.find(u => u.id === selectedUser);

  return (
    <Box>
      {/* ── Selectors ── */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>User Reports</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Select User</InputLabel>
              <Select value={selectedUser} label="Select User" onChange={e => setSelectedUser(e.target.value)}>
                {users.map(u => (
                  <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Select Week</InputLabel>
              <Select value={selectedWeek} label="Select Week" onChange={e => setSelectedWeek(e.target.value)}>
                {weeks.map(w => (
                  <MenuItem key={w.startDate} value={w.startDate}>{w.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {loading && <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>}
      {error   && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {!loading && selectedUserData && userUsage.length > 0 && (
        <>
          {/* ── User info card ── */}
          <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
              <Box sx={{ width: 38, height: 38, borderRadius: '50%', bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PersonIcon sx={{ color: '#2563eb', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>{selectedUserData.name}</Typography>
                <Typography variant="body2" color="text.secondary">{selectedUserData.email}</Typography>
              </Box>
              {selectedUserData.track && (
                <Chip label={selectedUserData.track} size="small"
                  sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 600 }} />
              )}
              {selectedUserData.scrum_master && (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto !important' }}>
                  SM: <strong>{selectedUserData.scrum_master}</strong>
                </Typography>
              )}
            </Stack>
          </Paper>

          {/* ── KPI cards ── */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={4}>
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>Days Active</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
                        {Object.keys(usageByDate).length}
                      </Typography>
                    </Box>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <EventNoteIcon sx={{ color: '#2563eb', fontSize: 22 }} />
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
                      <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>{userUsage.length}</Typography>
                    </Box>
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <SmartToyIcon sx={{ color: '#7c3aed', fontSize: 22 }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={4}>
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>Unique Assistants</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
                      {Object.keys(assistantFreq).length}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* ── Charts ── */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Typography variant="h6" sx={{ mb: 2.5 }}>Daily Usage</Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="count" name="Interactions"
                      stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb' }} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                <Typography variant="h6" sx={{ mb: 2.5 }}>Top Assistants</Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topAssistants} layout="vertical" barSize={10}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Uses" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* ── Detail table ── */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6">Daily Breakdown</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Date', 'Assistants Used', 'Count'].map(h => (
                      <TableCell key={h} sx={{ bgcolor: '#f8fafc' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.keys(usageByDate).sort().reverse().map(d => (
                    <TableRow key={d} hover>
                      <TableCell sx={{ fontWeight: 500, width: 140, color: 'text.secondary', fontSize: '0.83rem' }}>
                        {format(new Date(d), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {usageByDate[d].map((a, i) => (
                            <Chip key={i} label={a} size="small"
                              sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 500, fontSize: '0.72rem', height: 20 }} />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#2563eb', width: 60 }}>
                        {usageByDate[d].length}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {!loading && userUsage.length === 0 && selectedUser && selectedWeek && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No usage data found for this user and week.
        </Alert>
      )}
    </Box>
  );
}

export default UserReports;

// Made with Bob
