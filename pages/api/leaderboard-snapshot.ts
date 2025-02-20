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
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    // Updated range: expecting 10 columns now.
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Leaderboard!A1:J1000',
    });

    const data = response.data.values;
    if (!data || data.length === 0) {
      return res.status(200).json({ players: [] });
    }

    // Map the columns:
    // 0: Rank, 1: Previous Rank, 2: Player, 3: Group Points, 4: Super8 Points,
    // 5: Playoffs Points, 6: Total Points, 7: Penalty, 8: Timestamp, 9: Chips Used
    const players = data.slice(1).map((row) => ({
      rank: row[0] || '',
      previousRank: row[1] || '',
      name: row[2] || '',
      groupPoints: Number(row[3] || 0),
      super8Points: Number(row[4] || 0),
      playoffPoints: Number(row[5] || 0),
      totalPoints: Number(row[6] || 0),
      penalty: Number(row[7] || 0),
      timestamp: row[8] || '',
      chipsUsed: row[9] || '',
    }));

    return res.status(200).json({ players });
  } catch (error) {
    console.error('Error fetching leaderboard snapshot:', error);
    return res.status(500).json({ error: 'Error fetching leaderboard snapshot' });
  }
}