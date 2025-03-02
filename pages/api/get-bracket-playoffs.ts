// pages/api/get-bracket-playoffs.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { name } = req.query;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid name parameter' });
  }
  
  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Fetch fixture picks from the "Playoffs" tab (Semi-finals)
    const playoffsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Playoffs!A1:Z1000',
    });
    const playoffsData = playoffsResponse.data.values;
    if (!playoffsData || playoffsData.length === 0) {
      return res.status(404).json({ error: 'Playoffs sheet is empty' });
    }
    const playoffsHeaders = playoffsData[0];
    const userColumnIndex = playoffsHeaders.indexOf(name);
    const playoffsPicks: { [match: number]: string } = {};
    if (userColumnIndex !== -1) {
        const playoffsOffset = 12;
        for (let i = 1; i < playoffsData.length; i++) {
          if (playoffsData[i][userColumnIndex]) {
            // Add the offset so that row index 2 corresponds to match 13, row index 3 to match 14, etc.
            playoffsPicks[i + playoffsOffset] = playoffsData[i][userColumnIndex];
          }
        }
    }
    
    // Fetch fixture picks from the "Finals" tab
    const finalsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: 'Finals!A1:Z1000',
    });
    const finalsData = finalsResponse.data.values;
    let finalsPicks: { [match: number]: string } = {};
    if (finalsData && finalsData.length > 0) {
      const finalsHeaders = finalsData[0];
      const finalsUserColIndex = finalsHeaders.indexOf(name);
      if (finalsUserColIndex !== -1) {
        for (let i = 1; i < finalsData.length; i++) {
          if (finalsData[i][finalsUserColIndex]) {
            finalsPicks[i] = finalsData[i][finalsUserColIndex];
          }
        }
      }
    }
    
    return res.status(200).json({ playoffsPicks, finalsPicks });
  } catch (error) {
    console.error('Error fetching playoff bracket picks:', error);
    return res.status(500).json({ error: 'Error fetching data' });
  }
}