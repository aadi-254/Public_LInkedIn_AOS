const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const server = http.createServer(app);

// Configure Multer storage - ---------- ------------------- ---------------- -------errpr
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.cookies.userId;
    const targetPath = req.query.path || '';
    
    console.log('Upload request - userId:', userId);
    console.log('Upload request - raw target path from query:', req.query.path);
    console.log('Upload request - targetPath variable:', targetPath);
    
    // Normalize the target path
    let normalizedPath = targetPath || '';
    if (normalizedPath.startsWith('/')) {
      normalizedPath = normalizedPath.substring(1);
    }
    if (normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1);
    }
    
    // Construct the full path
    const baseDir = path.join(__dirname, 'storage', userId.toString(), 'desktop');
    const targetDir = normalizedPath ? path.join(baseDir, normalizedPath) : baseDir;
    
    console.log('Upload request - normalized path:', normalizedPath);
    console.log('Upload request - base directory:', baseDir);
    console.log('Upload request - full target directory:', targetDir);
    
    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      console.log('Creating target directory:', targetDir);
      try {
        fs.mkdirSync(targetDir, { recursive: true });
        console.log('Successfully created target directory');
      } catch (error) {
        console.error('Error creating target directory:', error);
        return cb(error);
      }
    }
    
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    const userId = req.cookies.userId;
    const targetPath = req.query.path || '';
    
    // Normalize the target path
    let normalizedPath = targetPath || '';
    if (normalizedPath.startsWith('/')) {
      normalizedPath = normalizedPath.substring(1);
    }
    if (normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1);
    }
    
    // Use the same path construction as in destination
    const baseDir = path.join(__dirname, 'storage', userId.toString(), 'desktop');
    const targetDir = normalizedPath ? path.join(baseDir, normalizedPath) : baseDir;
    
    // Use original filename but handle duplicates
    const originalName = file.originalname;
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    let finalName = originalName;
    let counter = 1;

    // Check if file exists in the target directory
    while (fs.existsSync(path.join(targetDir, finalName))) {
      finalName = `${baseName} (${counter})${ext}`;
      counter++;
    }
    
    console.log('Saving file:', {
      originalName,
      finalName,
      targetDir,
      fullPath: path.join(targetDir, finalName)
    });
    
    cb(null, finalName);
  }
});

// Create multer upload instance with the storage configuration
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

// Configure Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: {
    name: 'io',
    path: '/',
    httpOnly: true,
    sameSite: 'lax'
  }
});

// Configure CORS for Express
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Import routes
const userRoutes = require('./routes/users');

// Use routes
app.use('/api/auth', userRoutes);

// File System Routes
app.get('/api/fs/list', (req, res) => {
  const userId = req.cookies.userId;
  const { path: currentPath = '' } = req.query; // Get current path from query parameter
  
  console.log('List request - userId:', userId);
  console.log('List request - currentPath:', currentPath);
  
  if (!userId) {
    console.log('No userId found in cookies');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const userDir = path.join(__dirname, 'storage', userId.toString(), 'desktop', currentPath);
  console.log('Full user directory path:', userDir);
  
  try {
    if (!fs.existsSync(userDir)) {
      console.log('Directory does not exist, creating:', userDir);
      fs.mkdirSync(userDir, { recursive: true });
    }

    console.log('Reading directory:', userDir);
    const items = fs.readdirSync(userDir).map(item => {
      const fullPath = path.join(userDir, item);
      const stats = fs.statSync(fullPath);
      return {
        name: item,
        type: stats.isDirectory() ? 'folder' : 'file',
        size: stats.size,
        modified: stats.mtime
      };
    });

    console.log('Found items:', items);
    res.json({ items });
  } catch (error) {
    console.error('Error reading directory:', error);
    res.status(500).json({ error: 'Failed to read directory' });
  }
});

/////////////////

app.post('/api/fs/mkdir', (req, res) => {
  const userId = req.cookies.userId;
  const { name, path: currentPath = '' } = req.body;
  
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const dirPath = path.join(__dirname, 'storage', userId.toString(), 'desktop', currentPath, name);
  
  try {
    if (fs.existsSync(dirPath)) {
      return res.status(400).json({ error: 'Directory already exists' });
    }
    
    fs.mkdirSync(dirPath);
    res.json({ message: 'Directory created successfully' });
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ error: 'Failed to create directory' });
  }
});

