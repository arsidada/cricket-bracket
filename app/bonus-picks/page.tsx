'use client';

import React, { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Container,
  Typography,
  Paper,
  Box,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Button,
  Divider,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert as MuiAlert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ViewListIcon from '@mui/icons-material/ViewList';
import GridOnIcon from '@mui/icons-material/GridOn';
import { SnackbarCloseReason } from '@mui/material';

const Alert = React.forwardRef<HTMLDivElement, any>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

interface BonusPicksData {
  // Mapping: player name => { bonus category => pick }
  [player: string]: {
    [category: string]: string;
  };
}

// Transformed type: bonus category => { player => pick }
interface CategoryBonusPicks {
  [category: string]: {
    [player: string]: string;
  };
}

type ViewMode = 'accordion' | 'table';

const AllBonusPicksAllPage = () => {
  const { data: session, status } = useSession();
  const [bonusPicks, setBonusPicks] = useState<BonusPicksData>({});
  const [transformedData, setTransformedData] = useState<CategoryBonusPicks>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [viewMode, setViewMode] = useState<ViewMode>('accordion');

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = (event: React.SyntheticEvent | Event, reason: SnackbarCloseReason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Fetch bonus picks from the API endpoint.
  const fetchBonusPicks = async () => {
    setLoading(true);
    try {
      // Call the endpoint without a name query parameter so it returns all bonus picks.
      const res = await fetch('/api/get-bonus-picks', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setBonusPicks(data.bonusPicks);
      } else {
        const errMsg = data.error || 'Failed to fetch bonus picks';
        setError(errMsg);
        showSnackbar(errMsg, 'error');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errMsg);
      showSnackbar(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Transform bonusPicks from a player-keyed mapping to a category-keyed mapping,
  // filtering out any key that is "WINNERS".
  const transformData = (data: BonusPicksData) => {
    const categoryMap: CategoryBonusPicks = {};
    Object.entries(data).forEach(([player, picks]) => {
      if (player.trim().toUpperCase() === "WINNERS") return;
      Object.entries(picks).forEach(([category, pick]) => {
        if (!categoryMap[category]) {
          categoryMap[category] = {};
        }
        categoryMap[category][player] = pick;
      });
    });
    setTransformedData(categoryMap);
  };

  // For table view, also prepare a list of player names (excluding "WINNERS").
  const playerList = bonusPicks ? Object.keys(bonusPicks).filter(name => name.trim().toUpperCase() !== "WINNERS") : [];

  useEffect(() => {
    if (session) {
      fetchBonusPicks();
    }
  }, [session]);

  useEffect(() => {
    if (Object.keys(bonusPicks).length > 0) {
      transformData(bonusPicks);
    }
  }, [bonusPicks]);

  if (status === 'loading') {
    return (
      <Container maxWidth="sm" sx={{ pt: 4 }}>
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!session) {
    return (
      <Container maxWidth="sm" sx={{ pt: 4 }}>
        <Typography variant="h6" align="center" color="error" gutterBottom>
          Please sign in to view bonus picks.
        </Typography>
        <Box display="flex" justifyContent="center">
          <Button variant="contained" onClick={() => signIn()}>
            Sign In
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ pt: 4, pb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" color="primary">
            Bonus Picks
          </Typography>
          <Box>
            <IconButton color={viewMode === 'accordion' ? 'primary' : 'default'} onClick={() => setViewMode('accordion')}>
              <ViewListIcon />
            </IconButton>
            <IconButton color={viewMode === 'table' ? 'primary' : 'default'} onClick={() => setViewMode('table')}>
              <GridOnIcon />
            </IconButton>
          </Box>
        </Box>
        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography variant="body1" color="error" align="center">
            {error}
          </Typography>
        ) : (
          <>
            {viewMode === 'accordion' && (
              <>
                {Object.entries(transformedData).map(([category, picks]) => (
                  <Box key={category} mb={2}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">{category}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List>
                          {Object.entries(picks).map(([player, pick]) => (
                            <ListItem key={player} disablePadding>
                              <ListItemText primary={player} secondary={pick || "No pick submitted"} />
                            </ListItem>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                ))}
              </>
            )}
            {viewMode === 'table' && (
              <Box sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {/* Category column: make it sticky */}
                      <TableCell
                        sx={{
                          position: 'sticky',
                          left: 0,
                          backgroundColor: 'white',
                          zIndex: 1,
                        }}
                      >
                        <strong>Category</strong>
                      </TableCell>
                      {playerList.map((player) => (
                        <TableCell key={player} align="center">
                          <strong>{player}</strong>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(transformedData).map(([category, picks]) => (
                      <TableRow key={category}>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            backgroundColor: 'white',
                            zIndex: 1,
                          }}
                        >
                          {category}
                        </TableCell>
                        {playerList.map((player) => (
                          <TableCell key={player} align="center">
                            {picks[player] || "No pick submitted"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default AllBonusPicksAllPage;