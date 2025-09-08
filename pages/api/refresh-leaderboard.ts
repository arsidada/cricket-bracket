// pages/api/refresh-leaderboard.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { google } from 'googleapis';
import { DateTime } from 'luxon';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Set the deadline as a Luxon DateTime in EST.
const deadlineDT = DateTime.fromISO("2025-09-09T18:30:00", { zone: "America/New_York" });

// Hardcoded bonus points mapping for Asia Cup 2025.
// Update this with the actual participants and their bonus points.
const hardcodedBonusPoints: { [player: string]: number } = {
  // Add Asia Cup 2025 participants here
  // Example:
  // "Player Name": 10,
};

/**
 * Leaderboard evaluation function.
 * 
 * For Group Stage: if a player used a Double Up chip on a match and their pick was correct,
 * they receive double the points. In case of a DRAW, the base points are 5 (or 10 if a Double Up chip was used).
 * Also, if a submission is late, a penalty is applied.
 * 
 * For Super 8: a fixed point is awarded per correct pick.
 * 
 * For Playoffs and Finals: Each fixture has a pool (160 points for playoffs semi‑finals, 260 for finals)
 * that is split equally (using Math.floor) among the players who picked the winning team.
 */
function calculateLeaderboard(
  groupStageData: any[][],
  super4Data: any[][],
  playoffsData: any[][],
  finalsData: any[][],
  bonusesData: any[][], // ignored in favor of hardcoded bonus map.
  linksData: any[][],
  doubleUpChips: { [player: string]: number },
  submissionTimeMap: { [player: string]: DateTime }
) {
  const players: {
    [key: string]: {
      groupPoints: number;
      super4Points: number;
      playoffPoints: number;
      bonusPoints: number;
      totalPoints: number;
      timestamp: string;
      penalty: number;
    };
  } = {};

  // Helper: initialize a player's record if not already done.
  const initPlayer = (playerName: string) => {
    if (!players[playerName]) {
      players[playerName] = {
        groupPoints: 0,
        super4Points: 0,
        playoffPoints: 0,
        bonusPoints: 0,
        totalPoints: 0,
        timestamp: '',
        penalty: 0,
      };
    }
  };

  const processPredictions = (
    data: any[][],
    pointsPerCorrectPick: number, // used for Group Stage and Super8 (ignored for playoffs/finals)
    stage: string,
    doubleUpMap?: { [player: string]: number }
  ) => {
    const header = data[0];
    if (!header || !Array.isArray(header) || !header.includes('Winner')) {
      console.error("Winner column not found in", data);
      return;
    }
    const winnerIndex = header.indexOf('Winner');

    // For each match row (row index i represents a match)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const winner = row[winnerIndex];
      if (!winner) continue;
      const matchNumber = i; // using row index as match number

      if (stage === "Playoffs Semi-finals" || stage === "Playoffs Final" || stage === "Finals" || stage === "Super 4") {
        let pool = 0;
        if (stage === "Playoffs Semi-finals") {
          pool = 160;
        } else if (stage === "Playoffs Final") {
          pool = 160; // If you have separate pool for playoffs final, adjust here.
        } else if (stage === "Finals") {
          pool = 260;
        } else if (stage === "Super 4") {
          pool = 160; // Same pool as playoffs for Super 4 matches
        }
        // Count the number of players who picked the winner.
        let correctCount = 0;
        for (let j = 0; j < header.length; j++) {
          const playerName = header[j];
          if (!['Date', 'Match', 'Team 1', 'Team 2', 'Winner', 'POTM'].includes(playerName)) {
            if (row[j] === winner) {
              correctCount++;
            }
          }
        }
        if (correctCount > 0) {
          const pointsAwarded = Math.floor(pool / correctCount);
          for (let j = 0; j < header.length; j++) {
            const playerName = header[j];
            if (!['Date', 'Match', 'Team 1', 'Team 2', 'Winner', 'POTM'].includes(playerName)) {
              initPlayer(playerName);
              if (row[j] === winner) {
                players[playerName].totalPoints += pointsAwarded;
                players[playerName].playoffPoints += pointsAwarded;
              }
            }
          }
        }
      } else {
        // For Group Stage and Super 4.
        for (let j = 0; j < header.length; j++) {
          const playerName = header[j];
          if (!['Date', 'Match', 'Team 1', 'Team 2', 'Winner', 'POTM'].includes(playerName)) {
            initPlayer(playerName);
            if (winner === "DRAW") {
              let pointsAwarded = 5;
              if (stage === "Group Stage" && doubleUpMap && doubleUpMap[playerName] === matchNumber) {
                pointsAwarded = 10;
              }
              players[playerName].totalPoints += pointsAwarded;
              if (stage === "Group Stage") {
                players[playerName].groupPoints += pointsAwarded;
              } else if (stage === "Super 4") {
                players[playerName].super4Points += pointsAwarded;
              }
            } else if (row[j] === winner) {
              if (stage === "Group Stage") {
                const submission = submissionTimeMap[playerName];
                if (submission && submission > deadlineDT) {
                  const diffDays = submission.diff(deadlineDT, 'days').days;
                  const lateMatches = Math.ceil(diffDays);
                  if (matchNumber <= lateMatches) {
                    players[playerName].penalty -= 10;
                    players[playerName].totalPoints -= 10;
                    players[playerName].groupPoints -= 10;
                    continue; // Skip awarding points for this match.
                  }
                }
              }
              let pointsAwarded = pointsPerCorrectPick;
              if (stage === "Group Stage" && doubleUpMap && doubleUpMap[playerName] === matchNumber) {
                pointsAwarded = pointsPerCorrectPick * 2;
              }
              players[playerName].totalPoints += pointsAwarded;
              if (stage === "Group Stage") {
                players[playerName].groupPoints += pointsAwarded;
              } else if (stage === "Super 4") {
                players[playerName].super4Points += pointsAwarded;
              }
            }
          }
        }
      }
    }
  };

  // Process Group Stage predictions: base points = 10.
  if (groupStageData && groupStageData.length > 0) {
    processPredictions(groupStageData, 10, "Group Stage", doubleUpChips);
  } else {
    console.error("Group Stage data is empty or invalid");
  }

  // Process Super 4 predictions: pool-based scoring like playoffs.
  if (super4Data && super4Data.length > 0) {
    processPredictions(super4Data, 0, "Super 4");
  } else {
    console.log("Super 4 data is empty; skipping.");
  }

  // Process Playoffs predictions.
  if (playoffsData && playoffsData.length > 0) {
    if (playoffsData.length >= 3) {
      processPredictions(playoffsData.slice(0, 3), 0, "Playoffs Semi-finals");
    } else {
      console.log("Playoffs data has fewer than 3 rows; skipping semi-finals processing.");
    }
    if (playoffsData.length >= 5) {
      processPredictions(playoffsData.slice(3, 5), 0, "Playoffs Final");
    } else {
      console.log("Playoffs data has fewer than 5 rows; skipping final processing.");
    }
  } else {
    console.log("Playoffs data is empty; skipping.");
  }

  // Process Finals predictions.
  if (finalsData && finalsData.length > 0) {
    processPredictions(finalsData, 0, "Finals");
  } else {
    console.log("Finals data is empty; skipping.");
  }

  // Build submission time mapping from linksData.
  if (linksData && linksData.length > 0) {
    const linksHeader = linksData[0];
    const nameIndex = linksHeader.indexOf('Players');
    const timestampIndex = linksHeader.indexOf('Timestamp of submission');
    for (let i = 1; i < linksData.length; i++) {
      const row = linksData[i];
      const playerName = row[nameIndex];
      const timestamp = row[timestampIndex];
      if (playerName && timestamp) {
        players[playerName].timestamp = timestamp;
      }
    }
  } else {
    console.error("Links data is empty or invalid");
  }

  // Now, for each player already in our players object, lookup bonus points from the hardcoded map.
  Object.keys(players).forEach((playerName) => {
    const bonus = hardcodedBonusPoints[playerName] || 0;
    players[playerName].bonusPoints = bonus;
    players[playerName].totalPoints += bonus;
  });

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

    // Fetch previous leaderboard snapshot to get previous ranks.
    let prevRankMapping: { [player: string]: number } = {};
    try {
      const currentSnapshotRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Leaderboard!A2:K1000',
      });
      const currentData = currentSnapshotRes.data.values;
      if (currentData && currentData.length > 0) {
        // Assuming header: [Rank, Previous Rank, Player, Group Points, Super4 Points, Playoffs Points, Bonus Points, Total Points, Penalty, Timestamp, Chips Used]
        for (const row of currentData) {
          const playerName = row[2]; // Column C: Player
          const prevRank = Number(row[0]); // Column A: Rank from previous snapshot
          if (playerName && !isNaN(prevRank)) {
            prevRankMapping[playerName] = prevRank;
          }
        }
      }
    } catch (e) {
      console.log("No previous snapshot found; starting fresh.");
    }

    // Fetch sheet data from various tabs.
    const [
      groupStageRes,
      super8Res,
      playoffsRes,
      finalsRes,
      bonusesRes, // ignored
      linksRes,
      chipsRes
    ] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Predictions Overview!A1:Z1000' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Super4!A1:Z1000' }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Playoffs!A1:Z1000' }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Finals!A1:Z1000' }).catch(() => ({ data: { values: [] } })),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Bonuses Overview!A1:Z1000' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Links!A:B' }),
      sheets.spreadsheets.values.get({ spreadsheetId, range: 'Chips!A:C' }).catch(() => ({ data: { values: [] } }))
    ]);

    const groupStageData = groupStageRes.data.values || [];
    const super4Data = super8Res.data.values || [];
    const playoffsData = playoffsRes.data.values || [];
    const finalsData = finalsRes.data.values || [];
    const bonusesData: any[] = []; // Explicitly typed as any[]
    const linksData = linksRes.data.values || [];
    const chipsRows = chipsRes.data.values || [];

    // Build chip mappings.
    const doubleUpChips: { [player: string]: number } = {};
    const wildcardChips: { [player: string]: number } = {};
    if (chipsRows.length > 1) {
      for (let i = 1; i < chipsRows.length; i++) {
        const row = chipsRows[i];
        const player = row[0];
        const doubleUpValue = row[1];
        const wildcardValue = row[2];
        if (player && doubleUpValue && doubleUpValue.trim() !== '') {
          doubleUpChips[player] = parseInt(doubleUpValue, 10);
        }
        if (player && wildcardValue && wildcardValue.trim() !== '') {
          wildcardChips[player] = parseInt(wildcardValue, 10);
        }
      }
    }

    // Determine the last completed fixture from Group Stage.
    let lastFixture = 0;
    if (groupStageData.length > 1) {
      const header = groupStageData[0];
      const winnerIndex = header.indexOf('Winner');
      for (let i = 1; i < groupStageData.length; i++) {
        const row = groupStageData[i];
        if (row[winnerIndex] && row[winnerIndex].trim() !== '') {
          lastFixture = i;
        }
      }
    }

    // Build submission times mapping from linksData.
    const submissionTimeMap: { [player: string]: DateTime } = {};
    if (linksData && linksData.length > 0) {
      const linksHeader = linksData[0];
      const nameIndex = linksHeader.indexOf('Players');
      const timestampIndex = linksHeader.indexOf('Timestamp of submission');
      for (let i = 1; i < linksData.length; i++) {
        const row = linksData[i];
        const playerName = row[nameIndex];
        const timestampStr = row[timestampIndex];
        if (playerName && timestampStr) {
          submissionTimeMap[playerName] = DateTime.fromFormat(timestampStr, "yyyy-MM-dd HH:mm:ss", { zone: "America/New_York" });
        }
      }
    }

    // Evaluate the leaderboard.
    const players = calculateLeaderboard(
      groupStageData,
      super4Data,
      playoffsData,
      finalsData,
      bonusesData,
      linksData,
      doubleUpChips,
      submissionTimeMap
    );

    // Determine chips used.
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
    // New header: [Rank, Previous Rank, Player, Group Points, Super4 Points, Playoffs Points, Bonus Points, Total Points, Penalty, Timestamp, Chips Used]
    const leaderboardValues = [
      ['Rank', 'Previous Rank', 'Player', 'Group Points', 'Super4 Points', 'Playoffs Points', 'Bonus Points', 'Total Points', 'Penalty', 'Timestamp', 'Chips Used'],
      ...Object.entries(players)
        .map(([name, { groupPoints, super4Points, playoffPoints, bonusPoints, totalPoints, timestamp, penalty }]) => {
          // Look up bonus points from our hardcoded mapping (defaulting to 0)
          const bonus = hardcodedBonusPoints[name] || 0;
          return {
            name,
            groupPoints,
            super4Points,
            playoffPoints,
            bonusPoints: bonus,
            totalPoints: totalPoints, // totalPoints already had bonus added in calculateLeaderboard, if applicable
            penalty,
            timestamp,
          };
        })
        .sort((a, b) =>
          b.totalPoints - a.totalPoints ||
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        .map((player, index) => [
          index + 1,
          prevRankMapping[player.name] || '',
          player.name,
          player.groupPoints,
          player.super4Points,
          player.playoffPoints,
          player.bonusPoints,
          player.totalPoints,
          player.penalty,
          player.timestamp,
          chipsUsedMapping[player.name] || ''
        ]),
    ];

    // Update the "Leaderboard" tab.
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Leaderboard!A1:K1000',
      valueInputOption: 'RAW',
      requestBody: { values: leaderboardValues },
    });

    return res.status(200).json({ message: 'Leaderboard refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing leaderboard:', error);
    return res.status(500).json({ error: 'Error refreshing leaderboard' });
  }
}