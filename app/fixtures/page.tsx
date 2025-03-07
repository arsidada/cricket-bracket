'use client';

import { useSession, signIn } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Skeleton,
  Alert,
  Grid,
  Chip,
  Snackbar,
  Select,
  MenuItem,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { styled } from '@mui/material/styles';
import { DateTime } from 'luxon';
import { SelectChangeEvent } from '@mui/material';

// Mapping for team flags (using emoji)
const teamFlags: { [key: string]: string } = {
  'New Zealand': '🇳🇿',
  India: '🇮🇳',
  Bangladesh: '🇧🇩',
  Pakistan: '🇵🇰',
  'South Africa': '🇿🇦',
  Australia: '🇦🇺',
  England: '🇬🇧',
  Afghanistan: '🇦🇫',
};

// A larger, styled Chip that includes flags
const BigChip = styled(Chip)(({ theme }) => ({
  fontSize: '1.2rem',
  padding: '8px 12px',
  height: 'auto',
}));

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
};

interface Fixture {
  date: string;
  match: string;
  team1: string;
  team2: string;
  winner: string;
  picks: { [key: string]: string };
  rowIndex?: number;
};

/**
 * AdminFixtureUpdate
 *
 * This component allows the admin to update the fixture result.
 */
const AdminFixtureUpdate = ({
  fixture,
  setSnackbar,
}: {
  fixture: Fixture;
  setSnackbar: React.Dispatch<React.SetStateAction<SnackbarState>>;
}) => {
  const [newWinner, setNewWinner] = useState<string>(fixture.winner);
  const [updating, setUpdating] = useState<boolean>(false);

  const handleChange = (event: SelectChangeEvent<string>) => {
    setNewWinner(event.target.value);
  };

  const handleUpdate = async () => {
    if (newWinner !== fixture.team1 && newWinner !== fixture.team2 && newWinner !== 'DRAW') {
      setSnackbar({ open: true, message: 'Please select a valid team or "DRAW"', severity: 'error' });
      return;
    }
    setUpdating(true);
    try {
      const response = await fetch('/api/update-fixture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: fixture.date,
          match: fixture.match,
          newWinner,
        }),
      });
      const result = await response.json();
      if (response.ok) {
        const lbResponse = await fetch('/api/refresh-leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const lbResult = await lbResponse.json();
        if (lbResponse.ok) {
          setSnackbar({ open: true, message: 'Fixture and leaderboard updated successfully!', severity: 'success' });
        } else {
          setSnackbar({ open: true, message: lbResult.error || 'Fixture updated but leaderboard refresh failed', severity: 'error' });
        }
      } else {
        setSnackbar({ open: true, message: result.error || 'Fixture update failed', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'An error occurred while updating', severity: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid #ccc' }}>
      <Typography variant="subtitle2">Admin: Update Fixture Result</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <Select value={newWinner} onChange={handleChange} size="small" sx={{ minWidth: 120 }}>
          <MenuItem value={fixture.team1}>{fixture.team1}</MenuItem>
          <MenuItem value={fixture.team2}>{fixture.team2}</MenuItem>
          <MenuItem value="DRAW">DRAW</MenuItem>
        </Select>
        <Button variant="contained" color="primary" onClick={handleUpdate} disabled={updating}>
          {updating ? 'Updating...' : 'Update Fixture'}
        </Button>
      </Box>
    </Box>
  );
};

// Styled Accordion for fixture cards
const StyledAccordion = styled(Accordion)(({ theme }) => ({
  boxShadow: theme.shadows[3],
  borderRadius: theme.spacing(1),
  marginBottom: theme.spacing(2),
  '&:before': { display: 'none' },
}));

// Accordion component for each fixture
const FixtureAccordion = ({
  fixture,
  session,
  setSnackbar,
}: {
  fixture: Fixture;
  session: any;
  setSnackbar: React.Dispatch<React.SetStateAction<SnackbarState>>;
}) => {
  const team1Picks = Object.entries(fixture.picks)
    .filter(([_, pick]) => pick === fixture.team1)
    .map(([player]) => player);
  const team2Picks = Object.entries(fixture.picks)
    .filter(([_, pick]) => pick === fixture.team2)
    .map(([player]) => player);

  return (
    <StyledAccordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ width: '100%', textAlign: 'center' }}>
          <Typography variant="subtitle1">
            {fixture.date} – Match {fixture.match}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 1 }}>
            <BigChip
              label={`${teamFlags[fixture.team1] || ''} ${fixture.team1}`}
              color={
                fixture.winner === 'DRAW'
                  ? 'warning'
                  : fixture.team1 === fixture.winner
                  ? 'success'
                  : 'default'
              }
            />
            <BigChip
              label={`${teamFlags[fixture.team2] || ''} ${fixture.team2}`}
              color={
                fixture.winner === 'DRAW'
                  ? 'warning'
                  : fixture.team2 === fixture.winner
                  ? 'success'
                  : 'default'
              }
            />
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {`${teamFlags[fixture.team1] || ''} ${fixture.team1}`} Picks:
            </Typography>
            {team1Picks.length > 0 ? (
              team1Picks.map((player) => (
                <Typography key={player} variant="body2">
                  {player}
                </Typography>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No picks yet.
              </Typography>
            )}
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {`${teamFlags[fixture.team2] || ''} ${fixture.team2}`} Picks:
            </Typography>
            {team2Picks.length > 0 ? (
              team2Picks.map((player) => (
                <Typography key={player} variant="body2">
                  {player}
                </Typography>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No picks yet.
              </Typography>
            )}
          </Grid>
        </Grid>
        {session.user?.email === 'arsalan.rana@gmail.com' && (
          <AdminFixtureUpdate fixture={fixture} setSnackbar={setSnackbar} />
        )}
      </AccordionDetails>
    </StyledAccordion>
  );
};

// Generic function to transform sheet data into Fixture objects.
const transformData = (data: any[][] | undefined): Fixture[] => {
  if (!data || data.length === 0) return [];
  const header = data[0];
  const fixtures: Fixture[] = [];
  const dateIndex = header.indexOf('Date');
  const matchIndex = header.indexOf('Match');
  const team1Index = header.indexOf('Team 1');
  const team2Index = header.indexOf('Team 2');
  const winnerIndex = header.indexOf('Winner');
  if ([dateIndex, matchIndex, team1Index, team2Index, winnerIndex].includes(-1)) {
    throw new Error('Required columns not found');
  }
  let lastCompletedFixtureIndex = -1;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[dateIndex] === 'Date' && row[matchIndex] === 'Match') continue;
    if (row[winnerIndex]) lastCompletedFixtureIndex = i;
    const fixture: Fixture = {
      date: row[dateIndex],
      match: row[matchIndex],
      team1: row[team1Index],
      team2: row[team2Index],
      winner: row[winnerIndex],
      picks: {},
      rowIndex: i,
    };
    for (let j = 0; j < header.length; j++) {
      const columnName = header[j];
      if (![header[dateIndex], header[matchIndex], header[team1Index], header[team2Index], 'Winner', 'POTM'].includes(columnName)) {
        fixture.picks[columnName] = row[j];
      }
    }
    fixtures.push(fixture);
  }
  let fixturesToShow =
    lastCompletedFixtureIndex + 1 < fixtures.length ? lastCompletedFixtureIndex + 1 : fixtures.length;
  if (fixturesToShow === 0) {
    fixturesToShow = lastCompletedFixtureIndex + 2 < fixtures.length ? lastCompletedFixtureIndex + 2 : fixtures.length;
  }
  return fixtures.slice(0, fixturesToShow).reverse();
};

