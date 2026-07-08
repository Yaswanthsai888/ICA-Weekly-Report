/**
 * seedData.js
 * One-time seed script — run with: node backend/seedData.js
 *
 * Seeds:
 *   1. team_members  from HNK IBM Team Backup CSV
 *   2. leave_records from Jun-26 and Jul-26 leave CSVs
 *                    (also patches team_member locations)
 *   3. holidays      from JDE India Vacation Polaris Holiday List CSV
 */

const path = require('path');
const fs   = require('fs');

// Give the DB time to initialise its tables before we insert
const { db, dbHelpers } = require('./database');
const { parseLeaveCSV, inferMonthFromFilename } = require('./leaveParser');
const { parseHolidayCSV }                       = require('./holidayParser');

// ── CSV paths (relative to project root) ────────────────────────────────────
const ROOT = path.join(__dirname, '..');

const BACKUP_CSV  = path.join(ROOT, 'HNK IBM Team Backup-V1(HNK IBM Team Backup).csv');
const HOLIDAY_CSV = path.join(ROOT, 'JDE_India_Vacation_Polaris_2026(Holiday_List-2026).csv');
const LEAVE_CSVS  = [
  path.join(ROOT, 'JDE_India_Vacation_Polaris_2026(Jun-26).csv'),
  path.join(ROOT, 'JDE_India_Vacation_Polaris_2026(Jul-26).csv'),
];

// ── Parse Backup CSV ─────────────────────────────────────────────────────────
function parseBackupCSV(filePath) {
  const raw   = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).map(l => l.split(',').map(c => c.trim()));

  const members = [];
  // Skip header row (index 0) — "Sno,Stream,Role,Name,Email,Mobile,Backup Name,Email,Mobile"
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row[0] || isNaN(parseInt(row[0], 10))) continue;

    const name  = row[3]?.trim();
    const email = row[4]?.trim();
    if (!name || name === '') continue;

    members.push({
      name:          name,
      email:         email || null,
      mobile:        row[5]?.trim() || null,
      stream:        row[1]?.trim() || null,
      role:          row[2]?.trim() || null,
      location:      null,   // will be filled from leave CSVs
      backup_name:   row[6]?.trim() || null,
      backup_email:  row[7]?.trim() || null,
      backup_mobile: row[8]?.trim() || null,
      status:        'active',
    });
  }
  return members;
}

// ── Main seed ────────────────────────────────────────────────────────────────
async function seed() {
  // Wait 500ms for sqlite to finish table creation
  await new Promise(r => setTimeout(r, 500));

  // 1. Seed team members
  if (fs.existsSync(BACKUP_CSV)) {
    const members = parseBackupCSV(BACKUP_CSV);
    const inserted = await dbHelpers.bulkInsertTeamMembers(members);
    console.log(`✓ team_members: ${inserted} inserted (${members.length} in file)`);
  } else {
    console.warn('⚠ Backup CSV not found:', BACKUP_CSV);
  }

  // 2. Seed holidays
  if (fs.existsSync(HOLIDAY_CSV)) {
    const holidays = parseHolidayCSV(HOLIDAY_CSV);
    await dbHelpers.clearHolidays();
    const inserted = await dbHelpers.bulkInsertHolidays(holidays);
    console.log(`✓ holidays: ${inserted} inserted (${holidays.length} in file)`);
  } else {
    console.warn('⚠ Holiday CSV not found:', HOLIDAY_CSV);
  }

  // 2b. Manual location patches for name mismatches between backup & leave CSVs
  const LOCATION_PATCHES = [
    { name: 'Yaswanth Sai',   location: 'Hyderabad' },   // appears as "Yashwanth Sai" in leave CSVs
    { name: 'Runit Kumar',    location: 'Pune' },         // appears as "HARDIK SHARMA (Runit Kumar)"
    { name: 'Amarnath Kapanapalle', location: 'Hyderabad' }, // appears as "Rishabh Saxena (Amarnath)"
  ];
  for (const p of LOCATION_PATCHES) {
    await dbHelpers.updateTeamMemberLocation(p.name, p.location);
  }
  console.log(`✓ manual location patches applied`);

  // 3. Seed leave records + patch locations
  for (const csvPath of LEAVE_CSVS) {
    if (!fs.existsSync(csvPath)) {
      console.warn('⚠ Leave CSV not found:', csvPath);
      continue;
    }
    const filename = path.basename(csvPath);
    const inferred = inferMonthFromFilename(filename);
    if (!inferred) {
      console.warn('⚠ Could not infer month from filename:', filename);
      continue;
    }
    const { year, month } = inferred;
    const { members, records, monthYear } = parseLeaveCSV(csvPath, year, month);

    // Patch team_member locations from leave CSV (authoritative)
    for (const m of members) {
      if (m.location) await dbHelpers.updateTeamMemberLocation(m.name, m.location);
    }

    // Re-insert leave records for this month (delete first to allow re-seeding)
    await dbHelpers.deleteLeaveRecordsByMonth(monthYear);
    const inserted = await dbHelpers.bulkInsertLeaveRecords(records);
    console.log(`✓ leave_records [${monthYear}]: ${inserted} records (${records.length} in file), ${members.length} members, locations patched`);
  }

  console.log('\nSeed complete ✓');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

// Made with Bob
