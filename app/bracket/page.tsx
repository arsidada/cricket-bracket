'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Collapse,
  Skeleton,
  CircularProgress,
  Fab,
  TextField,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import SendIcon from '@mui/icons-material/Send';
import { DateTime } from 'luxon';

interface Fixture {
  date: string;
  match: number;
  team1: string;
  team2: string;
  aiPrediction: string;
  venue: string;
}

const fixtures: Fixture[] = [
  { date: "19 February", match: 1, team1: "Pakistan", team2: "New Zealand", aiPrediction: "Pakistan", venue: "National Stadium, Karachi 🇵🇰" },
  { date: "20 February", match: 2, team1: "Bangladesh", team2: "India", aiPrediction: "India", venue: "Dubai International Cricket Stadium, Dubai 🇦🇪" },
  { date: "21 February", match: 3, team1: "Afghanistan", team2: "South Africa", aiPrediction: "South Africa", venue: "National Stadium, Karachi 🇵🇰" },
  { date: "22 February", match: 4, team1: "Australia", team2: "England", aiPrediction: "Australia", venue: "Gaddafi Stadium, Lahore 🇵🇰" },
  { date: "23 February", match: 5, team1: "Pakistan", team2: "India", aiPrediction: "India", venue: "Dubai International Cricket Stadium, Dubai 🇦🇪" },
  { date: "24 February", match: 6, team1: "Bangladesh", team2: "New Zealand", aiPrediction: "New Zealand", venue: "Rawalpindi Cricket Stadium, Rawalpindi 🇵🇰" },
  { date: "25 February", match: 7, team1: "Australia", team2: "South Africa", aiPrediction: "Australia", venue: "Rawalpindi Cricket Stadium, Rawalpindi 🇵🇰" },
  { date: "26 February", match: 8, team1: "Afghanistan", team2: "England", aiPrediction: "England", venue: "Gaddafi Stadium, Lahore 🇵🇰" },
  { date: "27 February", match: 9, team1: "Pakistan", team2: "Bangladesh", aiPrediction: "Pakistan", venue: "Rawalpindi Cricket Stadium, Rawalpindi 🇵🇰" },
  { date: "28 February", match: 10, team1: "Afghanistan", team2: "Australia", aiPrediction: "Australia", venue: "Gaddafi Stadium, Lahore 🇵🇰" },
  { date: "1 March", match: 11, team1: "South Africa", team2: "England", aiPrediction: "England", venue: "National Stadium, Karachi 🇵🇰" },
  { date: "2 March", match: 12, team1: "New Zealand", team2: "India", aiPrediction: "India", venue: "Dubai International Cricket Stadium, Dubai 🇦🇪" }
];

const bonusQuestions = [
  "Tournament’s Top Scorer",
  "Tournament’s Top Wicket-taker",
  "Team with the Highest Single Match Score",
  "Team with the Lowest Single Match Score",
  "Most Sixes by a Player",
  "Most Centuries by a Player",
  "Player with the Most Catches",
  "Player with the Most Player-of-the-Match Awards",
  "Best Bowling Economy (12.5 overs minimum)",
  "Highest Individual Score",
  "Fastest Fifty",
  "Fastest Century",
  "Player of the Tournament"
];

const bonusPredictions: { [key: string]: string } = {
  "Tournament’s Top Scorer": "Shubman Gill (India)",
  "Tournament’s Top Wicket-taker": "Adam Zampa (Australia)",
  "Team with the Highest Single Match Score": "India",
  "Team with the Lowest Single Match Score": "Afghanistan",
  "Most Sixes by a Player": "Heinrich Klaasen (South Africa)",
  "Most Centuries by a Player": "Virat Kohli (India)",
  "Player with the Most Catches": "Jos Buttler (England)",
  "Player with the Most Player-of-the-Match Awards": "Shreyas Iyer (India)",
  "Best Bowling Economy (12.5 overs minimum)": "Keshav Maharaj (South Africa)",
  "Highest Individual Score": "Fakhar Zaman (Pakistan)",
  "Fastest Fifty": "Glenn Maxwell (Australia)",
  "Fastest Century": "Ben Duckett (England)",
  "Player of the Tournament": "Shubman Gill (India)"
};