const Fixtures = () => {
  const { data: session, status } = useSession();
  const [groupStageFixtures, setGroupStageFixtures] = useState<Fixture[]>([]);
  const [playoffsFixtures, setPlayoffsFixtures] = useState<Fixture[]>([]);
  const [finalsFixtures, setFinalsFixtures] = useState<Fixture[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/sheets', { cache: 'no-store' });
        const result = await response.json();
        if (response.ok) {
          setGroupStageFixtures(transformData(result.groupStage));
          setPlayoffsFixtures(transformData(result.playoffs));
          setFinalsFixtures(transformData(result.finals));
        } else {
          setError(result.error || 'An error occurred while fetching data');
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
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <Skeleton variant="rectangular" height={150} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={150} sx={{ mb: 2 }} />
      </Container>
    );
  }

  if (!session) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
        <Typography align="center" color="error" gutterBottom>
          Please sign in to view the fixtures.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => signIn()}>
          Sign In
        </Button>
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">Error: {error}</Alert>
      </Container>
    );
  }

  // Determine current Eastern time and the playoffs start time (March 4th, 4:00AM ET)
  const nowEastern = DateTime.now().setZone('America/New_York');
  const playoffsStart = DateTime.fromISO('2025-03-04T04:00:00', { zone: 'America/New_York' });
  const finalsStart = DateTime.fromISO('2025-03-09T04:00:00', { zone: 'America/New_York' });
  const showPlayoffs = nowEastern >= playoffsStart;
  const showFinals = nowEastern >= finalsStart;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Fixtures
      </Typography>

      {/* Finals Section - only show if finals fixture exists and both teams are set */}
      {showFinals && finalsFixtures.length > 0 && finalsFixtures[0].team1 && finalsFixtures[0].team2 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Finals
          </Typography>
          {finalsFixtures.map((fixture, index) => (
            <FixtureAccordion key={`finals-${index}`} fixture={fixture} session={session} setSnackbar={setSnackbar} />
          ))}
        </Box>
      )}

      {/* Playoffs Section - only show if the current time is past the playoffs start time */}
      {showPlayoffs && playoffsFixtures.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Playoffs
          </Typography>
          {playoffsFixtures.map((fixture, index) => (
            <FixtureAccordion key={`playoffs-${index}`} fixture={fixture} session={session} setSnackbar={setSnackbar} />
          ))}
        </Box>
      )}

      {/* Group Stage Section */}
      {groupStageFixtures.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Group Stage
          </Typography>
          {groupStageFixtures.map((fixture, index) => (
            <FixtureAccordion key={`group-${index}`} fixture={fixture} session={session} setSnackbar={setSnackbar} />
          ))}
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={(event, reason) => {
          if (reason !== 'clickaway') {
            setSnackbar({ ...snackbar, open: false });
          }
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={(event: React.SyntheticEvent, reason?: string) => {
            if (reason !== 'clickaway') {
              setSnackbar({ ...snackbar, open: false });
            }
          }}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Fixtures;