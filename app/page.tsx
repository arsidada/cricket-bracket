// app/page.tsx
'use client';

import React from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Box, Button, Typography } from '@mui/material';
import RecentActivity from './components/RecentActivity';

const HomePage = () => {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h6" color="primary">
          Loading...
        </Typography>
      </Box>
    );
  }

  if (!session) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Typography variant="h5" color="text.primary" gutterBottom>
          Please sign in to continue.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => signIn()}>
          Sign In
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: 8, // space for the navbar at the top if needed
        px: 2,
      }}
    >
      <Typography variant="h4" color="text.primary" gutterBottom>
        Welcome, {session.user?.name}!
      </Typography>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Use the menu to navigate to the Rules, Your Bracket, Fixture Picks, or Leaderboard.
      </Typography>
      <Box sx={{ width: '100%', mt: 4 }}>
        <RecentActivity />
      </Box>
    </Box>
  );
};

export default HomePage;