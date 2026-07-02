import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import ArrowBackIcon      from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon   from '@mui/icons-material/ArrowForward';
import DashboardIcon      from '@mui/icons-material/Dashboard';
import FullscreenIcon     from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

// ── Shared style tokens ───────────────────────────────────────────────────────
const S = {
  navy:  '#0a1628',
  blue:  '#1e3a5f',
  acc:   '#2563eb',
  txt:   '#f0f4ff',
  muted: '#94a3b8',
  card:  'rgba(255,255,255,0.07)',
  bdr:   'rgba(255,255,255,0.12)',
};

// ── Every slide declares its own step count ───────────────────────────────────
// step 0 = initial state shown when slide first appears
// each Next click increments step; when step > maxStep the slide advances
const SLIDE_DEFS = [
  { id: 'hero',      maxSteps: 0 },  // single-state, Next goes straight to slide 2
  { id: 'oldway',    maxSteps: 4 },  // step1=box1, step2=box2, step3=box3, step4=result strip
  { id: 'message',   maxSteps: 2 },  // step1=left box, step2=right box
  { id: 'pain',      maxSteps: 6 },  // each of 6 cards reveals on its own click
  { id: 'transform', maxSteps: 2 },  // step1=irony quote, step2=full diagram
  { id: 'features',  maxSteps: 6 },  // each feature card reveals
  { id: 'mockup',    maxSteps: 1 },  // step1=the irony line
  { id: 'builder',   maxSteps: 0 },  // single state
];
const TOTAL = SLIDE_DEFS.length;

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function Tag({ children, color = '#60a5fa', bg = 'rgba(37,99,235,0.15)', border = 'rgba(37,99,235,0.3)' }) {
  return (
    <Box sx={{
      display: 'inline-block', mb: 2,
      px: 1.75, py: 0.5, borderRadius: 20,
      border: `1px solid ${border}`,
      bgcolor: bg, color, fontSize: '0.67rem', fontWeight: 700,
      letterSpacing: '0.1em', textTransform: 'uppercase',
    }}>
      {children}
    </Box>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <Box sx={{ bgcolor: S.card, border: `1px solid ${S.bdr}`, borderRadius: 3, p: 2, flex: 1, minWidth: 130, textAlign: 'center' }}>
      <Box sx={{ fontSize: '1.6rem', mb: 0.5 }}>{icon}</Box>
      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: S.muted, mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: '1.1rem', fontWeight: 800, color: '#60a5fa' }}>{value}</Typography>
    </Box>
  );
}

function StatBox({ value, label, color }) {
  return (
    <Box sx={{ bgcolor: S.card, border: `1px solid ${S.bdr}`, borderRadius: 1.5, px: 2.5, py: 1.5, textAlign: 'center', minWidth: 110 }}>
      <Typography sx={{ fontSize: '1.9rem', fontWeight: 900, lineHeight: 1, mb: 0.4, color }}>{value}</Typography>
      <Typography sx={{ fontSize: '0.65rem', color: S.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
    </Box>
  );
}

// Fade-in wrapper — mounts visible, no animation needed when already mounted
function FadeIn({ children, delay = 0, sx = {} }) {
  return (
    <Box sx={{ animation: `presBoxIn 0.45s ease ${delay}s both`, ...sx }}>
      {children}
    </Box>
  );
}

function FlowNode({ emoji, text, variant = 'normal' }) {
  const styles = {
    normal: { bg: S.blue,                    border: 'rgba(255,255,255,0.18)', color: S.txt,    td: 'none',         opacity: 1    },
    red:    { bg: 'rgba(220,38,38,0.14)',    border: '#f87171',                color: '#fca5a5', td: 'line-through', opacity: 0.65 },
    green:  { bg: 'rgba(22,163,74,0.17)',    border: '#4ade80',                color: '#86efac', td: 'none',         opacity: 1    },
  };
  const st = styles[variant] || styles.normal;
  return (
    <Box sx={{
      bgcolor: st.bg, border: `1.5px solid ${st.border}`, borderRadius: 1.5,
      px: 2, py: 1.25, width: '100%', fontSize: '0.78rem', fontWeight: 600,
      textAlign: 'center', color: st.color, textDecoration: st.td, opacity: st.opacity, lineHeight: 1.4,
    }}>
      {emoji} {text}
    </Box>
  );
}

// ── SLIDE 1 — HERO ────────────────────────────────────────────────────────────
function SlideHero() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <Tag>ICA Usage Analytics</Tag>
      <Box sx={{ fontSize: 'clamp(3rem,5.5vw,4.5rem)', lineHeight: 1, mb: 1.5, animation: 'presFloat 3s ease-in-out infinite' }}>
        🚀
      </Box>
      <Typography sx={{ fontSize: 'clamp(1.9rem,3.8vw,3rem)', fontWeight: 900, lineHeight: 1.1, mb: 1.5, animation: 'presGlow 3s ease-in-out infinite', color: S.txt }}>
        From <Box component="span" sx={{ color: '#fbbf24' }}>Chaos</Box> to{' '}
        <Box component="span" sx={{ color: '#60a5fa' }}>Control</Box>
      </Typography>
      <Typography sx={{ fontSize: 'clamp(0.85rem,1.2vw,1rem)', color: S.muted, maxWidth: 600, lineHeight: 1.8, mb: 0.75 }}>
        A lazy developer's journey to eliminating manual work.
      </Typography>
      <Typography sx={{ fontSize: '0.82rem', color: '#60a5fa', fontStyle: 'italic', mb: 3, opacity: 0.8 }}>
        "The only thing not using AI... was the AI usage tracking process itself."
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 780 }}>
        <InfoCard icon="👥" label="Team"      value="Active"    />
        <InfoCard icon="🤖" label="ICA Tools" value="Tracked"   />
        <InfoCard icon="📊" label="Analytics" value="Real-time" />
        <InfoCard icon="🔔" label="Reminders" value="Automated" />
      </Box>
    </Box>
  );
}

