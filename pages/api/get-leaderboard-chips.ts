// pages/api/get-leaderboard-chips.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';
import { DateTime } from 'luxon';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Fixture definitions (group stage fixtures)
// You can adjust these definitions as needed.
// We assume each fixture starts at 4AM local time on the given date in 2025.
const fixtures = [
  { match: 1, date: "19 February" },
  { match: 2, date: "20 February" },
  { match: 3, date: "21 February" },
  { match: 4, date: "22 February" },
  { match: 5, date: "23 February" },
  { match: 6, date: "24 February" },
  { match: 7, date: "25 February" },
  { match: 8, date: "26 February" },
  { match: 9, date: "27 February" },
  { match: 10, date: "28 February" },
  { match: 11, date: "1 March" },
  { match: 12, date: "2 March" },
];

// Helper to get fixture start time given a fixture match number.
// We assume the year is 2025 and start time is 04:00.
function getFixtureStartTime(matchNumber: number) {
  const fixture = fixtures.find(f => f.match === matchNumber);
  if (!fixture) return null;
  // Construct a date string with the year and time.
  const dateString = `${fixture.date} 2025 04:00`;
  // Parse using Luxon. The format is: d MMMM yyyy HH:mm.
  const dt = DateTime.fromFormat(dateString, 'd MMMM yyyy HH:mm');
  return dt;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    // Fetch the Chips tab (columns A:C)
    const chipRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Chips!A:C',
    });
    const rows = chipRes.data.values || [];
    if (rows.length === 0) {
      return res.status(200).json({ players: [] });
    }

    // rows[0] is header. Process remaining rows.
    const now = DateTime.now();
    const players = rows.slice(1).map(row => {
      const player = row[0]?.trim() || 'Unknown';
      let doubleUp: number | null = row[1] && row[1].trim() !== '' ? parseInt(row[1], 10) : null;
      let wildcard: number | null = row[2] && row[2].trim() !== '' ? parseInt(row[2], 10) : null;

      // For each chip, check if its fixture has started (i.e. current time is after the fixture's 4AM start).
      if (doubleUp !== null) {
        const fixtureTime = getFixtureStartTime(doubleUp);
        if (!fixtureTime || now < fixtureTime) {
          // Not started yet; hide the chip.
          doubleUp = null;
        }
      }
      if (wildcard !== null) {
        const fixtureTime = getFixtureStartTime(wildcard);
        if (!fixtureTime || now < fixtureTime) {
          // Not started yet; hide the chip.
          wildcard = null;
        }
      }

      return { player, doubleUp, wildcard };
    });

    return res.status(200).json({ players });
  } catch (error) {
    console.error('Error fetching leaderboard chips:', error);
    return res.status(500).json({ error: 'Error fetching leaderboard chips' });
  }
}