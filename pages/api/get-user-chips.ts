// pages/api/get-user-chips.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const name = session.user?.name;
  if (!name) {
    return res.status(400).json({ error: 'No user name found in session' });
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
    // Assume header is in row 1.
    // Find the row matching the user name (case-insensitive)
    const userRow = rows.find((row, index) => index > 0 && row[0]?.trim().toLowerCase() === name.trim().toLowerCase());

    if (!userRow) {
      // No chip data found for user. Return empty values.
      return res.status(200).json({ name, doubleUp: null, wildcard: null });
    }

    // Return the chip values (or null if empty)
    const doubleUp = userRow[1] && userRow[1].trim() !== '' ? parseInt(userRow[1], 10) : null;
    const wildcard = userRow[2] && userRow[2].trim() !== '' ? parseInt(userRow[2], 10) : null;

    return res.status(200).json({ name, doubleUp, wildcard });
  } catch (error) {
    console.error('Error fetching user chips:', error);
    return res.status(500).json({ error: 'Error fetching user chips' });
  }
}