// ── SLIDE 2 — THE MANUAL PROCESS (4 clicks) ───────────────────────────────────
function SlideOldWay({ step }) {
  const show1 = step >= 1;
  const show2 = step >= 2;
  const show3 = step >= 3;
  const show4 = step >= 4;

  const ProcessBox = ({ emoji, stepNum, title, desc, color, bg, border, visible, delay = 0 }) => {
    if (!visible) return <Box sx={{ flex: 1, minWidth: 0, opacity: 0 }} />;
    return (
      <FadeIn delay={delay} sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{
          bgcolor: bg, border: `2px solid ${border}`, borderRadius: 3,
          p: 2.5, display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center', gap: 1, height: '100%',
        }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '50%',
            bgcolor: `${color}22`, border: `2px solid ${color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
          }}>{emoji}</Box>
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color, opacity: 0.85 }}>
            Step {stepNum}
          </Typography>
          <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: S.txt, lineHeight: 1.2 }}>{title}</Typography>
          <Typography sx={{ fontSize: '0.76rem', color: S.muted, lineHeight: 1.55 }}>{desc}</Typography>
        </Box>
      </FadeIn>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 900 }}>
      <Tag color="#fbbf24" bg="rgba(217,119,6,0.15)" border="rgba(217,119,6,0.3)">The Manual Process</Tag>
      <Typography sx={{ fontSize: 'clamp(1.3rem,2.4vw,1.9rem)', fontWeight: 800, textAlign: 'center', mb: 0.75, color: S.txt }}>
        How It <Box component="span" sx={{ color: '#fbbf24' }}>Used to Work</Box>
      </Typography>
      <Typography sx={{ fontSize: '0.86rem', color: S.muted, textAlign: 'center', mb: 3, maxWidth: 560 }}>
        Three steps. Every single working day.
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 0, width: '100%', minHeight: 180 }}>
        <ProcessBox
          visible={show1} emoji="📋" stepNum={1}
          title="Fill the Tracker"
          desc="Every team member updates an Excel sheet after using any ICA tool"
          color="#fbbf24" bg="rgba(217,119,6,0.1)" border="rgba(217,119,6,0.35)"
        />
        <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, opacity: show1 && show2 ? 1 : 0, transition: 'opacity 0.3s' }}>
          <Typography sx={{ fontSize: '1.6rem', color: S.muted }}>→</Typography>
        </Box>
        <ProcessBox
          visible={show2} emoji="🔍" stepNum={2}
          title="Check & Compile"
          desc="Tracker reviewed manually, missing entries noted down one by one"
          color="#f87171" bg="rgba(220,38,38,0.1)" border="rgba(220,38,38,0.35)"
        />
        <Box sx={{ display: 'flex', alignItems: 'center', px: 0.5, opacity: show2 && show3 ? 1 : 0, transition: 'opacity 0.3s' }}>
          <Typography sx={{ fontSize: '1.6rem', color: S.muted }}>→</Typography>
        </Box>
        <ProcessBox
          visible={show3} emoji="💬" stepNum={3}
          title="Post in Teams"
          desc="Names posted manually in the group chat — same message, every day"
          color="#a78bfa" bg="rgba(124,58,237,0.1)" border="rgba(124,58,237,0.35)"
        />
      </Box>

      {show4 && (
        <FadeIn sx={{ width: '100%', mt: 2.5 }}>
          <Box sx={{
            bgcolor: 'rgba(220,38,38,0.07)', border: '1.5px solid rgba(220,38,38,0.25)',
            borderRadius: 2, p: 2,
            display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap',
          }}>
            {[['📊','Zero Analytics'],['📅','No History'],['🔁','Repeated Daily'],['⏳','Time-consuming']].map(([icon, label]) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography sx={{ fontSize: '1rem' }}>{icon}</Typography>
                <Typography sx={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 600 }}>{label}</Typography>
              </Box>
            ))}
            <Typography sx={{ width: '100%', textAlign: 'center', fontSize: '0.8rem', color: '#fbbf24', fontStyle: 'italic', mt: 0.5 }}>
              "I wasn't really using AI... I was the AI."
            </Typography>
          </Box>
        </FadeIn>
      )}
    </Box>
  );
}

// ── SLIDE 3 — THE NOTIFICATION (2 clicks) ────────────────────────────────────
function SlideMessage({ step }) {
  const showLeft  = step >= 1;
  const showRight = step >= 2;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 860 }}>
      <Tag color="#f87171" bg="rgba(220,38,38,0.15)" border="rgba(220,38,38,0.3)">The Daily Notification</Tag>
      <Typography sx={{ fontSize: 'clamp(1.3rem,2.4vw,1.9rem)', fontWeight: 800, textAlign: 'center', mb: 0.75, color: S.txt }}>
        What the Team <Box component="span" sx={{ color: '#f87171' }}>Received</Box> Every Morning
      </Typography>
      <Typography sx={{ fontSize: '0.86rem', color: S.muted, textAlign: 'center', mb: 2.5 }}>
        Behind this tiny notification... there was a lot more human effort than it deserved.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, width: '100%', alignItems: 'stretch', minHeight: 260 }}>

        {/* Left — manual */}
        {showLeft ? (
          <FadeIn sx={{ flex: 1 }}>
            <Box sx={{ height: '100%', bgcolor: 'rgba(220,38,38,0.07)', border: '2px solid rgba(220,38,38,0.3)', borderRadius: 2.5, p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f87171' }} />
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Manual — Teams Chat
                </Typography>
              </Box>
              <Box sx={{ bgcolor: '#1e1e2e', border: '1px solid #3a3a5c', borderRadius: 1.5, p: 1.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>👤</Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700 }}>Admin</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: S.muted }}>9:14 AM · manually typed</Typography>
                  </Box>
                </Box>
                <Typography sx={{ fontSize: '0.76rem', color: '#c9d1d9', lineHeight: 1.6, mb: 1 }}>
                  Hey team 👋 — The following people haven't updated their ICA tracker yet. Please update ASAP.
                </Typography>
                <Box sx={{ bgcolor: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 1, p: 1 }}>
                  {['Alex Johnson','Sarah Williams','Mike Chen','Priya Sharma'].map(n => (
                    <Typography key={n} sx={{ fontSize: '0.72rem', color: '#fca5a5', py: '1px' }}>❌ {n}</Typography>
                  ))}
                </Box>
              </Box>
              <Box sx={{ mt: 1.5 }}>
                {[
                  'Written and sent by hand every day',
                  'Just names — no usage data or context',
                  'Entire team sees everyone\'s name publicly',
                ].map(t => (
                  <Box key={t} sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start', mb: 0.5 }}>
                    <Typography sx={{ color: '#f87171', fontSize: '0.75rem', flexShrink: 0 }}>✕</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: S.muted, lineHeight: 1.5 }}>{t}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </FadeIn>
        ) : (
          <Box sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.02)', border: `1px dashed ${S.bdr}`, borderRadius: 2.5 }} />
        )}

        {/* Divider */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ width: 2, flex: 1, bgcolor: S.bdr }} />
          <Typography sx={{ fontSize: '1.5rem' }}>⚡</Typography>
          <Box sx={{ width: 2, flex: 1, bgcolor: S.bdr }} />
        </Box>

        {/* Right — automated */}
        {showRight ? (
          <FadeIn sx={{ flex: 1 }}>
            <Box sx={{ height: '100%', bgcolor: 'rgba(22,163,74,0.07)', border: '2px solid rgba(22,163,74,0.3)', borderRadius: 2.5, p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4ade80' }} />
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Automated — App-triggered
                </Typography>
              </Box>
              <Box sx={{ bgcolor: '#0f172a', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 1.5, p: 1.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#16a34a,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🤖</Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#4ade80' }}>ICA Usage Bot</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: S.muted }}>Auto-triggered · 9:00 AM sharp</Typography>
                  </Box>
                </Box>
                <Typography sx={{ fontSize: '0.76rem', color: '#c9d1d9', lineHeight: 1.6, mb: 1 }}>
                  📊 Daily ICA Usage Check — the following members have no activity recorded today.
                </Typography>
                <Box sx={{ bgcolor: 'rgba(22,163,74,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 1, p: 1 }}>
                  {['Alex Johnson','Sarah Williams','Mike Chen','Priya Sharma'].map(n => (
                    <Typography key={n} sx={{ fontSize: '0.72rem', color: '#86efac', py: '1px' }}>🔔 {n}</Typography>
                  ))}
                </Box>
              </Box>
              <Box sx={{ mt: 1.5 }}>
                {[
                  'Zero human involvement — fires automatically',
                  'Linked to live usage data from the app',
                  'One click to send from the dashboard',
                ].map(t => (
                  <Box key={t} sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start', mb: 0.5 }}>
                    <Typography sx={{ color: '#4ade80', fontSize: '0.75rem', flexShrink: 0 }}>✓</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: S.muted, lineHeight: 1.5 }}>{t}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </FadeIn>
        ) : (
          <Box sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.02)', border: `1px dashed ${S.bdr}`, borderRadius: 2.5 }} />
        )}

      </Box>
    </Box>
  );
}

// ── SLIDE 4 — THE GAP (6 clicks — one card each) ─────────────────────────────
function SlidePain({ step }) {
  const problems = [
    { icon: '📊', title: 'No Analytics',   desc: 'No visibility into who uses ICA, how often, or which tools',          color: '#f87171', bg: 'rgba(220,38,38,0.08)',  border: 'rgba(220,38,38,0.3)'  },
    { icon: '📅', title: 'No History',     desc: 'Once the week passes, data is gone — no monthly trends possible',     color: '#fbbf24', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.3)'  },
    { icon: '⏳', title: 'Time Drain',     desc: 'The same manual task repeated every single day without automation',   color: '#f87171', bg: 'rgba(220,38,38,0.08)',  border: 'rgba(220,38,38,0.3)'  },
    { icon: '🎯', title: 'No Targeting',   desc: 'No way to distinguish first-time misses from consistent non-users',   color: '#fbbf24', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.3)'  },
    { icon: '🔔', title: 'Manual Alerts',  desc: 'Every notification written and sent by hand — zero intelligence',     color: '#f87171', bg: 'rgba(220,38,38,0.08)',  border: 'rgba(220,38,38,0.3)'  },
    { icon: '📈', title: 'Zero Insights',  desc: 'We knew who forgot today, but had no idea if adoption was improving', color: '#fbbf24', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.3)'  },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 860 }}>
      <Tag color="#f87171" bg="rgba(220,38,38,0.15)" border="rgba(220,38,38,0.3)">The Gap</Tag>
      <Typography sx={{ fontSize: 'clamp(1.3rem,2.4vw,1.9rem)', fontWeight: 800, textAlign: 'center', mb: 0.75, color: S.txt }}>
      <Box component="span" sx={{ color: '#f4f1eb' }}>What Was</Box> <Box component="span" sx={{ color: '#f87171' }}>Missing</Box>
      </Typography>
      <Typography sx={{ fontSize: '0.86rem', color: S.muted, textAlign: 'center', mb: 2.5 }}>
        We had data... but we weren't really learning anything from it.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1.5, width: '100%' }}>
        {problems.map((p, i) => {
          const visible = step > i;
          return visible ? (
            <FadeIn key={p.title}>
              <Box sx={{
                bgcolor: p.bg, border: `2px solid ${p.border}`, borderRadius: 2.5, p: 2,
                display: 'flex', flexDirection: 'column', gap: 1, height: '100%',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 1.5, flexShrink: 0, bgcolor: `${p.color}18`, border: `1.5px solid ${p.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>{p.icon}</Box>
                  <Typography sx={{ fontSize: '0.84rem', fontWeight: 800, color: p.color }}>{p.title}</Typography>
                </Box>
                <Typography sx={{ fontSize: '0.75rem', color: S.muted, lineHeight: 1.55 }}>{p.desc}</Typography>
              </Box>
            </FadeIn>
          ) : (
            <Box key={p.title} sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: `1px dashed ${S.bdr}`, borderRadius: 2.5, minHeight: 90 }} />
          );
        })}
      </Box>
    </Box>
  );
}

