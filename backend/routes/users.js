const express = require('express');
const router = express.Router();
const db = require('../db');

// Input validation middleware
const validateInput = (req, res, next) => {
  const { username, password, email } = req.body;
  if (!username || !password || (!req.path.includes('/login') && !email)) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (username.length < 3 || username.length > 50) {
    return res.status(400).json({ message: 'Username must be 3-50 characters' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  if (!req.path.includes('/login') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  next();
};

// Register new user
router.post('/register', validateInput, async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Check if username already exists (since it's our primary key)
    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check if email exists
    const existingEmail = await db.getUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Create new user with constant user_id
    const newUser = await db.createUser({
      username,
      email,
      password // Note: In a real app, you should hash the password
    });

    // Set cookies with constant user_id
    res.cookie('userId', db.CONSTANT_USER_ID, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,// 24 hours
      sameSite: 'None'
    });

    res.cookie('username', username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'None'
      
    });

    res.json({ 
      message: 'User registered successfully', 
      userId: db.CONSTANT_USER_ID,
      username: newUser.username 
    });
  } catch (error) {
    console.error('Error registering user:', error);
    if (error.message === 'Username already exists') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login user
router.post('/login', validateInput, async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await db.getUserByUsername(username);

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Set cookies with constant user_id
    res.cookie('userId', db.CONSTANT_USER_ID, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'None'// 24 hours
    });
    
    res.cookie('username', user.username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'None'// 24 hours
    });

    res.json({ 
      message: 'Login successful', 
      userId: db.CONSTANT_USER_ID,
      username: user.username 
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Logout user
router.post('/logout', (req, res) => {
  res.clearCookie('userId');
  res.clearCookie('username');
  res.json({ message: 'Logged out successfully' });
});

// Get current user info
router.get('/me', async (req, res) => {
  try {
    const username = req.cookies.username;

    if (!username) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await db.getUserByUsername(username);

    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Don't send password in response
    const { password, ...userInfo } = user;
    res.json({ 
      user: {
        ...userInfo,
        userId: db.CONSTANT_USER_ID // Always return constant user_id
      }
    });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ message: 'Error getting user info' });
  }
});

module.exports = router;
