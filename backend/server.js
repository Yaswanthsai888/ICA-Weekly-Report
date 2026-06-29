require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { db, dbHelpers } = require('./database');
const { parseCSV } = require('./csvParser');
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

    const usage = await dbHelpers.getUsageByDateRange(firstDay, lastDay);

    if (usage.length === 0) {
      return res.json({ weeks: [], users: [], rows: [], grandTotals: {} });
    }

    // Collect all unique week-start dates (Monday-based) within the range
    const weekStartSet = new Set();
    usage.forEach(record => {
      const d = new Date(record.date);
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      weekStartSet.add(format(ws, 'yyyy-MM-dd'));
    });
    const weeks = Array.from(weekStartSet).sort();

    // Build per-user, per-week counts
    const userMap = {};   // email → { name, weekCounts: { weekStart: count } }
    usage.forEach(record => {
      const ws = format(startOfWeek(new Date(record.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (!userMap[record.email]) {
        userMap[record.email] = { name: record.name, email: record.email, weekCounts: {} };
      }
      userMap[record.email].weekCounts[ws] = (userMap[record.email].weekCounts[ws] || 0) + 1;
    });

    // Build sorted rows with grand total per user
    const rows = Object.values(userMap)
      .map(u => {
        const total = Object.values(u.weekCounts).reduce((s, v) => s + v, 0);
        return { name: u.name, email: u.email, weekCounts: u.weekCounts, total };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    // Column grand totals
    const grandTotals = {};
    let grandTotal = 0;
    weeks.forEach(ws => {
      grandTotals[ws] = rows.reduce((s, r) => s + (r.weekCounts[ws] || 0), 0);
      grandTotal += grandTotals[ws];
    });

    res.json({ weeks, rows, grandTotals, grandTotal, month: m, year: y });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({ error: 'Failed to fetch monthly summary', details: error.message });
  }
});

// Get users who had NO usage on a specific date — used by ICA Agent Studio workflow
// Query param: date=YYYY-MM-DD
// Returns: [{ id, name, email, scrum_master, track }]
app.get('/api/missed-users', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'date query parameter is required (YYYY-MM-DD)' });
    }
    // Basic validation: YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
    }
    const users = await dbHelpers.getMissedUsers(date);
    res.json({ date, count: users.length, users });
  } catch (error) {
    console.error('Error fetching missed users:', error);
    res.status(500).json({ error: 'Failed to fetch missed users', details: error.message });
  }
});

// Get all team members with their active/inactive status
app.get('/api/team-members', async (req, res) => {
  try {
    const members = await dbHelpers.getTeamMembers();
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
    const factRows = users.map(u => ({ title: u.name, value: u.email }));
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
          "facts": lastWeekMissers.map(u => {
            const dates = Array.isArray(u.missed_dates) && u.missed_dates.length
              ? u.missed_dates.join(', ')
              : `${u.days_missed} day${u.days_missed !== 1 ? 's' : ''}`;
            return { title: u.name, value: `Missed: ${dates}` };
          }),
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
      const nameList = users.map(u => `• ${u.name} (${u.email})`).join('\n');
      let messageText = `Hi team, the following member${plural ? 's' : ''} have not yet used ICA (IBM Consulting Assistant) today (${date}):\n\n${nameList}\n\nPlease log in at https://remea.ica.ibm.com/ica/launchpad/teams/6960ac7f62128d5938d46839 and use ICA. Thank you!`;

      if (hasLastWeek) {
        const lastWeekList = lastWeekMissers.map(u => {
          const dates = Array.isArray(u.missed_dates) && u.missed_dates.length
            ? u.missed_dates.join(', ')
            : `${u.days_missed} day${u.days_missed !== 1 ? 's' : ''} missed`;
          return `• ${u.name} — Missed: ${dates}`;
        }).join('\n');
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
            "facts": users.map(u => ({ name: u.name, value: u.email })),
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
