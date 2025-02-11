// app/fixtures/page.tsx
'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState, ChangeEvent } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  CircularProgress,
  TextField,
  Snackbar,
  Select,
  MenuItem,
  SelectChangeEvent,
  Alert as MuiAlert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { styled } from '@mui/system';

interface Fixture {
  date: string;
  match: string;
  team1: string;
  team2: string;
  winner: string;
  picks: { [key: string]: string };
  // Optionally, you could include an ID or row index here if needed.
  rowIndex?: number;
}

const WinnerTypography = styled(Typography)({
  color: 'green',
  fontWeight: 'bold',
});

const Fixtures = () => {
  const { data: session, status } = useSession();
  const [groupStageFixtures, setGroupStageFixtures] = useState<Fixture[]>([]);
  const [super8Fixtures, setSuper8Fixtures] = useState<Fixture[]>([]);
  const [playoffFixtures, setPlayoffFixtures] = useState<Fixture[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/sheets', { cache: 'no-store' });
        const result = await response.json();

        if (response.ok) {
          const groupStageData = transformData(result.groupStage);
          let super8Data: Fixture[] = [];
          let playoffData: Fixture[] = [];

          if (result.super8 && !result.super8.errors) {
            super8Data = transformData(result.super8);
          }
          if (result.playoffs && !result.playoffs.errors) {
            playoffData = transformData(result.playoffs);
          }

          setGroupStageFixtures(groupStageData);
          setSuper8Fixtures(super8Data);
          setPlayoffFixtures(playoffData);
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
      <Container>
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
        <Typography align="center" color="primary">
          Loading...
        </Typography>
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
      <Container>
        <Typography align="center" color="error">
          Error: {error}
        </Typography>
      </Container>
    );
  }

  if (groupStageFixtures.length === 0 && super8Fixtures.length === 0 && playoffFixtures.length === 0) {
    return (
      <Container>
        <Typography align="center" color="primary">
          Loading...
        </Typography>
      </Container>
    );
  }

  const AdminFixtureUpdate = ({ fixture }: { fixture: Fixture }) => {
    const [newWinner, setNewWinner] = useState<string>(fixture.winner);
    const [updating, setUpdating] = useState<boolean>(false);
  
    const handleChange = (event: SelectChangeEvent<string>) => {
      setNewWinner(event.target.value);
    };
  
    const handleUpdate = async () => {
      // Validate that newWinner is one of the two teams.
      if (newWinner !== fixture.team1 && newWinner !== fixture.team2) {
        setSnackbar({ open: true, message: 'Please select a valid team', severity: 'error' });
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
          setSnackbar({ open: true, message: 'Fixture updated successfully!', severity: 'success' });
          // Optionally refresh fixtures data here or update the local state.
        } else {
          setSnackbar({ open: true, message: result.error || 'Update failed', severity: 'error' });
        }
      } catch (err) {
        setSnackbar({ open: true, message: 'An error occurred while updating', severity: 'error' });
      } finally {
        setUpdating(false);
      }
    };
  
    return (
      <Box sx={{ mt: 2, p: 1, borderTop: '1px solid #ccc' }}>
        <Typography variant="subtitle2">Admin: Update Fixture Result</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Select
            value={newWinner}
            onChange={handleChange}
            size="small"
            sx={{ minWidth: 120 }}
          >
            <MenuItem value={fixture.team1}>{fixture.team1}</MenuItem>
            <MenuItem value={fixture.team2}>{fixture.team2}</MenuItem>
          </Select>
          <Button variant="contained" color="primary" onClick={handleUpdate} disabled={updating}>
            {updating ? 'Updating...' : 'Update Fixture'}
          </Button>
        </Box>
      </Box>
    );
  };

  // Helper: Render a single fixture in an Accordion
  const renderFixtureAccordion = (fixture: Fixture, index: number) => {
    return (
      <Accordion key={index} sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1">
              {fixture.date} – Match {fixture.match}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              {fixture.team1 === fixture.winner ? (
                <WinnerTypography variant="h6">{fixture.team1}</WinnerTypography>
              ) : (
                <Typography variant="h6">{fixture.team1}</Typography>
              )}
              {fixture.team2 === fixture.winner ? (
                <WinnerTypography variant="h6">{fixture.team2}</WinnerTypography>
              ) : (
                <Typography variant="h6">{fixture.team2}</Typography>
              )}
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2">Players picking {fixture.team1}:</Typography>
              {Object.entries(fixture.picks)
                .filter(([player, pick]) => pick === fixture.team1)
                .map(([player]) => (
                  <Typography key={player} variant="body2">
                    {player}
                  </Typography>
                ))}
            </Box>
            <Box>
              <Typography variant="subtitle2">Players picking {fixture.team2}:</Typography>
              {Object.entries(fixture.picks)
                .filter(([player, pick]) => pick === fixture.team2)
                .map(([player]) => (
                  <Typography key={player} variant="body2">
                    {player}
                  </Typography>
                ))}
            </Box>
            {/* If user is admin, show the update fixture component */}
            {session.user?.email === 'arsalan.rana@gmail.com' && <AdminFixtureUpdate fixture={fixture} />}
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Fixtures
      </Typography>

      {playoffFixtures.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Playoffs
          </Typography>
          {playoffFixtures.map((fixture, index) => renderFixtureAccordion(fixture, index))}
        </Box>
      )}

      {super8Fixtures.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Super 8
          </Typography>
          {super8Fixtures.map((fixture, index) => renderFixtureAccordion(fixture, index))}
        </Box>
      )}

      {groupStageFixtures.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Group Stage
          </Typography>
          {groupStageFixtures.map((fixture, index) => renderFixtureAccordion(fixture, index))}
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <MuiAlert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Container>
  );
};

