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
  // Users table
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
  db.run(`ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`, () => {
    // ignore error — column already exists on fresh DBs
  });

  // Usage records table
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

  // App settings table (key/value store)
  db.run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better query performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_records(date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_records(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_usage_assistant ON usage_records(assistant_name)`);
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

  // Get active users who missed MORE THAN 2 working days in a given date range.
  // Returns: [{ id, name, email, scrum_master, track, days_missed }]
  getHeavyMissers: (startDate, endDate, minDaysMissed = 2) => {
    return new Promise((resolve, reject) => {
      // Count working days (Mon–Fri) in the range that actually exist in usage_records
      // A "miss" = the user had NO usage record on that date.
      // We find all distinct dates in the range that have at least one usage record
      // (i.e. dates where at least someone was active), then count how many of those
      // dates a given user did NOT appear on.
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
         HAVING days_missed > ?
         ORDER BY days_missed DESC, u.name`,
        [startDate, endDate, minDaysMissed],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // Clear all data (for re-import)
  clearAllData: () => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('DELETE FROM usage_records', (err) => {
          if (err) reject(err);
        });
        db.run('DELETE FROM users', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }
};

module.exports = { db, dbHelpers };

// Made with Bob
