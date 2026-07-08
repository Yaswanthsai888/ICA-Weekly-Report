require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { db, dbHelpers } = require('./database');
const { parseCSV } = require('./csvParser');
const { parseLeaveCSV, inferMonthFromFilename } = require('./leaveParser');
const { parseHolidayCSV } = require('./holidayParser');
const { resolveAll } = require('./nameResolver');
const { startOfWeek, endOfWeek, format, subWeeks, addDays } = require('date-fns');

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Middleware
if (!IS_PROD) app.use(cors());   // dev only — in prod the frontend is served from same origin
app.use(express.json());

// ── Serve React build in production ──────────────────────────────────────────
const FRONTEND_BUILD = path.join(__dirname, '..', 'frontend', 'build');
if (IS_PROD && fs.existsSync(FRONTEND_BUILD)) {
  app.use(express.static(FRONTEND_BUILD));
}

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ICA Weekly Report API is running' });
});

// Upload and process CSV
app.post('/api/upload-csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the uploaded file
    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    
    // Parse CSV
    const parseResult = parseCSV(csvContent);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error });
    }

    // Store data in database
    let usersProcessed  = 0;
    let newRecords      = 0;   // records that did not exist before
    let skippedRecords  = 0;   // records already in the DB (duplicates)

    for (const userData of parseResult.users) {
      try {
        const user = await dbHelpers.getOrCreateUser({
          name: userData.name,
          email: userData.email,
          scrum_master: userData.scrum_master,
          track: userData.track
        });

        usersProcessed++;

        for (const usage of userData.usage) {
          const result = await dbHelpers.insertUsageRecord({
            user_id: user.id,
            date: usage.date,
            assistant_name: usage.assistant_name,
            row_number: usage.row_number
          });
          if (result.isNew) newRecords++;
          else              skippedRecords++;
        }
      } catch (error) {
        console.error(`Error processing user ${userData.name}:`, error);
      }
    }

    const totalRecords = newRecords + skippedRecords;
    res.json({
      success: true,
      message: newRecords > 0
        ? `${newRecords} new record${newRecords !== 1 ? 's' : ''} added successfully`
        : 'No new records — database is already up to date',
      stats: {
        usersProcessed,
        newRecords,
        skippedRecords,
        totalRecords,
        dateRange: parseResult.dateRange,
        totalDates: parseResult.totalDates
      }
    });

  } catch (error) {
    console.error('Error processing CSV:', error);
    res.status(500).json({ error: 'Failed to process CSV file', details: error.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await dbHelpers.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get weekly summary
app.get('/api/weekly-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const summary = await dbHelpers.getWeeklySummary(startDate, endDate);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching weekly summary:', error);
    res.status(500).json({ error: 'Failed to fetch weekly summary' });
  }
});

// Get assistant statistics
app.get('/api/assistant-stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const stats = await dbHelpers.getAssistantStats(startDate, endDate);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching assistant stats:', error);
    res.status(500).json({ error: 'Failed to fetch assistant statistics' });
  }
});

// Get user-specific usage
app.get('/api/user-usage/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const usage = await dbHelpers.getUsageByUser(userId, startDate, endDate);
    res.json(usage);
  } catch (error) {
    console.error('Error fetching user usage:', error);
    res.status(500).json({ error: 'Failed to fetch user usage' });
  }
});

// Get usage by date range
app.get('/api/usage', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const usage = await dbHelpers.getUsageByDateRange(startDate, endDate);
    res.json(usage);
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage data' });
  }
});

// Get available weeks (for dropdown selection)
app.get('/api/available-weeks', async (req, res) => {
  try {
    const usage = await dbHelpers.getUsageByDateRange('2000-01-01', '2099-12-31');
    
    if (usage.length === 0) {
      return res.json([]);
    }

    // Get unique weeks
    const weeks = new Set();
    usage.forEach(record => {
      const date = new Date(record.date);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
      weeks.add(format(weekStart, 'yyyy-MM-dd'));
    });

    const weekList = Array.from(weeks).sort().reverse().map(weekStart => {
      const start = new Date(weekStart);
      const end = endOfWeek(start, { weekStartsOn: 1 });
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        label: `Week of ${format(start, 'MMM dd, yyyy')}`
      };
    });

    res.json(weekList);
  } catch (error) {
    console.error('Error fetching available weeks:', error);
    res.status(500).json({ error: 'Failed to fetch available weeks' });
  }
});

