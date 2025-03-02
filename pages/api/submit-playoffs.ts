// pages/api/submit-playoffs.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import { google } from 'googleapis';
import { DateTime } from 'luxon';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Helper function to log an activity event
const logActivity = async (
  sheets: any,
  spreadsheetId: string,
  timestamp: string,
  eventType: string,
  user: string,
  details: string = ''
) => {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Activity Log!A:D',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[timestamp, eventType, user, details]],
      },
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized - No session found' });
  }

  const { name, picks } = req.body;
  if (!name || typeof name !== 'string' || !picks || typeof picks !== 'object') {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });
    // Convert current time to Eastern Time
    const timestampEST = DateTime.now().setZone('America/New_York').toFormat('yyyy-MM-dd HH:mm:ss');

    // Step 1: Fetch existing sheet data from "Playoffs"
    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Playoffs!A1:Z1000',
    });
    const data = sheetResponse.data.values;
    if (!data || data.length === 0) {
      return res.status(500).json({ error: 'Sheet is empty' });
    }

    const headers = data[0];
    let userColumnIndex = headers.indexOf(name);
    let eventType = '';
    let eventDetails = '';

    // Step 2: If user doesn't have a column, add one (new submission)
    if (userColumnIndex === -1) {
      eventType = 'PLAYOFFS_SUBMITTED';
      eventDetails = 'submitted their playoffs picks';
      userColumnIndex = headers.length;
      headers.push(name);
      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: 'Playoffs!A1:Z1',
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      });
    } else {
      // Existing column – update submission
      eventType = 'PLAYOFFS_UPDATED';
      eventDetails = 'updated their playoffs picks';
    }

    // Step 3: Update each row with the user's picks.
    // Use an offset so that match number 13 maps to row 2 (index 1) and match 14 maps to row 3 (index 2).
    // In this example, offset = 11.
    const updatedData = [...data];
    const offset = 12;
    for (const matchNumber in picks) {
      const numericMatch = parseInt(matchNumber, 10);
      const rowIndex = numericMatch - offset;
      if (!updatedData[rowIndex]) updatedData[rowIndex] = [];
      updatedData[rowIndex][userColumnIndex] = picks[matchNumber];
    }

    // Step 4: Update the "Playoffs" sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Playoffs!A1:Z1000',
      valueInputOption: 'RAW',
      requestBody: { values: updatedData },
    });

    // Step 5: Log the activity
    await logActivity(
      sheets,
      process.env.GOOGLE_SHEET_ID!,
      timestampEST,
      eventType,
      name,
      eventDetails
    );

    return res.status(200).json({ message: 'Playoffs picks submitted successfully' });
  } catch (error) {
    console.error('Error submitting playoffs picks:', error);
    return res.status(500).json({ error: 'Error submitting playoffs picks' });
  }
}