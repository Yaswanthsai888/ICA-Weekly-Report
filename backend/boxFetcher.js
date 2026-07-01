/**
 * boxFetcher.js
 * Downloads an xlsx file from a Box shared link and converts it to CSV text
 * that parseCSV() can consume directly.
 *
 * IBM Box shared links (https://ibm.box.com/s/xxx) redirect through several
 * hops before reaching the actual file bytes.  We follow all redirects manually
 * so we stay in control of headers at every hop.
 */

const https = require('https');
const http  = require('http');
const XLSX  = require('xlsx');

/**
 * Given a Box shared URL, append the download trigger and fetch the xlsx.
 * Returns a Promise<string> of CSV text (first sheet).
 *
 * @param {string} rawUrl  e.g. "https://ibm.box.com/s/10f7xcf90pauzc97hkayvc5n3eunsv88"
 */
function fetchBoxXlsxAsCsv(rawUrl) {
  if (!rawUrl || !rawUrl.startsWith('http')) {
    return Promise.reject(new Error('Box URL must start with http/https'));
  }

  // Strip any existing dl param and add dl=1 to force file download
  let downloadUrl;
  try {
    const u = new URL(rawUrl.trim());
    u.searchParams.set('dl', '1');
    downloadUrl = u.toString();
  } catch (_) {
    return Promise.reject(new Error(`Invalid Box URL: ${rawUrl}`));
  }

  return downloadBuffer(downloadUrl, 10).then(buf => {
    const workbook = XLSX.read(buf, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('Box xlsx has no sheets');
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], {
      blankrows: true,    // preserve blank rows — parser relies on relative position
      rawNumbers: false,
    });
    return csv;
  });
}

/**
 * Follow HTTP/HTTPS redirects and return the final response body as a Buffer.
 * Uses the 3-argument form of https.get(url, options, cb) which accepts a
 * plain URL string in all Node versions >= 10.
 */
function downloadBuffer(url, maxRedirects) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) {
      return reject(new Error('Too many redirects while fetching Box file'));
    }

    const lib = url.startsWith('https') ? https : http;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ICA-Report-App/1.0)',
        'Accept':     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*',
      },
    };

    const req = lib.get(url, options, (res) => {
      // Follow any redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); // drain socket
        let nextUrl = res.headers.location;
        // Handle relative redirect locations
        if (nextUrl.startsWith('/')) {
          const base = new URL(url);
          nextUrl = `${base.protocol}//${base.host}${nextUrl}`;
        }
        return resolve(downloadBuffer(nextUrl, maxRedirects - 1));
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(
          `Box returned HTTP ${res.statusCode}. ` +
          `Make sure the link is a shared link (ibm.box.com/s/...) and access is set to "People in your company".`
        ));
      }

      // Check content type — if Box returns HTML it means the link is a viewer, not a file
      const ct = (res.headers['content-type'] || '').toLowerCase();
      if (ct.includes('text/html')) {
        res.resume();
        return reject(new Error(
          'Box returned an HTML page instead of the xlsx file. ' +
          'Please use a shared link (https://ibm.box.com/s/…) not a viewer or Office Online link.'
        ));
      }

      const chunks = [];
      res.on('data',  chunk => chunks.push(chunk));
      res.on('end',   ()    => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error('Request to Box timed out after 30 s'));
    });
  });
}

module.exports = { fetchBoxXlsxAsCsv };

// Made with Bob
