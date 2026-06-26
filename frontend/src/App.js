import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  ThemeProvider,
  createTheme,
  CssBaseline,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  CircularProgress,
  Tooltip,
  LinearProgress,
  Button,
  Collapse,
} from '@mui/material';
import DashboardIcon    from '@mui/icons-material/Dashboard';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import PersonIcon       from '@mui/icons-material/Person';
import SmartToyIcon     from '@mui/icons-material/SmartToy';
import InsightsIcon     from '@mui/icons-material/Insights';
import CloudUploadIcon  from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon  from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import axios from 'axios';

import Dashboard        from './components/Dashboard';
import UsageExplorer    from './components/UsageExplorer';
import UserReports      from './components/UserReports';
import AssistantReports from './components/AssistantReports';
import Reminders        from './components/Reminders';

const SIDEBAR_WIDTH = 248;

const theme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: '#2563eb', light: '#3b82f6', dark: '#1d4ed8', contrastText: '#fff' },
    secondary: { main: '#7c3aed', contrastText: '#fff' },
    background: { default: '#f1f5f9', paper: '#ffffff' },
    text:       { primary: '#0f172a', secondary: '#475569' },
    divider:    '#e2e8f0',
    success:    { main: '#16a34a' },
    warning:    { main: '#d97706' },
    error:      { main: '#dc2626' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    h4:  { fontWeight: 700, letterSpacing: '-0.02em' },
    h5:  { fontWeight: 700, letterSpacing: '-0.01em' },
    h6:  { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    body2: { color: '#475569' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)', borderRadius: 12 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        elevation3: { boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
        containedPrimary: { boxShadow: '0 1px 2px 0 rgb(37 99 235 / 0.4)' },
      },
    },
    MuiChip:      { styleOverrides: { root: { fontWeight: 500 } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.04em', textTransform: 'uppercase' } } },
  },
});

const NAV_ITEMS = [
  { id: 0, label: 'Dashboard',         icon: <DashboardIcon />,              requiresData: true  },
  { id: 1, label: 'Usage Explorer',    icon: <ManageSearchIcon />,           requiresData: true  },
  { id: 2, label: 'User Reports',      icon: <PersonIcon />,                 requiresData: true  },
  { id: 3, label: 'Assistant Reports', icon: <SmartToyIcon />,               requiresData: true  },
  { id: 4, label: 'Send Reminders',    icon: <NotificationsActiveIcon />,    requiresData: true  },
];