/////////////////////
app.post('/api/fs/touch', (req, res) => {
  const userId = req.cookies.userId;
  const { name, path: currentPath = '' } = req.body;
  
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const filePath = path.join(__dirname, 'storage', userId.toString(), 'desktop', currentPath, name);
  
  try {
    if (fs.existsSync(filePath)) {
      return res.status(400).json({ error: 'File already exists' });
    }
    
    fs.writeFileSync(filePath, '');
    res.json({ message: 'File created successfully' });
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ error: 'Failed to create file' });
  }
});

//////////////////////
app.delete('/api/fs/remove', (req, res) => {
  const userId = req.cookies.userId;
  const { name, path: currentPath = '' } = req.body;
  
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Prevent deletion of Music folder
  if (name === 'Music' && (!currentPath || currentPath === '')) {
    return res.status(403).json({ error: 'Cannot delete the Music folder' });
  }

  const itemPath = path.join(__dirname, 'storage', userId.toString(), 'desktop', currentPath, name);
  
  try {
    if (!fs.existsSync(itemPath)) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      fs.rmdirSync(itemPath, { recursive: true });
    } else {
      fs.unlinkSync(itemPath);
    }
    
    res.json({ message: 'Item removed successfully' });
  } catch (error) {
    console.error('Error removing item:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

////////////////
app.get('/api/fs/read/:filename', (req, res) => {
  const userId = req.cookies.userId;
  const { filename } = req.params;
  const { path: currentPath = '' } = req.query;
  
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const filePath = path.join(__dirname, 'storage', userId.toString(), 'desktop', currentPath, filename);
  
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ content });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

//////////////////////
app.post('/api/fs/write/:filename', (req, res) => {
  const userId = req.cookies.userId;
  const { filename } = req.params;
  const { content, path: currentPath = '' } = req.body;
  
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const filePath = path.join(__dirname, 'storage', userId.toString(), 'desktop', currentPath, filename);
  
  try {
    fs.writeFileSync(filePath, content);
    res.json({ message: 'File written successfully' });
  } catch (error) {
    console.error('Error writing file:', error);
    res.status(500).json({ error: 'Failed to write file' });
  }
});

// Modify file upload endpoint
app.post('/api/fs/upload', upload.single('file'), (req, res) => {
  const userId = req.cookies.userId;
  let targetPath = req.query.path || '';
  
  // Normalize the target path
  if (targetPath.startsWith('/')) {
    targetPath = targetPath.substring(1);
  }
  if (targetPath.endsWith('/')) {
    targetPath = targetPath.slice(0, -1);
  }
  
  console.log('File upload request:');
  console.log('- User ID:', userId);
  console.log('- Original path:', req.query.path);
  console.log('- Normalized path:', targetPath);
  console.log('- File:', req.file);
  
  if (!userId) {
    console.log('Upload failed: Not authenticated');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!req.file) {
    console.log('Upload failed: No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Construct the full path for the response - use the same path construction
    const baseDir = path.join(__dirname, 'storage', userId.toString(), 'desktop');
    const targetDir = targetPath ? path.join(baseDir, targetPath) : baseDir;
    const fullPath = path.join(targetDir, req.file.filename);
    
    // Calculate the relative path from the base directory
    const relativePath = path.relative(baseDir, fullPath);
    
    const response = { 
      message: 'File uploaded successfully',
      file: {
        name: req.file.filename,
        size: req.file.size,
        path: targetPath, // Use the normalized target path
        fullPath: relativePath // Use the relative path from base directory
      }
    };
    
    console.log('Upload successful:', response);
    res.json(response);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Add download endpoint
app.get('/api/fs/download', (req, res) => {
  const userId = req.cookies.userId;
  const { path: currentPath = '', filename } = req.query;
  
  // Debug logging - show all relevant information
  console.log('=== Download Request Debug ===');
  console.log('1. Request Details:', {
    userId,
    currentPath: currentPath || 'desktop',
    filename,
    query: req.query,
    cookies: req.cookies
  });

  if (!userId) {
    console.log('Download failed: Not authenticated');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!filename) {
    console.log('Download failed: Filename is required');
    return res.status(400).json({ error: 'Filename is required' });
  }

  // Construct and verify all path components
  const storageDir = path.join(__dirname, 'storage');
  const userDir = path.join(storageDir, userId.toString());
  const desktopDir = path.join(userDir, 'desktop');
  const filePath = currentPath 
    ? path.join(desktopDir, currentPath, filename)
    : path.join(desktopDir, filename);

  // Debug logging - show all path components
  console.log('2. Path Components:', {
    storageDir,
    userDir,
    desktopDir,
    filePath,
    exists: {
      storageDir: fs.existsSync(storageDir),
      userDir: fs.existsSync(userDir),
      desktopDir: fs.existsSync(desktopDir),
      filePath: fs.existsSync(filePath)
    }
  });

  // List directory contents to help debug
  try {
    console.log('3. Directory Contents:');
    console.log('- Storage dir contents:', fs.readdirSync(storageDir));
    console.log('- User dir contents:', fs.existsSync(userDir) ? fs.readdirSync(userDir) : 'Directory does not exist');
    console.log('- Desktop dir contents:', fs.existsSync(desktopDir) ? fs.readdirSync(desktopDir) : 'Directory does not exist');
    if (currentPath) {
      const targetDir = path.join(desktopDir, currentPath);
      console.log('- Target dir contents:', fs.existsSync(targetDir) ? fs.readdirSync(targetDir) : 'Directory does not exist');
    }
  } catch (error) {
    console.log('Error listing directory contents:', error);
  }
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log('4. Download failed: File not found at path:', filePath);
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if it's a file
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      console.log('Download failed: Not a file:', filePath);
      return res.status(400).json({ error: 'Not a file' });
    }

    console.log('5. File found, starting download:', {
      filePath,
      size: stats.size,
      stats: {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        mode: stats.mode,
        uid: stats.uid,
        gid: stats.gid,
        size: stats.size,
        atime: stats.atime,
        mtime: stats.mtime,
        ctime: stats.ctime,
        birthtime: stats.birthtime
      }
    });

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('6. Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Create default Music folder for user
app.post('/api/fs/create-music-folder', (req, res) => {
  const userId = req.cookies.userId;
  
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const musicFolderPath = path.join(__dirname, 'storage', userId.toString(), 'desktop', 'Music');
  
  try {
    if (!fs.existsSync(musicFolderPath)) {
      fs.mkdirSync(musicFolderPath);
      console.log('Created Music folder for user:', userId);
    }
    res.json({ message: 'Music folder ready', path: 'Music' });
  } catch (error) {
    console.error('Error creating Music folder:', error);
    res.status(500).json({ error: 'Failed to create Music folder' });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Handle chat messages - broadcast to everyone
  socket.on('chat-message', (message) => {
    // Get the current user's data from the socket
    const currentUser = socket.userData;
    if (!currentUser) {
      console.log('No user data found for socket:', socket.id);
      return;
    }

    // Create message with user info
    const fullMessage = {
      ...message,
      socketId: socket.id,
      username: currentUser.username,
      timestamp: new Date().toISOString()
    };

    console.log('Broadcasting message:', {
      from: currentUser.username,
      message: message.content,
      socketId: socket.id
    });

    // Broadcast to ALL connected clients
    io.emit('chat-message', fullMessage);
  });

  // Handle video chat join
  socket.on('join-video-chat', (userData) => {
    // Store user data in socket
    socket.userData = userData;
    socket.join('video-chat-room');
    
    // Broadcast to everyone that a new user joined
    io.emit('user-joined', {
      socketId: socket.id,
      username: userData.username
    });

    // Add system message for user join
    io.emit('chat-message', {
      type: 'system',
      content: `${userData.username} joined the chat`,
      timestamp: new Date().toISOString()
    });

    console.log('User joined video chat:', userData.username);
  });

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    io.to(data.target).emit('offer', {
      offer: data.offer,
      from: socket.id
    });
  });

  socket.on('answer', (data) => {
    io.to(data.target).emit('answer', {
      answer: data.answer,
      from: socket.id
    });
  });

  socket.on('ice-candidate', (data) => {
    io.to(data.target).emit('ice-candidate', {
      candidate: data.candidate,
      from: socket.id
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const userData = socket.userData;
    if (userData) {
      // Broadcast to everyone that user left
      io.emit('user-left', {
        socketId: socket.id,
        username: userData.username
      });

      // Add system message for user leave
      io.emit('chat-message', {
        type: 'system',
        content: `${userData.username} left the chat`,
        timestamp: new Date().toISOString()
      });

      console.log('User left video chat:', userData.username);
    }
    console.log('Client disconnected:', socket.id);
  });
});


 // ======================= Chat App code =========================/




// Start server with error handling
const PORT = process.env.PORT || 5000;
server.listen(PORT, (err) => {
  if (err) {
    console.error(`Failed to start server: ${err}`);
    process.exit(1);
  }
  console.log(`Server running with Socket.IO on port ${PORT}`);
});