// ── SLIDE 5 — THE TURNING POINT (2 clicks) ───────────────────────────────────
function SlideTransform({ step }) {
  const showIrony = step >= 1;
  const showFlow  = step >= 2;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 860 }}>
      <Tag color="#c4b5fd" bg="rgba(124,58,237,0.15)" border="rgba(124,58,237,0.3)">The Turning Point</Tag>
      <Typography sx={{ fontSize: 'clamp(1.3rem,2.4vw,1.9rem)', fontWeight: 800, textAlign: 'center', mb: 0.75, color: S.txt }}>
        <Box component="span" sx={{ color: '#f87171' }}>Before</Box> vs{' '}
        <Box component="span" sx={{ color: '#4ade80' }}>After</Box>
      </Typography>

      {showIrony && (
        <FadeIn sx={{ mb: 2.5, width: '100%', maxWidth: 700 }}>
          <Box sx={{ bgcolor: 'rgba(37,99,235,0.1)', border: '1.5px solid rgba(37,99,235,0.3)', borderRadius: 2, p: 2.25, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.9rem', color: '#93c5fd', lineHeight: 1.8, fontStyle: 'italic' }}>
              "Then one day I realised something ironic.<br/>
              We were encouraging everyone to use AI every day...<br/>
              but the process of <strong style={{ color: S.txt }}>tracking AI usage</strong> was <strong style={{ color: '#f87171' }}>completely manual</strong>.<br/>
              That didn't feel right. So I decided to <strong style={{ color: '#4ade80' }}>automate the automation</strong>."
            </Typography>
          </Box>
        </FadeIn>
      )}

      {showFlow && (
        <FadeIn sx={{ display: 'flex', gap: 2.5, width: '100%', alignItems: 'flex-start' }}>
          {/* before */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>❌ Before</Typography>
            {[
              ['📋', 'User fills Excel tracker'],
              ['🔍', 'Manually review tracker'],
              ['📝', 'Compile names by hand'],
              ['💬', 'Post in Teams manually'],
              ['😶', 'No data. No insights.'],
            ].map(([e, t], i) => (
              <React.Fragment key={t}>
                <FlowNode emoji={e} text={t} variant="red" />
                {i < 4 && <Typography sx={{ color: 'rgba(248,113,113,0.4)', fontSize: '1.1rem', my: '2px' }}>↓</Typography>}
              </React.Fragment>
            ))}
          </Box>
          {/* divider */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pt: '30px', gap: 0.5, flexShrink: 0 }}>
            <Box sx={{ width: 2, height: 60, bgcolor: S.bdr }} />
            <Typography sx={{ fontSize: '1.6rem', lineHeight: 1 }}>⚡</Typography>
            <Box sx={{ width: 2, height: 60, bgcolor: S.bdr }} />
          </Box>
          {/* after */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 0.5 }}>✅ After</Typography>
            {[
              ['📤', 'CSV exported from ICA'],
              ['🚀', 'Uploaded to the App'],
              ['🤖', 'Auto-detects missing users'],
              ['🔔', 'Teams notification fires!'],
              ['📊', 'Full analytics dashboard'],
            ].map(([e, t], i) => (
              <React.Fragment key={t}>
                <FlowNode emoji={e} text={t} variant="green" />
                {i < 4 && <Typography sx={{ color: '#4ade80', fontSize: '1.1rem', my: '2px' }}>↓</Typography>}
              </React.Fragment>
            ))}
          </Box>
        </FadeIn>
      )}

      {!showIrony && (
        <Typography sx={{ fontSize: '0.86rem', color: S.muted, textAlign: 'center', mt: 1 }}>
          Click Next to reveal the irony that started it all.
        </Typography>
      )}
    </Box>
  );
}

