import React, { useState, useCallback } from 'react';
import {
  Box, Button, Typography, Alert, LinearProgress,
  Grid, Card, CardContent, Paper, Chip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import DatasetIcon from '@mui/icons-material/Dataset';
import DateRangeIcon from '@mui/icons-material/DateRange';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import axios from 'axios';

function StatCard({ icon, label, value, accent }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500 }}>
              {label}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1 }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2,
              bgcolor: `${accent}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {React.cloneElement(icon, { sx: { color: accent, fontSize: 20 } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function UploadComponent({ onUploadSuccess }) {
  const [file, setFile]               = useState(null);
  const [dragging, setDragging]       = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError]             = useState(null);

  const acceptFile = (f) => {
    if (f && f.name.endsWith('.csv')) {
      setFile(f);
      setError(null);
      setUploadResult(null);
    } else {
      setError('Please select a valid .csv file.');
      setFile(null);
    }
  };

  const handleFileChange  = (e) => acceptFile(e.target.files[0]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files[0]);
  }, []);

  const handleDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = ()  => setDragging(false);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult(response.data);
      if (response.data.stats?.newRecords > 0) {
        onUploadSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('Clear all data from the database? This cannot be undone.')) return;
    try {
      await axios.delete('/api/clear-data');
      setUploadResult(null);
      setFile(null);
      setError(null);
    } catch {
      setError('Failed to clear data.');
    }
  };

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      {/* Page heading */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>Import CSV Data</Typography>
        <Typography variant="body2" color="text.secondary">
          Upload the ICA usage CSV exported from your tracker. JDE stream records will be extracted and stored.
        </Typography>
      </Box>

      {/* Drop zone */}
      <Paper
        elevation={0}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        sx={{
          border: '2px dashed',
          borderColor: dragging ? 'primary.main' : file ? 'success.main' : 'divider',
          borderRadius: 3,
          p: 5,
          textAlign: 'center',
          bgcolor: dragging ? 'rgba(37,99,235,0.04)' : file ? 'rgba(22,163,74,0.04)' : 'background.paper',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          '&:hover': { borderColor: 'primary.light', bgcolor: 'rgba(37,99,235,0.03)' },
        }}
        onClick={() => !file && document.getElementById('csv-input').click()}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {file ? (
          <Box>
            <InsertDriveFileIcon sx={{ fontSize: 44, color: 'success.main', mb: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'success.main' }}>
              {file.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {(file.size / 1024).toFixed(1)} KB — ready to upload
            </Typography>
            <Button
              size="small"
              variant="text"
              sx={{ mt: 1.5, color: 'text.secondary', textTransform: 'none' }}
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
            >
              Remove file
            </Button>
          </Box>
        ) : (
          <Box>
            <CloudUploadIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Drag & drop your CSV here
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              or{' '}
              <Box
                component="span"
                sx={{ color: 'primary.main', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => document.getElementById('csv-input').click()}
              >
                browse to select a file
              </Box>
            </Typography>
            <Chip label=".csv only" size="small" sx={{ mt: 2, bgcolor: '#f1f5f9', color: 'text.secondary' }} />
          </Box>
        )}
      </Paper>

      {/* Upload button */}
      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={handleUpload}
        disabled={!file || uploading}
        startIcon={uploading ? null : <CloudUploadIcon />}
        sx={{ mt: 2, py: 1.4, fontSize: '0.95rem' }}
      >
        {uploading ? 'Processing…' : 'Upload & Process'}
      </Button>

      {uploading && <LinearProgress sx={{ mt: 1, borderRadius: 1 }} />}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Upload result */}
      {uploadResult && (
        <Box sx={{ mt: 3 }}>
          <Alert
            severity={uploadResult.stats.newRecords > 0 ? 'success' : 'info'}
            icon={<CheckCircleOutlineIcon />}
            sx={{ mb: 3, borderRadius: 2 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {uploadResult.message}
            </Typography>
            {uploadResult.stats.newRecords > 0 ? (
              <Typography variant="body2" color="text.secondary">
                Dashboard updated with new data.
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                All {uploadResult.stats.skippedRecords} records were already stored — nothing changed.
              </Typography>
            )}
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <StatCard
                icon={<PeopleAltIcon />}
                label="Users"
                value={uploadResult.stats.usersProcessed}
                accent="#2563eb"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                icon={<DatasetIcon />}
                label="New Records"
                value={uploadResult.stats.newRecords}
                accent={uploadResult.stats.newRecords > 0 ? '#16a34a' : '#94a3b8'}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                icon={<CalendarTodayIcon />}
                label="Already Stored"
                value={uploadResult.stats.skippedRecords}
                accent="#7c3aed"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatCard
                icon={<DateRangeIcon />}
                label="Date Range"
                value={`${uploadResult.stats.dateRange.start.slice(5)} → ${uploadResult.stats.dateRange.end.slice(5)}`}
                accent="#0891b2"
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Danger zone */}
      <Box
        sx={{
          mt: 4, p: 2.5, borderRadius: 3,
          border: '1px solid', borderColor: 'rgba(220,38,38,0.2)',
          bgcolor: 'rgba(220,38,38,0.03)',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main', mb: 0.5 }}>
          Danger Zone
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Permanently removes all users and usage records from the database.
        </Typography>
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<DeleteOutlineIcon />}
          onClick={handleClearData}
          sx={{ borderRadius: 2 }}
        >
          Clear All Data
        </Button>
      </Box>
    </Box>
  );
}

export default UploadComponent;

// Made with Bob
