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
  DialogActions
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import SendIcon from '@mui/icons-material/Send';

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
  "Best Bowling Economy",
  "Highest Individual Score",
  "Fastest Fifty",
  "Fastest Century",
  "Player of the Tournament"
];

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

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  // Define the deadline: 3:59 AM Feb 19, 2025 (adjust timezone if necessary)
  const deadline = new Date("2025-02-19T03:59:00");
  const now = new Date();
  const isPastDeadline = now > deadline;
  // The bracket is locked only if it's past deadline and the user has already finalized a submission.
  const locked = isPastDeadline && alreadySubmitted;

  useEffect(() => {
    const fetchExistingPicks = async () => {
      if (!session?.user?.name) return;
      setIsLoading(true);
      const response = await fetch(`/api/get-bracket?name=${encodeURIComponent(session.user.name)}`);
      const data = await response.json();
      if (response.ok) {
        // If data.picks exists and is non-empty, then the user already submitted.
        if (data.picks && Object.keys(data.picks).length > 0) {
          setAlreadySubmitted(true);
          setPredictions(data.picks);
          setBonusAnswers(data.bonusPicks || {});
        }
      }
      setIsLoading(false);
    };

    fetchExistingPicks();
  }, [session]);

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

  // Function that handles the actual submission API call.
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

  return (
    <Container maxWidth="sm">
      <Box my={4} textAlign="center">
        <Typography variant="h4" gutterBottom>
          Submit Your Bracket
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

      {/* Deadline Popup Dialog */}
      <Dialog
        open={showDeadlinePopup}
        onClose={handlePopupCancel}
      >
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