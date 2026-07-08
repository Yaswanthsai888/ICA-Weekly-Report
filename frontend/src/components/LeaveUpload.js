import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Chip, CircularProgress, Alert, Button,
  LinearProgress, Paper, Divider, Snackbar, FormControlLabel,
  Switch, Tooltip,
} from '@mui/material';
import CloudUploadIcon     from '@mui/icons-material/CloudUpload';
import CheckCircleIcon     from '@mui/icons-material/CheckCircle';
import CalendarMonthIcon   from '@mui/icons-material/CalendarMonth';
import EventNoteIcon       from '@mui/icons-material/EventNote';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import UpdateIcon          from '@mui/icons-material/Update';
import InfoOutlinedIcon    from '@mui/icons-material/InfoOutlined';
import axios from 'axios';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMonthLabel(ym) {
  if (!ym) return ym;
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function shortDate(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── UploadZone ────────────────────────────────────────────────────────────────

function UploadZone({ title, description, accept, onFile, uploading, lastResult, icon }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  return (
    <Paper
      elevation={0}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      sx={{
        border: '2px dashed',
        borderColor: dragging ? '#2563eb' : (lastResult?.success ? '#16a34a' : 'divider'),
        borderRadius: 2,
        p: 3,
        textAlign: 'center',
        bgcolor: dragging ? 'rgba(37,99,235,0.04)' : (lastResult?.success ? 'rgba(22,163,74,0.04)' : 'background.paper'),
        transition: 'all 0.15s',
        cursor: 'pointer',
      }}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        {uploading ? (
          <CircularProgress size={28} />
        ) : lastResult?.success ? (
          <CheckCircleIcon sx={{ fontSize: 32, color: '#16a34a' }} />
        ) : (
          React.cloneElement(icon, { sx: { fontSize: 32, color: '#94a3b8' } })
        )}

        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}>{title}</Typography>
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{description}</Typography>

        {!uploading && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<CloudUploadIcon />}
            onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
            sx={{ mt: 0.5, fontSize: '0.78rem', borderRadius: 1.5 }}
          >
            Choose File
          </Button>
        )}

        {uploading && (
          <Box sx={{ width: '100%', mt: 1 }}>
            <LinearProgress sx={{ borderRadius: 1 }} />
            <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary', mt: 0.75 }}>Uploading…</Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

// ── ResultBanner ──────────────────────────────────────────────────────────────

function ResultBanner({ result }) {
  if (!result) return null;
  if (result.success) {
    return (
      <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 1.5, fontSize: '0.82rem', borderRadius: 1.5 }}>
        <strong>{result.title}</strong>
        {result.detail && <Box sx={{ mt: 0.5, fontSize: '0.78rem' }}>{result.detail}</Box>}
      </Alert>
    );
  }
  return (
    <Alert severity="error" sx={{ mt: 1.5, fontSize: '0.82rem', borderRadius: 1.5 }}>
      {result.error}
    </Alert>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LeaveUpload() {
  const [uploadedMonths,   setUploadedMonths]   = useState([]);
  const [snapshots,        setSnapshots]        = useState([]);
  const [monthsLoading,    setMonthsLoading]    = useState(true);
  const [leaveUploading,   setLeaveUploading]   = useState(false);
  const [holidayUploading, setHolidayUploading] = useState(false);
  const [leaveResult,      setLeaveResult]      = useState(null);
  const [holidayResult,    setHolidayResult]    = useState(null);
  const [forceEnd,         setForceEnd]         = useState(false);
  const [snack,            setSnack]            = useState({ open: false, message: '' });

  const loadMonths = useCallback(() => {
    setMonthsLoading(true);
    Promise.all([
      axios.get('/api/leave'),
      axios.get('/api/leave/snapshots'),
    ])
      .then(([leaveRes, snapRes]) => {
        const months = [...new Set(leaveRes.data.map(rec => rec.month_year))].filter(Boolean).sort();
        setUploadedMonths(months);
        setSnapshots(snapRes.data);
      })
      .catch(() => setUploadedMonths([]))
      .finally(() => setMonthsLoading(false));
  }, []);

  useEffect(() => { loadMonths(); }, [loadMonths]);

  // Build snapMap keyed by monthYear → { start, end }
  const snapMap = {};
  snapshots.forEach(s => {
    if (!snapMap[s.month_year]) snapMap[s.month_year] = {};
    snapMap[s.month_year][s.snapshot] = s;
  });

  // Upload monthly leave CSV
  const handleLeaveFile = async (file) => {
    setLeaveResult(null);
    setLeaveUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    // If forceEnd is toggled, explicitly pass 'end'; otherwise let backend auto-detect
    if (forceEnd) fd.append('snapshot', 'end');
    try {
      const r = await axios.post('/api/upload-leave', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const d = r.data;
      const snapLabel = d.snapshot === 'end' ? 'End-of-month correction' : 'Start-of-month';
      setLeaveResult({
        success: true,
        title: `Uploaded ${formatMonthLabel(d.monthYear)} — ${d.inserted} records inserted`,
        detail: `${snapLabel} · ${d.members} team members · ${d.total} leave entries processed`,
      });
      loadMonths();
      setSnack({ open: true, message: `${snapLabel} leave data for ${formatMonthLabel(d.monthYear)} uploaded.` });
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details || 'Upload failed. Check the file format and try again.';
      setLeaveResult({ success: false, error: msg });
    } finally {
      setLeaveUploading(false);
    }
  };

  // Upload holiday CSV
  const handleHolidayFile = async (file) => {
    setHolidayResult(null);
    setHolidayUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await axios.post('/api/upload-holidays', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const d = r.data;
      setHolidayResult({
        success: true,
        title: `Holiday list updated — ${d.inserted} holidays loaded`,
        detail: `${d.total} total entries processed`,
      });
      setSnack({ open: true, message: `Holiday list updated: ${d.inserted} holidays loaded.` });
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details || 'Upload failed. Check the file format.';
      setHolidayResult({ success: false, error: msg });
    } finally {
      setHolidayUploading(false);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>Upload Leave Data</Typography>
        <Typography variant="body2" color="text.secondary">
          Upload monthly leave grid CSVs and the IBM India holiday list to keep the calendar current.
        </Typography>
      </Box>

      {/* Two upload panels side by side */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3.5 }}>

        {/* Leave CSV */}
        <Box>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.25 }}>
            Monthly Leave Grid
          </Typography>

          {/* End-of-month toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25, p: 1.25, bgcolor: forceEnd ? 'rgba(124,58,237,0.06)' : 'rgba(22,163,74,0.05)', border: '1px solid', borderColor: forceEnd ? 'rgba(124,58,237,0.2)' : 'rgba(22,163,74,0.2)', borderRadius: 1.5 }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={forceEnd}
                  onChange={e => setForceEnd(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#7c3aed' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#7c3aed' },
                  }}
                />
              }
              label={
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: forceEnd ? '#7c3aed' : '#16a34a' }}>
                  {forceEnd ? 'End-of-month correction (Actual)' : 'Start-of-month (Planned)'}
                </Typography>
              }
              sx={{ m: 0 }}
            />
            <Tooltip title={forceEnd
              ? 'This will save as the end-of-month snapshot. Use this at month close when sick leaves or extra absences have been added.'
              : 'This will save as the start-of-month snapshot (planned). The system auto-detects: if this month has no data yet it saves as start, otherwise as end.'
            }>
              <InfoOutlinedIcon sx={{ fontSize: 15, color: 'text.disabled', cursor: 'help' }} />
            </Tooltip>
          </Box>

          <UploadZone
            title={forceEnd ? 'Upload End-of-Month CSV' : 'Upload Leave CSV'}
            description="JDE_India_Vacation_Polaris_2026(Mon-YY).csv — month is auto-detected from filename"
            accept=".csv"
            onFile={handleLeaveFile}
            uploading={leaveUploading}
            lastResult={leaveResult}
            icon={forceEnd ? <UpdateIcon /> : <CalendarMonthIcon />}
          />
          <ResultBanner result={leaveResult} />

          {/* Format hint */}
          <Box sx={{ mt: 1.5, bgcolor: '#f7f8fa', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>Expected format</Typography>
            <Typography sx={{ fontSize: '0.71rem', color: 'text.disabled', fontFamily: 'monospace', lineHeight: 1.6 }}>
              Row 1: day-of-week headers<br />
              Row 2: Name, Location, 1, 2, 3 … 30/31<br />
              Row 3+: Name, City, [X = vacation / S = sick]
            </Typography>
          </Box>
        </Box>

        {/* Holiday CSV */}
        <Box>
          <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.25 }}>
            IBM India Holiday List
          </Typography>
          <UploadZone
            title="Upload Holiday List CSV"
            description="JDE_India_Vacation_Polaris_2026(Holiday_List-2026).csv — replaces all existing holidays"
            accept=".csv"
            onFile={handleHolidayFile}
            uploading={holidayUploading}
            lastResult={holidayResult}
            icon={<EventNoteIcon />}
          />
          <ResultBanner result={holidayResult} />

          <Box sx={{ mt: 1.5, bgcolor: '#f7f8fa', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1.5 }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>Expected format</Typography>
            <Typography sx={{ fontSize: '0.71rem', color: 'text.disabled', fontFamily: 'monospace', lineHeight: 1.6 }}>
              Row 1: S.No, Name, Year, "", State columns…<br />
              Row 2: "", "", Date, Day, City columns…<br />
              Row 3+: 1, Republic Day, 26-Jan-26, Monday, 1, 1 …
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Uploaded months log with snapshot status */}
      <Box>
        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
          Months with Leave Data
        </Typography>

        {monthsLoading ? (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <CircularProgress size={14} />
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>Loading…</Typography>
          </Box>
        ) : uploadedMonths.length === 0 ? (
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3, textAlign: 'center' }}>
            <InsertDriveFileIcon sx={{ fontSize: 28, color: 'text.disabled', mb: 0.75 }} />
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>No leave data uploaded yet</Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled', mt: 0.25 }}>Upload a monthly leave CSV to get started</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {uploadedMonths.map(m => {
              const snaps = snapMap[m] || {};
              return (
                <Box key={m} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, flexWrap: 'wrap' }}>
                  {/* Month label */}
                  <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', minWidth: 120 }}>{formatMonthLabel(m)}</Typography>

                  {/* Start snapshot */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Chip
                      size="small"
                      label="Start"
                      sx={{
                        bgcolor: snaps.start ? 'rgba(22,163,74,0.12)' : 'rgba(148,163,184,0.1)',
                        color: snaps.start ? '#16a34a' : '#94a3b8',
                        fontWeight: 700, fontSize: '0.67rem', height: 18,
                        '.MuiChip-label': { px: 0.75 },
                      }}
                    />
                    {snaps.start ? (
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                        {snaps.start.leave_days}d leave{snaps.start.uploaded_at ? ` · uploaded ${shortDate(snaps.start.uploaded_at)}` : ' · legacy upload'}
                      </Typography>
                    ) : (
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>not uploaded</Typography>
                    )}
                  </Box>

                  <Box sx={{ width: 1, height: 16, bgcolor: 'divider', display: { xs: 'none', sm: 'block' } }} />

                  {/* End snapshot */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Chip
                      size="small"
                      label="End"
                      sx={{
                        bgcolor: snaps.end ? 'rgba(124,58,237,0.12)' : 'rgba(148,163,184,0.1)',
                        color: snaps.end ? '#7c3aed' : '#94a3b8',
                        fontWeight: 700, fontSize: '0.67rem', height: 18,
                        '.MuiChip-label': { px: 0.75 },
                      }}
                    />
                    {snaps.end ? (
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                        {snaps.end.leave_days}d leave · uploaded {shortDate(snaps.end.uploaded_at)}
                      </Typography>
                    ) : (
                      <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>pending month-end upload</Typography>
                    )}
                  </Box>

                  {/* Both done badge */}
                  {snaps.start && snaps.end && (
                    <Chip
                      size="small"
                      icon={<CheckCircleIcon sx={{ fontSize: '12px !important' }} />}
                      label="Complete"
                      sx={{ ml: 'auto', bgcolor: 'rgba(22,163,74,0.1)', color: '#16a34a', fontWeight: 700, fontSize: '0.68rem', height: 20 }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Success snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ fontSize: '0.84rem' }} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// Made with Bob
