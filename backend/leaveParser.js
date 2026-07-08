/**
 * leaveParser.js
 * Parses the monthly leave grid CSV format used by the team.
 *
 * Format:
 *   Row 1: day-of-week headers (Mon, Tue, …) starting at column index 2
 *   Row 2: day numbers (1, 2, 3, …) + Name / Location headers in cols 0-1
 *   Row 3+: one row per person — Name, Location, then X / S / blank per day
 *
 * Returns: { members: [{name, location}], records: [{member_name, leave_date, leave_type, month_year}] }
 */

const fs   = require('fs');
const path = require('path');

/**
 * Parse a leave CSV file.
 * @param {string} filePath  - absolute path to the CSV file
 * @param {number} year      - e.g. 2026
 * @param {number} month     - 1-based month number (1=Jan, 6=Jun, 7=Jul …)
 * @returns {{ members: Array, records: Array, monthYear: string }}
 */
function parseLeaveCSV(filePath, year, month) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);

  // ── locate data rows ─────────────────────────────────────────────────────
  // We scan for the row whose first non-empty cell is "Name" (case-insensitive)
  let headerRowIdx = -1;
  const parsed = lines.map(l => l.split(',').map(c => c.trim()));

  for (let i = 0; i < parsed.length; i++) {
    if (parsed[i][0].toLowerCase() === 'name') {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error('Could not find "Name" header row in leave CSV');
  }

  const headerRow = parsed[headerRowIdx];   // ["Name","Location","1","2",…,"30"]
  const dayColumns = [];                    // [{colIdx, dayNum}]

  for (let c = 2; c < headerRow.length; c++) {
    const dayNum = parseInt(headerRow[c], 10);
    if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
      dayColumns.push({ colIdx: c, dayNum });
    }
  }

  const monthStr  = String(month).padStart(2, '0');
  const monthYear = `${year}-${monthStr}`;

  const members = [];
  const records = [];

  // ── data rows ─────────────────────────────────────────────────────────────
  for (let i = headerRowIdx + 1; i < parsed.length; i++) {
    const row = parsed[i];
    const name     = row[0]?.trim();
    const location = row[1]?.trim();

    // Stop at summary rows (blank name, "Vacation", "Holiday", "SICK", totals)
    if (!name || name === '' || name.toLowerCase() === 'vacation' ||
        name.toLowerCase() === 'holiday' || name.toLowerCase() === 'sick') {
      continue;
    }

    members.push({ name, location: location || '' });

    // Process each day column
    dayColumns.forEach(({ colIdx, dayNum }) => {
      const cell = (row[colIdx] || '').trim().toUpperCase();

      let leaveType = null;
      if (cell === 'X')      leaveType = 'vacation';
      else if (cell === 'S') leaveType = 'sick';
      // blank or anything else = working

      if (leaveType) {
        const dateStr = `${year}-${monthStr}-${String(dayNum).padStart(2, '0')}`;
        records.push({
          member_name: name,
          leave_date:  dateStr,
          leave_type:  leaveType,
          month_year:  monthYear,
          source:      'upload',
        });
      }
    });
  }

  return { members, records, monthYear };
}

/**
 * Infer year and month from a filename like:
 *   "JDE_India_Vacation_Polaris_2026(Jun-26).csv"
 *   "JDE_India_Vacation_Polaris_2026(Jul-26).csv"
 * Returns { year, month } or null if cannot determine.
 */
function inferMonthFromFilename(filename) {
  const MONTH_MAP = {
    jan: 1, feb: 2, mar: 3, apr: 4,  may: 5,  jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };

  // Try "(Jun-26)" style
  const m = filename.match(/\(([A-Za-z]{3})-?(\d{2})\)/i);
  if (m) {
    const monthNum = MONTH_MAP[m[1].toLowerCase()];
    const year     = 2000 + parseInt(m[2], 10);
    if (monthNum) return { year, month: monthNum };
  }

  // Try "2026-06" style in filename
  const m2 = filename.match(/(\d{4})[_-](\d{2})/);
  if (m2) return { year: parseInt(m2[1], 10), month: parseInt(m2[2], 10) };

  return null;
}

module.exports = { parseLeaveCSV, inferMonthFromFilename };

// Made with Bob