// TabPanel component (from MUI docs)
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}
function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

// Helper to get fixture start time (assuming fixtures start at 04:00 on the given date in 2025)
// Using Luxon with an explicit time zone
const getFixtureStartTime = (fixture: Fixture) => {
  const dt = DateTime.fromFormat(
    `${fixture.date} 2025 04:00`, 
    'd MMMM yyyy HH:mm',
    { zone: 'America/New_York' }  // Explicitly set Eastern Time
  );
  return dt.toJSDate();
};

const BracketSubmission = () => {
  const { data: session } = useSession();
  const [tabValue, setTabValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State for picks that the user is currently working on
  const [predictions, setPredictions] = useState<{ [match: number]: string }>({});
  const [detailsOpen, setDetailsOpen] = useState<{ [match: number]: boolean }>({});
  const [bonusAnswers, setBonusAnswers] = useState<{ [key: string]: string }>({});

  // NEW: A flag that indicates whether the user has already submitted (finalized) their bracket.
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  // State for showing the deadline popup
  const [showDeadlinePopup, setShowDeadlinePopup] = useState(false);
  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // --- CHIP STATES ---
  // Which chip menu (if any) is currently expanded ("doubleUp" or "wildcard")
  const [selectedChipMenu, setSelectedChipMenu] = useState<"doubleUp" | "wildcard" | null>(null);
  // The selected fixture for each chip (fixture number)
  const [selectedDoubleUp, setSelectedDoubleUp] = useState<number | null>(null);
  const [selectedWildcard, setSelectedWildcard] = useState<number | null>(null);
  // Dialog state for confirming chip activation
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  // Store user's already activated chips fetched from backend
  const [userChips, setUserChips] = useState<{ doubleUp: number | null; wildcard: number | null }>({
    doubleUp: null,
    wildcard: null
  });

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Define the bracket submission deadline: 3:59 AM Feb 19, 2025 (adjust timezone if necessary)
  const deadline = new Date("2025-02-19T03:59:00");
  const now = new Date();
  const isPastDeadline = now > deadline;
  // The bracket is locked only if it's past deadline and the user has already finalized a submission.
  const locked = isPastDeadline && alreadySubmitted;

  // Fetch bracket data on mount
  useEffect(() => {
    const fetchExistingPicks = async () => {
      if (!session?.user?.name) return;
      setIsLoading(true);
      try {
        const response = await fetch(`/api/get-bracket?name=${encodeURIComponent(session.user.name)}`);
        const data = await response.json();
        if (response.ok) {
          // Only update if the user hasn't already started working on picks
          if (Object.keys(predictions).length === 0 && data.picks && Object.keys(data.picks).length > 0) {
            setAlreadySubmitted(true);
            setPredictions(data.picks);
            setBonusAnswers(data.bonusPicks || {});
          }
        }
      } catch (error) {
        console.error("Error fetching bracket:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingPicks();
    // We intentionally leave out `predictions` from the dependency array so that this
    // effect runs only when the session changes.
  }, [session]);

  // Fetch user's chip usage from the backend (using our get-user-chips endpoint)
  useEffect(() => {
    const fetchUserChips = async () => {
      if (!session?.user?.name) return;
      try {
        const response = await fetch('/api/get-user-chips');
        if (response.ok) {
          const data = await response.json();
          setUserChips({
            doubleUp: data.doubleUp,
            wildcard: data.wildcard
          });
        }
      } catch (error) {
        console.error("Error fetching user chips:", error);
      }
    };

    fetchUserChips();
  }, [session]);

  // Get the current time in Eastern Time using Luxon
  const nowEastern = DateTime.now().setZone('America/New_York').toJSDate();
  const availableFixtures = fixtures.filter(fixture => getFixtureStartTime(fixture) > nowEastern);

  const handleSelection = (match: number, team: string) => {
    // Do not allow changing the pick if submission is locked.
    if (locked) return;
    setPredictions((prev) => ({
      ...prev,
      [match]: team,
    }));
  };

  const toggleDetails = (match: number) => {
    setDetailsOpen((prev) => ({
      ...prev,
      [match]: !prev[match],
    }));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Function that handles the actual submission API call for bracket picks.
  const doSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/submit-bracket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: session?.user?.name,
          picks: predictions,
          bonusAnswers: bonusAnswers,
        }),
      });

      if (response.ok) {
        showSnackbar("Your bracket has been submitted successfully!", "success");
        // Mark that the user has now finalized their submission.
        setAlreadySubmitted(true);
      } else {
        showSnackbar("Failed to submit your bracket. Please try again.", "error");
      }
    } catch (error) {
      showSnackbar("An error occurred while submitting. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    // First, check that fixture picks and bonus answers are complete.
    if (Object.keys(predictions).length !== fixtures.length) {
      showSnackbar("Please predict the winner for all matches before submitting.", "error");
      return;
    }
    for (const question of bonusQuestions) {
      if (!bonusAnswers[question] || bonusAnswers[question].trim() === "") {
        showSnackbar(`Please answer the bonus question: "${question}"`, "error");
        return;
      }
    }

    if (isPastDeadline) {
      if (alreadySubmitted) {
        // Already submitted and now locked—do not allow changes.
        showSnackbar("Bracket submission is locked. You cannot modify your submission.", "error");
        return;
      } else {
        // User has not finalized a submission even though it's past the deadline.
        // Show the popup warning about the penalty.
        setShowDeadlinePopup(true);
        return;
      }
    }

    // If not past deadline, proceed normally.
    doSubmit();
  };

  // Handlers for the deadline popup dialog.
  const handlePopupContinue = () => {
    setShowDeadlinePopup(false);
    doSubmit();
  };

  const handlePopupCancel = () => {
    setShowDeadlinePopup(false);
  };

  // --- CHIP UI HANDLERS ---
  const handleChipMenuToggle = (chip: "doubleUp" | "wildcard") => {
    if (selectedChipMenu === chip) {
      setSelectedChipMenu(null);
    } else {
      setSelectedChipMenu(chip);
    }
  };

  // Called when the user clicks the "Apply Chip" button.
  const handleApplyChip = () => {
    setConfirmDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    setConfirmDialogOpen(false);
  };

  const handleConfirmChip = async () => {
    setConfirmDialogOpen(false);
  
    if (selectedChipMenu === "wildcard" && selectedWildcard) {
      // Find the fixture details for the selected wildcard fixture.
      const fixture = fixtures.find(f => f.match === selectedWildcard);
      if (!fixture) {
        showSnackbar("Invalid fixture selection.", "error");
        return;
      }
      
      // Determine the current pick and swap it.
      const currentPick = predictions[fixture.match];
      let newPick: string;
      if (currentPick === fixture.team1) {
        newPick = fixture.team2;
      } else if (currentPick === fixture.team2) {
        newPick = fixture.team1;
      } else {
        // If no pick exists yet, you could choose a default or prompt the user.
        newPick = fixture.team2;
      }
      
      // Update the picks object.
      const updatedPicks = { ...predictions, [fixture.match]: newPick };
      setPredictions(updatedPicks);
      
      try {
        // Submit the updated bracket with the wildcard flag.
        const bracketResponse = await fetch('/api/submit-bracket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: session?.user?.name,
            picks: updatedPicks,
            bonusAnswers: bonusAnswers,
            isWildcard: true, // This flag tells the API not to log this activity.
          }),
        });
        
        if (!bracketResponse.ok) {
          showSnackbar("Failed to update your bracket with the wildcard change.", "error");
          return;
        }
        
        // Record the wildcard chip usage.
        const chipResponse = await fetch('/api/submit-chips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: session?.user?.name,
            chips: { wildcard: fixture.match },
          }),
        });
        
        if (!chipResponse.ok) {
          showSnackbar("Bracket updated, but failed to record wildcard usage.", "error");
          return;
        }
        
        showSnackbar("Wildcard applied! Your prediction has been swapped.", "success");
        
        // Update local chip state.
        setUserChips((prev) => ({ ...prev, wildcard: fixture.match }));
        // Clear wildcard selection.
        setSelectedChipMenu(null);
        setSelectedWildcard(null);
      } catch (error) {
        showSnackbar("An error occurred while applying the wildcard. Please try again.", "error");
      }
    } else if (selectedChipMenu === "doubleUp" && selectedDoubleUp) {
      // Handle the double up chip in the usual way.
      let chipData: any = { doubleUp: selectedDoubleUp };
      try {
        const response = await fetch('/api/submit-chips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: session?.user?.name,
            chips: chipData,
          }),
        });
        if (response.ok) {
          showSnackbar("Chip activated successfully!", "success");
          setUserChips((prev) => ({ ...prev, doubleUp: chipData.doubleUp }));
          setSelectedChipMenu(null);
          setSelectedDoubleUp(null);
        } else {
          showSnackbar("Failed to activate chip. Please try again.", "error");
        }
      } catch (error) {
        showSnackbar("An error occurred while activating chip. Please try again.", "error");
      }
    }
  };

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

  // Determine the selected fixture details for the active chip menu.
  let chipFixture: Fixture | undefined;
  if (selectedChipMenu === "doubleUp" && selectedDoubleUp) {
    chipFixture = fixtures.find(f => f.match === selectedDoubleUp);
  } else if (selectedChipMenu === "wildcard" && selectedWildcard) {
    chipFixture = fixtures.find(f => f.match === selectedWildcard);
  }

  return (
    <Container maxWidth="sm">
      <Box my={4} textAlign="center">
        <Typography variant="h4" gutterBottom>
          Your Bracket
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Make your selections in the tabs below and then submit your bracket.
        </Typography>
        {locked && (
          <Typography variant="body2" color="error">
            Bracket submission is locked as you already submitted your bracket and the deadline has passed.
          </Typography>
        )}
      </Box>

      {/* --- CHIP ACTIVATION UI --- */}
      <Box my={4}>
        <Typography variant="h5" gutterBottom>
          Activate a Chip
        </Typography>
        <Box display="flex" justifyContent="center" gap={2}>
          <IconButton
            onClick={() => handleChipMenuToggle("doubleUp")}
            disabled={userChips.doubleUp !== null}
            size="large"
            sx={{
              backgroundColor: 'grey.200',
              '&:hover': { backgroundColor: 'grey.300' },
              borderRadius: '50%',
              p: 1.5,
            }}
          >
            <LooksTwoIcon color={userChips.doubleUp !== null ? "disabled" : "primary"} />
          </IconButton>
          <IconButton
            onClick={() => handleChipMenuToggle("wildcard")}
            disabled={userChips.wildcard !== null}
            size="large"
            sx={{
              backgroundColor: 'grey.200',
              '&:hover': { backgroundColor: 'grey.300' },
              borderRadius: '50%',
              p: 1.5,
            }}
          >
            <ShuffleIcon color={userChips.wildcard !== null ? "disabled" : "primary"} />
          </IconButton>
        </Box>
        {selectedChipMenu === "doubleUp" && (
          <Box mt={2}>
            <Typography variant="subtitle1">Double Up Chip</Typography>
            <FormControl fullWidth>
              <InputLabel id="doubleUp-select-label">Fixture</InputLabel>
              <Select
                labelId="doubleUp-select-label"
                value={selectedDoubleUp || ""}
                label="Fixture"
                onChange={(e) => setSelectedDoubleUp(Number(e.target.value))}
              >
                {availableFixtures.map((fixture) => (
                  <MenuItem key={fixture.match} value={fixture.match}>
                    {`Match ${fixture.match} - ${fixture.date}: ${fixture.team1} vs ${fixture.team2}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
        {selectedChipMenu === "wildcard" && (
          <Box mt={2}>
            <Typography variant="subtitle1">Wildcard Chip</Typography>
            <FormControl fullWidth>
              <InputLabel id="wildcard-select-label">Fixture</InputLabel>
              <Select
                labelId="wildcard-select-label"
                value={selectedWildcard || ""}
                label="Fixture"
                onChange={(e) => setSelectedWildcard(Number(e.target.value))}
              >
                {availableFixtures.map((fixture) => (
                  <MenuItem key={fixture.match} value={fixture.match}>
                    {`Match ${fixture.match} - ${fixture.date}: ${fixture.team1} vs ${fixture.team2}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
        {(selectedChipMenu &&
          ((selectedChipMenu === "doubleUp" && selectedDoubleUp) ||
           (selectedChipMenu === "wildcard" && selectedWildcard))) && (
          <Box mt={2} textAlign="center">
            <Button variant="contained" color="primary" onClick={handleApplyChip}>
              Apply Chip
            </Button>
          </Box>
        )}
      </Box>

      {/* --- CONFIRM CHIP ACTIVATION DIALOG --- */}
      <Dialog open={confirmDialogOpen} onClose={handleConfirmCancel}>
        <DialogTitle>Confirm Chip Activation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {chipFixture
              ? `Are you sure you want to activate the ${
                  selectedChipMenu === "doubleUp" ? "Double Up" : "Wildcard"
                } chip for Match ${chipFixture.match} - ${chipFixture.date}: ${chipFixture.team1} vs ${chipFixture.team2}?`
              : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmCancel} variant="contained" color="error">
            Cancel
          </Button>
          <Button onClick={handleConfirmChip} variant="contained" color="success">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- EXISTING TABS FOR BRACKET SUBMISSION --- */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="Bracket Submission Tabs">
          <Tab label="Fixture Picks" {...a11yProps(0)} />
          <Tab label="Bonus Picks" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <TabPanel value={tabValue} index={0}>
        {fixtures.map((fixture) => (
          <Paper key={fixture.match} sx={{ p: 2, my: 2, textAlign: 'center', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Match {fixture.match} - {fixture.date}
            </Typography>
            <Box display="flex" justifyContent="center" gap={2}>
              {isLoading ? (
                <Skeleton variant="rectangular" width="100%" height={40} />
              ) : (
                <Button
                  variant={predictions[fixture.match] === fixture.team1 ? "contained" : "outlined"}
                  onClick={() => handleSelection(fixture.match, fixture.team1)}
                  disabled={locked}
                >
                  {fixture.team1}
                </Button>
              )}
              {isLoading ? (
                <Skeleton variant="rectangular" width="100%" height={40} />
              ) : (
                <Button
                  variant={predictions[fixture.match] === fixture.team2 ? "contained" : "outlined"}
                  onClick={() => handleSelection(fixture.match, fixture.team2)}
                  disabled={locked}
                >
                  {fixture.team2}
                </Button>
              )}
            </Box>
            <Button
              variant="text"
              color="secondary"
              size="small"
              onClick={() => toggleDetails(fixture.match)}
              endIcon={detailsOpen[fixture.match] ? <ExpandLess /> : <ExpandMore />}
              sx={{ mt: 1 }}
            >
              Details
            </Button>
            <Collapse in={detailsOpen[fixture.match]}>
              <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={2}>
                <Typography variant="body2">
                  <strong>✨ AI Prediction:</strong> {fixture.aiPrediction}
                </Typography>
                <Typography variant="body2">
                  <strong>📍 Venue:</strong> {fixture.venue}
                </Typography>
              </Box>
            </Collapse>
          </Paper>
        ))}
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <Box my={4}>
          <Typography variant="h5" gutterBottom>
            Bonus Questions
          </Typography>
          {bonusQuestions.map((question) => (
            <Box key={question} mb={2}>
              <TextField
                fullWidth
                label={question}
                value={bonusAnswers[question] || ""}
                onChange={(e) =>
                  setBonusAnswers((prev) => ({
                    ...prev,
                    [question]: e.target.value,
                  }))
                }
                disabled={locked}
              />
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                AI Prediction: {bonusPredictions[question]}
              </Typography>
            </Box>
          ))}
        </Box>
      </TabPanel>

      <Fab
        variant="extended"
        color="primary"
        onClick={handleSubmit}
        disabled={isSubmitting || locked}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
          backgroundColor: '#90A4AE',
          color: '#ffffff',
          '&:hover': { backgroundColor: '#607D8B' },
          '&:disabled': { backgroundColor: '#B0BEC5', color: '#ECEFF1' },
        }}
      >
        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : <SendIcon sx={{ mr: 1 }} />}
        Submit
      </Fab>

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

      <Dialog open={showDeadlinePopup} onClose={handlePopupCancel}>
        <DialogTitle>Submission Deadline Passed</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The deadline for the bracket submission has passed. Remember that your submission will incur a penalty.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePopupCancel} variant="contained" color="error">
            Cancel
          </Button>
          <Button onClick={handlePopupContinue} variant="contained" color="success">
            Continue
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BracketSubmission;