export default Fixtures;

// Helper function to transform sheet data into Fixture objects.
// Optionally, you can also add a row index or unique ID to each fixture.
const transformData = (data: any[][] | undefined): Fixture[] => {
  if (!data || data.length === 0) {
    return [];
  }

  const header = data[0];
  const fixtures: Fixture[] = [];

  const dateIndex = header.indexOf('Date');
  const matchIndex = header.indexOf('Match');
  const team1Index = header.indexOf('Team 1');
  const team2Index = header.indexOf('Team 2');
  const winnerIndex = header.indexOf('Winner');

  if (dateIndex === -1 || matchIndex === -1 || team1Index === -1 || team2Index === -1 || winnerIndex === -1) {
    throw new Error("Required columns not found");
  }

  let lastCompletedFixtureIndex = -1;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[dateIndex] === 'Date' && row[matchIndex] === 'Match') {
      continue; // Skip duplicate header rows
    }
    const winner = row[winnerIndex];

    if (winner) {
      lastCompletedFixtureIndex = i;
    }

    const fixture: Fixture = {
      date: row[dateIndex],
      match: row[matchIndex],
      team1: row[team1Index],
      team2: row[team2Index],
      winner: row[winnerIndex],
      picks: {},
      rowIndex: i, // Optionally keep track of the row index
    };

    for (let j = 0; j < header.length; j++) {
      const columnName = header[j];
      if (![header[dateIndex], header[matchIndex], header[team1Index], header[team2Index], 'Winner', 'POTM'].includes(columnName)) {
        fixture.picks[columnName] = row[j];
      }
    }

    fixtures.push(fixture);
  }

  let fixturesToShow = lastCompletedFixtureIndex + 1 < fixtures.length ? lastCompletedFixtureIndex + 1 : fixtures.length;
  if (fixturesToShow === 0) {
    fixturesToShow = lastCompletedFixtureIndex + 1 < fixtures.length ? lastCompletedFixtureIndex + 2 : fixtures.length;
  }
  return fixtures.slice(0, fixturesToShow).reverse();
};