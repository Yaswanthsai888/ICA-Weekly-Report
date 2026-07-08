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
  Tab,
  Tabs,
} from '@mui/material';
import DashboardIcon             from '@mui/icons-material/Dashboard';
import ManageSearchIcon          from '@mui/icons-material/ManageSearch';
import PersonIcon                from '@mui/icons-material/Person';
import SmartToyIcon              from '@mui/icons-material/SmartToy';
import InsightsIcon              from '@mui/icons-material/Insights';
import CloudUploadIcon           from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon       from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon           from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon         from '@mui/icons-material/DeleteOutline';
import NotificationsActiveIcon   from '@mui/icons-material/NotificationsActive';
import PeopleIcon                from '@mui/icons-material/People';
import AccountTreeIcon           from '@mui/icons-material/AccountTree';
import SlideshowIcon             from '@mui/icons-material/Slideshow';
import EventNoteIcon             from '@mui/icons-material/EventNote';
import TodayIcon                 from '@mui/icons-material/Today';
import CalendarMonthIcon         from '@mui/icons-material/CalendarMonth';
import GroupsIcon                from '@mui/icons-material/Groups';
import BarChartIcon              from '@mui/icons-material/BarChart';
import SwapHorizIcon             from '@mui/icons-material/SwapHoriz';
import ManageAccountsIcon        from '@mui/icons-material/ManageAccounts';
import axios from 'axios';

import Dashboard        from './components/Dashboard';
import UsageExplorer    from './components/UsageExplorer';
import UserReports      from './components/UserReports';
import AssistantReports from './components/AssistantReports';
import Reminders        from './components/Reminders';
import Architecture     from './components/Architecture';
import Presentation     from './components/Presentation';
import TeamRoster       from './components/TeamRoster';
import BackupMap        from './components/BackupMap';
import WhosOutToday     from './components/WhosOutToday';
import LeaveCalendar    from './components/LeaveCalendar';
import LeaveUpload      from './components/LeaveUpload';
import ManagerTab       from './components/ManagerTab';

const SIDEBAR_WIDTH = 232;

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
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.82rem',
          minHeight: 44,
          padding: '0 16px',
        },
      },
    },
  },
});

// ── Section definitions ────────────────────────────────────────────────────────
// Each section has an id, label, icon (for the sidebar), and a list of sub-tabs.
// Sub-tabs have: id (unique string), label, icon, requiresData flag, and panel.
// Panels are rendered lazily inside the App component where refreshKey is available.

const SECTIONS = [
  {
    id: 'ica',
    label: 'ICA Monitoring',
    icon: <InsightsIcon />,
    subTabs: [
      { id: 'dashboard',         label: 'Dashboard',         icon: <DashboardIcon />,            requiresData: true  },
      { id: 'usage-explorer',    label: 'Usage Explorer',    icon: <ManageSearchIcon />,          requiresData: true  },
      { id: 'user-reports',      label: 'User Reports',      icon: <PersonIcon />,               requiresData: true  },
      { id: 'assistant-reports', label: 'Assistant Reports', icon: <SmartToyIcon />,             requiresData: true  },
      { id: 'reminders',         label: 'Send Reminders',    icon: <NotificationsActiveIcon />,  requiresData: true  },
      { id: 'architecture',      label: 'Architecture',      icon: <AccountTreeIcon />,          requiresData: false },
      { id: 'presentation',      label: 'Presentation',      icon: <SlideshowIcon />,            requiresData: false },
    ],
  },
  {
    id: 'leave',
    label: 'Leave Monitoring',
    icon: <EventNoteIcon />,
    subTabs: [
      { id: 'whos-out',       label: "Who's Out Today", icon: <TodayIcon />,        requiresData: false },
      { id: 'leave-calendar', label: 'Monthly Calendar', icon: <CalendarMonthIcon />, requiresData: false },
      { id: 'leave-upload',   label: 'Upload Leave',     icon: <EventNoteIcon />,     requiresData: false },
    ],
  },
  {
    id: 'team',
    label: 'Team Details',
    icon: <GroupsIcon />,
    subTabs: [
      { id: 'team-roster', label: 'Team Roster', icon: <PeopleIcon />,    requiresData: false },
      { id: 'backup-map',  label: 'Backup Map',  icon: <SwapHorizIcon />, requiresData: false },
    ],
  },
  {
    id: 'manager',
    label: 'Manager',
    icon: <ManageAccountsIcon />,
    subTabs: [
      { id: 'manage-members', label: 'Manage Members', icon: <ManageAccountsIcon />, requiresData: false },
    ],
  },
  {
    id: 'overall',
    label: 'Overall Team',
    icon: <BarChartIcon />,
    subTabs: [
      { id: 'overall-overview', label: 'Overall Overview', icon: <BarChartIcon />, requiresData: false },
    ],
  },
];

