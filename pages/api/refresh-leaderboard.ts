// pages/api/refresh-leaderboard.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { google } from 'googleapis';
import { DateTime } from 'luxon';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

/**
 * Leaderboard evaluation function.
 * The doubleUpChips mapping is used for Group Stage processing:
 * For each player, if they used a Double Up chip on a given match and their pick was correct,
 * they receive double the points.
 */
function calculateLeaderboard(
  groupStageData: any[][],
  super8Data: any[][],
  playoffsData: any[][],
  bonusesData: any[][],
  linksData: any[][],
  doubleUpChips: { [player: string]: number } // mapping from player name to match number
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

  const processPredictions = (
    data: any[][],
    pointsPerCorrectPick: number,
    stage: string,
    doubleUpMap?: { [player: string]: number }
  ) => {
    const header = data[0];
    if (!header || !Array.isArray(header) || !header.includes('Winner')) {
      console.error("Winner column not found in", data);
      return;
    }
    const winnerIndex = header.indexOf('Winner');

    // Assume each row (starting at index 1) represents a match.
    // We use the row index as the match number.
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const winner = row[winnerIndex];
      if (!winner) continue;
      const matchNumber = i; // row index equals match number

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
            // For Group Stage, if the player used a Double Up chip for this match, double the points.
            let pointsAwarded = pointsPerCorrectPick;
            if (stage === "Group Stage" && doubleUpMap && doubleUpMap[playerName] === matchNumber) {
              pointsAwarded = pointsPerCorrectPick * 2;
            }
            players[playerName].totalPoints += pointsAwarded;
            if (stage === "Group Stage") {
              players[playerName].groupPoints += pointsAwarded;
            } else if (stage === "Super 8") {
              players[playerName].super8Points += pointsAwarded;
            } else if (stage === "Playoffs Semi-finals" || stage === "Playoffs Final") {
              players[playerName].playoffPoints += pointsAwarded;
            }
          }
        }
      }
    }
  };

  if (groupStageData && groupStageData.length > 0) {
    processPredictions(groupStageData, 10, "Group Stage", doubleUpChips);
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

  // Return the players object so that we can build the leaderboard snapshot later.
  return players;
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
    const [
      groupStageRes,
      super8Res,
      playoffsRes,
      bonusesRes,
      linksRes,
      chipsRes
    ] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Predictions Overview!A1:Z1000' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Super8!A1:Z1000' }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Playoffs!A1:Z1000' }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Bonuses Overview!A1:Z1000' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Links!A:B' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Chips!A:C' }).catch(() => ({ data: { values: [] } }))
    ]);

    const groupStageData = groupStageRes.data.values || [];
    const super8Data = super8Res.data.values || [];
    const playoffsData = playoffsRes.data.values || [];
    const bonusesData = bonusesRes.data.values || [];
    const linksData = linksRes.data.values || [];
    const chipsRows = chipsRes.data.values || [];

    // Build a mapping for Double Up chips from the Chips tab.
    const doubleUpChips: { [player: string]: number } = {};
    // Also build a mapping for Wildcard chips.
    const wildcardChips: { [player: string]: number } = {};
    if (chipsRows.length > 1) {
      for (let i = 1; i < chipsRows.length; i++) {
        const row = chipsRows[i];
        const player = row[0];
        const doubleUpValue = row[1]; // Column B for Double Up
        const wildcardValue = row[2]; // Column C for Wildcard
        if (player && doubleUpValue && doubleUpValue.trim() !== '') {
          doubleUpChips[player] = parseInt(doubleUpValue, 10);
        }
        if (player && wildcardValue && wildcardValue.trim() !== '') {
          wildcardChips[player] = parseInt(wildcardValue, 10);
        }
      }
    }

    // Determine the last completed fixture from Group Stage data.
    // We assume that each row (starting at index 1) corresponds to a match,
    // and we use the "Winner" column (found at index determined below).
    let lastFixture = 0;
    if (groupStageData.length > 1) {
      const header = groupStageData[0];
      const winnerIndex = header.indexOf('Winner');
      for (let i = 1; i < groupStageData.length; i++) {
        const row = groupStageData[i];
        if (row[winnerIndex] && row[winnerIndex].trim() !== '') {
          lastFixture = i; // use the row index as the match number
        }
      }
    }

    // Evaluate the leaderboard.
    const players = calculateLeaderboard(groupStageData, super8Data, playoffsData, bonusesData, linksData, doubleUpChips);

    // For each player, determine which chips have been used
    // (only include chips if the chip's match number is <= lastFixture)
    const chipsUsedMapping: { [player: string]: string } = {};
    Object.keys(players).forEach((player) => {
      let used: string[] = [];
      if (doubleUpChips[player] && doubleUpChips[player] <= lastFixture) {
        used.push("Double Up");
      }
      if (wildcardChips[player] && wildcardChips[player] <= lastFixture) {
        used.push("Wildcard");
      }
      chipsUsedMapping[player] = used.join(", ");
    });

    // Prepare a snapshot array for the "Leaderboard" tab.
    // Updated header to include "Chips Used".
    const leaderboardValues = [
      ['Rank', 'Player', 'Group Points', 'Super8 Points', 'Playoffs Points', 'Total Points', 'Timestamp', 'Chips Used'],
      ...Object.entries(players)
        .map(([name, { groupPoints, super8Points, playoffPoints, bonusPoints, totalPoints, timestamp }]) => ({
          name,
          groupPoints,
          super8Points,
          playoffPoints,
          totalPoints,
          timestamp,
        }))
        .sort((a, b) =>
          b.totalPoints - a.totalPoints ||
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        .map((player, index) => [
          index + 1,
          player.name,
          player.groupPoints,
          player.super8Points,
          player.playoffPoints,
          player.totalPoints,
          player.timestamp,
          chipsUsedMapping[player.name] || ''
        ]),
    ];

    // Update (or create) the "Leaderboard" tab with the snapshot.
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Leaderboard!A1:H1000',
      valueInputOption: 'RAW',
      requestBody: { values: leaderboardValues },
    });

    return res.status(200).json({ message: 'Leaderboard refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing leaderboard:', error);
    return res.status(500).json({ error: 'Error refreshing leaderboard' });
  }
}