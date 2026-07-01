import React, { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import PeopleIcon              from '@mui/icons-material/People';
import UploadFileIcon          from '@mui/icons-material/UploadFile';
import VerifiedIcon            from '@mui/icons-material/Verified';
import AccountTreeIcon         from '@mui/icons-material/AccountTree';
import StorageIcon             from '@mui/icons-material/Storage';
import DashboardIcon           from '@mui/icons-material/Dashboard';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon         from '@mui/icons-material/CheckCircle';
import BoltIcon                from '@mui/icons-material/Bolt';
import ExpandMoreIcon          from '@mui/icons-material/ExpandMore';
import ExpandLessIcon          from '@mui/icons-material/ExpandLess';

/* ─── palette tokens ────────────────────────────────────────────────────── */
const T = {
  user:    { color: '#2563eb', bg: '#eff6ff',  border: '#bfdbfe',  faint: '#dbeafe' },
  app:     { color: '#7c3aed', bg: '#f5f3ff',  border: '#ddd6fe',  faint: '#ede9fe' },
  proc:    { color: '#0f766e', bg: '#f0fdfa',  border: '#99f6e4',  faint: '#ccfbf1' },
  store:   { color: '#78350f', bg: '#fffbeb',  border: '#fde68a',  faint: '#fef3c7' },
  output:  { color: '#16a34a', bg: '#f0fdf4',  border: '#bbf7d0',  faint: '#dcfce7' },
  notif:   { color: '#ea580c', bg: '#fff7ed',  border: '#fed7aa',  faint: '#ffedd5' },
  future:  { color: '#94a3b8', bg: '#f8fafc',  border: '#e2e8f0',  faint: '#f1f5f9' },
};

/* ─── KPIs ──────────────────────────────────────────────────────────────── */
const kpis = [
  { value: '120+', label: 'Weekly records processed', ...T.user   },
  { value: '35',   label: 'Active users tracked',     ...T.output },
  { value: '18',   label: 'Teams notifications sent', ...T.notif  },
  { value: '<2m',  label: 'Processing turnaround',    ...T.app    },
];

const principles = [
  'Modular',
  'Scalable',
  'API Ready',
  'Event Driven',
  'Extensible',
];

const designDecisions = [
  'CSV was chosen as the current ingestion format to fit existing team workflows with minimal change.',
  'Validation is separated from processing so data quality issues are identified before metrics are generated.',
  'The dashboard reads persisted data only, which keeps reporting consistent across views.',
  'Teams notifications are kept separate from analytics rendering so follow-up can evolve independently.',
  'Scheduler and ICA API integration are intentionally positioned as the next architecture step, not part of the current build.',
];

/* ─── Story strip ────────────────────────────────────────────────────────── */
const story = [
  { stage: 'Problem',        title: 'Manual Excel Reporting',                       bullets: ['Weekly files built by hand', 'Insights delayed by consolidation', 'Follow-up dependent on memory'],                      ...T.notif  },
  { stage: 'Solution',       title: 'Automated Upload + Dashboard + Alerts',        bullets: ['CSV intake replaces Excel effort', 'Live analytics dashboard', 'Auto Teams reminders'],                                    ...T.user   },
  { stage: 'Business Value', title: 'Measurable impact',                            bullets: ['~80% less manual effort', 'Faster visibility for leadership', 'Action-oriented follow-up loop'],                           ...T.output },
  { stage: 'Next Evolution', title: 'Intelligent, Scheduled & API-driven',          bullets: ['Scheduled auto-execution', 'Agentic Studio orchestration', 'Direct ICA API replaces Excel'],                               ...T.app    },
];

/* ─── Pipeline nodes — each has expandable detail ───────────────────────── */
const pipelineNodes = [
  {
    id: 'users',
    label: 'ICA Users',
    sublabel: 'Interacts via browser',
    conn: 'Browser → React App',
    icon: <PeopleIcon sx={{ fontSize: 20 }} />,
    status: 'active',
    ...T.user,
    detail: ['Login to platform via browser', 'Upload weekly CSV report', 'View analytics dashboard', 'Receive Teams reminders'],
  },
  {
    id: 'upload',
    label: 'Upload Portal',
    sublabel: 'React + MUI frontend',
    conn: 'POST /api/upload-csv',
    icon: <UploadFileIcon sx={{ fontSize: 20 }} />,
    status: 'active',
    ...T.app,
    detail: ['Drag-and-drop CSV input', 'Client-side file type check', 'Sends multipart/form-data to API', 'Progress and result feedback shown'],
  },
  {
    id: 'validate',
    label: 'Validation Engine',
    sublabel: 'Node.js backend',
    conn: 'Schema + data checks',
    icon: <VerifiedIcon sx={{ fontSize: 20 }} />,
    status: 'active',
    ...T.proc,
    detail: ['Required column presence check', 'Empty row detection and removal', 'Data type and format validation', 'Duplicate record detection'],
  },
  {
    id: 'process',
    label: 'Processing Pipeline',
    sublabel: 'CSV Parser + Business Logic',
    conn: 'Parse → Clean → Aggregate',
    icon: <AccountTreeIcon sx={{ fontSize: 20 }} />,
    status: 'active',
    ...T.proc,
    detail: ['Header mapping and normalization', 'Record parsing and cleaning', 'Deduplication against stored data', 'Metric aggregation per user and date'],
  },
  {
    id: 'db',
    label: 'Database',
    sublabel: 'SQLite persistent store',
    conn: 'INSERT / SELECT',
    icon: <StorageIcon sx={{ fontSize: 20 }} />,
    status: 'active',
    ...T.store,
    detail: ['Stores structured usage records', 'Tracks new vs already-seen entries', 'Provides data for all dashboard queries', 'Supports historical report generation'],
  },
];

const pipelineOutputs = [
  {
    id: 'dashboard',
    label: 'Analytics Dashboard',
    sublabel: 'React + Recharts',
    conn: 'GET /api/... queries',
    icon: <DashboardIcon sx={{ fontSize: 20 }} />,
    status: 'active',
    ...T.output,
    detail: ['Usage KPI cards and trend charts', 'Per-user and per-assistant breakdown', 'Weekly and monthly views', 'Team-level activity overview'],
  },
  {
    id: 'teams',
    label: 'Teams Notifications',
    sublabel: 'Microsoft Teams Webhook',
    conn: 'POST webhook payload',
    icon: <NotificationsActiveIcon sx={{ fontSize: 20 }} />,
    status: 'active',
    ...T.notif,
    detail: ['Adaptive Card sent to Teams channel', 'Lists users who have not used ICA today', 'Includes last-week persistent non-users', 'Supports Power Automate + webhook.office.com'],
  },
];


/* ─── Roadmap ────────────────────────────────────────────────────────────── */
const roadmap = [
  {
    phase: 'Now',    label: 'Delivered',            live: true,   ...T.user,
    items: ['CSV upload + validation', 'Processing pipeline', 'Analytics dashboard', 'Teams reminders (manual)'],
  },
  {
    phase: 'Soon',   label: 'Scheduled execution',  live: false,  ...T.app,
    items: ['Auto-trigger at a fixed time', 'Runs without manual intervention'],
  },
  {
    phase: 'Next',   label: 'Agentic AI',            live: false,  ...T.proc,
    items: ['Agentic Studio integration', 'Intelligent orchestration'],
  },
  {
    phase: 'Future', label: 'Autonomous',            live: false,  ...T.store,
    items: ['Direct ICA API replaces Excel', 'Fully hands-off reporting'],
  },
];

/* ─── Legend items ───────────────────────────────────────────────────────── */
const legend = [
  { label: 'User interaction', ...T.user   },
  { label: 'Application',      ...T.app    },
  { label: 'Processing',       ...T.proc   },
  { label: 'Storage',          ...T.store  },
  { label: 'Output / action',  ...T.output },
  { label: 'Future capability',...T.future },
];

/* ═══ Pipeline node component ═══════════════════════════════════════════════ */
function PipelineNode({ node, onToggle, open }) {
  const isActive = node.status === 'active';
  return (
    <Stack alignItems="center">
      <Box
        onClick={() => onToggle(node.id)}
        sx={{
          width: 230,
          borderRadius: 3,
          border: `2px solid ${open ? node.color : node.border}`,
          bgcolor: open ? node.bg : '#ffffff',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          '&:hover': { borderColor: node.color, boxShadow: `0 0 0 3px ${node.faint}` },
        }}
      >
        {/* header row */}
        <Stack direction="row" justifyContent="space-between" alignItems="center"
          sx={{ px: 1.5, py: 1, bgcolor: node.bg, borderBottom: `1px solid ${node.border}` }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ color: node.color }}>{node.icon}</Box>
            <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', color: node.color }}>{node.label}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: isActive ? '#16a34a' : '#94a3b8' }} />
            {open ? <ExpandLessIcon sx={{ fontSize: 14, color: node.color }} /> : <ExpandMoreIcon sx={{ fontSize: 14, color: '#94a3b8' }} />}
          </Stack>
        </Stack>

        {/* sublabel + conn label */}
        <Box sx={{ px: 1.5, py: 0.85 }}>
          <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>{node.sublabel}</Typography>
          <Box sx={{ mt: 0.5, display: 'inline-block', px: 0.9, py: 0.2, borderRadius: 99, bgcolor: node.faint, border: `1px solid ${node.border}` }}>
            <Typography sx={{ fontSize: '0.66rem', fontWeight: 700, color: node.color }}>{node.conn}</Typography>
          </Box>
        </Box>

        {/* expandable detail */}
        <Collapse in={open}>
          <Box sx={{ px: 1.5, pb: 1.25, borderTop: `1px dashed ${node.border}` }}>
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              {node.detail.map((d) => (
                <Stack key={d} direction="row" spacing={0.75} alignItems="flex-start">
                  <CheckCircleIcon sx={{ fontSize: 12, color: node.color, mt: '3px', flexShrink: 0 }} />
                  <Typography sx={{ fontSize: '0.75rem', color: '#475569', lineHeight: 1.5 }}>{d}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Collapse>
      </Box>
    </Stack>
  );
}

/* ═══ Arrow with label ══════════════════════════════════════════════════════ */
function Arrow({ label, active = false }) {
  return (
    <Stack alignItems="center" spacing={0} sx={{ my: 0.25 }}>
      <Box
        sx={{
          width: 2,
          height: 12,
          bgcolor: active ? '#60a5fa' : '#cbd5e1',
          transition: 'background-color 0.3s ease',
        }}
      />
      <Box
        sx={{
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: `7px solid ${active ? '#60a5fa' : '#cbd5e1'}`,
          transition: 'border-top-color 0.3s ease',
        }}
      />
      {label && (
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: active ? '#2563eb' : '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', mt: 0.25, transition: 'color 0.3s ease' }}>
          {label}
        </Typography>
      )}
    </Stack>
  );
}

/* ═══ Architecture component ════════════════════════════════════════════════ */
function Architecture() {
  const [openNode, setOpenNode] = useState(null);
  const [techOpen, setTechOpen] = useState(false);
  const [activeFlowStep, setActiveFlowStep] = useState(0);

  useEffect(() => {
    const maxStep = pipelineNodes.length + 1;
    const timer = setInterval(() => {
      setActiveFlowStep((prev) => (prev + 1) % maxStep);
    }, 1400);

    return () => clearInterval(timer);
  }, []);

  const toggleNode = (id) => setOpenNode(prev => prev === id ? null : id);

  return (
    <Stack spacing={3}>

      {/* ── 1. Dark hero ─────────────────────────────────────────── */}
      <Box sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 6, bgcolor: '#0f172a', border: '1px solid #1e293b' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Chip label="Enterprise Architecture Overview"
              sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.07)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 700 }} />
            <Typography variant="h4" sx={{ color: '#f8fafc', mb: 1.1, maxWidth: 860 }}>
              ICA Reporting Platform — Solution Architecture
            </Typography>
            <Typography sx={{ color: '#93c5fd', fontSize: '0.86rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', mb: 1.25 }}>
              Upload → Validate → Process → Store → Visualize → Notify
            </Typography>
            <Typography sx={{ color: '#94a3b8', lineHeight: 1.8, fontSize: '0.97rem', maxWidth: 900 }}>
              Built to replace manual weekly Excel reporting with a structured upload pipeline, a live analytics dashboard,
              and automatic Microsoft Teams reminders. Delivered end-to-end using the IBM Coding Agent{' '}
              <Box component="span" sx={{ color: '#60a5fa', fontWeight: 700 }}>BoB</Box>.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Grid container spacing={1.5}>
              {kpis.map((k) => (
                <Grid item xs={6} key={k.label}>
                  <Box sx={{ p: 1.75, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>{k.value}</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mt: 0.5, lineHeight: 1.3 }}>{k.label}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Box>

      {/* ── 2. Transformation story strip ────────────────────────── */}
      <Box>
        <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2563eb', mb: 1.5 }}>
          Transformation story
        </Typography>
        <Grid container spacing={2} alignItems="stretch">
          {story.map((s, i) => (
            <React.Fragment key={s.stage}>
              <Grid item xs={12} md>
                <Box sx={{ height: '100%', p: 2, borderRadius: 4, bgcolor: s.bg, border: `1.5px solid ${s.border}` }}>
                  <Chip label={s.stage}
                    sx={{ mb: 1.25, bgcolor: 'rgba(255,255,255,0.7)', color: s.color, border: `1px solid ${s.border}`, fontWeight: 800, fontSize: '0.7rem' }} />
                  <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', mb: 0.9 }}>{s.title}</Typography>
                  <Stack spacing={0.55}>
                    {s.bullets.map((b) => (
                      <Stack key={b} direction="row" spacing={0.75} alignItems="flex-start">
                        <CheckCircleIcon sx={{ fontSize: 13, color: s.color, mt: '3px', flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.5 }}>{b}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              </Grid>
              {i < story.length - 1 && (
                <Grid item sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography sx={{ color: '#cbd5e1', fontWeight: 700, fontSize: '1.1rem' }}>→</Typography>
                </Grid>
              )}
            </React.Fragment>
          ))}
        </Grid>
      </Box>

      {/* ── 3. Architecture diagram — relationship-focused ────────── */}
      <Grid container spacing={2.5} alignItems="flex-start">

        {/* Left: pipeline */}
        <Grid item xs={12} lg={7}>
          <Box sx={{ p: 3, borderRadius: 5, bgcolor: '#ffffff', border: '1px solid #e2e8f0', height: '100%', backgroundImage: 'linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2.5 }}>
              <Box>
                <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2563eb', mb: 0.5 }}>
                  Data flow diagram
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>End-to-end pipeline</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                  Click any node to expand processing detail
                </Typography>
              </Box>
              <Box sx={{ px: 1.3, py: 0.6, borderRadius: 99, bgcolor: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <BoltIcon sx={{ color: '#2563eb', fontSize: 15 }} />
                <Typography sx={{ color: '#2563eb', fontSize: '0.78rem', fontWeight: 700 }}>Built with BoB</Typography>
              </Box>
            </Stack>

            <Stack alignItems="center" spacing={0}>
              {pipelineNodes.map((node, i) => (
                <React.Fragment key={node.id}>
                  <PipelineNode node={node} onToggle={toggleNode} open={openNode === node.id} />
                  {i < pipelineNodes.length - 1 && (
                    <Arrow label={pipelineNodes[i + 1].conn} active={activeFlowStep === i} />
                  )}
                </React.Fragment>
              ))}

              {/* Fork arrow */}
              <Arrow label="Query results" active={activeFlowStep === pipelineNodes.length - 1} />

              {/* Outputs side-by-side */}
              <Grid container spacing={1.5} justifyContent="center" sx={{ maxWidth: 500 }}>
                {pipelineOutputs.map((node) => (
                  <Grid item xs={12} sm={6} key={node.id}>
                    <PipelineNode node={node} onToggle={toggleNode} open={openNode === node.id} />
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </Box>
        </Grid>

        {/* Right: system overview + BoB + legend */}
        <Grid item xs={12} lg={5}>
          <Stack spacing={2}>

            {/* System overview */}
            <Box sx={{ p: 2.5, borderRadius: 5, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
              <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2563eb', mb: 1.5 }}>
                System overview
              </Typography>
              {[
                { label: 'Frontend',       sub: 'React + MUI Dashboard',   ...T.app,    status: 'Live' },
                { label: 'Backend',        sub: 'Node.js REST API',         ...T.app,    status: 'Live' },
                { label: 'Storage',        sub: 'SQLite database',          ...T.store,  status: 'Live' },
                { label: 'Notifications',  sub: 'Microsoft Teams Webhook',  ...T.notif,  status: 'Live' },
                { label: 'Scheduler',      sub: 'Auto-trigger (planned)',    ...T.future, status: 'Soon' },
                { label: 'ICA APIs',       sub: 'Direct data source (future)',...T.future,status: 'Future' },
              ].map((item) => (
                <Stack key={item.label} direction="row" justifyContent="space-between" alignItems="center"
                  sx={{ py: 0.85, borderBottom: '1px solid #f1f5f9', '&:last-child': { borderBottom: 'none' } }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: 2, bgcolor: item.bg, border: `1.5px solid ${item.border}` }} />
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a' }}>{item.label}</Typography>
                      <Typography sx={{ fontSize: '0.73rem', color: '#64748b' }}>{item.sub}</Typography>
                    </Box>
                  </Stack>
                  <Chip label={item.status}
                    sx={{
                      height: 20, fontSize: '0.67rem', fontWeight: 700,
                      bgcolor: item.status === 'Live' ? '#f0fdf4' : item.status === 'Soon' ? '#f5f3ff' : '#f8fafc',
                      color:   item.status === 'Live' ? '#16a34a' : item.status === 'Soon' ? '#7c3aed' : '#94a3b8',
                      border:  `1px solid ${item.status === 'Live' ? '#bbf7d0' : item.status === 'Soon' ? '#ddd6fe' : '#e2e8f0'}`,
                      '.MuiChip-label': { px: 0.9 },
                    }}
                  />
                </Stack>
              ))}
            </Box>

            {/* BoB section */}
            <Box sx={{ p: 2.5, borderRadius: 5, bgcolor: '#0f172a', border: '1px solid #1e293b' }}>
              <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.25 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BoltIcon sx={{ color: '#60a5fa', fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: '#f8fafc' }}>Built with BoB</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>IBM Coding Agent</Typography>
                </Box>
              </Stack>
              <Stack spacing={0.6}>
                {['UI design and component architecture', 'Backend API and validation logic', 'Teams notification integration', 'This presentation layer itself'].map((item) => (
                  <Stack key={item} direction="row" spacing={0.75} alignItems="flex-start">
                    <CheckCircleIcon sx={{ fontSize: 12, color: '#60a5fa', mt: '3px', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>{item}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            {/* Legend */}
            <Box sx={{ p: 2, borderRadius: 5, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
              <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2563eb', mb: 1.25 }}>
                Legend
              </Typography>
              <Grid container spacing={0.75}>
                {legend.map((item) => (
                  <Grid item xs={6} key={item.label}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Box sx={{ width: 12, height: 12, borderRadius: 1.5, bgcolor: item.bg, border: `1.5px solid ${item.border}`, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.74rem', color: '#475569' }}>{item.label}</Typography>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Box sx={{ p: 2.25, borderRadius: 5, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
              <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2563eb', mb: 1.25 }}>
                Architecture principles
              </Typography>
              <Grid container spacing={0.9}>
                {principles.map((item) => (
                  <Grid item xs={6} key={item}>
                    <Stack direction="row" spacing={0.7} alignItems="center">
                      <CheckCircleIcon sx={{ fontSize: 13, color: '#16a34a' }} />
                      <Typography sx={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>{item}</Typography>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </Box>

          </Stack>
        </Grid>
      </Grid>

      <Box sx={{ p: 2.25, borderRadius: 5, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
        <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2563eb', mb: 1.25 }}>
          Key design decisions
        </Typography>
        <Grid container spacing={1.2}>
          {designDecisions.map((item) => (
            <Grid item xs={12} md={6} key={item}>
              <Stack direction="row" spacing={0.8} alignItems="flex-start">
                <CheckCircleIcon sx={{ fontSize: 14, color: '#2563eb', mt: '3px', flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.6 }}>{item}</Typography>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── 5. Roadmap ───────────────────────────────────────────── */}
      <Box>
        <Typography sx={{ fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2563eb', mb: 1.5 }}>
          Evolution roadmap
        </Typography>
        <Box sx={{ position: 'relative' }}>
          <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'absolute', top: 27, left: '12.5%', right: '12.5%', height: 3, bgcolor: '#e2e8f0', borderRadius: 99, zIndex: 0 }} />
          <Grid container spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
            {roadmap.map((r) => (
              <Grid item xs={12} md={3} key={r.phase}>
                <Stack alignItems={{ xs: 'flex-start', md: 'center' }} spacing={1.1}>
                  <Box sx={{ width: 54, height: 54, borderRadius: '50%', bgcolor: r.live ? r.bg : '#f8fafc', border: `2px solid ${r.live ? r.border : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.74rem', color: r.live ? r.color : '#94a3b8', textAlign: 'center' }}>
                      {r.phase === 'Now' ? '🚀' : r.phase === 'Soon' ? '⏰' : r.phase === 'Next' ? '🤖' : '🌐'}
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', p: 1.75, borderRadius: 4, bgcolor: r.live ? r.bg : '#f8fafc', border: `1.5px solid ${r.live ? r.border : '#e2e8f0'}` }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 0.9 }}>
                      <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: r.live ? r.color : '#64748b' }}>{r.label}</Typography>
                      {r.live && <Chip label="Live" sx={{ height: 17, fontSize: '0.66rem', bgcolor: r.bg, color: r.color, border: `1px solid ${r.border}`, fontWeight: 700, '.MuiChip-label': { px: 0.75 } }} />}
                    </Stack>
                    <Stack spacing={0.55}>
                      {r.items.map((item) => (
                        <Stack key={item} direction="row" spacing={0.7} alignItems="flex-start">
                          <CheckCircleIcon sx={{ fontSize: 12, color: r.live ? r.color : '#94a3b8', mt: '3px', flexShrink: 0 }} />
                          <Typography sx={{ fontSize: '0.78rem', color: r.live ? '#334155' : '#64748b', lineHeight: 1.5 }}>{item}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <Box sx={{ p: 1.75, borderRadius: 4, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
        <BoltIcon sx={{ color: '#2563eb', fontSize: 17 }} />
        <Typography variant="body2" sx={{ color: '#475569' }}>
          Designed and delivered end-to-end using the IBM Coding Agent
          <Box component="span" sx={{ fontWeight: 700, color: '#2563eb' }}> BoB</Box> — from architecture decisions to working application to this presentation.
        </Typography>
      </Box>
    </Stack>
  );
}

export default Architecture;
