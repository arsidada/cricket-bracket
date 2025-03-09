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
  // newWinner may be one of the teams or "DRAW"
  if (!date || !match || newWinner === undefined || newWinner === null) {
    return res.status(400).json({ error: 'Missing required fields: date, match, or newWinner' });
  }

  // Parse match number (assuming match is sent as a number or numeric string)
  const matchNumber = Number(match);
  if (isNaN(matchNumber)) {
    return res.status(400).json({ error: 'Invalid match number' });
  }

  // Determine which bracket the fixture belongs to:
  // Group Stage: match 1-12, Playoffs: match 13-14, Finals: match 15+
  let bracketType: 'group' | 'playoffs' | 'finals' = 'group';
  if (matchNumber >= 13 && matchNumber < 15) {
    bracketType = 'playoffs';
  } else if (matchNumber >= 15) {
    bracketType = 'finals';
  }

  // Set sheet range and offset based on bracket type.
  let range = '';
  let offset = 0;
  if (bracketType === 'group') {
    range = 'Predictions Overview!A1:Z1000';
  } else if (bracketType === 'playoffs') {
    range = 'Playoffs!A1:Z1000';
    offset = 12; // Using the same offset as in submission logic.
  } else if (bracketType === 'finals') {
    range = 'Finals!A1:Z1000';
    // For finals, assume the fixture is stored in the first row after the header.
    // So, set offset = matchNumber - 1 to always target row index 1.
    offset = matchNumber - 1;
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

    // Fetch the current sheet data from the appropriate tab.
    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
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

    // Calculate the expected row index in the sheet.
    // For group and finals, we assume row number equals the match number (with finals adjusted by offset).
    // For playoffs, apply the offset.
    const targetRowIndex = matchNumber - offset;

    if (targetRowIndex < 1 || targetRowIndex >= data.length) {
      return res.status(404).json({ error: 'Fixture row not found in the sheet' });
    }

    const row = data[targetRowIndex];
    // Use trimmed values for comparison.
    if (row[dateIndex].trim() !== date.trim() || row[matchIndex].toString().trim() !== match.toString().trim()) {
      console.warn('Mismatch in fixture data; proceeding with update.');
    }

    // Update the Winner column for the target row.
    data[targetRowIndex][winnerIndex] = newWinner;

    // Update the sheet with the new fixture result.
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: data },
    });

    // Log the update activity.
    const timestampEST = DateTime.now().setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm:ss');
    const adminName = session.user?.name || session.user?.email;
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Activity Log!A:D',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[timestampEST, 'FIXTURE_UPDATED', adminName, `Match ${match} Winner: ${newWinner}`]],
      },
    });

    return res.status(200).json({ message: 'Fixture updated successfully' });
  } catch (error) {
    console.error('Error updating fixture:', error);
    return res.status(500).json({ error: 'Error updating fixture' });
  }
}