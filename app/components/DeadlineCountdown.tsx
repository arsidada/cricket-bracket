// app/components/DeadlineCountdown.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import { DateTime } from 'luxon';

const DeadlineCountdown = () => {
  // Set the submission deadline to group stage deadline (first deadline)
  const deadline = DateTime.fromISO('2025-09-09T10:30:00', { zone: 'America/New_York' });
  // Initialize timeLeft as null so we can show a skeleton until it's computed.
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [deadlinePassed, setDeadlinePassed] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = DateTime.local();
      if (now >= deadline) {
        setDeadlinePassed(true);
        setTimeLeft('Submission closed');
        clearInterval(interval);
      } else {
        const diff = deadline.diff(now, ['days', 'hours', 'minutes', 'seconds']).toObject();
        const days = Math.floor(diff.days || 0);
        const hours = Math.floor(diff.hours || 0);
        const minutes = Math.floor(diff.minutes || 0);
        const seconds = Math.floor(diff.seconds || 0);
        const newTimeLeft = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        setTimeLeft(newTimeLeft);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <Box
      sx={{
        background: 'linear-gradient(90deg, #333, #555)',
        color: '#fff',
        py: 1,
        px: 2,
        textAlign: 'center',
        fontSize: '0.9rem',
        letterSpacing: 0.5,
      }}
    >
      {deadlinePassed ? (
        <Typography>
          The deadline has passed. No further submissions are accepted.
        </Typography>
      ) : (
        <Typography>
          {timeLeft === null ? (
            // Show a skeleton placeholder covering the entire message area until timeLeft is computed.
            <Skeleton variant="text" width="100%" height={24} />
          ) : (
            `Deadline to submit your group stage bracket: ${timeLeft}`
          )}
        </Typography>
      )}
    </Box>
  );
};

export default DeadlineCountdown;