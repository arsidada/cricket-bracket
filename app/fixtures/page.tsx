'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Button } from '@mui/material';
import { styled } from '@mui/system';

interface Fixture {
  date: string;
  match: string;
  team1: string;
  team2: string;
  winner: string;
  picks: { [key: string]: string };
}

const HighlightedTypography = styled(Typography)({
  fontWeight: 'bold',
  color: '#1976d2', // Use Material UI's primary color as a hex value
});

const StyledTableCell = styled(TableCell)({
  backgroundColor: '#f5f5f5',
  textAlign: 'center',
});

const WinnerTypography = styled(Typography)({
  color: 'green',
  fontWeight: 'bold',
});

const Fixtures = () => {
  const { data: session, status } = useSession();
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/sheets');
        const result = await response.json();
        if (response.ok) {
          const fixturesData = transformData(result);
          setFixtures(fixturesData);
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
          Please sign in to view the fixtures.
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

  if (fixtures.length === 0) {
    return <Typography align="center" color="primary">Loading...</Typography>;
  }

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" align="center" gutterBottom>
          Fixtures
        </Typography>
        {fixtures.map((fixture, index) => (
          <Box key={index} mb={4}>
            <HighlightedTypography variant="h6" gutterBottom>{fixture.date} - {fixture.match}</HighlightedTypography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <StyledTableCell>
                      {fixture.team1 === fixture.winner ? (
                        <WinnerTypography variant="h6">{fixture.team1}</WinnerTypography>
                      ) : (
                        <Typography variant="h6">{fixture.team1}</Typography>
                      )}
                    </StyledTableCell>
                    <StyledTableCell>
                      {fixture.team2 === fixture.winner ? (
                        <WinnerTypography variant="h6">{fixture.team2}</WinnerTypography>
                      ) : (
                        <Typography variant="h6">{fixture.team2}</Typography>
                      )}
                    </StyledTableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <StyledTableCell>
                      <Box display="flex" flexDirection="column" alignItems="flex-start">
                        {Object.entries(fixture.picks).map(([player, pick]) => (
                          pick === fixture.team1 && <Typography key={player}>{player}</Typography>
                        ))}
                      </Box>
                    </StyledTableCell>
                    <StyledTableCell>
                      <Box display="flex" flexDirection="column" alignItems="flex-start">
                        {Object.entries(fixture.picks).map(([player, pick]) => (
                          pick === fixture.team2 && <Typography key={player}>{player}</Typography>
                        ))}
                      </Box>
                    </StyledTableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))}
      </Box>
    </Container>
  );
};

export default Fixtures;

const transformData = (data: any[][]): Fixture[] => {
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
    };

    for (let j = 0; j < header.length; j++) {
      const columnName = header[j];
      if (![header[dateIndex], header[matchIndex], header[team1Index], header[team2Index], 'Winner', 'POTM'].includes(columnName)) {
        fixture.picks[columnName] = row[j];
      }
    }

    fixtures.push(fixture);
  }

  const fixturesToShow = lastCompletedFixtureIndex + 1 < fixtures.length ? lastCompletedFixtureIndex + 2 : fixtures.length;
  return fixtures.slice(0, fixturesToShow).reverse();
};