// ── SLIDE 6 — FEATURES (6 clicks — one card each) ────────────────────────────
function SlideFeatures({ step }) {
  const features = [
    { icon: '📊', title: 'Monthly Dashboard',   desc: 'Full pivot table — who used what, which week, how many times' },
    { icon: '🔔', title: 'Auto Reminders',       desc: 'Detects missed users and fires a Teams notification automatically' },
    { icon: '🔍', title: 'Usage Explorer',       desc: 'Filter by user, assistant, date range — drill into any data point' },
    { icon: '👤', title: 'User Reports',         desc: 'Per-person usage trends — how each member uses ICA over time' },
    { icon: '🤖', title: 'Assistant Reports',    desc: 'Which ICA tools are most popular? Rankings, charts, adoption rates' },
    { icon: '👥', title: 'Team Manager',         desc: 'Mark people Online/Offline — those on leave skip reminders entirely' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 820 }}>
      <Tag color="#4ade80" bg="rgba(22,163,74,0.15)" border="rgba(22,163,74,0.3)">What It Does</Tag>
      <Typography sx={{ fontSize: 'clamp(1.3rem,2.4vw,1.9rem)', fontWeight: 800, textAlign: 'center', mb: 0.75, color: S.txt }}>
        Instead of Excel... <Box component="span" sx={{ color: '#60a5fa' }}>a complete platform</Box>
      </Typography>
      <Typography sx={{ fontSize: '0.86rem', color: S.muted, textAlign: 'center', mb: 2 }}>
        Built with <strong style={{ color: S.txt }}>React · Node.js · SQLite</strong>. Deployed. Running.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1.25, width: '100%' }}>
        {features.map((f, i) => {
          const visible = step > i;
          return visible ? (
            <FadeIn key={f.title}>
              <Box sx={{ bgcolor: S.card, border: `1px solid ${S.bdr}`, borderRadius: 1.5, p: 1.5, display: 'flex', gap: 1.25, alignItems: 'flex-start', height: '100%' }}>
                <Box sx={{ fontSize: '1.25rem', flexShrink: 0 }}>{f.icon}</Box>
                <Box>
                  <Typography sx={{ fontSize: '0.77rem', fontWeight: 700, mb: 0.25 }}>{f.title}</Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: S.muted, lineHeight: 1.4 }}>{f.desc}</Typography>
                </Box>
              </Box>
            </FadeIn>
          ) : (
            <Box key={f.title} sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: `1px dashed ${S.bdr}`, borderRadius: 1.5, minHeight: 70 }} />
          );
        })}
      </Box>
    </Box>
  );
}