// ── Placeholder panel for sections not yet built ───────────────────────────────
function ComingSoon({ title }) {
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '60vh', gap: 2, opacity: 0.55,
    }}>
      <BarChartIcon sx={{ fontSize: 52, color: 'text.disabled' }} />
      <Typography variant="h6" color="text.secondary">{title}</Typography>
      <Typography variant="body2" color="text.secondary">
        This section is coming soon.
      </Typography>
    </Box>
  );
}

// ── Compact sidebar upload widget ─────────────────────────────────────────────
function SidebarUpload({ onUploadSuccess, onClearData }) {
  const [file, setFile]           = useState(null);
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]       = useState(null);
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
  const [activeSection, setActiveSection] = useState('ica');
  const [activeSubTab,  setActiveSubTab]  = useState('dashboard');
  const [dataUploaded,  setDataUploaded]  = useState(false);
  const [checking,      setChecking]      = useState(true);
  const [recordCount,   setRecordCount]   = useState(0);
  const [refreshKey,    setRefreshKey]    = useState(0);

  const checkDataStatus = useCallback(() => {
    axios.get('/api/users')
      .then(r => { if (r.data?.length > 0) setDataUploaded(true); })
      .catch(() => {})
      .finally(() => setChecking(false));
    axios.get('/api/usage', { params: { startDate: '2000-01-01', endDate: '2099-12-31' } })
      .then(r => setRecordCount(r.data?.length || 0))
      .catch(() => {});
  }, []);

  useEffect(() => { checkDataStatus(); }, [checkDataStatus]);

  const handleUploadSuccess = () => {
    setDataUploaded(true);
    setRefreshKey(k => k + 1);
    if (!dataUploaded) {
      setActiveSection('ica');
      setActiveSubTab('dashboard');
    }
    axios.get('/api/usage', { params: { startDate: '2000-01-01', endDate: '2099-12-31' } })
      .then(r => setRecordCount(r.data?.length || 0))
      .catch(() => {});
  };

  const handleClearData = () => {
    setDataUploaded(false);
    setRecordCount(0);
    setRefreshKey(k => k + 1);
  };

  // Switch section → reset to first sub-tab of that section
  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    const section = SECTIONS.find(s => s.id === sectionId);
    setActiveSubTab(section.subTabs[0].id);
  };

  // Map sub-tab id → panel element
  const getPanel = (subTabId) => {
    switch (subTabId) {
      case 'dashboard':         return <Dashboard        key={refreshKey} />;
      case 'usage-explorer':    return <UsageExplorer    key={refreshKey} />;
      case 'user-reports':      return <UserReports      key={refreshKey} />;
      case 'assistant-reports': return <AssistantReports key={refreshKey} />;
      case 'reminders':         return <Reminders        key={refreshKey} />;
      case 'architecture':      return <Architecture />;
      case 'presentation':      return <Presentation     key="presentation" onLaunch={() => { setActiveSection('ica'); setActiveSubTab('dashboard'); }} />;
      // Team Details
      case 'team-roster':       return <TeamRoster />;
      case 'backup-map':        return <BackupMap />;
      // Leave Monitoring (Phase 3)
      case 'whos-out':          return <WhosOutToday />;
      case 'leave-calendar':    return <LeaveCalendar />;
      case 'leave-upload':      return <LeaveUpload />;
      // Manager (single source of truth for all member edits)
      case 'manage-members':    return <ManagerTab />;
      // Overall (Phase 5)
      case 'overall-overview':  return <ComingSoon title="Overall Team" />;
      default:                  return null;
    }
  };

  const currentSection = SECTIONS.find(s => s.id === activeSection);
  const currentSubTab  = currentSection?.subTabs.find(t => t.id === activeSubTab);
  const noDataTabs     = ['architecture', 'presentation', 'whos-out', 'leave-calendar', 'leave-upload', 'team-roster', 'backup-map', 'manage-members', 'overall-overview', 'manager'];
  const canView        = dataUploaded || noDataTabs.includes(activeSubTab);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

        {/* ── Left Sidebar — main sections ── */}
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
              <Typography sx={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.2 }}>Team Monitoring</Typography>
              <Typography sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>HNK IBM Portal</Typography>
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
                label={dataUploaded ? `${recordCount.toLocaleString()} records` : 'No data — upload below'}
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

          {/* Section nav */}
          <List sx={{ px: 1.5, pt: 0.5, flexGrow: 1 }} disablePadding>

            {/* Section group label */}
            <Typography sx={{ color: '#475569', fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', px: 1.5, pt: 1, pb: 0.5 }}>
              Sections
            </Typography>

            {SECTIONS.map((section) => {
              const active = activeSection === section.id;
              return (
                <ListItemButton
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  sx={{
                    borderRadius: 2, mb: 0.5, py: 1, px: 1.5,
                    bgcolor: active ? 'rgba(37,99,235,0.2)' : 'transparent',
                    '&:hover': { bgcolor: active ? 'rgba(37,99,235,0.25)' : 'rgba(255,255,255,0.05)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 34, color: active ? '#60a5fa' : '#64748b', '& .MuiSvgIcon-root': { fontSize: 19 } }}>
                    {section.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={section.label}
                    primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: active ? 600 : 400, color: active ? '#e2e8f0' : '#94a3b8' }}
                  />
                  {active && <Box sx={{ width: 3, height: 20, borderRadius: 4, bgcolor: '#3b82f6', ml: 1 }} />}
                </ListItemButton>
              );
            })}
          </List>

          {/* Upload widget — only shown in ICA section */}
          {activeSection === 'ica' && (
            <SidebarUpload onUploadSuccess={handleUploadSuccess} onClearData={handleClearData} />
          )}
        </Box>

        {/* ── Main content area ── */}
        <Box component="main" sx={{ flexGrow: 1, ml: `${SIDEBAR_WIDTH}px`, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

          {/* ── Top header bar with sub-tabs ── */}
          <Box sx={{
            bgcolor: 'background.paper',
            borderBottom: '1px solid', borderColor: 'divider',
            position: 'sticky', top: 0, zIndex: 50,
          }}>
            {/* Section title row */}
            <Box sx={{
              height: 48, display: 'flex', alignItems: 'center', px: 3, gap: 2,
              borderBottom: '1px solid', borderColor: 'divider',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                {currentSection?.icon && React.cloneElement(currentSection.icon, { sx: { fontSize: 18, color: '#2563eb' } })}
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', letterSpacing: '0.02em' }}>
                  {currentSection?.label}
                </Typography>
              </Box>
              <Box sx={{ width: 1, height: 16, bgcolor: 'divider' }} />
              <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600, flexGrow: 1 }}>
                {currentSubTab?.label}
              </Typography>
              {dataUploaded && activeSection === 'ica' && (
                <Chip
                  size="small"
                  label={`${recordCount.toLocaleString()} records`}
                  sx={{
                    bgcolor: 'rgba(37,99,235,0.08)', color: '#2563eb',
                    border: '1px solid rgba(37,99,235,0.2)',
                    fontSize: '0.7rem', height: 22, fontWeight: 600,
                    '.MuiChip-label': { px: 1 },
                  }}
                />
              )}
            </Box>

            {/* Sub-tabs row — Tab must be a direct child of Tabs for value matching */}
            <Tabs
              value={activeSubTab}
              onChange={(_, newVal) => setActiveSubTab(newVal)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 40,
                px: 1,
                '& .MuiTabs-indicator': { bgcolor: '#2563eb', height: 2 },
                '& .MuiTab-root': { minHeight: 40 },
                '& .MuiTab-root.Mui-selected': { color: '#2563eb', fontWeight: 600 },
                '& .MuiTab-root:not(.Mui-selected)': { color: '#64748b' },
                '& .MuiTab-root.Mui-disabled': { opacity: 0.38 },
              }}
            >
              {currentSection?.subTabs.map((tab) => {
                const disabled = tab.requiresData && !dataUploaded;
                return (
                  <Tab
                    key={tab.id}
                    value={tab.id}
                    disabled={disabled}
                    label={
                      <Tooltip title={disabled ? 'Upload a CSV first' : ''} placement="bottom">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          {React.cloneElement(tab.icon, { sx: { fontSize: 15 } })}
                          {tab.label}
                        </Box>
                      </Tooltip>
                    }
                  />
                );
              })}
            </Tabs>
          </Box>

          {/* ── Page content ── */}
          <Box sx={{ p: 3.5, flexGrow: 1 }}>
            {canView
              ? getPanel(activeSubTab)
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
