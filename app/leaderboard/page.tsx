// app/leaderboard/page.tsx
'use client';

import React from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Button, IconButton, Collapse } from '@mui/material';
import { styled } from '@mui/system';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';

const StyledTableCell = styled(TableCell)({
  backgroundColor: '#f5f5f5',
});

interface Player {
  name: string;
  groupPoints: number;
  super8Points: number;
  playoffPoints: number;
  bonusPoints: number;
  totalPoints: number;
  timestamp: string;
}

const Leaderboard = () => {
  const { data: session, status } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openRows, setOpenRows] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/sheets', { cache: "no-store" });
        const result = await response.json();
    
        if (response.ok) {
          const playersData = calculateLeaderboard(
            result.groupStage,
            result.super8,
            result.playoffs,
            result.bonuses,
            result.links
          );
  
          setPlayers([...playersData]); // Force state update
        } else {
          setError(result.error);
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred");
        }
      }
    };
  
    if (session) {
      fetchData();
    } else {
      console.log("⚠️ No session detected, skipping fetch.");
    }
  }, [session]);

  const handleRowClick = (playerName: string) => {
    setOpenRows(prev => ({ ...prev, [playerName]: !prev[playerName] }));
  };

  if (status === 'loading') {
    return <Typography align="center" color="primary">Loading...</Typography>;
  }

  if (!session) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
        <Typography align="center" color="error" gutterBottom>
          Please sign in to view the leaderboard.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => signIn()}>
          Sign In
        </Button>
      </Box>
    );
  }

  if (error) {
    return <Typography align="center" color="error">Error: {error}</Typography>;
  }

  if (players.length === 0) {
    return <Typography align="center" color="primary">Loading...</Typography>;
  }

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h4" align="center" gutterBottom>
          Leaderboard
        </Typography>
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow>
                <StyledTableCell />
                <StyledTableCell><Typography variant="h6">Rank</Typography></StyledTableCell>
                <StyledTableCell><Typography variant="h6">Player</Typography></StyledTableCell>
                <StyledTableCell><Typography variant="h6">Total Points</Typography></StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map((player, index) => (
                <React.Fragment key={player.name}>
                  <TableRow key={player.name} onClick={() => handleRowClick(player.name)}>
                    <TableCell>
                      <IconButton size="small">
                        {openRows[player.name] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{player.name}</TableCell>
                    <TableCell>{player.totalPoints}</TableCell>
                  </TableRow>
                  <TableRow key={`${player.name}-details`}>
                    <TableCell colSpan={4} style={{ paddingBottom: 0, paddingTop: 0 }}>
                      <Collapse in={openRows[player.name]} timeout="auto" unmountOnExit>
                        <Box margin={1}>
                          <Typography variant="h6" gutterBottom component="div">
                            Points Breakdown
                          </Typography>
                          <Table size="small" aria-label="points breakdown">
                            <TableBody>
                              <TableRow key={`${player.name}-groupPoints`}>
                                <TableCell>Groups</TableCell>
                                <TableCell>{player.groupPoints}</TableCell>
                              </TableRow>
                              <TableRow key={`${player.name}-playoffPoints`}>
                                <TableCell>Playoffs</TableCell>
                                <TableCell>{player.playoffPoints}</TableCell>
                              </TableRow>
                              <TableRow key={`${player.name}-bonusPoints`}>
                                <TableCell>Bonuses</TableCell>
                                <TableCell>{player.bonusPoints}</TableCell>
                              </TableRow>
                              <TableRow key={`${player.name}-timestamp`}>
                                <TableCell>Time</TableCell>
                                <TableCell>{player.timestamp}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
};

export default Leaderboard;

const calculateLeaderboard = (
  groupStageData: any[][],
  super8Data: any[][],
  playoffsData: any[][],
  bonusesData: any[][],
  linksData: any[][]
): Player[] => {
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

  // Helper function to process predictions for a given stage.
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

  // Process Group Stage (always)
  if (groupStageData && groupStageData.length > 0) {
    processPredictions(groupStageData, 10, "Group Stage");
  } else {
    console.error("Group Stage data is empty or invalid");
  }

  // Process Super 8 if available
  if (super8Data && super8Data.length > 0) {
    processPredictions(super8Data, 15, "Super 8");
  } else {
    console.log("Super 8 data is empty; skipping.");
  }

  // Process Playoffs if available
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

  // Process Bonuses if available
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

  // --- New Step: Ensure Every Player Column from Group Stage Is Represented
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

  // Process timestamps from links data if available
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

  // Build and return the final sorted leaderboard array
  return Object.entries(players)
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
};