// ── SLIDE 7 — DASHBOARD MOCKUP (1 click — irony line) ────────────────────────
function SlideMockup({ step }) {
  const showIrony = step >= 1;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 700 }}>
      <Tag color="#22d3ee" bg="rgba(8,145,178,0.15)" border="rgba(8,145,178,0.3)">The Dashboard</Tag>
      <Typography sx={{ fontSize: 'clamp(1.25rem,2.3vw,1.85rem)', fontWeight: 800, textAlign: 'center', mb: 0.75, color: S.txt }}>
        This is the Part I'm <Box component="span" sx={{ color: '#60a5fa' }}>Most Proud Of</Box>
      </Typography>
      <Typography sx={{ fontSize: '0.84rem', color: S.muted, textAlign: 'center', mb: 1.5 }}>
        Everything is available in one place — no more searching through Excel.
      </Typography>

      <Box sx={{ bgcolor: '#0f172a', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden', width: '100%' }}>
        <Box sx={{ bgcolor: '#1e293b', px: 1.75, py: 1, display: 'flex', alignItems: 'center', gap: 0.75, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {['#ef4444','#f59e0b','#22c55e'].map(c => <Box key={c} sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: c }} />)}
          <Typography sx={{ fontSize: '0.7rem', color: '#64748b', ml: 0.75 }}>ICA Reports — Usage Analytics</Typography>
        </Box>
        <Box sx={{ display: 'flex', p: 1.25, gap: 1 }}>
          <Box sx={{ width: 100, borderRight: '1px solid rgba(255,255,255,0.06)', pr: 1 }}>
            <Typography sx={{ fontSize: '0.5rem', color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', px: 0.75, pb: 0.5 }}>Menu</Typography>
            {[['📊','Dashboard',true],['🔍','Explorer',false],['👤','Users',false],['🤖','Assistants',false],['🔔','Reminders',false],['👥','Team',false]].map(([ic,lb,on]) => (
              <Box key={lb} sx={{ px: 0.75, py: 0.5, borderRadius: 1, bgcolor: on ? 'rgba(37,99,235,0.2)' : 'transparent', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                <Typography sx={{ fontSize: '0.75rem' }}>{ic}</Typography>
                <Typography sx={{ fontSize: '0.6rem', color: on ? '#93c5fd' : '#64748b' }}>{lb}</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', gap: 0.5, mb: 0.75 }}>
              {[['247','#60a5fa','Total Interactions'],['18','#c4b5fd','Active Users'],['4','#34d399','Weeks'],['13.7','#fbbf24','Avg/User']].map(([v,c,l]) => (
                <Box key={l} sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 1, p: '5px 8px' }}>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: c }}>{v}</Typography>
                  <Typography sx={{ fontSize: '0.5rem', color: '#64748b' }}>{l}</Typography>
                </Box>
              ))}
            </Box>
            <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 1, p: '6px 8px' }}>
              <Box sx={{ display: 'flex', gap: 0.5, pb: 0.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Name','Jun 02','Jun 09','Jun 16','Total'].map((h,i) => (
                  <Typography key={h} sx={{ flex:1, fontSize:'0.5rem', color:'#64748b', fontWeight:700, textTransform:'uppercase', textAlign: i>0?'right':'left' }}>{h}</Typography>
                ))}
              </Box>
              {[
                { name:'Alex J.',  vals:[12,9,14],  total:35, amber:false },
                { name:'Sarah W.', vals:[0,0,0],    total:0,  amber:true  },
                { name:'Mike C.',  vals:[8,11,7],   total:26, amber:false },
                { name:'Priya S.', vals:[15,13,11], total:39, amber:false },
              ].map(row => (
                <Box key={row.name} sx={{ display:'flex', gap:0.5, py:'3px', borderBottom:'1px solid rgba(255,255,255,0.04)', bgcolor: row.amber ? 'rgba(217,119,6,0.07)' : 'transparent' }}>
                  <Box sx={{ flex:1 }}>
                    <Typography sx={{ fontSize:'0.58rem', color: row.amber ? '#fbbf24' : '#94a3b8' }}>
                      {row.name}
                      {row.amber && <Box component="span" sx={{ ml:0.5, bgcolor:'rgba(217,119,6,0.2)', color:'#fbbf24', border:'1px solid rgba(217,119,6,0.35)', borderRadius:0.5, px:0.5, fontSize:'0.5rem', fontWeight:700 }}>not using</Box>}
                    </Typography>
                  </Box>
                  {row.vals.map((v,i) => (
                    <Typography key={i} sx={{ flex:1, fontSize:'0.58rem', textAlign:'right', color: v ? '#93c5fd' : '#475569', fontWeight: v ? 600 : 400 }}>{v || '–'}</Typography>
                  ))}
                  <Typography sx={{ flex:1, fontSize:'0.6rem', textAlign:'right', fontWeight:700, color: row.amber ? '#d97706' : '#60a5fa' }}>{row.total}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      {showIrony ? (
        <FadeIn sx={{ mt: 1.5, width: '100%' }}>
          <Box sx={{ bgcolor: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 1.5, p: 1.5, display: 'flex', gap: 2.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              'Who uses ICA the most?',
              'Which assistant is most popular?',
              'How has adoption changed this month?',
              'Who is consistently inactive?',
            ].map(q => (
              <Typography key={q} sx={{ fontSize: '0.77rem', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box component="span" sx={{ color: '#4ade80' }}>→</Box> {q}
              </Typography>
            ))}
          </Box>
        </FadeIn>
      ) : (
        <Typography sx={{ fontSize: '0.72rem', color: S.muted, textAlign: 'center', mt: 1.25 }}>
          ✅ Zero manual effort &nbsp;·&nbsp; ✅ Real-time data &nbsp;·&nbsp; ✅ Auto reminders &nbsp;·&nbsp; ✅ Full history
        </Typography>
      )}
    </Box>
  );
}

// ── SLIDE 8 — THE BUILDER ────────────────────────────────────────────────────
function SlideBuilder({ onLaunch }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <Tag color="#c4b5fd" bg="rgba(124,58,237,0.15)" border="rgba(124,58,237,0.3)">The Builder</Tag>
      <Typography sx={{ fontSize: 'clamp(1.25rem,2.3vw,1.85rem)', fontWeight: 800, textAlign: 'center', mb: 0.5, color: S.txt }}>
        And Finally... <Box component="span" sx={{ color: '#60a5fa' }}>The Person Responsible</Box>
      </Typography>
      <Typography sx={{ fontSize: '0.85rem', color: S.muted, textAlign: 'center', mb: 2.5 }}>For all of this.</Typography>

      <Box sx={{
        background: 'linear-gradient(135deg,rgba(37,99,235,0.2),rgba(124,58,237,0.2))',
        border: '1.5px solid rgba(99,102,241,0.4)',
        borderRadius: 3, p: 3, textAlign: 'center', maxWidth: 480, width: '100%', mb: 2.5,
      }}>
        <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', mx: 'auto', mb: 1.5, border: '3px solid rgba(255,255,255,0.2)' }}>
          👨‍💻
        </Box>
        <Typography sx={{ fontSize: '1.2rem', fontWeight: 800, mb: 0.25 }}>Yaswanth Sai</Typography>
        <Typography sx={{ fontSize: '0.75rem', color: S.muted, mb: 1.75 }}>
          AI Enthusiast · Full Stack Developer · Someone who dislikes manual work enough to spend weeks automating five minutes of daily effort
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center', flexWrap: 'wrap', mb: 1.75 }}>
          {[
            { label: 'React',      bg: 'rgba(37,99,235,0.15)',  border: 'rgba(37,99,235,0.3)',  color: '#93c5fd' },
            { label: 'Node.js',    bg: 'rgba(37,99,235,0.15)',  border: 'rgba(37,99,235,0.3)',  color: '#93c5fd' },
            { label: 'SQLite',     bg: 'rgba(37,99,235,0.15)',  border: 'rgba(37,99,235,0.3)',  color: '#93c5fd' },
            { label: 'IBM BoB AI', bg: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.3)', color: '#c4b5fd' },
            { label: 'Teams API',  bg: 'rgba(16,163,74,0.15)',  border: 'rgba(16,163,74,0.3)',  color: '#86efac' },
          ].map(t => (
            <Box key={t.label} sx={{ bgcolor: t.bg, border: `1px solid ${t.border}`, borderRadius: 20, px: 1.25, py: '3px', fontSize: '0.68rem', color: t.color }}>
              {t.label}
            </Box>
          ))}
        </Box>
        <Typography sx={{ fontSize: '0.82rem', color: S.muted, fontStyle: 'italic', lineHeight: 1.8 }}>
          "This project wasn't just about sending notifications.<br/>
          It was about converting repetitive work into intelligent automation.
          Saving time. Providing insights.<br/>
          And making ICA adoption <strong style={{ color: S.txt, fontStyle: 'normal' }}>measurable instead of guessable</strong>."
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
        <StatBox value="0"    label="Manual Steps"    color="#60a5fa" />
        <StatBox value="100%" label="Automated"        color="#4ade80" />
        <StatBox value="∞"    label="People Impressed" color="#fbbf24" />
      </Box>

      <Box
        component="button"
        onClick={onLaunch}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.25,
          bgcolor: '#2563eb', color: '#fff',
          border: 'none', borderRadius: 2, px: 3.5, py: 1.5,
          fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'background 0.18s, transform 0.12s',
          '&:hover': { bgcolor: '#1d4ed8', transform: 'translateY(-2px)' },
          '&:active': { transform: 'translateY(0)' },
          boxShadow: '0 4px 16px rgba(37,99,235,0.45)',
        }}
      >
        <DashboardIcon sx={{ fontSize: 20 }} />
        Launch the App →
      </Box>
    </Box>
  );
}

// ── Slide content router ──────────────────────────────────────────────────────
function SlideContent({ id, step, onLaunch }) {
  switch (id) {
    case 'hero':      return <SlideHero />;
    case 'oldway':    return <SlideOldWay   step={step} />;
    case 'message':   return <SlideMessage  step={step} />;
    case 'pain':      return <SlidePain     step={step} />;
    case 'transform': return <SlideTransform step={step} />;
    case 'features':  return <SlideFeatures step={step} />;
    case 'mockup':    return <SlideMockup   step={step} />;
    case 'builder':   return <SlideBuilder  onLaunch={onLaunch} />;
    default:          return null;
  }
}

// ── Main Presentation component ───────────────────────────────────────────────
export default function Presentation({ onLaunch }) {
  const [slideIdx, setSlideIdx]  = useState(0);
  const [step, setStep]          = useState(0);       // step within current slide
  const [direction, setDirection] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [isFS, setIsFS]           = useState(false);
  const containerRef              = useRef(null);

  const currentDef = SLIDE_DEFS[slideIdx];

  // ── Navigate to a specific slide index ──
  const goToSlide = useCallback((idx) => {
    if (animating || idx === slideIdx) return;
    setDirection(idx > slideIdx ? 1 : -1);
    setAnimating(true);
    setTimeout(() => {
      setSlideIdx(idx);
      setStep(0);
      setAnimating(false);
    }, 280);
  }, [animating, slideIdx]);

  // ── "Next" — either reveal next step or advance to next slide ──
  const next = useCallback(() => {
    if (animating) return;
    if (step < currentDef.maxSteps) {
      setStep(s => s + 1);
    } else if (slideIdx < TOTAL - 1) {
      goToSlide(slideIdx + 1);
    }
  }, [animating, step, currentDef.maxSteps, slideIdx, goToSlide]);

  // ── "Prev" — either go back one step or go back one slide ──
  const prev = useCallback(() => {
    if (animating) return;
    if (step > 0) {
      setStep(s => s - 1);
    } else if (slideIdx > 0) {
      const prevDef = SLIDE_DEFS[slideIdx - 1];
      setDirection(-1);
      setAnimating(true);
      setTimeout(() => {
        setSlideIdx(slideIdx - 1);
        setStep(prevDef.maxSteps);   // land on last-step of prev slide
        setAnimating(false);
      }, 280);
    }
  }, [animating, step, slideIdx]);

  const isAtStart = slideIdx === 0 && step === 0;
  const isAtEnd   = slideIdx === TOTAL - 1;

  // ── Fullscreen ──
  const toggleFS = useCallback(() => {
    if (!isFS) {
      const el = containerRef.current;
      if (el?.requestFullscreen)            el.requestFullscreen();
      else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen)             document.exitFullscreen();
      else if (document.webkitExitFullscreen)  document.webkitExitFullscreen();
    }
  }, [isFS]);

  useEffect(() => {
    const onChange = () => setIsFS(!!(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  // ── Keyboard ──
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft')                   { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // Progress counts each "click" — total steps across all slides
  const totalClicks = SLIDE_DEFS.reduce((a, d) => a + d.maxSteps + 1, 0);
  const doneClicks  = SLIDE_DEFS.slice(0, slideIdx).reduce((a, d) => a + d.maxSteps + 1, 0) + step;
  const progress    = (doneClicks / (totalClicks - 1)) * 100;

  return (
    <Box ref={containerRef} sx={{
      bgcolor: '#0a1628',
      borderRadius: isFS ? 0 : 3,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: isFS ? '100vh' : 'calc(100vh - 100px)',
      minHeight: 500,
      position: 'relative',
      border: isFS ? 'none' : '1px solid rgba(255,255,255,0.08)',
    }}>

      {/* keyframes */}
      <style>{`
        @keyframes presFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes presGlow    { 0%,100%{text-shadow:0 0 20px rgba(37,99,235,0.3)} 50%{text-shadow:0 0 44px rgba(37,99,235,0.7),0 0 90px rgba(124,58,237,0.4)} }
        @keyframes presFadeIn  { from{opacity:0;transform:translateX(40px)}  to{opacity:1;transform:translateX(0)} }
        @keyframes presFadeOut { from{opacity:1;transform:translateX(0)}  to{opacity:0;transform:translateX(-40px)} }
        @keyframes presFadeInBack  { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes presFadeOutBack { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(40px)} }
        @keyframes presBoxIn   { from{opacity:0;transform:translateY(18px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>

      {/* progress bar */}
      <Box sx={{ height: 3, background: 'linear-gradient(90deg,#2563eb,#7c3aed)', width: `${progress}%`, transition: 'width 0.35s ease' }} />

      {/* bg orbs */}
      <Box sx={{ position:'absolute', width:400, height:400, borderRadius:'50%', bgcolor:'rgba(37,99,235,0.08)', filter:'blur(80px)', top:-80, left:-80, pointerEvents:'none', zIndex:0 }} />
      <Box sx={{ position:'absolute', width:350, height:350, borderRadius:'50%', bgcolor:'rgba(124,58,237,0.07)', filter:'blur(80px)', bottom:-60, right:-60, pointerEvents:'none', zIndex:0 }} />

      {/* slide counter */}
      <Box sx={{ position:'absolute', top:12, right:16, zIndex:10, bgcolor:'rgba(0,0,0,0.4)', border:`1px solid ${S.bdr}`, borderRadius:20, px:1.5, py:0.4 }}>
        <Typography sx={{ fontSize:'0.72rem', color:S.muted }}>
          {slideIdx + 1} / {TOTAL}
          {currentDef.maxSteps > 0 && (
            <Box component="span" sx={{ ml: 0.75, opacity: 0.6 }}>
              · {step}/{currentDef.maxSteps}
            </Box>
          )}
        </Typography>
      </Box>

      {/* slide stage */}
      <Box sx={{ flex:1, position:'relative', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1 }}>
        <Box
          key={slideIdx}
          sx={{
            position:'absolute', inset:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            p: '28px 40px',
            animation: animating
              ? (direction > 0 ? 'presFadeOut 0.28s ease forwards' : 'presFadeOutBack 0.28s ease forwards')
              : (direction > 0 ? 'presFadeIn 0.38s ease forwards'  : 'presFadeInBack 0.38s ease forwards'),
            overflowY: 'auto',
          }}
        >
          <SlideContent id={currentDef.id} step={step} onLaunch={onLaunch} />
        </Box>
      </Box>

      {/* nav bar */}
      <Box sx={{
        display:'flex', alignItems:'center', justifyContent:'center', gap:2,
        px:3, py:1.5,
        bgcolor:'rgba(0,0,0,0.35)',
        borderTop:`1px solid ${S.bdr}`,
        zIndex:2, flexShrink:0,
      }}>
        {/* prev */}
        <Tooltip title="Previous (←)">
          <span>
            <IconButton
              size="small" disabled={isAtStart} onClick={prev}
              sx={{
                color:S.txt, bgcolor:S.card, border:`1px solid ${S.bdr}`,
                borderRadius:1.5, px:1.5, py:0.75, gap:0.5,
                '&:hover':{ bgcolor:'rgba(255,255,255,0.12)' },
                '&.Mui-disabled':{ opacity:0.28, color:S.txt },
              }}
            >
              <ArrowBackIcon sx={{ fontSize:16 }} />
              <Typography sx={{ fontSize:'0.82rem', fontWeight:600, color:'inherit' }}>Prev</Typography>
            </IconButton>
          </span>
        </Tooltip>

        {/* slide dots */}
        <Box sx={{ display:'flex', gap:1, alignItems:'center' }}>
          {SLIDE_DEFS.map((_, i) => (
            <Box
              key={i}
              onClick={() => goToSlide(i)}
              sx={{
                width: i === slideIdx ? 24 : 8, height: 8,
                borderRadius: i === slideIdx ? 4 : '50%',
                bgcolor: i === slideIdx ? '#2563eb' : 'rgba(255,255,255,0.2)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                '&:hover':{ bgcolor: i === slideIdx ? '#2563eb' : 'rgba(255,255,255,0.4)' },
              }}
            />
          ))}
        </Box>

        {/* step indicator dots (when slide has sub-steps) */}
        {currentDef.maxSteps > 0 && (
          <Box sx={{ display:'flex', gap:0.5, alignItems:'center' }}>
            {Array.from({ length: currentDef.maxSteps }).map((_, i) => (
              <Box key={i} sx={{
                width: 5, height: 5, borderRadius: '50%',
                bgcolor: step > i ? '#2563eb' : 'rgba(255,255,255,0.15)',
                transition: 'background 0.2s',
              }} />
            ))}
          </Box>
        )}

        {/* fullscreen */}
        <Tooltip title={isFS ? 'Exit fullscreen (Esc)' : 'Fullscreen'}>
          <IconButton
            size="small" onClick={toggleFS}
            sx={{
              color:S.muted, bgcolor:S.card, border:`1px solid ${S.bdr}`,
              borderRadius:1.5, width:34, height:34,
              '&:hover':{ bgcolor:'rgba(255,255,255,0.12)', color:S.txt },
            }}
          >
            {isFS ? <FullscreenExitIcon sx={{ fontSize:18 }} /> : <FullscreenIcon sx={{ fontSize:18 }} />}
          </IconButton>
        </Tooltip>

        {/* next */}
        <Tooltip title={isAtEnd ? 'Done!' : (step < currentDef.maxSteps ? `Reveal next (${currentDef.maxSteps - step} left)` : 'Next slide (→)')}>
          <span>
            <IconButton
              size="small" disabled={isAtEnd} onClick={next}
              sx={{
                color:'#fff', bgcolor:'#2563eb', border:'1px solid #2563eb',
                borderRadius:1.5, px:1.5, py:0.75, gap:0.5,
                '&:hover':{ bgcolor:'#1d4ed8', borderColor:'#1d4ed8' },
                '&.Mui-disabled':{ opacity:0.28, color:'#fff' },
              }}
            >
              <Typography sx={{ fontSize:'0.82rem', fontWeight:600, color:'inherit' }}>
                {isAtEnd ? '🎉 Done' : step < currentDef.maxSteps ? 'Click' : 'Next'}
              </Typography>
              {!isAtEnd && <ArrowForwardIcon sx={{ fontSize:16 }} />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* keyboard hint on first slide */}
      {isAtStart && (
        <Box sx={{ position:'absolute', bottom:56, left:'50%', transform:'translateX(-50%)', zIndex:10, pointerEvents:'none' }}>
          <Typography sx={{ fontSize:'0.65rem', color:'rgba(148,163,184,0.5)', whiteSpace:'nowrap' }}>
            Press → or click Next to advance · Space also works
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// Made with Bob
