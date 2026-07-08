/**
 * holidayParser.js
 * Parses the JDE India Vacation Polaris holiday list CSV.
 *
 * Format (works for any year — all detection is dynamic):
 *   Row 1: headers  — S.No, Name of the Holiday, <year>, "", Karnataka, Tamil Nadu, …
 *   Row 2: sub-hdrs — "", "", Date, Day, "Bengaluru, Mysore", "Chennai, Coimbatore", …
 *   Row 3+: one holiday per row; "1" = location observes the holiday
 *
 * The parser finds the sub-header row by looking for "Date" in column 2, then reads
 * city column positions from that row — so adding/reordering columns in a future
 * year's CSV is handled automatically as long as the city names stay the same.
 *
 * Returns: Array of { holiday_date, name, locations: string[], is_national: bool }
 */

const fs = require('fs');

// Maps CSV sub-header cell (lowercase) → canonical city names stored in team_members.location
// Both state-level names (Row 1) and city-level names (Row 2) are listed so either header
// row format is handled correctly.
const LOCATION_COLUMN_MAP = {
  // Karnataka
  'karnataka':              ['Bangalore'],
  'bengaluru, mysore':      ['Bangalore'],
  // Tamil Nadu
  'tamil nadu':             ['Chennai'],
  'chennai, coimbatore':    ['Chennai'],
  // Telangana
  'telangana':              ['Hyderabad'],
  'hyderabad':              ['Hyderabad'],
  // Kerala
  'kerala':                 ['Kochi'],
  'kochi':                  ['Kochi'],
  // Haryana
  'haryana':                ['Gurgaon'],
  'gurgaon':                ['Gurgaon'],
  // Uttar Pradesh
  'uttar pradesh':          ['Noida', 'Lucknow'],
  'noida, lucknow':         ['Noida', 'Lucknow'],
  // Maharashtra
  'maharashtra':            ['Pune', 'Mumbai'],
  'mumbai, pune':           ['Pune', 'Mumbai'],
  // Gujarat
  'gujarat':                ['Ahmedabad'],
  'ahmedabad, gandhi nagar':['Ahmedabad'],
  // West Bengal
  'west bengal':            ['Kolkata'],
  'kolkata':                ['Kolkata'],
  // Odisha
  'odisha':                 ['Bhubaneswar'],
  'bhubaneswar':            ['Bhubaneswar'],
};

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * RFC-4180-aware CSV line splitter.
 * Handles quoted fields that contain commas, e.g. "Bengaluru, Mysore".
 * Without this, naive .split(',') would misalign all columns after the first quoted cell.
 */
function splitCSVLine(line) {
  const result = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Parse a date string like "15-Jan-26", "3-Apr-27" → "2026-01-15", "2027-04-03"
 * Works for any 2-digit year suffix (adds 2000).
 */
function parseHolidayDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  const [day, monStr, yearShort] = parts;
  const mon = MONTH_MAP[monStr.toLowerCase().slice(0, 3)];
  if (!mon) return null;
  const year = parseInt(yearShort, 10) < 100
    ? 2000 + parseInt(yearShort, 10)
    : parseInt(yearShort, 10);
  return `${year}-${mon}-${String(parseInt(day, 10)).padStart(2, '0')}`;
}

/**
 * Parse the holiday list CSV.
 * @param {string} filePath
 * @returns {Array<{ holiday_date: string, name: string, locations: string[], is_national: boolean }>}
 */
function parseHolidayCSV(filePath) {
  const raw   = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).map(splitCSVLine);

  // Find the sub-header row dynamically — it is the one that has "Date" in column 2.
  // This means the parser works for any year's file without hardcoding a row number.
  let subHeaderIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i][2]?.toLowerCase() === 'date') {
      subHeaderIdx = i;
      break;
    }
  }
  if (subHeaderIdx === -1) throw new Error('Could not find "Date" sub-header row in holiday CSV');

  const subHeader = lines[subHeaderIdx]; // ["", "", "Date", "Day", "Bengaluru, Mysore", ...]

  // Build location column list by reading city names from the sub-header at runtime.
  // Columns not present in LOCATION_COLUMN_MAP are skipped with a warning so that
  // new states added by IBM in future years don't silently break the parse.
  const locationCols = []; // [{ colIdx, cities[] }]
  for (let c = 4; c < subHeader.length; c++) {
    const key    = subHeader[c].toLowerCase();
    if (!key) continue;
    const cities = LOCATION_COLUMN_MAP[key];
    if (cities) {
      locationCols.push({ colIdx: c, cities });
    } else {
      console.warn(`[holidayParser] Unknown location column "${subHeader[c]}" (col ${c}) — skipped. Add it to LOCATION_COLUMN_MAP if needed.`);
    }
  }

  const totalLocationCols = locationCols.length;
  const holidays = [];

  for (let i = subHeaderIdx + 1; i < lines.length; i++) {
    const row  = lines[i];
    const sno  = row[0];
    const name = row[1];

    // Skip blank rows and stop at the "Total" / "Note:" footer rows
    if (!sno || isNaN(parseInt(sno, 10))) continue;
    if (!name || name === '')             continue;
    if (name.toLowerCase().startsWith('note')) break;

    const parsedDate = parseHolidayDate(row[2]);
    if (!parsedDate) continue;

    // Collect cities that observe this holiday
    const observingCities = [];
    let observingCount    = 0;

    locationCols.forEach(({ colIdx, cities }) => {
      if (row[colIdx] === '1') {
        observingCities.push(...cities);
        observingCount++;
      }
    });

    const uniqueCities = [...new Set(observingCities)];
    // A holiday is "national" only when every known location column observes it
    const isNational   = totalLocationCols > 0 && observingCount === totalLocationCols;

    holidays.push({
      holiday_date: parsedDate,
      name:         name.trim(),
      locations:    uniqueCities,
      is_national:  isNational,
    });
  }

  return holidays;
}

module.exports = { parseHolidayCSV };

// Made with Bob
