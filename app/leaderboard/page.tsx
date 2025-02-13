// app/leaderboard/page.tsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  IconButton,
  Collapse,
  Snackbar,
  Button,
} from '@mui/material';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { styled } from '@mui/system';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { Divider } from '@mui/material';

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const StyledTableCell = styled(TableCell)({
  backgroundColor: '#f5f5f5',
});

interface Player {
  rank: string;
  name: string;
  groupPoints: number;
  playoffPoints: number;
  bonusPoints: number;
  totalPoints: number;
  timestamp: string;
}

type StandingsDelta = { [playerName: string]: 'up' | 'down' | 'same' };

const Leaderboard = () => {
  const { data: session, status } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openRows, setOpenRows] = useState<{ [key: string]: boolean }>({});
  const [deltaMap, setDeltaMap] = useState<StandingsDelta>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Use a ref to store previous players for calculating standing changes.
  const prevPlayersRef = useRef<Player[]>([]);

  const fetchLeaderboardSnapshot = async () => {
    try {
      const response = await fetch('/api/leaderboard-snapshot', { cache: 'no-store' });
      if (response.status === 404) {
        // Snapshot not found; set players to empty so headers show.
        setPlayers([]);
        return;
      }
      const result = await response.json();
      if (response.ok) {
        const newPlayers: Player[] = result.players;
        // Calculate delta by comparing newPlayers with previous snapshot.
        const newDeltaMap: StandingsDelta = {};
        newPlayers.forEach((player, index) => {
          const prevIndex = prevPlayersRef.current.findIndex((p) => p.name === player.name);
          if (prevIndex === -1) {
            newDeltaMap[player.name] = 'same';
          } else if (index < prevIndex) {
            newDeltaMap[player.name] = 'up';
          } else if (index > prevIndex) {
            newDeltaMap[player.name] = 'down';
          } else {
            newDeltaMap[player.name] = 'same';
          }
        });
        setDeltaMap(newDeltaMap);
        setPlayers(newPlayers);
        prevPlayersRef.current = newPlayers;
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  useEffect(() => {
    if (session) {
      fetchLeaderboardSnapshot();
    }
  }, [session]);

  const handleRowClick = (playerName: string) => {
    setOpenRows((prev) => ({ ...prev, [playerName]: !prev[playerName] }));
  };

  // Updated onClose handler to match Snackbar type requirements.
  const handleSnackbarClose = (event: React.SyntheticEvent<Element, Event> | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
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

  return (
    <Container maxWidth="md" sx={{ pt: 4 }}> {/* Minimal top padding */}
      <Box my={4}>
        <Typography variant="h4" align="center" gutterBottom>
          Leaderboard
        </Typography>
        {players.length === 0 ? (
          <Typography align="center" color="primary">
            {'No leaderboard data available.'}
          </Typography>
        ) : (
          <TableContainer component={Paper} elevation={3}>
            <Table>
              <TableHead>
                <TableRow>
                  <StyledTableCell />
                  <StyledTableCell>
                    <Typography variant="h6">Rank</Typography>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Typography variant="h6">Player</Typography>
                  </StyledTableCell>
                  <StyledTableCell>
                    <Typography variant="h6">Total Points</Typography>
                  </StyledTableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {players.map((player) => (
                  <React.Fragment key={player.name}>
                    <TableRow onClick={() => handleRowClick(player.name)}>
                      <TableCell>
                        <IconButton size="small">
                          {openRows[player.name] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        {player.rank}
                        {deltaMap[player.name] === 'up' && (
                          <ArrowUpwardIcon
                            style={{ color: 'green', verticalAlign: 'middle', marginLeft: 4 }}
                            fontSize="small"
                          />
                        )}
                        {deltaMap[player.name] === 'down' && (
                          <ArrowDownwardIcon
                            style={{ color: 'red', verticalAlign: 'middle', marginLeft: 4 }}
                            fontSize="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell>{player.totalPoints}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={4} style={{ paddingBottom: 0, paddingTop: 0 }}>
                        <Collapse in={openRows[player.name]} timeout="auto" unmountOnExit>
                          <Box margin={1}>
                            <Typography variant="h6" gutterBottom>
                              Points Breakdown
                            </Typography>
                            <Box sx={{ borderTop: '1px solid #ccc', mt: 1 }}>
                              <Typography variant="body2" sx={{ pt: 1 }}>
                                Groups: {player.groupPoints}
                              </Typography>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="body2">
                                Playoffs: {player.playoffPoints}
                              </Typography>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="body2">
                                Bonuses: {player.bonusPoints}
                              </Typography>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="body2" sx={{ pb: 1 }}>
                                Time: {player.timestamp}
                              </Typography>
                            </Box>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Leaderboard;