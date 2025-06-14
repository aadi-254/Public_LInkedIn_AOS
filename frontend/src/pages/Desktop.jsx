import React, { useState, useEffect } from 'react';
import { useFileSystem } from '../hooks/useFileSystem';
import Terminal from './Terminal';
import FileManager from './FileManager';
import Notepad from '../apps/Notepad/Notepad';
import Calculator from '../apps/Calculator/Calculator';
import TaskManager from '../apps/TaskManager/Taskmanager';
import MusicPlayer from '../apps/MusicPlayer/MusicPlayer';
import Game from '../apps/Games/Game';
import Talk from '../apps/Talk/Talk';
import WindowFrame from '../components/WindowFrame';
import './Desktop.css';

const Desktop = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [windows, setWindows] = useState([]);
  const [activeWindowId, setActiveWindowId] = useState(null);
  const [fileManagerPath, setFileManagerPath] = useState('/');
  const [clipboard, setClipboard] = useState(null);
  const { items, loading, error, createDirectory, createFile, removeItem, readFile, writeFile, refresh, retry } = useFileSystem();
  const [fileManagerPosition, setFileManagerPosition] = useState({ x: 100, y: 100 });
  const [fileManagerSize, setFileManagerSize] = useState({ width: 800, height: 600 });
  const [windowOffset, setWindowOffset] = useState({ x: 30, y: 30 });

  // Default window sizes
  const defaultSizes = {
    terminal: { width: 600, height: 400 },
    fileManager: { width: 800, height: 600 },
    notepad: { width: 800, height: 600 },
    calculator: { width: 400, height: 600 },
    taskManager: { width: 800, height: 600 },
    gameZone: { width: 800, height: 600 },
    musicPlayer: { width: 800, height: 600 },
    games: { width: 800, height: 600 },
    talk: { width: 1000, height: 800 }
  };

  // Default apps configuration
  const defaultApps = [
    { id: 'notepad', name: 'Notepad', icon: 'fa-file-alt', type: 'notepad' },
    { id: 'calculator', name: 'Calculator', icon: 'fa-calculator', type: 'calculator' },
    { id: 'taskManager', name: 'Task Manager', icon: 'fa-tasks', type: 'taskManager' },
    { id: 'musicPlayer', name: 'Music Player', icon: 'fa-music', type: 'musicPlayer' },
    { id: 'games', name: 'Games', icon: 'fa-gamepad', type: 'games' },
    { id: 'talk', name: 'Talk', icon: 'fa-video', type: 'talk' }
  ];

  // Time update effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Refresh items periodically
  useEffect(() => {
    const refreshTimer = setInterval(refresh, 5000);
    return () => clearInterval(refreshTimer);
  }, [refresh]);

  // Empty dependency array means this runs once on mount

  // Function to create a new window
  const createWindow = (type, title, initialPath = '/') => {
    const position = getNextWindowPosition();
    const newWindow = {
      id: Date.now(),
      type,
      title,
      position,
      size: defaultSizes[type], // Use default sizes based on window type
      isMinimized: false,
      isMaximized: false,
      isClosed: false,
      path: initialPath
    };
    setWindows(prev => [...prev, newWindow]);
    setActiveWindowId(newWindow.id);
    return newWindow.id;
  };

  // Function to update window state
  const updateWindow = (windowId, updates) => {
    setWindows(prev => prev.map(window => 
      window.id === windowId ? { ...window, ...updates } : window
    ));
  };

  // Handle window actions
  const handleWindowAction = (windowId, action) => {
    const window = windows.find(w => w.id === windowId);
    if (!window) return;

    switch (action) {
      case 'minimize':
        // Update window state to minimized
        updateWindow(windowId, { 
          isMinimized: true,
          isMaximized: false // Ensure window is not maximized when minimized
        });
        // If this was the active window, set active to null
        if (windowId === activeWindowId) {
          setActiveWindowId(null);
        }
        break;
      case 'maximize':
        updateWindow(windowId, { 
          isMaximized: !window.isMaximized,
          prevSize: window.size,
          prevPosition: window.position
        });
        break;
      case 'close':
        updateWindow(windowId, { isClosed: true });
        // If this was the active window, set active to null
        if (windowId === activeWindowId) {
          setActiveWindowId(null);
        }
        break;
    }
  };

  // Function to restore a minimized window
  const restoreWindow = (windowId) => {
    const window = windows.find(w => w.id === windowId);
    if (window && window.isMinimized) {
      updateWindow(windowId, { isMinimized: false });
      setActiveWindowId(windowId);
    }
  };

  // Function to get next window position
  const getNextWindowPosition = () => {
    const offset = windowOffset;
    setWindowOffset(prev => ({
      x: (prev.x + 30) % 150,
      y: (prev.y + 30) % 150
    }));
    return offset;
  };

  // Handle opening terminal
  const openTerminal = () => {
    const existingWindow = windows.find(w => w.type === 'terminal' && !w.isClosed);
    if (existingWindow) {
      setActiveWindowId(existingWindow.id);
    } else {
      createWindow('terminal', 'CloudOS Terminal');
    }
  };

  // Handle opening file manager
  const openFileManager = (path = '/') => {
    const existingWindow = windows.find(w => w.type === 'fileManager' && !w.isClosed);
    if (existingWindow) {
      setActiveWindowId(existingWindow.id);
      updateWindow(existingWindow.id, { path });
    } else {
      createWindow('fileManager', 'File Manager', path);
    }
  };

  // Handle opening apps
  const openApp = (appType) => {
    const existingWindow = windows.find(w => w.type === appType && !w.isClosed);
    if (existingWindow) {
      setActiveWindowId(existingWindow.id);
    } else {
      const app = defaultApps.find(app => app.type === appType);
      if (app) {
        createWindow(appType, app.name);
      }
    }
  };

  // Handle window drag
  const handleWindowDrag = (windowId, position) => {
    const window = windows.find(w => w.id === windowId);
    if (!window.isMaximized) {
      updateWindow(windowId, { position });
    }
  };

  // Handle window resize
  const handleWindowResize = (windowId, size) => {
    const window = windows.find(w => w.id === windowId);
    if (!window.isMaximized) {
      // Ensure minimum size
      const minSize = defaultSizes[window.type];
      const newSize = {
        width: Math.max(size.width, minSize.width),
        height: Math.max(size.height, minSize.height)
      };
      updateWindow(windowId, { size: newSize });
    }
  };

  // Update the handleDoubleClick function to handle music files
  const handleDoubleClick = async (item) => {
    if (item.type === 'folder') {
      // Special handling for Music folder
      if (item.name === 'Music' && item.path === 'apps') {
        openFileManager('apps/Music');
        return;
      }
      openFileManager(item.name);
    } else if (item.type === 'file') {
      // Check file extension
      const extension = item.name.split('.').pop().toLowerCase();
      
      if (extension === 'txt') {
        // Open txt files in Notepad
        const existingWindow = windows.find(w => w.type === 'notepad' && !w.isClosed);
        if (existingWindow) {
          setActiveWindowId(existingWindow.id);
          window.dispatchEvent(new CustomEvent('fileOpen', {
            detail: {
              type: 'file',
              name: item.name,
              path: item.path || ''
            }
          }));
        } else {
          const windowId = createWindow('notepad', 'Notepad');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('fileOpen', {
              detail: {
                type: 'file',
                name: item.name,
                path: item.path || ''
              }
            }));
          }, 100);
        }
      } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
        // Open music files in Music Player
        const existingWindow = windows.find(w => w.type === 'musicPlayer' && !w.isClosed);
        if (existingWindow) {
          setActiveWindowId(existingWindow.id);
          window.dispatchEvent(new CustomEvent('musicFileOpen', {
            detail: {
              type: 'file',
              name: item.name,
              path: 'apps/Music' // Use apps/Music path
            }
          }));
        } else {
          const windowId = createWindow('musicPlayer', 'Music Player');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('musicFileOpen', {
              detail: {
                type: 'file',
                name: item.name,
                path: 'apps/Music' // Use apps/Music path
              }
            }));
          }, 100);
        }
      }
    }
  };

  // Add rename functionality
  const handleRename = async (item, newName) => {
    try {
      const response = await fetch(`https://browseros-aos.onrender.com/api/fs/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          oldName: item.name,
          newName: newName,
          path: item.path || ''
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rename item');
      }

      // Refresh the file list
      refresh();
      return true;
    } catch (error) {
      console.error('Error renaming item:', error);
      alert(error.message || 'Failed to rename item');
      return false;
    }
  };

  // Add copy functionality
  const handleCopy = async (item) => {
    try {
      // For files, we need to read the content
      if (item.type === 'file') {
        const response = await fetch(`https://browseros-aos.onrender.com/api/fs/read/${encodeURIComponent(item.name)}?path=${encodeURIComponent(item.path || '')}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to read file');
        }

        const data = await response.json();
        setClipboard({
          type: 'file',
          name: item.name,
          content: data.content,
          path: item.path || ''
        });
      } else {
        // For folders, just store the path
        setClipboard({
          type: 'folder',
          name: item.name,
          path: item.path || ''
        });
      }
      console.log('Copied to clipboard:', item.name);
    } catch (error) {
      console.error('Error copying item:', error);
      alert(error.message || 'Failed to copy item');
    }
  };

  // Add paste functionality
  const handlePaste = async (targetPath) => {
    if (!clipboard) return;

    try {
      if (clipboard.type === 'file') {
        // For files, create a new file with the content
        const response = await fetch(`https://browseros-aos.onrender.com/api/fs/write/${encodeURIComponent(clipboard.name)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            content: clipboard.content,
            path: targetPath
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to paste file');
        }
      } else {
        // For folders, create a new directory
        const response = await fetch(`https://browseros-aos.onrender.com/api/fs/mkdir`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            name: clipboard.name,
            path: targetPath
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to paste folder');
        }
      }

      // Refresh the file list
      refresh();
      console.log('Pasted successfully');
    } catch (error) {
      console.error('Error pasting item:', error);
      alert(error.message || 'Failed to paste item');
    }
  };

  // Handle context menu actions
  const handleContextMenuAction = async (action, item) => {
    // Prevent deletion of Music folder
    if (action === 'delete' && item.name === 'Music' && item.path === 'apps') {
      alert('Cannot delete the Music folder as it is a system folder.');
      return;
    }

    switch (action) {
      case 'open':
        handleDoubleClick(item);
        break;
      case 'copy':
        await handleCopy(item);
        break;
      case 'paste':
        if (clipboard) {
          await handlePaste(item.path || '');
        }
        break;
      case 'delete':
        if (await removeItem(item.name)) {
          console.log(`Deleted ${item.name}`);
        }
        break;
      case 'rename':
        // Prevent renaming of Music folder
        if (item.name === 'Music' && item.path === 'apps') {
          alert('Cannot rename the Music folder as it is a system folder.');
          return;
        }
        const newName = prompt('Enter new name:', item.name);
        if (newName && newName !== item.name) {
          if (item.type === 'file' && !newName.endsWith('.txt')) {
            alert('Files must end with .txt extension');
            return;
          }
          await handleRename(item, newName);
        }
        break;
    }
    setSelectedItem(null);
  };

  // Handle desktop click (deselect)
  const handleDesktopClick = () => {
    setSelectedItem(null);
    setIsStartMenuOpen(false);
  };

  const handleFileManagerDrag = (position) => {
    setFileManagerPosition(position);
  };

  const handleFileManagerResize = (size) => {
    setFileManagerSize(size);
  };

  // Add function to handle opening files from FileManager
  const handleOpenFile = (fileInfo) => {
    const existingWindow = windows.find(w => w.type === 'notepad' && !w.isClosed);
    if (existingWindow) {
      setActiveWindowId(existingWindow.id);
      // Dispatch event to Notepad to load the file
      window.dispatchEvent(new CustomEvent('fileOpen', {
        detail: {
          type: 'file',
          name: fileInfo.name,
          path: fileInfo.path
        }
      }));
    } else {
      const windowId = createWindow('notepad', 'Notepad');
      // Wait for window to be created before dispatching event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('fileOpen', {
          detail: {
            type: 'file',
            name: fileInfo.name,
            path: fileInfo.path
          }
        }));
      }, 100);
    }
  };

  // Update handleOpenMusicFile to use apps/Music path
  const handleOpenMusicFile = (fileInfo) => {
    const existingWindow = windows.find(w => w.type === 'musicPlayer' && !w.isClosed);
    if (existingWindow) {
      setActiveWindowId(existingWindow.id);
      window.dispatchEvent(new CustomEvent('musicFileOpen', {
        detail: {
          type: 'file',
          name: fileInfo.name,
          path: 'apps/Music' // Use the existing apps/Music path
        }
      }));
    } else {
      const windowId = createWindow('musicPlayer', 'Music Player');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('musicFileOpen', {
          detail: {
            type: 'file',
            name: fileInfo.name,
            path: 'apps/Music' // Use the existing apps/Music path
          }
        }));
      }, 100);
    }
  };

  // Add function to check if FileManager is open
  const isFileManagerOpen = () => {
    return windows.some(window => window.type === 'fileManager' && !window.isClosed && !window.isMinimized);
  };

  // Loading state
  if (loading) {
    return <div className="os-container">Loading desktop...</div>;
  }

  // Error state with retry button
  if (error) {
    return (
      <div className="os-container">
        <div className="error-container">
          <div className="error-icon">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <div className="error-message">{error}</div>
          <button className="retry-button" onClick={() => retry()}>
            <i className="fas fa-sync-alt"></i> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="os-container" 
      onClick={handleDesktopClick}
    >
      {/* Desktop Area */}
      <div className="desktop">
        {/* Desktop Icons */}
        <div className="desktop-icons">
          {/* Default Apps */}
          {defaultApps.map((app) => (
            <div
              key={app.id}
              className={`desktop-icon ${selectedItem?.id === app.id ? 'selected' : ''}`}
              onDoubleClick={() => openApp(app.type)}
              onContextMenu={(e) => {
                e.preventDefault();
                setSelectedItem(app);
              }}
            >
              <div className="icon-wrapper">
                <i className={`fas ${app.icon}`}></i>
                <span className="icon-name">{app.name}</span>
              </div>
            </div>
          ))}
          
          {/* File System Items */}
          {items.map((item, index) => (
            <div
              key={index}
              className={`desktop-icon ${selectedItem === item ? 'selected' : ''}`}
              onDoubleClick={() => handleDoubleClick(item)}
              onContextMenu={(e) => {
                e.preventDefault();
                setSelectedItem(item);
              }}
            >
              <div className="icon-wrapper">
                <i className={`fas fa-${item.type === 'folder' ? 'folder' : 'file'}`}></i>
                <span className="icon-name">{item.name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Windows */}
        {windows.map(window => {
          if (window.isClosed) return null;

          const isActive = window.id === activeWindowId;
          const windowStyle = {
            zIndex: isActive ? 1000 : 100,
            display: window.isMinimized ? 'none' : 'block',
            position: 'absolute',
            left: window.isMaximized ? 0 : window.position.x,
            top: window.isMaximized ? 0 : window.position.y,
            width: window.isMaximized ? '100%' : window.size.width,
            height: window.isMaximized ? '100%' : window.size.height
          };

          const renderWindowContent = () => {
            switch (window.type) {
              case 'terminal':
                return <Terminal />;
              case 'fileManager':
                return <FileManager 
                  initialPath={window.path} 
                  onOpenFile={handleOpenFile}
                  onOpenMusicFile={handleOpenMusicFile}
                />;
              case 'notepad':
                return <Notepad />;
              case 'calculator':
                return <Calculator />;
              case 'taskManager':
                return <TaskManager />;
              case 'musicPlayer':
                return <MusicPlayer />;
              case 'games':
                return <Game />;
              case 'talk':
                return <Talk />;
              default:
                return null;
            }
          };

          return (
            <div
              key={window.id}
              className={`window ${isActive ? 'active' : ''}`}
              style={windowStyle}
              onClick={() => setActiveWindowId(window.id)}
            >
              <WindowFrame
                title={window.title}
                onMinimize={() => handleWindowAction(window.id, 'minimize')}
                onMaximize={() => handleWindowAction(window.id, 'maximize')}
                onClose={() => handleWindowAction(window.id, 'close')}
                onDrag={(position) => handleWindowDrag(window.id, position)}
                onResize={(size) => handleWindowResize(window.id, size)}
                isMinimized={window.isMinimized}
                isMaximized={window.isMaximized}
                minWidth={defaultSizes[window.type].width}
                minHeight={defaultSizes[window.type].height}
              >
                {renderWindowContent()}
              </WindowFrame>
            </div>
          );
        })}
      </div>

      {/* Taskbar */}
      <div className="taskbar">
        <div className="start-button" onClick={() => setIsStartMenuOpen(!isStartMenuOpen)}>
          <i className="fas fa-bars"></i>
        </div>
        
        <div className="taskbar-apps">
          <div className="taskbar-app active">
            <i className="fas fa-home"></i>
          </div>
          <div className="taskbar-app" onClick={() => openFileManager()}>
            <i className="fas fa-folder"></i>
          </div>
          <div className="taskbar-app terminal" onClick={openTerminal}>
            <i className="fas fa-terminal"></i>
          </div>
          {/* Show all windows in taskbar, including minimized ones */}
          {windows.filter(w => !w.isClosed).map(window => {
            const app = defaultApps.find(app => app.type === window.type);
            return app ? (
              <div
                key={window.id}
                className={`taskbar-app ${window.id === activeWindowId ? 'active' : ''} ${window.isMinimized ? 'minimized' : ''}`}
                onClick={() => {
                  if (window.isMinimized) {
                    restoreWindow(window.id);
                  } else {
                    setActiveWindowId(window.id);
                  }
                }}
                title={window.title}
              >
                <i className={`fas ${app.icon}`}></i>
              </div>
            ) : null;
          })}
        </div>

        <div className="taskbar-right">
          <div className="time-display">{time}</div>
          <div className="user-profile">
            <i className="fas fa-user"></i>
          </div>
        </div>
      </div>

      {/* Start Menu */}
      {isStartMenuOpen && (
        <div className="start-menu">
          <div className="start-menu-item">
            <i className="fas fa-home"></i>
            <span>Home</span>
          </div>
          <div className="start-menu-item" onClick={() => openFileManager()}>
            <i className="fas fa-folder"></i>
            <span>Files</span>
          </div>
          <div className="start-menu-item terminal" onClick={openTerminal}>
            <i className="fas fa-terminal"></i>
            <span>Terminal</span>
          </div>
          {/* Add default apps to start menu */}
          {defaultApps.map(app => (
            <div
              key={app.id}
              className="start-menu-item"
              onClick={() => openApp(app.type)}
            >
              <i className={`fas ${app.icon}`}></i>
              <span>{app.name}</span>
            </div>
          ))}
          <div className="start-menu-item">
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </div>
          <div className="start-menu-item logout">
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {selectedItem && (
        <div 
          className="context-menu"
          style={{
            top: '100px',
            left: '100px'
          }}
        >
          <div className="context-menu-item" onClick={() => handleContextMenuAction('open', selectedItem)}>
            <i className="fas fa-folder-open"></i>
            <span>Open</span>
          </div>
          <div className="context-menu-item" onClick={() => handleContextMenuAction('copy', selectedItem)}>
            <i className="fas fa-copy"></i>
            <span>Copy</span>
          </div>
          {clipboard && (
            <div className="context-menu-item" onClick={() => handleContextMenuAction('paste', selectedItem)}>
              <i className="fas fa-paste"></i>
              <span>Paste</span>
            </div>
          )}
          <div className="context-menu-item" onClick={() => handleContextMenuAction('rename', selectedItem)}>
            <i className="fas fa-edit"></i>
            <span>Rename</span>
          </div>
          <div className="context-menu-item" onClick={() => handleContextMenuAction('delete', selectedItem)}>
            <i className="fas fa-trash"></i>
            <span>Delete</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Desktop; 