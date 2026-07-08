const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Initialize SQLite database
// DB_PATH env var lets the cloud host (Railway, Azure, etc.) redirect the file
// to a persistent volume mount (e.g. /data/ica_usage.db).
// Falls back to the local __dirname location for development.
const dbPath = process.env.DB_PATH || path.join(__dirname, 'ica_usage.db');

// Ensure the parent directory exists (required when using a volume mount like
// /data/ica_usage.db — the directory must exist before SQLite can open the file)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
  // ── ICA: Users table ─────────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      scrum_master TEXT,
      track TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: add is_active column if the DB already existed without it
  db.run(`ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`, () => {});

  // ── ICA: Usage records table ──────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS usage_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      assistant_name TEXT NOT NULL,
      row_number INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, date, assistant_name, row_number)
    )
  `);

  // ── App settings table (key/value store) ─────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Team members table ────────────────────────────────────────────────────
  // Central roster. backup_id is a self-referencing FK to another team_member.
  db.run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      email       TEXT,
      mobile      TEXT,
      stream      TEXT,
      role        TEXT,
      location    TEXT,
      backup_id   INTEGER,
      backup_name TEXT,
      backup_email TEXT,
      backup_mobile TEXT,
      status      TEXT NOT NULL DEFAULT 'active',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Leave records table ───────────────────────────────────────────────────
  // One row per person per day they are absent.
  // leave_type: 'vacation' | 'sick' | 'holiday'
  // source:     'upload' | 'manual'
  // snapshot:   'start' | 'end' | null  — which monthly CSV upload this came from
  db.run(`
    CREATE TABLE IF NOT EXISTS leave_records (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id   INTEGER,
      member_name TEXT NOT NULL,
      leave_date  TEXT NOT NULL,
      leave_type  TEXT NOT NULL DEFAULT 'vacation',
      month_year  TEXT,
      source      TEXT NOT NULL DEFAULT 'upload',
      snapshot    TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(member_name, leave_date, leave_type, snapshot)
    )
  `);

  // Migration: add snapshot column if the DB already existed without it
  db.run(`ALTER TABLE leave_records ADD COLUMN snapshot TEXT`, () => {});

  // ── Leave snapshots tracking table ───────────────────────────────────────
  // Tracks when a start-of-month or end-of-month CSV was uploaded for a month.
  db.run(`
    CREATE TABLE IF NOT EXISTS leave_snapshots (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      month_year  TEXT NOT NULL,
      snapshot    TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      member_count INTEGER DEFAULT 0,
      leave_days   INTEGER DEFAULT 0,
      UNIQUE(month_year, snapshot)
    )
  `);

  // ── Public holidays table ─────────────────────────────────────────────────
  // locations stores a JSON array of city names the holiday applies to.
  db.run(`
    CREATE TABLE IF NOT EXISTS holidays (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      holiday_date TEXT NOT NULL,
      name         TEXT NOT NULL,
      locations    TEXT NOT NULL DEFAULT '[]',
      is_national  INTEGER NOT NULL DEFAULT 0,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(holiday_date, name)
    )
  `);

  // ── Indexes ───────────────────────────────────────────────────────────────
  db.run(`CREATE INDEX IF NOT EXISTS idx_usage_date       ON usage_records(date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_usage_user       ON usage_records(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_usage_assistant  ON usage_records(assistant_name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_leave_date       ON leave_records(leave_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_leave_member     ON leave_records(member_name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_holiday_date     ON holidays(holiday_date)`);
});

// Database helper functions
const dbHelpers = {
  // Get or create user
  getOrCreateUser: (userData) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE email = ?',
        [userData.email],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve(row);
          } else {
            db.run(
              'INSERT INTO users (name, email, scrum_master, track) VALUES (?, ?, ?, ?)',
              [userData.name, userData.email, userData.scrum_master, userData.track],
              function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, ...userData });
              }
            );
          }
        }
      );
    });
  },

  // Insert usage record — resolves with { isNew: bool, ...record }
  // SQLite's INSERT OR REPLACE deletes the old row and inserts a new one when
  // a conflict occurs, so lastID is always set.  We detect "new" by checking
  // whether a row with that key existed BEFORE the insert.
  insertUsageRecord: (record) => {
    return new Promise((resolve, reject) => {
      // First check if the record already exists
      db.get(
        `SELECT id FROM usage_records WHERE user_id=? AND date=? AND assistant_name=? AND row_number=?`,
        [record.user_id, record.date, record.assistant_name, record.row_number],
        (err, existing) => {
          if (err) return reject(err);
          db.run(
            `INSERT OR REPLACE INTO usage_records (user_id, date, assistant_name, row_number)
             VALUES (?, ?, ?, ?)`,
            [record.user_id, record.date, record.assistant_name, record.row_number],
            function(err2) {
              if (err2) reject(err2);
              else resolve({ id: this.lastID, isNew: !existing, ...record });
            }
          );
        }
      );
    });
  },

  // Get all users
  getAllUsers: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM users ORDER BY name', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Get all team members with their active status
  getTeamMembers: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM users ORDER BY name', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  // Set a user's active status (1 = online/active, 0 = offline/inactive)
  setUserActiveStatus: (userId, isActive) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET is_active = ? WHERE id = ?',
        [isActive ? 1 : 0, userId],
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) reject(new Error('User not found'));
          else resolve({ id: userId, is_active: isActive ? 1 : 0 });
        }
      );
    });
  },

  // Get usage records by date range
  getUsageByDateRange: (startDate, endDate) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT ur.*, u.name, u.email 
         FROM usage_records ur 
         JOIN users u ON ur.user_id = u.id 
         WHERE ur.date BETWEEN ? AND ? 
         ORDER BY ur.date, u.name`,
        [startDate, endDate],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Get usage by user
  getUsageByUser: (userId, startDate, endDate) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM usage_records 
         WHERE user_id = ? AND date BETWEEN ? AND ? 
         ORDER BY date`,
        [userId, startDate, endDate],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Get assistant usage statistics
  getAssistantStats: (startDate, endDate) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT assistant_name, COUNT(*) as usage_count, COUNT(DISTINCT user_id) as user_count
         FROM usage_records 
         WHERE date BETWEEN ? AND ? 
         GROUP BY assistant_name 
         ORDER BY usage_count DESC`,
        [startDate, endDate],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Get weekly summary
  getWeeklySummary: (startDate, endDate) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           u.name,
           u.email,
           COUNT(DISTINCT ur.date) as days_used,
           COUNT(*) as total_assistants_used,
           COUNT(DISTINCT ur.assistant_name) as unique_assistants
         FROM users u
         LEFT JOIN usage_records ur ON u.id = ur.user_id 
           AND ur.date BETWEEN ? AND ?
         GROUP BY u.id, u.name, u.email
         ORDER BY u.name`,
        [startDate, endDate],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Get users who had NO usage on a specific date (missed that day)
  // Only includes ACTIVE users (is_active = 1) — inactive/offline members are excluded
  // Returns: [{ id, name, email, scrum_master, track }]
  getMissedUsers: (date) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id, u.name, u.email, u.scrum_master, u.track
         FROM users u
         WHERE u.is_active = 1
           AND u.id NOT IN (
             SELECT DISTINCT ur.user_id
             FROM usage_records ur
             WHERE ur.date = ?
           )
         ORDER BY u.name`,
        [date],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Get a setting by key
  getSetting: (key) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT value FROM app_settings WHERE key = ?', [key], (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.value : null);
      });
    });
  },

  // Set (upsert) a setting
  setSetting: (key, value) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [key, value],
        function(err) {
          if (err) reject(err);
          else resolve({ key, value });
        }
      );
    });
  },

  // Get active users who missed 2 OR MORE working days in a given date range.
  // Returns: [{ id, name, email, scrum_master, track, days_missed, missed_dates[] }]
  getHeavyMissers: (startDate, endDate, minDaysMissed = 2) => {
    return new Promise((resolve, reject) => {
      // Step 1: get users + their miss count, excluding header/placeholder rows
      db.all(
        `SELECT u.id, u.name, u.email, u.scrum_master, u.track,
                (SELECT COUNT(DISTINCT d.date)
                 FROM usage_records d
                 WHERE d.date BETWEEN ? AND ?
                   AND u.id NOT IN (
                     SELECT DISTINCT ur2.user_id
                     FROM usage_records ur2
                     WHERE ur2.date = d.date
                   )
                ) AS days_missed
         FROM users u
         WHERE u.is_active = 1
           AND LOWER(u.email) != 'email'
         GROUP BY u.id, u.name, u.email, u.scrum_master, u.track
         HAVING days_missed >= ?
         ORDER BY days_missed DESC, u.name`,
        [startDate, endDate, minDaysMissed],
        (err, rows) => {
          if (err) return reject(err);
          if (rows.length === 0) return resolve([]);

          // Step 2: get all active dates in the range (dates at least one person used ICA)
          db.all(
            `SELECT DISTINCT date FROM usage_records WHERE date BETWEEN ? AND ? ORDER BY date`,
            [startDate, endDate],
            (e2, dateRows) => {
              if (e2) return reject(e2);
              const activeDates = dateRows.map(r => r.date);

              // Step 3: for each misser, find which of those dates they did NOT use ICA
              const results = rows.map(u => ({ ...u, missed_dates: [] }));
              let pending = results.length;

              results.forEach((u, idx) => {
                db.all(
                  `SELECT DISTINCT date FROM usage_records WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date`,
                  [u.id, startDate, endDate],
                  (e3, usedRows) => {
                    if (e3) return reject(e3);
                    const usedSet = new Set(usedRows.map(r => r.date));
                    results[idx].missed_dates = activeDates.filter(d => !usedSet.has(d));
                    if (--pending === 0) resolve(results);
                  }
                );
              });
            }
          );
        }
      );
    });
  },

  // Clear all data (for re-import)
  clearAllData: () => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('DELETE FROM usage_records', (err) => { if (err) reject(err); });
        db.run('DELETE FROM users', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  },

  // ── Team Members ────────────────────────────────────────────────────────────

  getAllTeamMembers: () => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM team_members ORDER BY stream, name`, [], (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
  },

  getTeamMemberById: (id) => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM team_members WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err); else resolve(row || null);
      });
    });
  },

  upsertTeamMember: (m) => {
    return new Promise((resolve, reject) => {
      if (m.id) {
        db.run(
          `UPDATE team_members SET
            name=?, email=?, mobile=?, stream=?, role=?, location=?,
            backup_name=?, backup_email=?, backup_mobile=?,
            status=?, updated_at=CURRENT_TIMESTAMP
           WHERE id=?`,
          [m.name, m.email||null, m.mobile||null, m.stream||null, m.role||null,
           m.location||null, m.backup_name||null, m.backup_email||null,
           m.backup_mobile||null, m.status||'active', m.id],
          function(err) { if (err) reject(err); else resolve({ id: m.id, ...m }); }
        );
      } else {
        db.run(
          `INSERT INTO team_members
            (name, email, mobile, stream, role, location, backup_name, backup_email, backup_mobile, status)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [m.name, m.email||null, m.mobile||null, m.stream||null, m.role||null,
           m.location||null, m.backup_name||null, m.backup_email||null,
           m.backup_mobile||null, m.status||'active'],
          function(err) { if (err) reject(err); else resolve({ id: this.lastID, ...m }); }
        );
      }
    });
  },

  setTeamMemberStatus: (id, status) => {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE team_members SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [status, id],
        function(err) {
          if (err) reject(err);
          else if (this.changes === 0) reject(new Error('Member not found'));
          else resolve({ id, status });
        }
      );
    });
  },

  // Bulk insert team members — skips duplicates by name
  bulkInsertTeamMembers: (members) => {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO team_members
          (name, email, mobile, stream, role, location, backup_name, backup_email, backup_mobile, status)
         VALUES (?,?,?,?,?,?,?,?,?,?)`
      );
      let inserted = 0;
      db.serialize(() => {
        members.forEach(m => {
          stmt.run(
            [m.name, m.email||null, m.mobile||null, m.stream||null, m.role||null,
             m.location||null, m.backup_name||null, m.backup_email||null,
             m.backup_mobile||null, m.status||'active'],
            (err) => { if (!err) inserted++; }
          );
        });
        stmt.finalize((err) => { if (err) reject(err); else resolve(inserted); });
      });
    });
  },

  // Hard-delete a team member by id
  deleteTeamMember: (id) => {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM team_members WHERE id = ?`, [id], function(err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error('Member not found'));
        else resolve({ id });
      });
    });
  },

  // Update location for a team member by name (used when parsing leave CSV)
  updateTeamMemberLocation: (name, location) => {
    return new Promise((resolve) => {
      db.run(
        `UPDATE team_members SET location=?, updated_at=CURRENT_TIMESTAMP
         WHERE UPPER(name) = UPPER(?)`,
        [location, name],
        () => resolve()
      );
    });
  },

  // ── Leave Records ────────────────────────────────────────────────────────────

  getLeaveRecords: ({ monthYear, memberName, startDate, endDate } = {}) => {
    return new Promise((resolve, reject) => {
      let sql = `SELECT * FROM leave_records WHERE 1=1`;
      const params = [];
      if (monthYear)  { sql += ` AND month_year = ?`;                params.push(monthYear); }
      if (memberName) { sql += ` AND UPPER(member_name) = UPPER(?)`; params.push(memberName); }
      if (startDate)  { sql += ` AND leave_date >= ?`;               params.push(startDate); }
      if (endDate)    { sql += ` AND leave_date <= ?`;               params.push(endDate); }
      sql += ` ORDER BY leave_date, member_name`;
      db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
    });
  },

  getMembersOnLeave: (date) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT DISTINCT member_name, leave_type FROM leave_records WHERE leave_date = ?`,
        [date],
        (err, rows) => { if (err) reject(err); else resolve(rows); }
      );
    });
  },

  bulkInsertLeaveRecords: (records) => {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO leave_records
          (member_name, leave_date, leave_type, month_year, source, snapshot)
         VALUES (?,?,?,?,?,?)`
      );
      let inserted = 0;
      db.serialize(() => {
        records.forEach(r => {
          stmt.run(
            [r.member_name, r.leave_date, r.leave_type||'vacation', r.month_year||null, r.source||'upload', r.snapshot||null],
            (err) => { if (!err) inserted++; }
          );
        });
        stmt.finalize((err) => { if (err) reject(err); else resolve(inserted); });
      });
    });
  },

  deleteLeaveRecordsByMonthSnapshot: (monthYear, snapshot) => {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM leave_records WHERE month_year = ? AND snapshot = ?`,
        [monthYear, snapshot],
        function(err) { if (err) reject(err); else resolve(this.changes); }
      );
    });
  },

  deleteLeaveRecordsByMonth: (monthYear) => {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM leave_records WHERE month_year = ?`, [monthYear], function(err) {
        if (err) reject(err); else resolve(this.changes);
      });
    });
  },

  upsertLeaveSnapshot: (monthYear, snapshot, memberCount, leaveDays) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO leave_snapshots (month_year, snapshot, member_count, leave_days, uploaded_at)
         VALUES (?,?,?,?, CURRENT_TIMESTAMP)
         ON CONFLICT(month_year, snapshot) DO UPDATE SET
           member_count = excluded.member_count,
           leave_days   = excluded.leave_days,
           uploaded_at  = CURRENT_TIMESTAMP`,
        [monthYear, snapshot, memberCount, leaveDays],
        (err) => { if (err) reject(err); else resolve(); }
      );
    });
  },

  getLeaveSnapshots: () => {
    return new Promise((resolve, reject) => {
      // Return rows from leave_snapshots (new system) PLUS synthesise 'start' entries
      // for months that only exist in leave_records with NULL snapshot (legacy uploads).
      db.all(`SELECT * FROM leave_snapshots ORDER BY month_year DESC, snapshot ASC`, [], (err, rows) => {
        if (err) return reject(err);

        // Find months in leave_records that have no entry in leave_snapshots at all
        db.all(
          `SELECT month_year, COUNT(*) as leave_days
           FROM leave_records
           WHERE month_year IS NOT NULL AND (snapshot IS NULL OR snapshot = 'start')
           GROUP BY month_year`,
          [],
          (err2, legacyRows) => {
            if (err2) return reject(err2);

            const snappedMonths = new Set(rows.map(r => r.month_year + '|' + r.snapshot));
            const synthetic = [];
            legacyRows.forEach(r => {
              // Only add a synthetic 'start' if no real 'start' entry exists yet
              if (!snappedMonths.has(r.month_year + '|start')) {
                synthetic.push({
                  id: null,
                  month_year: r.month_year,
                  snapshot: 'start',
                  uploaded_at: null,   // legacy — no timestamp
                  member_count: null,
                  leave_days: r.leave_days,
                  is_legacy: true,
                });
              }
            });

            resolve([...rows, ...synthetic].sort((a, b) =>
              b.month_year.localeCompare(a.month_year) || a.snapshot.localeCompare(b.snapshot)
            ));
          }
        );
      });
    });
  },

  /**
   * getWorkingHours(monthYear, snapshot, hoursPerDay)
   * Returns per-member working hours for a given month and snapshot.
   * Logic:
   *   - Count total weekdays in the month (Mon–Fri)
   *   - Deduct public holidays per member based on their location
   *   - Deduct leave days (vacation + sick) from the snapshot
   *   - working_hours = (weekdays − holidayDays − leaveDays) × hoursPerDay
   */
  getWorkingHours: (monthYear, snapshot, hoursPerDay = 9) => {
    return new Promise((resolve, reject) => {
      const [yr, mo] = monthYear.split('-').map(Number);
      const startDate = `${monthYear}-01`;
      const daysInMonth = new Date(yr, mo, 0).getDate();
      const endDate   = `${monthYear}-${String(daysInMonth).padStart(2,'0')}`;

      // 1. Team members
      db.all(`SELECT * FROM team_members WHERE status != 'moved_away' ORDER BY name`, [], (err, teamRows) => {
        if (err) return reject(err);

        // 2. Leave days for this month + snapshot
        let snapFilter, snapParams;
        if (snapshot === 'end') {
          snapFilter = ` AND snapshot = 'end'`;
          snapParams = [monthYear];
        } else {
          snapFilter = ` AND (snapshot IS NULL OR snapshot = 'start')`;
          snapParams = [monthYear];
        }
        db.all(
          `SELECT member_name, COUNT(*) as leave_days
           FROM leave_records WHERE month_year = ?${snapFilter}
           GROUP BY member_name`,
          snapParams,
          (err2, leaveRows) => {
            if (err2) return reject(err2);

            // 3. Public holidays in this month
            db.all(
              `SELECT * FROM holidays WHERE holiday_date >= ? AND holiday_date <= ?`,
              [startDate, endDate],
              (err3, holidayRows) => {
                if (err3) return reject(err3);

                // Parse holiday locations
                const holidays = holidayRows.map(h => ({
                  date: h.holiday_date,
                  is_national: h.is_national === 1,
                  locations: JSON.parse(h.locations || '[]').map(l => l.toLowerCase()),
                }));

                // Compute total weekdays in the month
                let totalWeekdays = 0;
                for (let d = 1; d <= daysInMonth; d++) {
                  const dow = new Date(yr, mo - 1, d).getDay();
                  if (dow !== 0 && dow !== 6) totalWeekdays++;
                }

                // Count national holidays (apply to everyone)
                const nationalHolidayDates = new Set(
                  holidays.filter(h => h.is_national).map(h => h.date)
                );

                // Location-specific holiday dates grouped by location
                const locationHolidayDates = {};
                holidays.filter(h => !h.is_national).forEach(h => {
                  h.locations.forEach(loc => {
                    if (!locationHolidayDates[loc]) locationHolidayDates[loc] = new Set();
                    locationHolidayDates[loc].add(h.date);
                  });
                });

                const leaveMap = {};
                leaveRows.forEach(r => { leaveMap[r.member_name.toLowerCase()] = r.leave_days; });

                const members = teamRows.map(m => {
                  const loc = (m.location || '').toLowerCase();

                  // Holiday days that apply to this member
                  const memberHolidayDates = new Set([
                    ...nationalHolidayDates,
                    ...(locationHolidayDates[loc] || []),
                  ]);
                  // Only weekday holidays count
                  let holidayDays = 0;
                  memberHolidayDates.forEach(dateStr => {
                    const d = new Date(dateStr);
                    const dow = d.getDay();
                    if (dow !== 0 && dow !== 6) holidayDays++;
                  });

                  const leaveDays    = leaveMap[m.name.toLowerCase()] || 0;
                  // Max working days for this member = weekdays minus their holidays
                  const maxDays      = Math.max(0, totalWeekdays - holidayDays);
                  const workingDays  = Math.max(0, maxDays - leaveDays);

                  return {
                    id: m.id,
                    name: m.name,
                    stream: m.stream || '',
                    location: m.location || '',
                    status: m.status,
                    leave_days: leaveDays,
                    holiday_days: holidayDays,
                    working_days: workingDays,
                    working_hours: workingDays * hoursPerDay,
                    total_possible_hours: maxDays * hoursPerDay,
                  };
                });

                const activeMembers    = members.filter(m => m.status === 'active');
                const teamWorkingHours = activeMembers.reduce((s, m) => s + m.working_hours, 0);
                const teamPossibleHours= activeMembers.reduce((s, m) => s + m.total_possible_hours, 0);
                const teamLeaveDays    = activeMembers.reduce((s, m) => s + m.leave_days, 0);
                const teamHolidayDays  = activeMembers.reduce((s, m) => s + m.holiday_days, 0);

                resolve({
                  monthYear,
                  snapshot: snapshot || 'start',
                  hoursPerDay,
                  weekdays: totalWeekdays,
                  members,
                  team: {
                    active_count: activeMembers.length,
                    total_leave_days: teamLeaveDays,
                    total_holiday_days: teamHolidayDays,
                    working_hours: teamWorkingHours,
                    possible_hours: teamPossibleHours,
                  },
                });
              }
            );
          }
        );
      });
    });
  },

  // ── Holidays ──────────────────────────────────────────────────────────────────

  getHolidays: ({ location, startDate, endDate } = {}) => {
    return new Promise((resolve, reject) => {
      db.all(`SELECT * FROM holidays ORDER BY holiday_date`, [], (err, rows) => {
        if (err) return reject(err);
        let result = rows.map(r => ({ ...r, locations: JSON.parse(r.locations || '[]') }));
        if (location) {
          result = result.filter(h =>
            h.is_national === 1 ||
            h.locations.some(l => l.toLowerCase() === location.toLowerCase())
          );
        }
        if (startDate) result = result.filter(h => h.holiday_date >= startDate);
        if (endDate)   result = result.filter(h => h.holiday_date <= endDate);
        resolve(result);
      });
    });
  },

  bulkInsertHolidays: (holidays) => {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO holidays (holiday_date, name, locations, is_national)
         VALUES (?,?,?,?)`
      );
      let inserted = 0;
      db.serialize(() => {
        holidays.forEach(h => {
          stmt.run(
            [h.holiday_date, h.name, JSON.stringify(h.locations||[]), h.is_national ? 1 : 0],
            (err) => { if (!err) inserted++; }
          );
        });
        stmt.finalize((err) => { if (err) reject(err); else resolve(inserted); });
      });
    });
  },

  clearHolidays: () => {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM holidays`, (err) => { if (err) reject(err); else resolve(); });
    });
  },

  // ── Leave-aware missed users ─────────────────────────────────────────────────
  // Same as getMissedUsers but skips people who are on leave or on a holiday
  // for their location on that date.
  getMissedUsersLeaveAware: (date) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT u.id, u.name, u.email, u.scrum_master, u.track
         FROM users u
         WHERE u.is_active = 1
           AND u.id NOT IN (
             SELECT DISTINCT ur.user_id FROM usage_records ur WHERE ur.date = ?
           )
           AND UPPER(u.name) NOT IN (
             SELECT UPPER(lr.member_name) FROM leave_records lr WHERE lr.leave_date = ?
           )
         ORDER BY u.name`,
        [date, date],
        (err, rows) => {
          if (err) return reject(err);
          // Further filter out users whose location has a public holiday
          db.all(`SELECT * FROM holidays WHERE holiday_date = ?`, [date], (err2, hols) => {
            if (err2) return reject(err2);
            if (hols.length === 0) return resolve(rows);

            const holidayLocations = new Set();
            let hasNational = false;
            hols.forEach(h => {
              if (h.is_national) { hasNational = true; }
              else { JSON.parse(h.locations || '[]').forEach(l => holidayLocations.add(l.toLowerCase())); }
            });

            if (hasNational) return resolve([]);

            db.all(`SELECT name, email, location FROM team_members WHERE status = 'active'`, [], (err3, members) => {
              if (err3) return reject(err3);
              const locationByEmail = {}, locationByName = {};
              members.forEach(m => {
                if (m.email) locationByEmail[m.email.toLowerCase()] = (m.location||'').toLowerCase();
                locationByName[m.name.toLowerCase()] = (m.location||'').toLowerCase();
              });
              const filtered = rows.filter(u => {
                const loc = locationByEmail[u.email?.toLowerCase()] || locationByName[u.name?.toLowerCase()] || '';
                return loc === '' || !holidayLocations.has(loc);
              });
              resolve(filtered);
            });
          });
        }
      );
    });
  }
};

module.exports = { db, dbHelpers };

// Made with Bob