// ── Compact sidebar upload widget ─────────────────────────────────────────────
function SidebarUpload({ onUploadSuccess, onClearData }) {
  const [file, setFile]         = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]     = useState(null);   // { ok, message, isNew }
  const inputId = 'sidebar-csv-input';

  const acceptFile = (f) => {
    if (f?.name.endsWith('.csv')) { setFile(f); setResult(null); }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    acceptFile(e.dataTransfer.files[0]);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post('/api/upload-csv', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { newRecords, skippedRecords } = res.data.stats;
      setResult({
        ok: true,
        isNew: newRecords > 0,
        message: newRecords > 0
          ? `✓ ${newRecords} new record${newRecords !== 1 ? 's' : ''} added`
          : `✓ Already up to date (${skippedRecords} stored)`,
      });
      setFile(null);
      if (newRecords > 0) onUploadSuccess();
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.error || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear ALL data from the database? This cannot be undone.')) return;
    try {
      await axios.delete('/api/clear-data');
      setFile(null);
      setResult(null);
      onClearData();
    } catch {
      setResult({ ok: false, message: 'Failed to clear data' });
    }
  };

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Divider sx={{ borderColor: '#1e293b', mb: 2 }} />

      {/* Section label */}
      <Typography sx={{ color: '#475569', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', mb: 1.5 }}>
        Import CSV
      </Typography>

      {/* Drop zone */}
      <Box
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => !file && document.getElementById(inputId).click()}
        sx={{
          border: '1.5px dashed',
          borderColor: dragging ? '#3b82f6' : file ? '#16a34a' : '#1e293b',
          borderRadius: 2,
          p: 1.5,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: dragging ? 'rgba(59,130,246,0.08)' : file ? 'rgba(22,163,74,0.07)' : 'rgba(255,255,255,0.03)',
          transition: 'all 0.18s ease',
          '&:hover': { borderColor: '#3b82f6', bgcolor: 'rgba(59,130,246,0.06)' },
        }}
      >
        <input id={inputId} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={(e) => acceptFile(e.target.files[0])} />

        {file ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InsertDriveFileIcon sx={{ fontSize: 16, color: '#4ade80', flexShrink: 0 }} />
            <Typography sx={{ color: '#e2e8f0', fontSize: '0.75rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name}
            </Typography>
            <Box
              component="span"
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              sx={{ color: '#64748b', fontSize: '0.7rem', cursor: 'pointer', flexShrink: 0, '&:hover': { color: '#94a3b8' } }}
            >
              ✕
            </Box>
          </Box>
        ) : (
          <Box>
            <CloudUploadIcon sx={{ fontSize: 20, color: '#475569', mb: 0.5 }} />
            <Typography sx={{ color: '#64748b', fontSize: '0.72rem', lineHeight: 1.3 }}>
              Drop CSV or <Box component="span" sx={{ color: '#60a5fa' }}>browse</Box>
            </Typography>
          </Box>
        )}
      </Box>

      {/* Upload button */}
      <Button
        variant="contained"
        size="small"
        fullWidth
        disabled={!file || uploading}
        onClick={handleUpload}
        startIcon={uploading ? null : <CloudUploadIcon sx={{ fontSize: '14px !important' }} />}
        sx={{
          mt: 1, py: 0.75, fontSize: '0.78rem',
          bgcolor: '#2563eb',
          '&:hover': { bgcolor: '#1d4ed8' },
          '&.Mui-disabled': { bgcolor: '#1e293b', color: '#475569' },
        }}
      >
        {uploading ? 'Processing…' : 'Upload & Process'}
      </Button>

      {uploading && <LinearProgress sx={{ mt: 0.75, borderRadius: 1, bgcolor: '#1e293b', '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6' } }} />}

      {/* Inline result feedback */}
      <Collapse in={!!result}>
        {result && (
          <Box sx={{
            mt: 1, px: 1.5, py: 1, borderRadius: 1.5,
            bgcolor: result.ok
              ? (result.isNew ? 'rgba(22,163,74,0.15)' : 'rgba(59,130,246,0.12)')
              : 'rgba(220,38,38,0.15)',
            border: '1px solid',
            borderColor: result.ok
              ? (result.isNew ? 'rgba(74,222,128,0.25)' : 'rgba(96,165,250,0.25)')
              : 'rgba(248,113,113,0.25)',
            display: 'flex', alignItems: 'flex-start', gap: 0.75,
          }}>
            <CheckCircleIcon sx={{ fontSize: 13, mt: 0.25, flexShrink: 0, color: result.ok ? (result.isNew ? '#4ade80' : '#60a5fa') : '#f87171' }} />
            <Typography sx={{ color: result.ok ? (result.isNew ? '#86efac' : '#93c5fd') : '#fca5a5', fontSize: '0.72rem', lineHeight: 1.4 }}>
              {result.message}
            </Typography>
          </Box>
        )}
      </Collapse>

      {/* Clear data */}
      <Box
        onClick={handleClear}
        sx={{
          mt: 2, display: 'flex', alignItems: 'center', gap: 0.75,
          cursor: 'pointer', opacity: 0.45,
          '&:hover': { opacity: 0.75 },
        }}
      >
        <DeleteOutlineIcon sx={{ fontSize: 13, color: '#f87171' }} />
        <Typography sx={{ color: '#f87171', fontSize: '0.68rem' }}>Clear all data</Typography>
      </Box>
    </Box>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab]       = useState(0);
  const [dataUploaded, setDataUploaded] = useState(false);
  const [checking, setChecking]         = useState(true);
  // Refresh key — increment to force child re-fetch after upload
  const [refreshKey, setRefreshKey]     = useState(0);

  useEffect(() => {
    axios.get('/api/users')
      .then(r => { if (r.data?.length > 0) setDataUploaded(true); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const handleUploadSuccess = () => {
    setDataUploaded(true);
    setRefreshKey(k => k + 1);   // causes active panel to re-fetch
    if (!dataUploaded) setActiveTab(0);  // first upload → go to Dashboard
  };

  const handleClearData = () => {
    setDataUploaded(false);
    setRefreshKey(k => k + 1);
  };

  // Pass refreshKey as prop so panels re-mount when data changes
  const PANELS = [
    <Dashboard        key={refreshKey} />,
    <UsageExplorer    key={refreshKey} />,
    <UserReports      key={refreshKey} />,
    <AssistantReports key={refreshKey} />,
    <Reminders        key={refreshKey} />,
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

        {/* ── Sidebar ── */}
        <Box sx={{
          width: SIDEBAR_WIDTH, flexShrink: 0, bgcolor: '#0f172a',
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        }}>

          {/* Logo */}
          <Box sx={{ px: 3, py: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <InsightsIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.2 }}>ICA Reports</Typography>
              <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem' }}>Usage Analytics</Typography>
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#1e293b', mx: 2 }} />

          {/* Data status pill */}
          <Box sx={{ px: 2.5, pt: 2, pb: 1 }}>
            {checking ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={12} sx={{ color: '#94a3b8' }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>Checking data…</Typography>
              </Box>
            ) : (
              <Chip size="small"
                label={dataUploaded ? 'Data loaded' : 'No data — upload below'}
                sx={{
                  bgcolor: dataUploaded ? 'rgba(22,163,74,0.15)' : 'rgba(148,163,184,0.1)',
                  color:   dataUploaded ? '#4ade80' : '#94a3b8',
                  border:  `1px solid ${dataUploaded ? 'rgba(74,222,128,0.3)' : 'rgba(148,163,184,0.2)'}`,
                  fontSize: '0.68rem', height: 22,
                  '.MuiChip-label': { px: 1 },
                }}
              />
            )}
          </Box>

          {/* Nav */}
          <List sx={{ px: 1.5, pt: 0.5, flexGrow: 1 }} disablePadding>
            {NAV_ITEMS.map((item) => {
              const disabled = item.requiresData && !dataUploaded;
              const active   = activeTab === item.id;
              return (
                <Tooltip key={item.id} title={disabled ? 'Upload a CSV first' : ''} placement="right">
                  <span>
                    <ListItemButton
                      disabled={disabled}
                      onClick={() => setActiveTab(item.id)}
                      sx={{
                        borderRadius: 2, mb: 0.5, py: 1, px: 1.5,
                        bgcolor: active ? 'rgba(37,99,235,0.2)' : 'transparent',
                        '&:hover': { bgcolor: active ? 'rgba(37,99,235,0.25)' : 'rgba(255,255,255,0.05)' },
                        '&.Mui-disabled': { opacity: 0.35 },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 34, color: active ? '#60a5fa' : '#64748b', '& .MuiSvgIcon-root': { fontSize: 19 } }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.label}
                        primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: active ? 600 : 400, color: active ? '#e2e8f0' : '#94a3b8' }} />
                      {active && <Box sx={{ width: 3, height: 20, borderRadius: 4, bgcolor: '#3b82f6', ml: 1 }} />}
                    </ListItemButton>
                  </span>
                </Tooltip>
              );
            })}
          </List>

          {/* ── Upload widget lives at the bottom of the sidebar ── */}
          <SidebarUpload onUploadSuccess={handleUploadSuccess} onClearData={handleClearData} />
        </Box>

        {/* ── Main content ── */}
        <Box component="main" sx={{ flexGrow: 1, ml: `${SIDEBAR_WIDTH}px`, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

          {/* Top bar */}
          <Box sx={{
            height: 56, bgcolor: 'background.paper',
            borderBottom: '1px solid', borderColor: 'divider',
            display: 'flex', alignItems: 'center', px: 4,
            position: 'sticky', top: 0, zIndex: 50,
          }}>
            <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {NAV_ITEMS.find(n => n.id === activeTab)?.label}
            </Typography>
          </Box>

          {/* Page */}
          <Box sx={{ p: 3.5, flexGrow: 1 }}>
            {dataUploaded
              ? PANELS[activeTab]
              : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 2, opacity: 0.6 }}>
                  <CloudUploadIcon sx={{ fontSize: 52, color: 'text.disabled' }} />
                  <Typography variant="h6" color="text.secondary">No data yet</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Drop a CSV onto the sidebar upload area to get started.
                  </Typography>
                </Box>
              )
            }
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;

// Made with Bob
