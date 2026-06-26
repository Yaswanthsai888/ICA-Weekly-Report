import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import axios from 'axios';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

function WeeklyDashboard() {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [weeklySummary, setWeeklySummary] = useState([]);
  const [assistantStats, setAssistantStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAvailableWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      fetchWeeklyData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]);

  const fetchAvailableWeeks = async () => {
    try {
      const response = await axios.get('/api/available-weeks');
      setWeeks(response.data);
      if (response.data.length > 0) {
        setSelectedWeek(response.data[0].startDate);
      }
    } catch (err) {
      setError('Failed to fetch available weeks');
    }
  };

  const fetchWeeklyData = async () => {
    setLoading(true);
    setError(null);

    try {
      const week = weeks.find(w => w.startDate === selectedWeek);
      if (!week) return;

      const [summaryRes, statsRes] = await Promise.all([
        axios.get('/api/weekly-summary', {
          params: { startDate: week.startDate, endDate: week.endDate }
        }),
        axios.get('/api/assistant-stats', {
          params: { startDate: week.startDate, endDate: week.endDate }
        })
      ]);

      setWeeklySummary(summaryRes.data);
      setAssistantStats(statsRes.data);
    } catch (err) {
      setError('Failed to fetch weekly data');
    } finally {
      setLoading(false);
    }
  };

  const handleWeekChange = (event) => {
    setSelectedWeek(event.target.value);
  };

  // Prepare data for charts
  const userUsageData = weeklySummary.map(user => ({
    name: user.name.split(' ')[0], // First name only
    days: user.days_used,
    assistants: user.total_assistants_used
  }));

  const topAssistants = assistantStats.slice(0, 10);

  const assistantPieData = topAssistants.map(stat => ({
    name: stat.assistant_name.length > 20 
      ? stat.assistant_name.substring(0, 20) + '...' 
      : stat.assistant_name,
    value: stat.usage_count
  }));

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Weekly Analytics Dashboard
        </Typography>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Select Week</InputLabel>
          <Select
            value={selectedWeek}
            label="Select Week"
            onChange={handleWeekChange}
          >
            {weeks.map((week) => (
              <MenuItem key={week.startDate} value={week.startDate}>
                {week.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {loading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && weeklySummary.length > 0 && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Users
                  </Typography>
                  <Typography variant="h4">
                    {weeklySummary.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Total Assistants Used
                  </Typography>
                  <Typography variant="h4">
                    {weeklySummary.reduce((sum, user) => sum + user.total_assistants_used, 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Unique Assistants
                  </Typography>
                  <Typography variant="h4">
                    {assistantStats.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Avg Usage per User
                  </Typography>
                  <Typography variant="h4">
                    {(weeklySummary.reduce((sum, user) => sum + user.total_assistants_used, 0) / weeklySummary.length).toFixed(1)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={6}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  User Activity Overview
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={userUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="days" fill="#8884d8" name="Days Active" />
                    <Bar dataKey="assistants" fill="#82ca9d" name="Total Assistants" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Top 10 Assistants Used
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={assistantPieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {assistantPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* User Summary Table */}
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              User Summary
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell align="right"><strong>Days Active</strong></TableCell>
                    <TableCell align="right"><strong>Total Assistants Used</strong></TableCell>
                    <TableCell align="right"><strong>Unique Assistants</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {weeklySummary.map((user) => (
                    <TableRow key={user.email}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell align="right">{user.days_used}</TableCell>
                      <TableCell align="right">{user.total_assistants_used}</TableCell>
                      <TableCell align="right">{user.unique_assistants}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
}

export default WeeklyDashboard;

// Made with Bob
