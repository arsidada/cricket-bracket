// app/leaderboard/page.tsx
'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Button } from '@mui/material';
import { styled } from '@mui/system';

const StyledTableCell = styled(TableCell)({
  backgroundColor: '#f5f5f5',
});

interface Player {
  name: string;
  points: number;
  timestamp: string;
}

const Leaderboard = () => {
  const { data: session, status } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/sheets');
        const result = await response.json();
        if (response.ok) {
          const playersData = calculateLeaderboard(result.groupStage, result.super8, result.links);
          setPlayers(playersData);
        } else {
          setError(result.error);
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      }
    };

    if (session) {
      fetchData();
    }
  }, [session]);

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
                <StyledTableCell><Typography variant="h6">Rank</Typography></StyledTableCell>
                <StyledTableCell><Typography variant="h6">Player</Typography></StyledTableCell>
                <StyledTableCell><Typography variant="h6">Points</Typography></StyledTableCell>
                {/* <StyledTableCell><Typography variant="h6">Submission</Typography></StyledTableCell> */}
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map((player, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{player.name}</TableCell>
                  <TableCell>{player.points}</TableCell>
                  {/* <TableCell>{player.timestamp}</TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
};

export default Leaderboard;

const calculateLeaderboard = (groupStageData: any[][], super8Data: any[][], linksData: any[][]): Player[] => {
  const header = groupStageData[0];
  const players: { [key: string]: { points: number, timestamp: string } } = {};

  const winnerIndex = header.indexOf('Winner');

  if (winnerIndex === -1) {
    throw new Error("Winner column not found");
  }

  // Process Group Stage
  for (let i = 1; i < groupStageData.length; i++) {
    const row = groupStageData[i];
    const winner = row[winnerIndex];

    if (!winner) {
      break;
    }

    if (winner === "DRAW") {
      header.forEach(columnName => {
        if (![header[winnerIndex], 'Date', 'Match', 'Team 1', 'Team 2', 'POTM'].includes(columnName)) {
          if (!players[columnName]) {
            players[columnName] = { points: 0, timestamp: '' };
          }
          players[columnName].points += 5;
        }
      });
    } else {
      for (let j = 0; j < header.length; j++) {
        const columnName = header[j];
        if (![header[winnerIndex], 'Date', 'Match', 'Team 1', 'Team 2', 'POTM'].includes(columnName)) {
          if (!players[columnName]) {
            players[columnName] = { points: 0, timestamp: '' };
          }
          if (row[j] === winner) {
            players[columnName].points += 10;
          }
        }
      }
    }
  }

  // Process Super 8
  for (let i = 1; i < super8Data.length; i++) {
    const row = super8Data[i];
    const winner = row[winnerIndex];

    if (!winner) {
      break;
    }

    if (winner === "DRAW") {
      header.forEach(columnName => {
        if (![header[winnerIndex], 'Date', 'Match', 'Team 1', 'Team 2', 'POTM'].includes(columnName)) {
          if (!players[columnName]) {
            players[columnName] = { points: 0, timestamp: '' };
          }
          players[columnName].points += 5;
        }
      });
    } else {
      for (let j = 0; j < header.length; j++) {
        const columnName = header[j];
        if (![header[winnerIndex], 'Date', 'Match', 'Team 1', 'Team 2', 'POTM'].includes(columnName)) {
          if (!players[columnName]) {
            players[columnName] = { points: 0, timestamp: '' };
          }
          if (row[j] === winner) {
            players[columnName].points += 15;
          }
        }
      }
    }
  }

  // Add timestamps
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

  return Object.entries(players)
    .map(([name, { points, timestamp }]) => ({ name, points, timestamp }))
    .sort((a, b) => b.points - a.points || new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};
