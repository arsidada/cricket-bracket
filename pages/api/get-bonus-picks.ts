// pages/api/get-all-bonus-picks.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch bonus picks from the "Bonuses Overview" sheet.
    const bonusResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Bonuses Overview!A1:Z1000',
    });
    const bonusData = bonusResponse.data.values;
    if (!bonusData || bonusData.length === 0) {
      return res.status(404).json({ error: 'Bonuses Overview sheet is empty' });
    }

    // The first row is assumed to be headers: the first cell is "Category", followed by player names.
    const header = bonusData[0];

    // Initialize a mapping for bonus picks: { [playerName]: { [category]: pick } }
    const bonusPicks: { [player: string]: { [category: string]: string } } = {};

    // Loop over each player column (starting at index 1)
    for (let colIndex = 1; colIndex < header.length; colIndex++) {
      const playerName = header[colIndex];
      // Skip the column if it is "WINNERS"
      if (playerName && playerName.trim().toUpperCase() === "WINNER") {
        continue;
      }
      if (playerName) {
        bonusPicks[playerName] = {};
        // For each subsequent row, use the first column as the bonus category.
        for (let rowIndex = 1; rowIndex < bonusData.length; rowIndex++) {
          const row = bonusData[rowIndex];
          const category = row[0]; // Bonus category
          const value = row[colIndex] || "";
          if (category) {
            bonusPicks[playerName][category] = value;
          }
        }
      }
    }

    return res.status(200).json({ bonusPicks });
  } catch (error) {
    console.error('Error fetching all bonus picks:', error);
    return res.status(500).json({ error: 'Error fetching all bonus picks' });
  }
}