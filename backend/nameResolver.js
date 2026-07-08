/**
 * nameResolver.js
 *
 * Resolves a CSV member name (and optional email) to the canonical name
 * stored in the team_members roster.
 *
 * Priority chain (first match wins):
 *   1. Email match          — most reliable when the CSV includes an email column
 *   2. Exact name match     — case-insensitive, whitespace-normalised
 *   3. Roster starts-with   — roster "Danish Kokkarani" matches CSV "DANISH" or "DANISH ."
 *   4. CSV starts-with      — CSV "Ajantha Baby" matches roster "Ajantha Baby M"
 *   5. First-word match     — "SENTHIL" → "Senthilkumar R"  (only when unambiguous)
 *
 * Returns: { resolved: string, method: string, changed: boolean }
 *   resolved — canonical roster name (or original if no match found)
 *   method   — which step matched ('email'|'exact'|'roster-prefix'|'csv-prefix'|'first-word'|'none')
 *   changed  — true when resolved !== original
 */

/**
 * Build a normalised token from a raw name string:
 *   - trim whitespace
 *   - strip trailing punctuation (. , ;)
 *   - collapse internal whitespace
 *   - uppercase
 */
function normalise(str) {
  return (str || '')
    .trim()
    .replace(/[.,;]+$/, '')   // strip trailing dots/commas
    .replace(/\s+/g, ' ')     // collapse spaces
    .toUpperCase();
}

/**
 * Resolve a single CSV entry to its canonical roster name.
 *
 * @param {string}        csvName   — raw name from the CSV
 * @param {string|null}   csvEmail  — email from the CSV (may be null/undefined)
 * @param {Array}         roster    — array of { name, email } from team_members
 * @returns {{ resolved: string, method: string, changed: boolean }}
 */
function resolveOne(csvName, csvEmail, roster) {
  const csv = normalise(csvName);

  // ── 1. Email match ──────────────────────────────────────────────────────────
  if (csvEmail) {
    const emailLower = csvEmail.trim().toLowerCase();
    const m = roster.find(r => r.email && r.email.trim().toLowerCase() === emailLower);
    if (m) return { resolved: m.name, method: 'email', changed: m.name !== csvName };
  }

  // ── 2. Exact name match (case-insensitive, normalised) ─────────────────────
  let m = roster.find(r => normalise(r.name) === csv);
  if (m) return { resolved: m.name, method: 'exact', changed: m.name !== csvName };

  // ── 3. Roster name starts with the CSV token ───────────────────────────────
  // "DANISH" or "DANISH ." both match "Danish Kokkarani"
  m = roster.find(r => {
    const rn = normalise(r.name);
    return rn === csv || rn.startsWith(csv + ' ');
  });
  if (m) return { resolved: m.name, method: 'roster-prefix', changed: true };

  // ── 4. CSV starts with the roster name (CSV is the longer one) ─────────────
  // "Ajantha Baby M 123" would still match "Ajantha Baby M"
  m = roster.find(r => {
    const rn = normalise(r.name);
    return csv === rn || csv.startsWith(rn + ' ');
  });
  if (m) return { resolved: m.name, method: 'csv-prefix', changed: m.name !== csvName };

  // ── 5. First-word match (only when exactly one roster entry matches) ────────
  // "SENTHILKUMAR" → "Senthilkumar R"
  const csvFirst = csv.split(' ')[0];
  const firstWordMatches = roster.filter(r => normalise(r.name).startsWith(csvFirst + ' ') || normalise(r.name) === csvFirst);
  if (firstWordMatches.length === 1) {
    return { resolved: firstWordMatches[0].name, method: 'first-word', changed: true };
  }

  // ── No match ────────────────────────────────────────────────────────────────
  return { resolved: csvName, method: 'none', changed: false };
}

/**
 * Resolve an array of { name, email? } objects against the roster.
 * Mutates each entry in-place (name → canonical name).
 * Returns a summary of what changed.
 *
 * @param {Array}  entries  — e.g. members[] or records[] (must have .name or .member_name)
 * @param {string} nameKey  — field to read/write ('name' or 'member_name')
 * @param {string|null} emailKey — optional field for email ('email' or null)
 * @param {Array}  roster   — array of { name, email } from team_members
 * @returns {Array<{ original, resolved, method }>} — only entries that changed
 */
function resolveAll(entries, nameKey, emailKey, roster) {
  const changes = [];
  entries.forEach(entry => {
    const csvName  = entry[nameKey];
    const csvEmail = emailKey ? entry[emailKey] : null;
    const { resolved, method, changed } = resolveOne(csvName, csvEmail, roster);
    if (changed) {
      changes.push({ original: csvName, resolved, method });
      entry[nameKey] = resolved;
    }
  });
  return changes;
}

module.exports = { resolveOne, resolveAll, normalise };

// Made with Bob