// Get monthly summary: per-user counts grouped by week within a month
// Query params: year (YYYY), month (1-12)
app.get('/api/monthly-summary', async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: 'year and month are required' });
    }

    const y = parseInt(year, 10);
    const m = parseInt(month, 10);

    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    // Build first and last day of the month
    const firstDay = format(new Date(y, m - 1, 1), 'yyyy-MM-dd');
    const lastDay  = format(new Date(y, m, 0), 'yyyy-MM-dd');       // day 0 of next month = last day of this month

    const [usage, allActiveUsers] = await Promise.all([
      dbHelpers.getUsageByDateRange(firstDay, lastDay),
      new Promise((resolve, reject) =>
        db.all(
          `SELECT id, name, email FROM users WHERE is_active = 1 AND LOWER(email) != 'email' ORDER BY name`,
          [],
          (err, rows) => err ? reject(err) : resolve(rows)
        )
      ),
    ]);

    if (usage.length === 0 && allActiveUsers.length === 0) {
      return res.json({ weeks: [], users: [], rows: [], grandTotals: {}, grandTotal: 0, totalActiveUsers: 0 });
    }

    // Collect all unique week-start dates (Monday-based) within the range
    const weekStartSet = new Set();
    usage.forEach(record => {
      const d = new Date(record.date);
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      weekStartSet.add(format(ws, 'yyyy-MM-dd'));
    });
    const weeks = Array.from(weekStartSet).sort();

    // Build per-user, per-week counts from usage records
    const userMap = {};   // email → { name, weekCounts: { weekStart: count } }
    usage.forEach(record => {
      const ws = format(startOfWeek(new Date(record.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (!userMap[record.email]) {
        userMap[record.email] = { name: record.name, email: record.email, weekCounts: {} };
      }
      userMap[record.email].weekCounts[ws] = (userMap[record.email].weekCounts[ws] || 0) + 1;
    });

    // Merge in active users who had zero usage this month
    allActiveUsers.forEach(u => {
      if (!userMap[u.email]) {
        userMap[u.email] = { name: u.name, email: u.email, weekCounts: {} };
      }
    });

    // Build sorted rows: active users (total > 0) by total desc, then zero-users alphabetically at bottom
    const rows = Object.values(userMap)
      .map(u => {
        const total = Object.values(u.weekCounts).reduce((s, v) => s + v, 0);
        return { name: u.name, email: u.email, weekCounts: u.weekCounts, total };
      })
      .sort((a, b) => {
        if (a.total === 0 && b.total === 0) return a.name.localeCompare(b.name);
        if (a.total === 0) return 1;
        if (b.total === 0) return -1;
        return b.total - a.total;
      });

    // Column grand totals
    const grandTotals = {};
    let grandTotal = 0;
    weeks.forEach(ws => {
      grandTotals[ws] = rows.reduce((s, r) => s + (r.weekCounts[ws] || 0), 0);
      grandTotal += grandTotals[ws];
    });

    res.json({ weeks, rows, grandTotals, grandTotal, totalActiveUsers: allActiveUsers.length, month: m, year: y });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ error: 'Failed to fetch monthly summary', details: error.message });
  }
});

// Get users who had NO usage on a specific date — used by ICA Agent Studio workflow
// Query param: date=YYYY-MM-DD
// Returns: [{ id, name, email, scrum_master, track }]
// GET /api/missed-users?date=YYYY-MM-DD
// Now leave-aware: skips people on leave or on a public holiday for their location
app.get('/api/missed-users', async (req, res) => {
  try {
    const { date, leaveAware } = req.query;
    if (!date) return res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
    // leaveAware=false falls back to original behaviour (for debugging)
    const users = leaveAware === 'false'
      ? await dbHelpers.getMissedUsers(date)
      : await dbHelpers.getMissedUsersLeaveAware(date);
    res.json({ date, count: users.length, users });
  } catch (error) {
    console.error('Error fetching missed users:', error);
    res.status(500).json({ error: 'Failed to fetch missed users', details: error.message });
  }
});

// ── Team Members (new full CRUD) ──────────────────────────────────────────────

