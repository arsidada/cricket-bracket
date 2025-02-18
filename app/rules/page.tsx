'use client';

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import ShuffleIcon from '@mui/icons-material/Shuffle';

const RulesPage = () => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      p={3}
    >
      <Paper elevation={3} sx={{ padding: 4, maxWidth: 800 }}>
        <Typography variant="h3" align="center" gutterBottom color="primary">
          CT 2025 Bracket Challenge Rules
        </Typography>

        <Typography variant="h5" color="secondary" mt={4} gutterBottom>
          1. Group Stages Prediction Points (due Feb 19th, 3:59AM EST):
        </Typography>
        <Typography variant="body1" gutterBottom>
          • Correct Match Winner: <strong>10 points</strong>
        </Typography>

        <Typography variant="h5" color="secondary" mt={4} gutterBottom>
          2. Semi-Finals and Finals (TBD):
        </Typography>
        <Typography variant="body1" gutterBottom>
          • Correct Semi-Final Winner: <strong>20 points</strong>
        </Typography>
        <Typography variant="body1" gutterBottom>
          • Correct Final Winner: <strong>30 points</strong>
        </Typography>

        <Typography variant="h5" color="secondary" mt={4} gutterBottom>
          3. Tiebreakers:
        </Typography>
        <Typography variant="body1" gutterBottom>
          • In case a match is rained out or abandoned for any reason: <strong>5 points</strong>
        </Typography>
        <Typography variant="body1" gutterBottom>
          • Earliest Submission: If still tied, the participant who submitted their predictions first wins.
        </Typography>

        <Typography variant="h5" color="secondary" mt={4} gutterBottom>
          4. Bonus Predictions (due Feb 19th, 3:59AM EST):
        </Typography>
        <Typography variant="body1" gutterBottom>
          • Each correct prediction awards <strong>10 points</strong>
        </Typography>

        <Typography variant="h5" color="secondary" mt={4} gutterBottom>
          5. Penalties for Late Submissions:
        </Typography>
        <Typography variant="body1" gutterBottom>
          To ensure fairness, strict rules will be applied to late submissions:
        </Typography>
        <Typography variant="body1" gutterBottom>
          <strong>Late Submission Penalty:</strong>
        </Typography>
        <Typography variant="body2" gutterBottom>
          • No points will be awarded for any matches that have already started or concluded by the time the predictions are submitted.
        </Typography>
        <Typography variant="body2" gutterBottom>
          • A penalty of <strong>10 points</strong> will be deducted from the total score for each day the submission is late.
        </Typography>
        <Typography variant="body1" gutterBottom>
          <strong>Bonus Points Cap for Late Submissions:</strong>
        </Typography>
        <Typography variant="body2" gutterBottom>
          • A maximum cap of <strong>30 bonus points</strong> will be applied to late submissions to prevent any undue advantage.
        </Typography>

        <Typography variant="h5" color="secondary" mt={4} gutterBottom>
          6. Chip Features (Group Stage Only):
        </Typography>
        <Typography variant="body1" gutterBottom>
          • <strong>
            <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 4 }}>
              <LooksTwoIcon fontSize="small" />
            </span>
            Double Up Chip:
          </strong>{' '}
          For any group stage fixture, you can activate the Double Up chip before the match begins. If your prediction for that match is correct, your points for that fixture are doubled. Each participant can use the Double Up chip for only one fixture.
        </Typography>
        <Typography variant="body1" gutterBottom>
          • <strong>
            <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 4 }}>
              <ShuffleIcon fontSize="small" />
            </span>
            Wildcard Chip:
          </strong>{' '}
          For any group stage fixture, you can activate the Wildcard chip before the match begins. This chip allows you to swap your prediction for that fixture (choosing the opposite team) without penalty. Each participant can use the Wildcard chip for only one fixture.
        </Typography>
      </Paper>
    </Box>
  );
};

export default RulesPage;