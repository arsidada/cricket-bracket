// pages/api/submit-chips.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Check session for authorization.
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized - No session found' });
  }

  // Extract user and chip data from the request body.
  const { name, chips } = req.body;
  if (
    !name ||
    typeof name !== 'string' ||
    !chips ||
    typeof chips !== 'object'
  ) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  // Validate chip fields.
  // They can be omitted if not activated, but if provided, they should be numbers (fixture identifiers).
  if (chips.doubleUp !== undefined && typeof chips.doubleUp !== 'number') {
    return res.status(400).json({ error: 'Invalid doubleUp chip data' });
  }
  if (chips.wildcard !== undefined && typeof chips.wildcard !== 'number') {
    return res.status(400).json({ error: 'Invalid wildcard chip data' });
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    // Define the range to fetch the entire Chips tab.
    // Assume header row is in row 1.
    const chipsSheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Chips!A1:C1000',
    });

    let rows = chipsSheetResponse.data.values || [];

    // If the sheet is empty, initialize header row.
    if (rows.length === 0) {
      rows.push(["Player", "DoubleUp", "Wildcard"]);
    }

    // Assume the header row is row 1.
    const header = rows[0];
    // Ensure our expected header columns are there.
    if (header.length < 3) {
      header[0] = "Player";
      header[1] = "DoubleUp";
      header[2] = "Wildcard";
      rows[0] = header;
      // Write header row back if needed.
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Chips!A1:C1',
        valueInputOption: 'RAW',
        requestBody: { values: [header] },
      });
    }

    // Look for an existing row for the player (starting at row 2).
    let playerRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] && rows[i][0].toString().trim() === name.trim()) {
        playerRowIndex = i;
        break;
      }
    }

    // Prepare the updated chip values.
    // We'll update the DoubleUp (column B) and Wildcard (column C) values.
    const newDoubleUp = chips.doubleUp !== undefined ? chips.doubleUp.toString() : null;
    const newWildcard = chips.wildcard !== undefined ? chips.wildcard.toString() : null;

    if (playerRowIndex === -1) {
      // No row exists for this player, so append a new row.
      const newRow = [name, newDoubleUp ?? '', newWildcard ?? ''];
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Chips!A:C',
        valueInputOption: 'RAW',
        requestBody: {
          values: [newRow],
        },
      });
    } else {
      // Row exists—update it.
      // Update the in-memory row.
      const currentRow = rows[playerRowIndex];
      // Ensure the row has at least 3 columns.
      while (currentRow.length < 3) {
        currentRow.push('');
      }
      // If a chip value is provided, update that column.
      if (newDoubleUp !== null) {
        currentRow[1] = newDoubleUp;
      }
      if (newWildcard !== null) {
        currentRow[2] = newWildcard;
      }
      // Prepare the range for this row.
      // Google Sheets rows are 1-indexed, so row number is playerRowIndex+1.
      const updateRange = `Chips!A${playerRowIndex + 1}:C${playerRowIndex + 1}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: updateRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: [currentRow],
        },
      });
    }

    return res.status(200).json({ message: 'Chips submitted successfully' });
  } catch (error) {
    console.error('Error submitting chips:', error);
    return res.status(500).json({ error: 'Error submitting chips' });
  }
}