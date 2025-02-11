// pages/api/refresh-leaderboard.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { google } from 'googleapis';
import { DateTime } from 'luxon';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

/**
 * Leaderboard evaluation function.
 * This is a simplified version based on your current client-side logic.
 * You may extract and refactor your existing function into a shared module.
 */
function calculateLeaderboard(
  groupStageData: any[][],
  super8Data: any[][],
  playoffsData: any[][],
  bonusesData: any[][],
  linksData: any[][]
) {
  const players: {
    [key: string]: {
      groupPoints: number;
      super8Points: number;
      playoffPoints: number;
      bonusPoints: number;
      totalPoints: number;
      timestamp: string;
    };
  } = {};

  const processPredictions = (data: any[][], pointsPerCorrectPick: number, stage: string) => {
    const header = data[0];
    if (!header || !Array.isArray(header) || !header.includes('Winner')) {
      console.error("Winner column not found in", data);
      return;
    }
    const winnerIndex = header.indexOf('Winner');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const winner = row[winnerIndex];
      if (!winner) continue;

      for (let j = 0; j < header.length; j++) {
        const playerName = header[j];
        if (!['Date', 'Match', 'Team 1', 'Team 2', 'Winner', 'POTM'].includes(playerName)) {
          if (!players[playerName]) {
            players[playerName] = { groupPoints: 0, super8Points: 0, playoffPoints: 0, bonusPoints: 0, totalPoints: 0, timestamp: '' };
          }
          if (winner === "DRAW") {
            players[playerName].totalPoints += 5;
            if (stage === "Group Stage") {
              players[playerName].groupPoints += 5;
            } else if (stage === "Super 8") {
              players[playerName].super8Points += 5;
            } else if (stage === "Playoffs Semi-finals" || stage === "Playoffs Final") {
              players[playerName].playoffPoints += 5;
            }
          } else if (row[j] === winner) {
            players[playerName].totalPoints += pointsPerCorrectPick;
            if (stage === "Group Stage") {
              players[playerName].groupPoints += pointsPerCorrectPick;
            } else if (stage === "Super 8") {
              players[playerName].super8Points += pointsPerCorrectPick;
            } else if (stage === "Playoffs Semi-finals" || stage === "Playoffs Final") {
              players[playerName].playoffPoints += pointsPerCorrectPick;
            }
          }
        }
      }
    }
  };

  if (groupStageData && groupStageData.length > 0) {
    processPredictions(groupStageData, 10, "Group Stage");
  } else {
    console.error("Group Stage data is empty or invalid");
  }

  if (super8Data && super8Data.length > 0) {
    processPredictions(super8Data, 15, "Super 8");
  } else {
    console.log("Super 8 data is empty; skipping.");
  }

  if (playoffsData && playoffsData.length > 0) {
    if (playoffsData.length >= 3) {
      processPredictions(playoffsData.slice(0, 3), 20, "Playoffs Semi-finals");
    } else {
      console.log("Playoffs data has fewer than 3 rows; skipping semi-finals processing.");
    }
    if (playoffsData.length >= 5) {
      processPredictions(playoffsData.slice(3, 5), 30, "Playoffs Final");
    } else {
      console.log("Playoffs data has fewer than 5 rows; skipping final processing.");
    }
  } else {
    console.log("Playoffs data is empty; skipping.");
  }

  const processBonuses = (data: any[][]) => {
    const header = data[0];
    if (!header || !Array.isArray(header) || !header.includes('Winner')) {
      console.error("Winner column not found in bonuses", data);
      return;
    }
    const winnerIndex = header.indexOf('Winner');
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const winner = row[winnerIndex];
      if (!winner) continue;
      for (let j = 0; j < header.length; j++) {
        const playerName = header[j];
        if (playerName !== 'Category' && playerName !== 'WINNER') {
          if (!players[playerName]) {
            players[playerName] = { groupPoints: 0, super8Points: 0, playoffPoints: 0, bonusPoints: 0, totalPoints: 0, timestamp: '' };
          }
          if (row[j] === winner) {
            players[playerName].bonusPoints += 10;
            players[playerName].totalPoints += 10;
          }
        }
      }
    }
  };

  if (bonusesData && bonusesData.length > 0) {
    processBonuses(bonusesData);
  } else {
    console.error("Bonuses data is empty or invalid");
  }

  if (groupStageData && groupStageData.length > 0) {
    const header = groupStageData[0];
    header.forEach((col: string) => {
      if (!['Date', 'Match', 'Team 1', 'Team 2', 'Winner', 'POTM'].includes(col)) {
        if (!players[col]) {
          players[col] = { groupPoints: 0, super8Points: 0, playoffPoints: 0, bonusPoints: 0, totalPoints: 0, timestamp: '' };
        }
      }
    });
  }

  if (linksData && linksData.length > 0) {
    const linksHeader = linksData[0];
    const nameIndex = linksHeader.indexOf('Players');
    const timestampIndex = linksHeader.indexOf('Timestamp of submission');
    for (let i = 1; i < linksData.length; i++) {
      const row = linksData[i];
      const playerName = row[nameIndex];
      const timestamp = row[timestampIndex];
      if (players[playerName]) {
        players[playerName].timestamp = timestamp;
      }
    }
  } else {
    console.error("Links data is empty or invalid");
  }

  const leaderboard = Object.entries(players)
    .map(([name, { groupPoints, super8Points, playoffPoints, bonusPoints, totalPoints, timestamp }]) => ({
      name,
      groupPoints,
      super8Points,
      playoffPoints,
      bonusPoints,
      totalPoints,
      timestamp,
    }))
    .sort((a, b) =>
      b.totalPoints - a.totalPoints ||
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  return leaderboard;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session || session.user?.email !== adminEmail) {
    return res.status(401).json({ error: 'Unauthorized: Admin only' });
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    // Fetch sheet data from various tabs.
    const [groupStageRes, super8Res, playoffsRes, bonusesRes, linksRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Predictions Overview!A1:Z1000' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Super8!A1:Z1000' }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Playoffs!A1:Z1000' }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Bonuses Overview!A1:Z1000' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Links!A:B' }),
    ]);

    const groupStageData = groupStageRes.data.values || [];
    const super8Data = super8Res.data.values || [];
    const playoffsData = playoffsRes.data.values || [];
    const bonusesData = bonusesRes.data.values || [];
    const linksData = linksRes.data.values || [];

    // Evaluate the leaderboard using our function.
    const leaderboard = calculateLeaderboard(groupStageData, super8Data, playoffsData, bonusesData, linksData);

    // Prepare a snapshot array for the "Leaderboard" tab.
    const leaderboardValues = [
      ['Rank', 'Player', 'Group Points', 'Super8 Points', 'Playoffs Points', 'Total Points', 'Timestamp'],
      ...leaderboard.map((player, index) => [
        index + 1,
        player.name,
        player.groupPoints,
        player.super8Points,
        player.playoffPoints,
        player.totalPoints,
        player.timestamp,
      ]),
    ];

    // Update (or create) the "Leaderboard" tab with the snapshot.
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Leaderboard!A1:G1000',
      valueInputOption: 'RAW',
      requestBody: { values: leaderboardValues },
    });

    return res.status(200).json({ message: 'Leaderboard refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing leaderboard:', error);
    return res.status(500).json({ error: 'Error refreshing leaderboard' });
  }
}