const { parse } = require('csv-parse/sync');
const { format } = require('date-fns');

// ---------------------------------------------------------------------------
// Ignore keywords — same set as the original Python script
// ---------------------------------------------------------------------------
const IGNORE_KEYWORDS = [
  'missed', 'sick leave', 'holiday', 'planned leave',
  'sat and sun', 'no ica usage today', "didn't use ica",
  'sat & sun holidays', 'not used',
  // extras kept from original JS version for safety
  'public holiday', 'el', 'ph', 'vacation', 'on leave',
  'today no use for ica'
];

// ---------------------------------------------------------------------------
// Date parsing — mirrors the Python parse_header_dates() logic
//
// The CSV header can contain dates in either DD/MM/YYYY or MM/DD/YYYY order
// (sometimes with '-' as separator instead of '/').  We resolve ambiguity by:
//  1. Finding the first column whose date is unambiguous (only one valid
//     interpretation) → anchor.
//  2. Walking outward from the anchor, picking the candidate closest to the
//     previous resolved date (expecting ~1-day gaps).
// Returns: { colIndex: Date, ... }  (JS Date objects, already normalised)
// ---------------------------------------------------------------------------
function parseHeaderDates(headers) {
  // Step 1: collect all valid candidate Date objects per column index
  const rawCandidates = {};
  for (let idx = 0; idx < headers.length; idx++) {
    const clean = (headers[idx] || '').replace(/-/g, '/').trim();
    if (!clean) continue;
    const parts = clean.split('/');
    if (parts.length < 3) continue;

    let val1, val2, year;
    try {
      val1 = parseInt(parts[0], 10);
      val2 = parseInt(parts[1], 10);
      let y  = parseInt(parts[2], 10);
      year   = y < 100 ? 2000 + y : y;
    } catch (_) {
      continue;
    }
    if (isNaN(val1) || isNaN(val2) || isNaN(year)) continue;

    const candidates = [];
    // Try DD/MM/YYYY
    const d1 = new Date(year, val2 - 1, val1);
    if (d1.getFullYear() === year && d1.getMonth() === val2 - 1 && d1.getDate() === val1) {
      candidates.push(d1);
    }
    // Try MM/DD/YYYY  (only add if it produces a different date)
    const d2 = new Date(year, val1 - 1, val2);
    if (d2.getFullYear() === year && d2.getMonth() === val1 - 1 && d2.getDate() === val2) {
      const isDupe = candidates.some(c => c.getTime() === d2.getTime());
      if (!isDupe) candidates.push(d2);
    }

    if (candidates.length > 0) {
      // Sort so the earlier date comes first (mirrors Python's sorted(set(…)))
      candidates.sort((a, b) => a - b);
      rawCandidates[idx] = candidates;
    }
  }

  if (Object.keys(rawCandidates).length === 0) return {};

  // Step 2: find anchor — first column with exactly one interpretation
  const sortedIdxs = Object.keys(rawCandidates).map(Number).sort((a, b) => a - b);
  let anchorIdx  = null;
  let anchorDate = null;

  for (const idx of sortedIdxs) {
    if (rawCandidates[idx].length === 1) {
      anchorIdx  = idx;
      anchorDate = rawCandidates[idx][0];
      break;
    }
  }
  // Fallback: no unambiguous column — just take the first candidate of the first column
  if (anchorIdx === null) {
    anchorIdx  = sortedIdxs[0];
    anchorDate = rawCandidates[anchorIdx][0];
  }

  const resolved = { [anchorIdx]: anchorDate };

  // Helper: pick the candidate with the smallest penalty
  // Penalty = 0 when diff equals 1 day forward; large when going backwards
  function bestCandidate(candidates, prevDate, forward) {
    let best = null;
    let minScore = Infinity;
    for (const cand of candidates) {
      const diff = forward
        ? (cand - prevDate) / 86400000
        : (prevDate - cand) / 86400000;
      const score = diff >= 0 ? Math.abs(diff - 1) : 1000 + Math.abs(diff);
      if (score < minScore) { minScore = score; best = cand; }
    }
    return best;
  }

  // Step 3: resolve columns before the anchor (backwards)
  let prev = anchorDate;
  for (const idx of [...sortedIdxs].filter(i => i < anchorIdx).reverse()) {
    const cands = rawCandidates[idx];
    resolved[idx] = cands.length === 1 ? cands[0] : bestCandidate(cands, prev, false);
    prev = resolved[idx];
  }

  // Step 4: resolve columns after the anchor (forwards)
  prev = anchorDate;
  for (const idx of sortedIdxs.filter(i => i > anchorIdx)) {
    const cands = rawCandidates[idx];
    resolved[idx] = cands.length === 1 ? cands[0] : bestCandidate(cands, prev, true);
    prev = resolved[idx];
  }

  return resolved; // { colIndex(Number): Date }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// A row starts a new user block when it has a non-empty name (col 0) AND a
// non-empty stream (col 3).  Using stream (not email) as the gate matches the
// Python is_user_start_row() logic and is more reliable than checking for '@'.
function isUserStartRow(row) {
  if (!row || row.length < 4) return false;
  const name   = (row[0] || '').trim();
  const stream = (row[3] || '').trim();
  return name.length > 0 && stream.length > 0;
}

function isIgnored(text) {
  if (!text) return true;
  const lower = text.toLowerCase().trim();
  return IGNORE_KEYWORDS.some(kw => lower.includes(kw));
}

function cleanAssistantName(raw) {
  if (!raw) return null;
  let s = raw.replace(/\s+/g, ' ').trim().replace(/[,.:;]$/, '');
  return isIgnored(s) ? null : s;
}

// ---------------------------------------------------------------------------
// Main parser — user ownership is unlimited: a user owns all rows until the
// next user-start row is encountered (identified by name + stream in col 3).
// This is more robust than a fixed block size and never drops data.
// ---------------------------------------------------------------------------
function parseCSV(csvContent) {
  try {
    const records = parse(csvContent, {
      skip_empty_lines: false,   // keep blank rows so relative positioning is preserved
      relax_column_count: true,
      trim: false                // we trim manually
    });

    if (records.length < 3) {
      throw new Error('CSV file is too short. Expected at least 3 rows.');
    }

    // Row 0 → dates header (same as Python lines[0])
    const dateRow     = records[0];
    const dateMap     = parseHeaderDates(dateRow);        // { colIdx: Date }
    const dateEntries = Object.entries(dateMap)
      .map(([idx, dt]) => ({ idx: Number(idx), dt }))
      .sort((a, b) => a.idx - b.idx);

    if (dateEntries.length === 0) {
      throw new Error('No valid dates found in CSV header row.');
    }

    // Python skips rows 0 and 1 (range(2, len(lines))), so we start at index 2.
    const users = [];
    let currentUser = null;
    let rowNumber   = 0;   // 1-based row counter within the current user block

    for (let i = 2; i < records.length; i++) {
      const row = records[i];

      // ---- A new user-start row resets ownership ----
      if (isUserStartRow(row)) {
        if (currentUser) users.push(currentUser);

        const name   = row[0].trim();
        const email  = (row[1] || '').trim();
        const sm     = (row[2] || '').trim();
        const stream = row[3].trim().toUpperCase();

        currentUser = {
          name,
          email: email || `${name.replace(/\s+/g, '.').toLowerCase()}@unknown`,
          scrum_master: sm,
          track: stream,
          usage: []
        };
        rowNumber = 1;

      } else if (currentUser) {
        // Continuation row — still belongs to the same user
        rowNumber++;
      }

      // No user context yet (rows before the first user block)
      if (!currentUser) continue;

      // ---- Only collect data for JDE stream users ----
      if (currentUser.track === 'JDE') {
        for (const { idx, dt } of dateEntries) {
          const cellRaw = idx < row.length ? (row[idx] || '').trim() : '';
          if (!cellRaw) continue;

          // A cell can hold multiple assistants separated by newlines
          const lines = cellRaw.split(/\n|\r\n?/);
          for (const line of lines) {
            const assistant = cleanAssistantName(line);
            if (!assistant) continue;
            currentUser.usage.push({
              date:           format(dt, 'yyyy-MM-dd'),
              assistant_name: assistant,
              row_number:     rowNumber
            });
          }
        }
      }
    }

    // Push last user
    if (currentUser) users.push(currentUser);

    const allDates = dateEntries.map(e => format(e.dt, 'yyyy-MM-dd')).sort();

    return {
      success:    true,
      users,
      dateRange:  { start: allDates[0], end: allDates[allDates.length - 1] },
      totalDates: dateEntries.length,
      totalUsers: users.length
    };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { parseCSV };

// Made with Bob
