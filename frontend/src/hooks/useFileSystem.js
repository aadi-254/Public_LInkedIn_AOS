import { useState, useEffect } from 'react';
import axios from 'axios';

// Define the API base URL
const API_BASE_URL = 'https://browseros-aos.onrender.com';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  withCredentials: true // Important for handling cookies/sessions
});

export function useFileSystem() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentPath, setCurrentPath] = useState('');

  // Normalize path helper function
  const normalizePath = (path) => {
    if (!path) return '';
    // Remove leading and trailing slashes
    let normalized = path.replace(/^\/+|\/+$/g, '');
    console.log('Normalized path:', { original: path, normalized });
    return normalized;
  };

  // Load items from server with retry logic
  const loadItems = async (retry = false) => {
    try {
      const normalizedPath = normalizePath(currentPath);
      console.log('Loading items for path:', { original: currentPath, normalized: normalizedPath });
      
      setLoading(true);
      if (retry) {
        setRetryCount(prev => prev + 1);
      }
      
      const response = await api.get('/api/fs/list', {
        params: { path: normalizedPath }
      });
      
      console.log('Server response for path:', {
        requestedPath: normalizedPath,
        response: response.data
      });
      
      setItems(response.data.items || []);
      setError(null);
      setRetryCount(0);
    } catch (error) {
      console.error('Error loading items:', {
        path: currentPath,
        error: error.message,
        response: error.response?.data
      });
      
      if (error.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please ensure the backend is running.');
      } else if (error.response?.status === 401) {
        setError('Please log in to access the file system.');
      } else {
        setError(error.response?.data?.error || 'Failed to load items');
      }

      if (error.code === 'ERR_NETWORK' && retryCount < 3) {
        console.log(`Retrying... (${retryCount + 1}/3)`);
        setTimeout(() => loadItems(true), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  // Create directory
  const createDirectory = async (name) => {
    try {
      const normalizedPath = normalizePath(currentPath);
      await api.post('/api/fs/mkdir', { 
        name, 
        path: normalizedPath 
      });
      await loadItems();
      return true;
    } catch (err) {
      console.error('Error creating directory:', err);
      setError(err.response?.data?.error || 'Failed to create directory');
      return false;
    }
  };

  // Create file
  const createFile = async (name) => {
    try {
      const normalizedPath = normalizePath(currentPath);
      await api.post('/api/fs/touch', { 
        name, 
        path: normalizedPath 
      });
      await loadItems();
      return true;
    } catch (err) {
      console.error('Error creating file:', err);
      setError(err.response?.data?.error || 'Failed to create file');
      return false;
    }
  };

  // Remove item (file or directory)
  const removeItem = async (name) => {
    try {
      const normalizedPath = normalizePath(currentPath);
      await api.delete('/api/fs/remove', { 
        data: { 
          name, 
          path: normalizedPath 
        }
      });
      await loadItems();
      return true;
    } catch (err) {
      console.error('Error removing item:', err);
      setError(err.response?.data?.error || 'Failed to remove item');
      return false;
    }
  };

  // Read file content
  const readFile = async (filename) => {
    try {
      const normalizedPath = normalizePath(currentPath);
      const response = await api.get(`/api/fs/read/${filename}`, {
        params: { path: normalizedPath }
      });
      return response.data.content;
    } catch (err) {
      console.error('Error reading file:', err);
      setError(err.response?.data?.error || 'Failed to read file');
      return null;
    }
  };

  // Write file content
  const writeFile = async (filename, content) => {
    try {
      const normalizedPath = normalizePath(currentPath);
      await api.post(`/api/fs/write/${filename}`, { 
        content,
        path: normalizedPath
      });
      return true;
    } catch (err) {
      console.error('Error writing file:', err);
      setError(err.response?.data?.error || 'Failed to write file');
      return false;
    }
  };

  // Set current path with normalization
  const setPath = (newPath) => {
    const normalized = normalizePath(newPath);
    console.log('Setting path:', { original: newPath, normalized });
    setCurrentPath(normalized);
  };

  // Load items when path changes
  useEffect(() => {
    console.log('Path changed in useFileSystem:', currentPath);
    loadItems();
  }, [currentPath]);

  // Add manual retry function
  const retry = () => {
    loadItems(true);
  };

  return {
    items,
    loading,
    error,
    currentPath,
    setCurrentPath: setPath, // Use the normalized setter
    createDirectory,
    createFile,
    removeItem,
    readFile,
    writeFile,
    refresh: loadItems,
    retry
  };
} 