// GET /api/roster  — full team roster from team_members table
app.get('/api/roster', async (req, res) => {
  try {
    const members = await dbHelpers.getAllTeamMembers();
    res.json(members);
  } catch (err) {
    console.error('GET /api/roster error:', err);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
});

// GET /api/roster/:id
app.get('/api/roster/:id', async (req, res) => {
  try {
    const member = await dbHelpers.getTeamMemberById(parseInt(req.params.id, 10));
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// POST /api/roster  — add a new team member
app.post('/api/roster', async (req, res) => {
  try {
    const { name, email, mobile, stream, role, location, backup_name, backup_email, backup_mobile, status } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const member = await dbHelpers.upsertTeamMember({ name, email, mobile, stream, role, location, backup_name, backup_email, backup_mobile, status: status || 'active' });
    res.status(201).json(member);
  } catch (err) {
    console.error('POST /api/roster error:', err);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// PUT /api/roster/:id  — update a team member
app.put('/api/roster/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const existing = await dbHelpers.getTeamMemberById(id);
    if (!existing) return res.status(404).json({ error: 'Member not found' });
    const updated = await dbHelpers.upsertTeamMember({ ...req.body, id });
    res.json(updated);
  } catch (err) {
    console.error('PUT /api/roster/:id error:', err);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// PATCH /api/roster/:id/status  — change status (active | on_leave | moved_away)
app.patch('/api/roster/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    const valid = ['active', 'on_leave', 'moved_away'];
    if (!valid.includes(status)) return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
    const result = await dbHelpers.setTeamMemberStatus(id, status);
    res.json({ success: true, ...result });
  } catch (err) {
    if (err.message === 'Member not found') return res.status(404).json({ error: 'Member not found' });
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// DELETE /api/roster/:id  — permanently remove a team member
app.delete('/api/roster/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await dbHelpers.deleteTeamMember(id);
    res.json({ success: true, id });
  } catch (err) {
    if (err.message === 'Member not found') return res.status(404).json({ error: 'Member not found' });
    console.error('DELETE /api/roster/:id error:', err);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

// POST /api/upload-team-backup  — upload / re-upload the team backup CSV
app.post('/api/upload-team-backup', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const raw   = fs.readFileSync(req.file.path, 'utf8');
    const lines = raw.split(/\r?\n/).map(l => l.split(',').map(c => c.trim()));
    const members = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (!row[0] || isNaN(parseInt(row[0], 10))) continue;
      const name = row[3]?.trim();
      if (!name) continue;
      members.push({
        name, email: row[4]?.trim()||null, mobile: row[5]?.trim()||null,
        stream: row[1]?.trim()||null, role: row[2]?.trim()||null, location: null,
        backup_name: row[6]?.trim()||null, backup_email: row[7]?.trim()||null,
        backup_mobile: row[8]?.trim()||null, status: 'active',
      });
    }
    const inserted = await dbHelpers.bulkInsertTeamMembers(members);
    fs.unlinkSync(req.file.path);
    res.json({ success: true, inserted, total: members.length });
  } catch (err) {
    console.error('upload-team-backup error:', err);
    if (req.file?.path) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Failed to process team backup CSV' });
  }
});

// ── Leave Records ─────────────────────────────────────────────────────────────

// GET /api/leave?monthYear=2026-06&memberName=John
app.get('/api/leave', async (req, res) => {
  try {
    const { monthYear, memberName, startDate, endDate } = req.query;
    const records = await dbHelpers.getLeaveRecords({ monthYear, memberName, startDate, endDate });
    res.json(records);
  } catch (err) {
    console.error('GET /api/leave error:', err);
    res.status(500).json({ error: 'Failed to fetch leave records' });
  }
});

// GET /api/leave/today  — who is on leave today
app.get('/api/leave/today', async (req, res) => {
  try {
    const today = req.query.date || new Date().toISOString().slice(0, 10);
    const onLeave = await dbHelpers.getMembersOnLeave(today);
    // Enrich with team_member details (backup info)
    const roster = await dbHelpers.getAllTeamMembers();
    const rosterByName = {};
    roster.forEach(m => { rosterByName[m.name.toLowerCase()] = m; });
    const enriched = onLeave.map(l => ({
      ...l,
      member: rosterByName[l.member_name.toLowerCase()] || null,
    }));
    res.json({ date: today, count: enriched.length, members: enriched });
  } catch (err) {
    console.error('GET /api/leave/today error:', err);
    res.status(500).json({ error: 'Failed to fetch today\'s leave' });
  }
});

// POST /api/upload-leave  — upload a monthly leave CSV
// Body params: year, month, snapshot ('start' | 'end')
// If snapshot is not supplied, the server auto-detects:
//   - 'start'  if no leave data exists for that month yet  (first-ever upload)
//   - 'end'    if a 'start' snapshot already exists        (month-close correction)
// Uploading a snapshot replaces only the records for that month+snapshot pair,
// so start and end can coexist independently.
app.post('/api/upload-leave', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const filename = req.file.originalname || req.file.filename;
    let year  = req.body.year  ? parseInt(req.body.year, 10)  : null;
    let month = req.body.month ? parseInt(req.body.month, 10) : null;

    if (!year || !month) {
      const inferred = inferMonthFromFilename(filename);
      if (inferred) { year = inferred.year; month = inferred.month; }
    }
    if (!year || !month) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Could not determine year/month from filename. Pass year and month in the request body.' });
    }

    const monthYear = `${year}-${String(month).padStart(2, '0')}`;

    // ── Auto-detect snapshot type when not explicitly supplied ────────────────
    // Check both the leave_snapshots table AND leave_records (null = legacy start).
    let snapshot = req.body.snapshot;
    if (snapshot !== 'start' && snapshot !== 'end') {
      const snapshotRows = await dbHelpers.getLeaveSnapshots();
      // A real or legacy 'start' exists if leave_snapshots has a start entry OR
      // leave_records has any null-snapshot rows for this month (uploaded before snapshot system).
      const hasRealStart   = snapshotRows.some(s => s.month_year === monthYear && s.snapshot === 'start' && !s.is_legacy);
      const hasLegacyStart = snapshotRows.some(s => s.month_year === monthYear && s.snapshot === 'start' &&  s.is_legacy);
      snapshot = (hasRealStart || hasLegacyStart) ? 'end' : 'start';
    }

    const { members, records } = parseLeaveCSV(req.file.path, year, month);

    // ── Resolve CSV names to canonical roster names ───────────────────────────
    // Uses email (if present in entry) first, then multi-step name fuzzy match.
    // See backend/nameResolver.js for the full priority chain.
    const rosterMembers = await dbHelpers.getAllTeamMembers();
    const memberChanges = resolveAll(members, 'name',        'email', rosterMembers);
    const recordChanges = resolveAll(records, 'member_name', null,    rosterMembers);
    const allChanges = [...memberChanges, ...recordChanges];
    if (allChanges.length) {
      console.log('[upload-leave] Name resolutions:', allChanges.map(c => `"${c.original}" → "${c.resolved}" (${c.method})`).join(', '));
    }

    // Tag each record with the snapshot label
    records.forEach(r => { r.snapshot = snapshot; });

    // Patch team_member locations
    for (const m of members) {
      if (m.location) await dbHelpers.updateTeamMemberLocation(m.name, m.location);
    }

    // ── Delete existing records for this month+snapshot then insert fresh ─────
    // For 'start': also wipe legacy null-snapshot rows so they don't double-count
    // with the new 'start'-tagged rows in getWorkingHours queries.
    await dbHelpers.deleteLeaveRecordsByMonthSnapshot(monthYear, snapshot);
    if (snapshot === 'start') {
      // Migrate / wipe any legacy null-snapshot rows for this month
      await dbHelpers.deleteLeaveRecordsByMonthSnapshot(monthYear, null);
    }
    const inserted = await dbHelpers.bulkInsertLeaveRecords(records);

    // Record snapshot metadata
    await dbHelpers.upsertLeaveSnapshot(monthYear, snapshot, members.length, records.length);

    fs.unlinkSync(req.file.path);
    res.json({
      success: true, monthYear, snapshot, inserted,
      total: records.length, members: members.length,
      namesResolved: allChanges.length,
      resolutions: allChanges,
    });
  } catch (err) {
    console.error('upload-leave error:', err);
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ error: 'Failed to process leave CSV', details: err.message });
  }
});

// POST /api/repair-leave-names
// Scans all leave_records, resolves member_name values to canonical roster names using the same
// email+fuzzy logic as the upload flow, and writes the corrections back to the DB.
// Safe to run multiple times — only updates rows where the name actually changes.
app.post('/api/repair-leave-names', async (req, res) => {
  try {
    const roster = await dbHelpers.getAllTeamMembers();

    // Load all distinct member_name values from leave_records
    const rows = await new Promise((resolve, reject) => {
      db.all('SELECT DISTINCT member_name FROM leave_records', [], (err, r) => {
        if (err) reject(err); else resolve(r);
      });
    });

    const repairs = [];
    for (const row of rows) {
      // resolveAll works on arrays; wrap & unwrap
      const entry = { member_name: row.member_name };
      const changes = resolveAll([entry], 'member_name', null, roster);
      if (changes.length) {
        repairs.push({ from: row.member_name, to: entry.member_name, method: changes[0].method });
      }
    }

    // Apply each rename atomically
    for (const r of repairs) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE leave_records SET member_name = ? WHERE member_name = ?',
          [r.to, r.from],
          function(err) { if (err) reject(err); else resolve(this.changes); }
        );
      });
      console.log(`[repair-leave-names] "${r.from}" → "${r.to}" (${r.method})`);
    }

    res.json({ success: true, repaired: repairs.length, repairs });
  } catch (err) {
    console.error('repair-leave-names error:', err);
    res.status(500).json({ error: 'Repair failed', details: err.message });
  }
});

