// app/page.tsx
'use client';

import React from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Box, Button, Typography } from '@mui/material';

const HomePage = () => {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <Typography align="center" color="primary">Loading...</Typography>;
  }

  if (!session) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
        <Typography align="center" color="error" gutterBottom>
          Please sign in to continue.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => signIn()}>
          Sign In
        </Button>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
      <Typography variant="h4" align="center" gutterBottom>
        Welcome to the Champions Trophy 2025 Bracket Challenge
      </Typography>
      <Typography variant="h6" align="center" gutterBottom>
        Use the menu to navigate to the Rules, Your Bracket, Fixture Picks or Leaderboard.
      </Typography>
      <Button variant="contained" color="secondary" onClick={() => signOut()}>
        Sign Out
      </Button>
    </Box>
  );
};

export default HomePage;
