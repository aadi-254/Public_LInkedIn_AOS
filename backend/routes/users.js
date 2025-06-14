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
router.post('/register', validateInput, (req, res) => {
  const { username, password, email } = req.body;

  // Check if user or email already exists
  db.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Insert new user with fixed user_id of 1
    db.query('INSERT INTO users (user_id, username, email, password_hash, created_at) VALUES (1, ?, ?, ?, NOW())',
      [username, email, password],
      (err, result) => {
        if (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ message: 'Error creating user' });
        }

        // Always set userId cookie to 1
        res.cookie('userId', '1', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.cookie('username', username, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({ 
          message: 'User registered successfully', 
          userId: '1',
          username: username 
        });
      }
    );
  });
});

// Login user
router.post('/login', validateInput, (req, res) => {
  const { username, password } = req.body;

  db.query('SELECT * FROM users WHERE username = ? AND password_hash = ?',
    [username, password],
    (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const user = results[0];
      // Always set userId cookie to 1
      res.cookie('userId', '1', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      res.cookie('username', user.username, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.json({ 
        message: 'Login successful', 
        userId: '1',
        username: user.username 
      });
    }
  );
});

// Logout user
router.post('/logout', (req, res) => {
  res.clearCookie('userId');
  res.clearCookie('username');
  res.json({ message: 'Logged out successfully' });
});

// Get current user info
router.get('/me', (req, res) => {
  // Get username from cookies instead of userId
  const username = req.cookies.username;

  if (!username) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  db.query('SELECT user_id, username, email FROM users WHERE username = ?',
    [username],
    (err, results) => {
      if (err || results.length === 0) {
        console.error('Database error or user not found:', err);
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const user = results[0];
      res.json({ 
        user: {
          userId: user.user_id,
          username: user.username,
          email: user.email
        }
      });
    }
  );
});

module.exports = router;