// app/components/NavBar.tsx
'use client';

import React, { useState } from 'react';
import { AppBar, Toolbar, IconButton, Typography, Drawer, List, ListItem, ListItemText, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Link from 'next/link';

const NavBar: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (event.type === 'keydown' && ((event as React.KeyboardEvent).key === 'Tab' || (event as React.KeyboardEvent).key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  const list = () => (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <List>
        <Link href="/" passHref>
          <ListItem button component="a">
            <ListItemText primary="Home" />
          </ListItem>
        </Link>
        <Link href="/bracket" passHref>
          <ListItem button component="a">
            <ListItemText primary="Your Bracket" />
          </ListItem>
        </Link>
        <Link href="/fixtures" passHref>
          <ListItem button component="a">
            <ListItemText primary="Fixture Picks" />
          </ListItem>
        </Link>
        <Link href="/leaderboard" passHref>
          <ListItem button component="a">
            <ListItemText primary="Leaderboard" />
          </ListItem>
        </Link>
        <Link href="/rules" passHref>
          <ListItem button component="a">
            <ListItemText primary="Rules" />
          </ListItem>
        </Link>

      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="fixed" sx={{ backgroundColor: 'black' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center' }}>
            CT 2025 Bracket Challenge
          </Typography>
          <IconButton edge="start" color="inherit" aria-label="menu" onClick={toggleDrawer(true)}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
        {list()}
      </Drawer>
    </>
  );
};

export default NavBar;