// GET /api/leave/snapshots  — list months that have uploaded leave data and their snapshot status
app.get('/api/leave/snapshots', async (req, res) => {
  try {
    const snapshots = await dbHelpers.getLeaveSnapshots();
    res.json(snapshots);
  } catch (err) {
    console.error('GET /api/leave/snapshots error:', err);
    res.status(500).json({ error: 'Failed to fetch leave snapshots' });
  }
});

// GET /api/working-hours?monthYear=2026-06
// Returns both 'start' and 'end' snapshot data with per-member holiday deduction.
// hoursPerDay is read from app_settings (key: wh_hoursPerDay_<monthYear>), default 9.
app.get('/api/working-hours', async (req, res) => {
  try {
    const { monthYear } = req.query;
    if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({ error: 'monthYear query param required in YYYY-MM format' });
    }
    // Load custom hoursPerDay for this month (falls back to 9)
    const storedHpd = await dbHelpers.getSetting(`wh_hoursPerDay_${monthYear}`);
    const hoursPerDay = storedHpd ? parseFloat(storedHpd) : 9;

    const [startData, endData] = await Promise.all([
      dbHelpers.getWorkingHours(monthYear, 'start', hoursPerDay),
      dbHelpers.getWorkingHours(monthYear, 'end',   hoursPerDay),
    ]);
    const hasStartData = startData.members.some(m => m.leave_days > 0);
    const hasEndData   = endData.members.some(m => m.leave_days > 0);
    res.json({ monthYear, hoursPerDay, start: startData, end: endData, hasStartData, hasEndData });
  } catch (err) {
    console.error('GET /api/working-hours error:', err);
    res.status(500).json({ error: 'Failed to compute working hours', details: err.message });
  }
});

