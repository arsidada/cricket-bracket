// pages/api/sheets.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });

  if (!session) {
    console.error('Unauthorized access');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_CREDENTIALS!, 'base64').toString('utf-8')
    );

    const { client_email, private_key } = credentials;

    if (!client_email || !private_key) {
      console.error('Missing client_email or private_key in credentials');
      return res.status(500).json({ error: 'Missing client_email or private_key in credentials' });
    }

    const auth = new google.auth.JWT({
      email: client_email,
      key: private_key,
      scopes: SCOPES,
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const [groupStageResponse, super8Response, playoffsResponse, linksResponse, bonusesResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: 'Predictions Overview!A1:Z1000',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: 'Super8!A1:Z1000',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: 'Playoffs!A1:Z1000',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: 'Links!A1:C1000',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: 'Bonuses Overview!A1:Z1000',
      }),
    ]);

    return res.status(200).json({
      groupStage: groupStageResponse.data.values,
      super8: super8Response.data.values,
      playoffs: playoffsResponse.data.values,
      links: linksResponse.data.values,
      bonuses: bonusesResponse.data.values,
    });
  } catch (error) {
    console.error('Error fetching Google Sheets data:', error);
    return res.status(500).json({ error: 'Error fetching data' });
  }
}
