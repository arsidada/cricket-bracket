// pages/api/leaderboard-snapshot.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow only GET requests.
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Authenticate using the service account credentials.
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    // Fetch the snapshot from the "Leaderboard" tab.
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Leaderboard!A1:H1000', // Assumes headers in first row.
    });

    const data = response.data.values;
    if (!data || data.length === 0) {
      // If no data is found, return an empty array.
      return res.status(200).json({ players: [] });
    }

    // Assume the first row is header: [Rank, Player, Group Points, Super8 Points, Playoffs Points, Total Points, Timestamp]
    const players = data.slice(1).map((row) => ({
      rank: row[0] || '',
      name: row[1] || '',
      groupPoints: Number(row[2] || 0),
      super8Points: Number(row[3] || 0),
      playoffPoints: Number(row[4] || 0),
      totalPoints: Number(row[5] || 0),
      timestamp: row[6] || '',
      chipsUsed: row[7] || '',
    }));

    return res.status(200).json({ players });
  } catch (error) {
    console.error('Error fetching leaderboard snapshot:', error);
    return res.status(500).json({ error: 'Error fetching leaderboard snapshot' });
  }
}