// PUT /api/working-hours/settings  — save hoursPerDay override for a month
// Body: { monthYear: '2026-07', hoursPerDay: 8 }
app.put('/api/working-hours/settings', async (req, res) => {
  try {
    const { monthYear, hoursPerDay } = req.body;
    if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
      return res.status(400).json({ error: 'monthYear required in YYYY-MM format' });
    }
    const hpd = parseFloat(hoursPerDay);
    if (isNaN(hpd) || hpd <= 0 || hpd > 24) {
      return res.status(400).json({ error: 'hoursPerDay must be a number between 1 and 24' });
    }
    await dbHelpers.setSetting(`wh_hoursPerDay_${monthYear}`, String(hpd));
    res.json({ success: true, monthYear, hoursPerDay: hpd });
  } catch (err) {
    console.error('PUT /api/working-hours/settings error:', err);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

// ── Holidays ──────────────────────────────────────────────────────────────────

// GET /api/holidays?location=Bangalore&startDate=2026-01-01&endDate=2026-12-31
app.get('/api/holidays', async (req, res) => {
  try {
    const { location, startDate, endDate } = req.query;
    const holidays = await dbHelpers.getHolidays({ location, startDate, endDate });
    res.json(holidays);
  } catch (err) {
    console.error('GET /api/holidays error:', err);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// POST /api/upload-holidays  — upload / replace the holiday list CSV
app.post('/api/upload-holidays', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const holidays = parseHolidayCSV(req.file.path);
    await dbHelpers.clearHolidays();
    const inserted = await dbHelpers.bulkInsertHolidays(holidays);
    fs.unlinkSync(req.file.path);
    res.json({ success: true, inserted, total: holidays.length });
  } catch (err) {
    console.error('upload-holidays error:', err);
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ error: 'Failed to process holidays CSV', details: err.message });
  }
});

// ── Legacy team-members route (kept for backward compat with TeamManager component) ──
app.get('/api/team-members', async (req, res) => {
  try {
    const members = await dbHelpers.getAllTeamMembers();
    res.json(members);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Update a user's active status (online = active on project, offline = left/on leave)
app.patch('/api/users/:id/status', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { is_active } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    if (is_active === undefined || is_active === null) {
      return res.status(400).json({ error: 'is_active (boolean) is required in the request body' });
    }

    const updated = await dbHelpers.setUserActiveStatus(userId, Boolean(is_active));
    res.json({ success: true, ...updated });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// ── App Settings ─────────────────────────────────────────────────────────────
// GET /api/settings/:key  — retrieve a stored setting
app.get('/api/settings/:key', async (req, res) => {
  try {
    const value = await dbHelpers.getSetting(req.params.key);
    res.json({ key: req.params.key, value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// POST /api/settings/:key  — upsert a setting
app.post('/api/settings/:key', async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'value is required in the request body' });
    }
    const saved = await dbHelpers.setSetting(req.params.key, String(value));
    res.json({ success: true, ...saved });
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

// GET /api/last-week-heavy-missers — users who missed > 2 days last Mon-Fri
// Returns: { weekStart, weekEnd, count, users: [{name, email, days_missed}] }
app.get('/api/last-week-heavy-missers', async (req, res) => {
  try {
    // Compute last Mon–Fri in LOCAL server time (toISOString would shift to UTC
    // and give the wrong date in timezones ahead of UTC, e.g. IST UTC+5:30).
    const toLocalDateStr = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun,1=Mon,...,6=Sat
    // Days since last Monday (local): Mon=0, Tue=1, ..., Sun=6
    const daysSinceMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysSinceMon - 7);
    const lastFriday = new Date(lastMonday);
    lastFriday.setDate(lastMonday.getDate() + 4);

    const weekStart = toLocalDateStr(lastMonday);
    const weekEnd   = toLocalDateStr(lastFriday);

    const users = await dbHelpers.getHeavyMissers(weekStart, weekEnd, 2);
    res.json({ weekStart, weekEnd, count: users.length, users });
  } catch (error) {
    console.error('Error fetching last-week heavy missers:', error);
    res.status(500).json({ error: 'Failed to fetch last-week heavy missers', details: error.message });
  }
});

// GET /api/debug-heavy-missers — diagnose why last-week heavy missers might be empty
// Hit this in the browser: http://localhost:5000/api/debug-heavy-missers
app.get('/api/debug-heavy-missers', async (req, res) => {
  try {
    const toLocalDateStr = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysSinceMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysSinceMon - 7);
    const lastFriday = new Date(lastMonday);
    lastFriday.setDate(lastMonday.getDate() + 4);
    const weekStart = toLocalDateStr(lastMonday);
    const weekEnd   = toLocalDateStr(lastFriday);

    // All distinct dates stored in the DB
    const allDates = await new Promise((resolve, reject) =>
      db.all('SELECT DISTINCT date FROM usage_records ORDER BY date DESC LIMIT 40', [], (e, r) => e ? reject(e) : resolve(r))
    );

    // Dates that fall within the computed last-week range
    const datesInRange = await new Promise((resolve, reject) =>
      db.all('SELECT DISTINCT date, COUNT(*) as rows FROM usage_records WHERE date BETWEEN ? AND ? GROUP BY date', [weekStart, weekEnd], (e, r) => e ? reject(e) : resolve(r))
    );

    // Run the actual heavy-missers query
    const heavyMissers = await dbHelpers.getHeavyMissers(weekStart, weekEnd, 2);

    // All active users
    const activeUsers = await new Promise((resolve, reject) =>
      db.all('SELECT id, name, email FROM users WHERE is_active = 1 ORDER BY name', [], (e, r) => e ? reject(e) : resolve(r))
    );

    res.json({
      serverTime: today.toString(),
      serverLocalDate: toLocalDateStr(today),
      computedWeekStart: weekStart,
      computedWeekEnd: weekEnd,
      last40DatesInDB: allDates.map(r => r.date),
      datesFoundInRange: datesInRange,
      activeUserCount: activeUsers.length,
      activeUsers,
      heavyMissersResult: heavyMissers,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/teams-notify  — post a reminder card to a Teams channel via Incoming Webhook
// Body: { webhookUrl, date, users: [{name, email}], lastWeekMissers?: [{name, email, days_missed}] }
app.post('/api/teams-notify', async (req, res) => {
  try {
    const { webhookUrl, date, users, lastWeekMissers } = req.body;

    if (!webhookUrl || !date || !Array.isArray(users)) {
      return res.status(400).json({ error: 'webhookUrl, date and users[] are required' });
    }
    if (users.length === 0) {
      return res.status(400).json({ error: 'users array is empty — no one to remind' });
    }

    // lastWeekMissers is optional — only included on Mondays
    const hasLastWeek = Array.isArray(lastWeekMissers) && lastWeekMissers.length > 0;

    // Detect webhook type so we can send the right payload format
    const isPowerAutomate = /powerplatform\.com|powerautomate/i.test(webhookUrl);
    const isOfficeConnector = /webhook\.office\.com/i.test(webhookUrl);
    const isLogicApps = /logic\.azure\.com/i.test(webhookUrl);

    // Validate: must be one of the three known Teams/Power Platform webhook shapes
    if (!isPowerAutomate && !isOfficeConnector && !isLogicApps) {
      return res.status(400).json({ error: 'webhookUrl does not look like a valid Teams Incoming Webhook, Workflows, or Power Automate URL' });
    }

    // ── Build the payload ──────────────────────────────────────────────────────
    // Power Automate "Send webhook alerts to a channel" template routes the
    // incoming body straight into "Post card in a chat or channel" which requires
    // a valid Adaptive Card with "type":"AdaptiveCard".
    // Office Connector / Logic Apps use the older MessageCard format instead.

    // Shared: build the member rows for the Adaptive Card FactSet
    const factRows = users.map(u => ({ title: u.name, value: '' }));
    const plural = users.length !== 1;

    // Build the Adaptive Card body — start with today's missed users
    const adaptiveBody = [
      {
        "type": "TextBlock",
        "text": `ICA Usage Reminder - ${date}`,
        "weight": "Bolder",
        "size": "Medium",
        "color": "Warning",
        "wrap": true
      },
      {
        "type": "TextBlock",
        "text": `${users.length} team member${plural ? 's' : ''} ${plural ? 'have' : 'has'} not yet used ICA today.`,
        "wrap": true,
        "spacing": "Small"
      },
      {
        "type": "FactSet",
        "facts": factRows,
        "spacing": "Medium"
      },
      {
        "type": "TextBlock",
        "text": "Please log in and use ICA to keep the team's usage data up to date. Thank you!",
        "wrap": true,
        "spacing": "Medium",
        "isSubtle": true
      }
    ];

    // On Mondays: append last-week persistent missers section (missed >= 2 days)
    if (hasLastWeek) {
      adaptiveBody.push(
        {
          "type": "TextBlock",
          "text": "Last Week - Persistent Non-Users (missed 2+ days)",
          "weight": "Bolder",
          "size": "Small",
          "color": "Attention",
          "wrap": true,
          "spacing": "Large",
          "separator": true
        },
        {
          "type": "FactSet",
          "facts": lastWeekMissers.map(u => ({
            title: u.name,
            value: `${u.days_missed} day${u.days_missed !== 1 ? 's' : ''} missed`
          })),
          "spacing": "Small"
        }
      );
    }

    // Adaptive Card (required by Power Automate "Post card" action)
    const adaptiveCard = {
      "type": "AdaptiveCard",
      "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
      "version": "1.4",
      "body": adaptiveBody,
      "actions": [
        {
          "type": "Action.OpenUrl",
          "title": "Open ICA Now",
          "url": "https://remea.ica.ibm.com/ica/launchpad/teams/6960ac7f62128d5938d46839"
        }
      ]
    };

    let card;
    if (isPowerAutomate) {
      // Power Automate "Send webhook alerts to a channel" template expects the
      // body to contain an "attachments" array with the Adaptive Card as a string.
      card = {
        "type": "message",
        "attachments": [
          {
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": adaptiveCard
          }
        ]
      };
    } else {
      // MessageCard format — works for both *.webhook.office.com and prod-*.logic.azure.com
      const nameList = users.map(u => `• ${u.name}`).join('\n');
      let messageText = `Hi team, the following member${plural ? 's' : ''} have not yet used ICA (IBM Consulting Assistant) today (${date}):\n\n${nameList}\n\nPlease log in at https://remea.ica.ibm.com/ica/launchpad/teams/6960ac7f62128d5938d46839 and use ICA. Thank you!`;

      if (hasLastWeek) {
        const lastWeekList = lastWeekMissers.map(u =>
          `• ${u.name} — ${u.days_missed} day${u.days_missed !== 1 ? 's' : ''} missed`
        ).join('\n');
        messageText += `\n\n---\nLast Week - Persistent Non-Users (missed 2+ days):\n\n${lastWeekList}`;
      }

      card = {
        "@type":      "MessageCard",
        "@context":   "http://schema.org/extensions",
        "themeColor": "F59E0B",
        "summary":    `ICA Reminder — ${users.length} member${plural ? 's' : ''} missed ICA on ${date}`,
        "sections": [
          {
            "activityTitle":    `ICA Usage Reminder - ${date}`,
            "activitySubtitle": `${users.length} team member${plural ? 's' : ''} haven't used ICA today`,
            "facts": users.map(u => ({ name: u.name, value: '' })),
            "text": messageText,
            "markdown": true
          }
        ],
        "potentialAction": [
          {
            "@type":  "OpenUri",
            "name":   "Open ICA Now",
            "targets": [{ "os": "default", "uri": "https://remea.ica.ibm.com/ica/launchpad/teams/6960ac7f62128d5938d46839" }]
          }
        ]
      };
    }

    // Post to Teams webhook using built-in https module (no extra dependency)
    await new Promise((resolve, reject) => {
      const payload = JSON.stringify(card);
      const url = new URL(webhookUrl);
      const options = {
        hostname: url.hostname,
        path:     url.pathname + url.search,
        method:   'POST',
        headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      };
      const reqHttp = https.request(options, (resp) => {
        let data = '';
        resp.on('data', chunk => { data += chunk; });
        resp.on('end', () => {
          if (resp.statusCode >= 200 && resp.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Teams webhook returned ${resp.statusCode}: ${data}`));
          }
        });
      });
      reqHttp.on('error', reject);
      reqHttp.write(payload);
      reqHttp.end();
    });

    res.json({ success: true, message: `Reminder posted to Teams for ${users.length} user${users.length !== 1 ? 's' : ''}` });
  } catch (error) {
    console.error('Error posting to Teams:', error);
    const isWebhookErr = error.message?.startsWith('Teams webhook returned');
    res.status(isWebhookErr ? 502 : 500).json({ error: isWebhookErr ? error.message : 'Failed to post Teams notification', details: error.message });
  }
});

// Clear all data (for testing/re-import)
app.delete('/api/clear-data', async (req, res) => {
  try {
    await dbHelpers.clearAllData();
    res.json({ success: true, message: 'All data cleared successfully' });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

// GET /api/coverage?date=YYYY-MM-DD  — who is out and is their backup also out?
app.get('/api/coverage', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const [onLeave, roster, holidays] = await Promise.all([
      dbHelpers.getMembersOnLeave(date),
      dbHelpers.getAllTeamMembers(),
      dbHelpers.getHolidays({ startDate: date, endDate: date }),
    ]);

    const onLeaveNames = new Set(onLeave.map(l => l.member_name.toLowerCase()));

    // Also add people on holiday for their location
    const rosterMap = {};
    roster.forEach(m => { rosterMap[m.name.toLowerCase()] = m; });

    holidays.forEach(h => {
      const holidayLocs = new Set(h.locations.map(l => l.toLowerCase()));
      roster.forEach(m => {
        const loc = (m.location || '').toLowerCase();
        if (h.is_national || (loc && holidayLocs.has(loc))) {
          onLeaveNames.add(m.name.toLowerCase());
        }
      });
    });

    // Build coverage map
    const coverage = roster
      .filter(m => m.status === 'active')
      .map(m => {
        const isOut      = onLeaveNames.has(m.name.toLowerCase());
        const backupOut  = m.backup_name ? onLeaveNames.has(m.backup_name.toLowerCase()) : null;
        return {
          id:            m.id,
          name:          m.name,
          stream:        m.stream,
          role:          m.role,
          location:      m.location,
          status:        isOut ? 'absent' : 'present',
          backup_name:   m.backup_name || null,
          backup_email:  m.backup_email || null,
          backup_mobile: m.backup_mobile || null,
          backup_status: backupOut === null ? null : (backupOut ? 'absent' : 'present'),
          coverage_gap:  isOut && backupOut === true,
        };
      });

    const gaps = coverage.filter(c => c.coverage_gap);
    res.json({ date, coverage, coverage_gaps: gaps, absent_count: [...onLeaveNames].length });
  } catch (err) {
    console.error('GET /api/coverage error:', err);
    res.status(500).json({ error: 'Failed to compute coverage' });
  }
});

// ── Catch-all: send React app for any non-API route (client-side routing) ────
if (IS_PROD && fs.existsSync(FRONTEND_BUILD)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_BUILD, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`\n  ICA Weekly Report Application`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Mode   : ${IS_PROD ? 'production' : 'development'}`);
  console.log(`  URL    : http://localhost:${PORT}`);
  if (IS_PROD) console.log(`  App    : http://localhost:${PORT}  (open this in your browser)`);
  else         console.log(`  API    : http://localhost:${PORT}/api`);
  console.log('');
});

// Made with Bob
