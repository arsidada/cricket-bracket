// pages/api/update-fixture.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import { google } from 'googleapis';
import { DateTime } from 'luxon';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Only allow admin to update fixtures.
  const session = await getServerSession(req, res, authOptions);
  const adminEmail = process.env.ADMIN_EMAIL; // Set this in your env variables.
  if (!session || session.user?.email !== adminEmail) {
    return res.status(401).json({ error: 'Unauthorized: Admin only' });
  }

  const { date, match, newWinner } = req.body;
  if (!date || !match || !newWinner) {
    return res.status(400).json({ error: 'Missing required fields: date, match, or newWinner' });
  }

  try {
    // Authenticate with Google Sheets API.
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    // Fetch the current sheet data from "Predictions Overview"
    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Predictions Overview!A1:Z1000',
    });
    const data = sheetResponse.data.values;
    if (!data || data.length === 0) {
      return res.status(500).json({ error: 'Sheet is empty' });
    }

    // Find header indices for Date, Match, and Winner columns.
    const headers = data[0];
    const dateIndex = headers.indexOf('Date');
    const matchIndex = headers.indexOf('Match');
    const winnerIndex = headers.indexOf('Winner');
    if (dateIndex === -1 || matchIndex === -1 || winnerIndex === -1) {
      return res.status(500).json({ error: 'Required columns not found' });
    }

    // Locate the fixture row by matching the provided date and match.
    let rowFound = false;
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[dateIndex] === date && row[matchIndex] === match) {
        data[i][winnerIndex] = newWinner;
        rowFound = true;
        break;
      }
    }

    if (!rowFound) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    // Update the sheet with the new fixture result.
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Predictions Overview!A1:Z1000',
      valueInputOption: 'RAW',
      requestBody: { values: data },
    });

    // Log the update activity.
    const timestampEST = DateTime.now().setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm:ss');
    const adminName = session.user?.name || session.user?.email; // Use full name if available
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Activity Log!A:D',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[timestampEST, 'FIXTURE_UPDATED', adminName, `Match ${match} Winner: ${newWinner}`]],
      },
    });

    // (Optional) Trigger leaderboard evaluation here if desired.

    return res.status(200).json({ message: 'Fixture updated successfully' });
  } catch (error) {
    console.error('Error updating fixture:', error);
    return res.status(500).json({ error: 'Error updating fixture' });
  }
}