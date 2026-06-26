import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
  Collapse,
} from '@mui/material';
import ContentCopyIcon          from '@mui/icons-material/ContentCopy';
import CheckIcon                from '@mui/icons-material/Check';
import ExpandMoreIcon           from '@mui/icons-material/ExpandMore';
import PersonOffIcon            from '@mui/icons-material/PersonOff';
import NotificationsActiveIcon  from '@mui/icons-material/NotificationsActive';
import ApiIcon                  from '@mui/icons-material/Api';
import EmailIcon                from '@mui/icons-material/Email';
import SendIcon                 from '@mui/icons-material/Send';
import LinkIcon                 from '@mui/icons-material/Link';
import SaveIcon                 from '@mui/icons-material/Save';
import SettingsIcon             from '@mui/icons-material/Settings';
import axios from 'axios';

// ── Helper: today as YYYY-MM-DD (local time, not UTC) ────────────────────────
function todayLocal() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ── Copy-to-clipboard button ──────────────────────────────────────────────────
function CopyButton({ text, size = 'small' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
      <IconButton size={size} onClick={handleCopy} sx={{ color: copied ? '#4ade80' : '#94a3b8', '&:hover': { color: '#e2e8f0' } }}>
        {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}

// ── Agent Studio workflow step diagram ───────────────────────────────────────
function WorkflowDiagram({ apiUrl }) {
  const steps = [
    { icon: '⏰', label: 'Trigger',         detail: 'Schedule or Manual',                        color: '#7c3aed' },
    { icon: '🌐', label: 'API Request',     detail: apiUrl,                                      color: '#2563eb', copyable: true },
    { icon: '⚙️', label: 'JSON Operations', detail: 'Parse .users array from response',          color: '#0891b2' },
    { icon: '🔁', label: 'Loop',            detail: 'Iterate over each missed user',             color: '#0891b2' },
    { icon: '📧', label: 'Send Email',      detail: 'Outlook or Gmail (Composio) → send reminder', color: '#16a34a' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {steps.map((step, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
          <Box sx={{ width: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <Box sx={{
              width: 32, height: 32, borderRadius: '50%',
              bgcolor: step.color, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '0.95rem', flexShrink: 0, mt: 0.5,
            }}>
              {step.icon}
            </Box>
            {i < steps.length - 1 && (
              <Box sx={{ width: 2, flexGrow: 1, bgcolor: '#1e293b', my: 0.25, minHeight: 16 }} />
            )}
          </Box>
          <Box sx={{ pb: i < steps.length - 1 ? 2 : 0, pl: 1.5, flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.3 }}>
              {step.label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
              <Typography sx={{
                fontSize: '0.75rem', color: '#64748b', mt: 0.25,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flex: 1, minWidth: 0,
              }}>
                {step.detail}
              </Typography>
              {step.copyable && <CopyButton text={step.detail} size="small" />}
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ── Teams Incoming Webhook configuration card ─────────────────────────────────
function TeamsWebhookConfig({ webhookUrl, onSaved }) {
  const [draft, setDraft]     = useState(webhookUrl || '');
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [err,    setErr]      = useState(null);

  // Keep draft in sync if parent reloads the saved URL
  useEffect(() => { setDraft(webhookUrl || ''); }, [webhookUrl]);

  const handleSave = async () => {
    if (!draft.trim()) return;
    setSaving(true); setErr(null); setSaved(false);
    try {
      await axios.post('/api/settings/teams-webhook', { value: draft.trim() });
      setSaved(true);
      onSaved(draft.trim());
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save webhook URL');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 1.5, lineHeight: 1.6 }}>
        Paste your Teams <strong>Incoming Webhook URL</strong> below. The app will POST a reminder
        card directly to your channel with one click — no Azure portal or app registration needed.
      </Typography>

      {/* Path A — Power Automate / Workflows (primary for most IBM tenants) */}
      <Box sx={{ mb: 1, p: 1.5, bgcolor: 'rgba(124,92,216,0.06)', border: '1px solid rgba(124,92,216,0.2)', borderRadius: 1.5 }}>
        <Typography sx={{ fontSize: '0.73rem', fontWeight: 600, color: '#7c5cd8', mb: 0.75 }}>
          Option A — Workflows / Power Automate ✓ Recommended
        </Typography>
        {[
          'Click ••• next to the channel name → Workflows.',
          'In the search box type "webhook".',
          'Click "Send webhook alerts to a channel".',
          'Select your Team and Channel → Next → Add workflow.',
          'On the confirmation screen, copy the full HTTP POST URL.',
          'The URL starts with https://default…powerplatform.com or https://prod-…logic.azure.com — both work.',
          'Paste it in the box below → Save Webhook URL.',
        ].map((step, i) => (
          <Typography key={i} sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.7 }}>
            {i + 1}. {step}
          </Typography>
        ))}
      </Box>

      {/* Path B — classic Office 365 Connectors */}
      <Box sx={{ mb: 1.5, p: 1.5, bgcolor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 1.5 }}>
        <Typography sx={{ fontSize: '0.73rem', fontWeight: 600, color: '#3b82f6', mb: 0.75 }}>
          Option B — Manage channel → Connectors (classic)
        </Typography>
        {[
          'Click ••• next to the channel name → Manage channel.',
          'Scroll down to Connectors → Edit.',
          'Search "Incoming Webhook" → Add → Configure.',
          'Name it "ICA Reminder" → Create.',
          'Copy the URL (starts with https://…webhook.office.com) → paste below.',
        ].map((step, i) => (
          <Typography key={i} sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.7 }}>
            {i + 1}. {step}
          </Typography>
        ))}
      </Box>

      <TextField
        fullWidth
        size="small"
        placeholder="https://xxxx.webhook.office.com/webhookb2/…"
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setErr(null); setSaved(false); }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LinkIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 1 }}
      />

      {err && <Alert severity="error" sx={{ mb: 1, fontSize: '0.8rem', py: 0.5 }}>{err}</Alert>}

      <Button
        variant="contained"
        size="small"
        fullWidth
        disabled={!draft.trim() || saving || draft.trim() === webhookUrl}
        onClick={handleSave}
        startIcon={saving ? null : saved ? <CheckIcon /> : <SaveIcon />}
        sx={{
          textTransform: 'none', fontSize: '0.82rem',
          bgcolor: saved ? '#16a34a' : undefined,
          '&:hover': { bgcolor: saved ? '#15803d' : undefined },
        }}
      >
        {saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : saved ? 'Saved!' : 'Save Webhook URL'}
      </Button>
    </Box>
  );
}

// ── Teams notification action card ────────────────────────────────────────────
function TeamsNotifyCard({ result, webhookUrl, selectedDate }) {
  const [posting,    setPosting]    = useState(false);
  const [postResult, setPostResult] = useState(null); // { ok, message }
  const hasWebhook = Boolean(webhookUrl?.trim());
  const hasUsers   = result?.count > 0;

  // Build Teams deep-link: opens Teams app/browser to compose a message in the same channel
  // Falls back to a generic compose deep-link if no channel is configured.
  const teamsDeepLink = (() => {
    const names = result?.users?.map(u => u.name).join(', ') || '';
    const msg = encodeURIComponent(
      `Hi team 👋 A quick reminder — the following members haven't used ICA (IBM Consulting Assistant) yet today (${selectedDate}):\n\n${names}\n\nPlease log in at https://remea.ica.ibm.com/ica/launchpad/teams/6960ac7f62128d5938d46839 and use ICA. Thank you!`
    );
    return `https://teams.microsoft.com/l/chat/0/0?message=${msg}`;
  })();

  const handlePost = async () => {
    setPosting(true);
    setPostResult(null);
    try {
      const res = await axios.post('/api/teams-notify', {
        webhookUrl,
        date:  result.date,
        users: result.users,
      });
      setPostResult({ ok: true, message: res.data.message });
    } catch (err) {
      setPostResult({ ok: false, message: err.response?.data?.error || 'Failed to post to Teams' });
    } finally {
      setPosting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
        Microsoft Teams
      </Typography>

      {/* One-click post via webhook */}
      <Tooltip
        title={
          !hasWebhook ? 'Add a Teams Webhook URL in the Teams Setup card on the right first' :
          !hasUsers   ? 'No missed users to remind' : ''
        }
      >
        <span>
          <Button
            variant="contained"
            size="small"
            fullWidth
            disabled={!hasWebhook || !hasUsers || posting}
            onClick={handlePost}
            startIcon={posting ? null : <SendIcon sx={{ fontSize: '15px !important' }} />}
            sx={{
              justifyContent: 'flex-start', textTransform: 'none', fontSize: '0.82rem',
              bgcolor: '#5b5ea6',   // Teams purple
              '&:hover': { bgcolor: '#4a4d8a' },
              '&.Mui-disabled': { bgcolor: 'rgba(91,94,166,0.3)', color: 'rgba(255,255,255,0.4)' },
            }}
          >
            {posting
              ? <CircularProgress size={16} sx={{ color: '#fff' }} />
              : 'Post Reminder to Teams Channel'}
          </Button>
        </span>
      </Tooltip>

      {/* Deep-link fallback */}
      <Button
        component="a"
        href={teamsDeepLink}
        target="_blank"
        rel="noopener noreferrer"
        variant="outlined"
        size="small"
        fullWidth
        disabled={!hasUsers}
        startIcon={<LinkIcon sx={{ fontSize: '15px !important' }} />}
        sx={{ justifyContent: 'flex-start', textTransform: 'none', fontSize: '0.82rem', borderColor: '#5b5ea6', color: '#5b5ea6', '&:hover': { borderColor: '#4a4d8a', bgcolor: 'rgba(91,94,166,0.06)' } }}
      >
        Open Teams Chat with message pre-filled
      </Button>

      {/* Result feedback */}
      <Collapse in={Boolean(postResult)}>
        {postResult && (
          <Alert
            severity={postResult.ok ? 'success' : 'error'}
            onClose={() => setPostResult(null)}
            sx={{ fontSize: '0.8rem', py: 0.5 }}
          >
            {postResult.message}
          </Alert>
        )}
      </Collapse>

      {/* Hint if no webhook configured */}
      {!hasWebhook && (
        <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled', mt: 0.25 }}>
          Configure a Webhook URL in the Teams Setup panel → to enable one-click channel posting.
        </Typography>
      )}
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Reminders() {
  const [selectedDate, setSelectedDate] = useState(todayLocal());
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);   // { date, count, users } | null
  const [error, setError]               = useState(null);

  // Teams webhook URL persisted in DB
  const [webhookUrl, setWebhookUrl]     = useState('');

  // Load saved webhook URL on mount
  useEffect(() => {
    axios.get('/api/settings/teams-webhook')
      .then(r => { if (r.data.value) setWebhookUrl(r.data.value); })
      .catch(() => {});
  }, []);

  // Derive the API URL dynamically (works in both dev and prod)
  const baseUrl = window.location.origin;
  const apiUrl  = selectedDate
    ? `${baseUrl}/api/missed-users?date=${selectedDate}`
    : `${baseUrl}/api/missed-users?date=YYYY-MM-DD`;

  const handleFetch = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await axios.get('/api/missed-users', { params: { date: selectedDate } });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch missed users');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Email body helpers
  const emailSubject = 'Reminder: Please use ICA (IBM Consulting Assistant) today';
  const emailBody = (name) =>
    `Hi ${name},\n\nThis is a friendly reminder that you haven't used ICA (IBM Consulting Assistant) yet today.\n\nPlease log in and use ICA to keep the team's usage data up to date.\n\nhttps://ace.ibm.com\n\nThank you,\nYour Scrum Master`;

  const bulkEmailBody = result?.users?.length
    ? result.users.map(u => `To: ${u.email}\nSubject: ${emailSubject}\n\n${emailBody(u.name)}`).join('\n\n---\n\n')
    : '';

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>

      {/* ── Header ── */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <NotificationsActiveIcon sx={{ color: '#f59e0b', fontSize: 26 }} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>Send Reminders</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Find team members who didn't use ICA on a given day, then trigger email reminders
          via ICA Agent Studio, Outlook, or directly to a <strong>Microsoft Teams channel</strong>.{' '}
          <strong>Only Online members</strong> are included — members marked Offline in Team Manager are
          automatically excluded.
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>

        {/* ── Left: Date picker + results ── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Date picker card */}
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
              Select Date
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Box
                component="input"
                type="date"
                value={selectedDate}
                max={todayLocal()}
                onChange={(e) => { setSelectedDate(e.target.value); setResult(null); setError(null); }}
                sx={{
                  flex: 1, height: 40, px: 1.5,
                  border: '1px solid', borderColor: 'divider', borderRadius: '8px',
                  fontSize: '0.9rem', fontFamily: 'inherit',
                  color: 'text.primary', bgcolor: 'background.default',
                  outline: 'none',
                  '&:focus': { borderColor: 'primary.main', boxShadow: '0 0 0 2px rgba(37,99,235,0.18)' },
                  cursor: 'text',
                }}
              />
              <Button
                variant="contained"
                onClick={handleFetch}
                disabled={!selectedDate || loading}
                startIcon={loading ? null : <PersonOffIcon />}
                sx={{ height: 40, px: 2.5, whiteSpace: 'nowrap' }}
              >
                {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Check'}
              </Button>
            </Box>
          </Paper>

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ fontSize: '0.85rem' }}>{error}</Alert>
          )}

          {/* Results */}
          {result && (
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              {/* Result header */}
              <Box sx={{
                px: 2.5, py: 1.75,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                bgcolor: result.count > 0 ? 'rgba(245,158,11,0.07)' : 'rgba(22,163,74,0.07)',
                borderBottom: '1px solid', borderColor: 'divider',
              }}>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {result.count > 0
                      ? `${result.count} user${result.count !== 1 ? 's' : ''} missed ICA`
                      : '✓ Everyone used ICA'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    on {result.date}
                  </Typography>
                </Box>
                <Chip
                  label={result.count === 0 ? 'All good' : `${result.count} missed`}
                  size="small"
                  sx={{
                    bgcolor: result.count > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(22,163,74,0.15)',
                    color:   result.count > 0 ? '#f59e0b' : '#16a34a',
                    fontWeight: 600,
                    border: `1px solid ${result.count > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(22,163,74,0.3)'}`,
                  }}
                />
              </Box>

              {result.count > 0 && (
                <>
                  {/* User table */}
                  <TableContainer sx={{ maxHeight: 240 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Scrum Master</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {result.users.map((u) => (
                          <TableRow key={u.id} hover>
                            <TableCell sx={{ fontWeight: 500 }}>{u.name}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{u.email}</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{u.scrum_master || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Divider />

                  {/* Quick actions */}
                  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>

                    {/* ── Teams actions ── */}
                    <TeamsNotifyCard
                      result={result}
                      webhookUrl={webhookUrl}
                      selectedDate={selectedDate}
                    />

                    <Divider sx={{ my: 0.5 }} />

                    {/* ── Email actions ── */}
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                      Email
                    </Typography>

                    {/* Mailto link — opens Outlook / default mail client */}
                    <Button
                      component="a"
                      href={`mailto:${result.users.map(u => u.email).join(';')}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody('Team'))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outlined"
                      size="small"
                      startIcon={<EmailIcon />}
                      fullWidth
                      sx={{ justifyContent: 'flex-start', textTransform: 'none', fontSize: '0.82rem' }}
                    >
                      Open in Outlook / Mail Client
                    </Button>

                    {/* Copy all emails */}
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      startIcon={<ContentCopyIcon />}
                      onClick={() => navigator.clipboard.writeText(result.users.map(u => u.email).join('; '))}
                      sx={{ justifyContent: 'flex-start', textTransform: 'none', fontSize: '0.82rem' }}
                    >
                      Copy All Emails
                    </Button>

                    {/* Copy bulk email text */}
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      startIcon={<ContentCopyIcon />}
                      onClick={() => navigator.clipboard.writeText(bulkEmailBody)}
                      sx={{ justifyContent: 'flex-start', textTransform: 'none', fontSize: '0.82rem' }}
                    >
                      Copy Email Text (for manual send)
                    </Button>
                  </Box>
                </>
              )}
            </Paper>
          )}
        </Box>

        {/* ── Right: Teams setup + Agent Studio guide + API reference ── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* ── Teams Incoming Webhook setup ── */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Accordion disableGutters elevation={0} defaultExpanded sx={{ '&::before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5, py: 1.5, minHeight: 'unset', bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {/* Teams logo-ish icon */}
                  <Box sx={{
                    width: 22, height: 22, borderRadius: '6px', bgcolor: '#5b5ea6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <SettingsIcon sx={{ fontSize: 13, color: '#fff' }} />
                  </Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>Teams Setup — Incoming Webhook</Typography>
                  {webhookUrl && (
                    <Chip
                      label="Configured"
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: 'rgba(22,163,74,0.12)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)', ml: 0.5 }}
                    />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                <TeamsWebhookConfig webhookUrl={webhookUrl} onSaved={setWebhookUrl} />
              </AccordionDetails>
            </Accordion>
          </Paper>

          {/* API endpoint card */}
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <ApiIcon sx={{ color: '#3b82f6', fontSize: 18 }} />
              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>API Endpoint</Typography>
            </Box>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
              Paste this URL into the <strong>API Request</strong> node in ICA Agent Studio:
            </Typography>
            <Box sx={{
              display: 'flex', alignItems: 'center',
              bgcolor: '#0f172a', borderRadius: 1.5,
              border: '1px solid #1e293b', px: 1.5, py: 1, gap: 1,
            }}>
              <Typography sx={{
                fontFamily: 'monospace', fontSize: '0.72rem', color: '#93c5fd',
                flex: 1, wordBreak: 'break-all',
              }}>
                {apiUrl}
              </Typography>
              <CopyButton text={apiUrl} />
            </Box>
            <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mt: 1 }}>
              Response: <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>{'{ date, count, users: [{id, name, email, scrum_master, track}] }'}</code>
            </Typography>
          </Paper>

          {/* Agent Studio workflow guide */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Accordion disableGutters elevation={0} defaultExpanded sx={{ '&::before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5, py: 1.5, minHeight: 'unset', bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="span" sx={{ fontSize: '1rem' }}>🤖</Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>ICA Agent Studio Workflow</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 2 }}>
                  Build this flow at{' '}
                  <Box component="a" href="https://agentstudio.servicesessentials.ibm.com" target="_blank" rel="noopener noreferrer"
                    sx={{ color: '#60a5fa', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                    agentstudio.servicesessentials.ibm.com
                  </Box>
                </Typography>
                <WorkflowDiagram apiUrl={apiUrl} />
              </AccordionDetails>
            </Accordion>
          </Paper>

          {/* Node-by-node setup instructions */}
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Accordion disableGutters elevation={0} sx={{ '&::before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5, py: 1.5, minHeight: 'unset', bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box component="span" sx={{ fontSize: '1rem' }}>📋</Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>Node Setup Instructions</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                {[
                  {
                    step: '1',
                    title: 'Current Date (Utilities)',
                    color: '#7c3aed',
                    body: 'Drag a Current Date node onto the canvas. It outputs today\'s date. Use its output as the date parameter in the next node.',
                  },
                  {
                    step: '2',
                    title: 'API Request (Data Sources)',
                    color: '#2563eb',
                    body: `Set Method = GET. Set URL = ${baseUrl}/api/missed-users?date={{currentDate}} (replace {{currentDate}} with the output variable from the Current Date node). No auth required for internal use.`,
                  },
                  {
                    step: '3',
                    title: 'JSON Operations (Processing)',
                    color: '#0891b2',
                    body: 'Use a JSON Operations node to extract the .users array from the API response body. This becomes the list you will iterate over.',
                  },
                  {
                    step: '4',
                    title: 'Loop (Flow Control)',
                    color: '#0891b2',
                    body: 'Add a Loop node. Set the iterable to the users array from step 3. Inside the loop, each iteration will have the current user\'s name and email available as variables.',
                  },
                  {
                    step: '5a',
                    title: 'Send Email via Outlook',
                    color: '#16a34a',
                    body: 'Inside the loop, add an Outlook node (via Composio integration). Set To = {{user.email}}, Subject = "Reminder: Please use ICA today", Body = "Hi {{user.name}}, please use ICA today. Thank you!"',
                  },
                  {
                    step: '5b',
                    title: 'Send Email via Gmail (alternative)',
                    color: '#16a34a',
                    body: 'Alternatively, use a Gmail node (via Composio). Same field mapping as Outlook above. Both Outlook and Gmail are available in the Composio tool library inside Agent Studio.',
                  },
                  {
                    step: '6',
                    title: 'If-Else Guard (optional)',
                    color: '#475569',
                    body: 'Wrap everything after the API Request in an If-Else node that checks count > 0 so the loop and emails only run when there are actually missed users.',
                  },
                ].map((item) => (
                  <Box key={item.step} sx={{ display: 'flex', gap: 1.5, mb: 2, '&:last-child': { mb: 0 } }}>
                    <Box sx={{
                      width: 22, height: 22, borderRadius: '50%', bgcolor: item.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', color: '#fff', fontWeight: 700, flexShrink: 0, mt: 0.1,
                    }}>
                      {item.step}
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: 'text.primary' }}>{item.title}</Typography>
                      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.25, lineHeight: 1.5 }}>{item.body}</Typography>
                    </Box>
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          </Paper>

          {/* Available Agent Studio nodes reminder */}
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
              Available in Agent Studio
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {[
                'Current Date', 'API Request', 'JSON Operations', 'Loop',
                'If-Else', 'Parser', 'Text Operations', 'Split Text',
                'Outlook (Composio)', 'Gmail (Composio)', 'Prompt Template',
                'Language Model', 'Notify (Beta)', 'Run Flow (Beta)',
              ].map((node) => (
                <Chip key={node} label={node} size="small"
                  sx={{ fontSize: '0.7rem', height: 22, bgcolor: 'rgba(37,99,235,0.08)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}
                />
              ))}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

// Made with Bob
