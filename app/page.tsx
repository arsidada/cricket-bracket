'use client';

import React from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Box, Button, Typography } from '@mui/material';
import RecentActivity from './components/RecentActivity';
import { useTheme } from '@mui/material/styles';

const HomePage = () => {
  const { data: session, status } = useSession();
  const theme = useTheme(); // Access current theme values

  if (status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
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
          backgroundColor: theme.palette.background.default,
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
        backgroundColor: theme.palette.background.default,
        background: theme.palette.mode === 'dark' 
          ? 'radial-gradient(ellipse at top, #1a1a1a, #0f0f0f)'
          : 'radial-gradient(ellipse at top, #f8fffe, #f0f9f4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: 8,
        px: 2,
      }}
    >
      <Box textAlign="center" mb={4}>
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 800,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(45deg, #4CAF50, #81C784)'
              : 'linear-gradient(45deg, #1B5E20, #2E7D32)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            mb: 2,
          }}
        >
          🏏 Welcome, {session.user?.name}!
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary" 
          sx={{ 
            fontWeight: 400,
            maxWidth: 600,
            mx: 'auto',
            lineHeight: 1.6,
          }}
        >
          Your cricket bracket challenge dashboard. Use the menu to navigate between sections and track your predictions!
        </Typography>
      </Box>
      
      <Box sx={{ width: '100%', maxWidth: 800, mt: 2 }}>
        <RecentActivity />
      </Box>
    </Box>
  );
};

export default HomePage;