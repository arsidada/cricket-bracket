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
          const playersData = calculateLeaderboard(result);
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
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" align="center" gutterBottom>
          Leaderboard
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <StyledTableCell><Typography variant="h6">Player</Typography></StyledTableCell>
                <StyledTableCell><Typography variant="h6">Points</Typography></StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map((player, index) => (
                <TableRow key={index}>
                  <StyledTableCell>{player.name}</StyledTableCell>
                  <StyledTableCell>{player.points}</StyledTableCell>
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

const calculateLeaderboard = (data: any[][]): Player[] => {
  const header = data[0];
  const players: { [key: string]: number } = {};

  const winnerIndex = header.indexOf('Winner');

  if (winnerIndex === -1) {
    throw new Error("Winner column not found");
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const winner = row[winnerIndex];

    if (!winner) {
      break;
    }

    for (let j = 0; j < header.length; j++) {
      const columnName = header[j];
      if (![header[winnerIndex], 'Date', 'Match', 'Team 1', 'Team 2', 'POTM'].includes(columnName)) {
        if (!players[columnName]) {
          players[columnName] = 0;
        }
        if (row[j] === winner) {
          players[columnName] += 10;
        }
      }
    }
  }

  return Object.entries(players)
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points); // Sort by points in descending order
};
