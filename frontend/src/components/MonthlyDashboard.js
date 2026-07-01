import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, CircularProgress,
  Alert, IconButton, Stack, Tooltip, Grid, Card, CardContent,
} from '@mui/material';
import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupIcon        from '@mui/icons-material/Group';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import axios from 'axios';
import { format, parseISO, addMonths, subMonths } from 'date-fns';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function MonthlyDashboard() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const fetchMonthData = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/monthly-summary', {
        params: { year: date.getFullYear(), month: date.getMonth() + 1 },
      });
      setData(res.data);
    } catch (err) {
      setError('Failed to fetch monthly data.');
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

  const monthLabel      = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  const weekLabel       = ws => format(parseISO(ws), 'MMM dd');
  const hasData         = data?.rows?.length > 0;
  const totalActive     = data?.totalActiveUsers ?? data?.rows?.length ?? 0;

  return (
    <Box>
      {/* ── Header strip ── */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CalendarMonthIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Monthly Summary</Typography>

          <Tooltip title="Previous month">
            <IconButton onClick={handlePrev} size="small" sx={{ bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#e2e8f0' } }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Box sx={{
            px: 3, py: 0.75,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'primary.light',
            bgcolor: '#eff6ff',
            minWidth: 180,
            textAlign: 'center',
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
          ICA assistant usage per user, grouped by week (Mon–Sun). Each cell = number of assistant interactions.
        </Typography>
      </Paper>

      {/* ── KPI strip (when data loaded) ── */}
      {!loading && hasData && (
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>Total Interactions</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>{data.grandTotal}</Typography>
                  </Box>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUpIcon sx={{ color: '#2563eb', fontSize: 22 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>Active Users</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>{totalActive}</Typography>
                  </Box>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <GroupIcon sx={{ color: '#7c3aed', fontSize: 22 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>Weeks in Month</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>{data.weeks.length}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 0.5 }}>Avg / User</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
                    {totalActive > 0 ? (data.grandTotal / totalActive).toFixed(1) : '0.0'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {loading && <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>}
      {error   && <Alert severity="error"   sx={{ borderRadius: 2 }}>{error}</Alert>}

      {!loading && !error && !hasData && totalActive === 0 && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No usage data found for {monthLabel}. Navigate to another month or upload a CSV.
        </Alert>
      )}

      {/* ── Pivot table ── */}
      {!loading && hasData && (
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {/* Name col */}
                  <TableCell
                    sx={{
                      bgcolor: '#0f172a !important',
                      color: '#e2e8f0',
                      fontWeight: 700,
                      minWidth: 200,
                      fontSize: '0.78rem',
                      letterSpacing: '0.06em',
                      borderRight: '1px solid #1e293b',
                      py: 1.5,
                    }}
                  >
                    NAME
                  </TableCell>

                  {/* Week columns */}
                  {data.weeks.map(ws => (
                    <TableCell
                      key={ws}
                      align="right"
                      sx={{
                        bgcolor: '#0f172a !important',
                        color: '#94a3b8',
                        fontWeight: 600,
                        minWidth: 90,
                        fontSize: '0.78rem',
                        letterSpacing: '0.04em',
                        borderRight: '1px solid #1e293b',
                        py: 1.5,
                      }}
                    >
                      {weekLabel(ws)}
                    </TableCell>
                  ))}

                  {/* Grand Total col */}
                  <TableCell
                    align="right"
                    sx={{
                      bgcolor: '#1e293b !important',
                      color: '#e2e8f0',
                      fontWeight: 700,
                      minWidth: 100,
                      fontSize: '0.78rem',
                      letterSpacing: '0.06em',
                      py: 1.5,
                    }}
                  >
                    TOTAL
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {data.rows.map((row, idx) => {
                  const isNonUser = row.total === 0;
                  return (
                  <TableRow
                    key={row.email}
                    hover
                    sx={{ bgcolor: isNonUser ? '#fffbf0' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc') }}
                  >
                    {/* Name */}
                    <TableCell
                      sx={{
                        fontWeight: 500,
                        fontSize: '0.85rem',
                        color: isNonUser ? '#92400e' : '#0f172a',
                        borderRight: '1px solid #e2e8f0',
                        py: 1.25,
                      }}
                    >
                      {row.name}
                      {isNonUser && (
                        <Typography component="span" sx={{ ml: 1, fontSize: '0.7rem', color: '#b45309', fontWeight: 600, bgcolor: '#fef3c7', px: 0.75, py: 0.2, borderRadius: 1 }}>
                          not using
                        </Typography>
                      )}
                    </TableCell>

                    {/* Weekly counts */}
                    {data.weeks.map(ws => {
                      const val = row.weekCounts[ws];
                      return (
                        <TableCell
                          key={ws}
                          align="right"
                          sx={{
                            fontSize: '0.85rem',
                            fontWeight: val ? 600 : 400,
                            color: val ? '#0f172a' : '#cbd5e1',
                            borderRight: '1px solid #e2e8f0',
                            py: 1.25,
                          }}
                        >
                          {val || '–'}
                        </TableCell>
                      );
                    })}

                    {/* Row total */}
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        color: isNonUser ? '#b45309' : '#2563eb',
                        bgcolor: isNonUser ? '#fef3c7' : '#eff6ff',
                        py: 1.25,
                      }}
                    >
                      {row.total}
                    </TableCell>
                  </TableRow>
                  );
                })}

                {/* Grand Total row */}
                <TableRow sx={{ bgcolor: '#0f172a' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#e2e8f0', borderRight: '1px solid #1e293b', py: 1.5 }}>
                    Grand Total
                  </TableCell>
                  {data.weeks.map(ws => (
                    <TableCell
                      key={ws}
                      align="right"
                      sx={{ fontWeight: 700, color: '#94a3b8', borderRight: '1px solid #1e293b', fontSize: '0.88rem', py: 1.5 }}
                    >
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
      )}
    </Box>
  );
}

export default MonthlyDashboard;

// Made with Bob
