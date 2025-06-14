const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');
const CONSTANT_USER_ID = "1"; // Constant user_id for all users

// Helper function to read the database
const readDB = async () => {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return default structure
    if (error.code === 'ENOENT') {
      return { users: [] };
    }
    throw error;
  }
};

// Helper function to write to the database
const writeDB = async (data) => {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
};

// Get all users
const getAllUsers = async () => {
  const db = await readDB();
  return db.users;
};

// Get user by username (primary key)
const getUserByUsername = async (username) => {
  const db = await readDB();
  return db.users.find(user => user.username === username);
};

// Get user by email
const getUserByEmail = async (email) => {
  const db = await readDB();
  return db.users.find(user => user.email === email);
};

// Create new user
const createUser = async (userData) => {
  const db = await readDB();
  
  // Check if username already exists (since it's our primary key)
  if (await getUserByUsername(userData.username)) {
    throw new Error('Username already exists');
  }
  
  const newUser = {
    user_id: CONSTANT_USER_ID, // Always use constant user_id
    ...userData,
    created_at: new Date().toISOString()
  };
  
  db.users.push(newUser);
  await writeDB(db);
  return newUser;
};

// Update user by username (primary key)
const updateUser = async (username, updates) => {
  const db = await readDB();
  const userIndex = db.users.findIndex(user => user.username === username);
  
  if (userIndex === -1) {
    return null;
  }
  
  // Don't allow updating username (primary key) or user_id
  const { username: _, user_id: __, ...safeUpdates } = updates;
  
  db.users[userIndex] = {
    ...db.users[userIndex],
    ...safeUpdates
  };
  
  await writeDB(db);
  return db.users[userIndex];
};

// Delete user by username (primary key)
const deleteUser = async (username) => {
  const db = await readDB();
  const userIndex = db.users.findIndex(user => user.username === username);
  
  if (userIndex === -1) {
    return false;
  }
  
  db.users.splice(userIndex, 1);
  await writeDB(db);
  return true;
};

module.exports = {
  getAllUsers,
  getUserByUsername,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  CONSTANT_USER_ID // Export constant user_id for use in routes
}; 