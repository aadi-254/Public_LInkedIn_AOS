import React, { useState, useEffect, useRef } from 'react';
import { useFileSystem } from '../hooks/useFileSystem';
import './FileManager.css';

const FileManager = ({ onMinimize, onMaximize, onClose, onDrag, onResize, isMinimized, isMaximized, initialPath, onOpenFile, onOpenMusicFile }) => {
  const { 
    items, 
    loading, 
    error, 
    currentPath, 
    setCurrentPath, 
    createDirectory, 
    createFile, 
    removeItem, 
    readFile, 
    writeFile,
    refresh  // Add refresh to the destructured values
  } = useFileSystem();
  const [selectedItems, setSelectedItems] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'type', 'date'
  const [sortOrder, setSortOrder] = useState('asc');
  const [showNewItemMenu, setShowNewItemMenu] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('folder');
  const [clipboard, setClipboard] = useState(null); // Add clipboard state
  
  // Window management states
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const prevSize = useRef(null);
  const prevPos = useRef(null);
  const headerRef = useRef(null);
  const windowRef = useRef(null);
  const url = 'http://localhost:5000';


  // Add new states for drag and drop
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);

  // Handle maximize/minimize transitions
  useEffect(() => {
    if (isMaximized) {
      // Store current size and position before maximizing
      const rect = windowRef.current.getBoundingClientRect();
      prevSize.current = { width: rect.width, height: rect.height };
      prevPos.current = { x: rect.left, y: rect.top };
    } else if (prevSize.current && prevPos.current) {
      // Restore previous size and position when unmaximizing
      onResize(prevSize.current);
      onDrag(prevPos.current);
    }
  }, [isMaximized]);

  const handleHeaderMouseDown = (e) => {
    if (e.target.className.includes('control')) return;
    if (isMaximized) return; // Prevent dragging when maximized
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const rect = headerRef.current.getBoundingClientRect();
    startPos.current = { x: rect.left, y: rect.top };
  };

  const handleResizeMouseDown = (e) => {
    if (isMaximized) return; // Prevent resizing when maximized
    setIsResizing(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const rect = windowRef.current.getBoundingClientRect();
    startSize.current = { width: rect.width, height: rect.height };
  };

  const handleMouseMove = (e) => {
    if (isDragging && !isMaximized) {
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      onDrag({
        x: startPos.current.x + dx,
        y: startPos.current.y + dy
      });
    } else if (isResizing && !isMaximized) {
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      const newWidth = Math.max(400, startSize.current.width + dx);
      const newHeight = Math.max(300, startSize.current.height + dy);
      onResize({ width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, isMaximized]);

  // Handle item selection
  const handleItemClick = (item, e) => {
    if (e.ctrlKey) {
      // Multi-select with Ctrl
      setSelectedItems(prev => 
        prev.includes(item) 
          ? prev.filter(i => i !== item)
          : [...prev, item]
      );
    } else {
      // Single select
      setSelectedItems([item]);
    }
  };

  // Handle navigation
  const handleNavigate = (newPath) => {
    console.log('FileManager - Navigating to:', newPath);
    setCurrentPath(newPath);
  };

  // Handle item double click
  const handleItemDoubleClick = async (item) => {
    if (item.type === 'folder') {
      const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
      console.log('FileManager - Double click navigation:', { item, newPath });
      setCurrentPath(newPath);
    } else if (item.type === 'file') {
      const extension = item.name.split('.').pop().toLowerCase();
      
      if (extension === 'txt') {
        onOpenFile({
          name: item.name,
          path: currentPath
        });
      } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
        onOpenMusicFile({
          name: item.name,
          path: currentPath
        });
      }
    }
  };

  // Handle create new item
  const handleCreateItem = async () => {
    if (!newItemName) return;

    const success = newItemType === 'folder' 
      ? await createDirectory(newItemName)
      : await createFile(newItemName);

    if (success) {
      setNewItemName('');
      setShowNewItemMenu(false);
    }
  };

  // Handle delete items
  const handleDeleteItems = async () => {
    if (selectedItems.length === 0) return;

    const confirmMessage = selectedItems.length === 1
      ? `Are you sure you want to delete "${selectedItems[0].name}"?`
      : `Are you sure you want to delete ${selectedItems.length} items?`;

    if (window.confirm(confirmMessage)) {
      for (const item of selectedItems) {
        try {
          const response = await fetch(`${url}/api/fs/remove`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
              name: item.name,
              path: currentPath
            })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Failed to delete ${item.name}`);
          }
        } catch (error) {
          console.error('Error deleting item:', error);
          alert(error.message || `Failed to delete ${item.name}`);
          return;
        }
      }
      // Refresh the file list after successful deletion
      refresh();
      setSelectedItems([]);
    }
  };

  // Add context menu for file operations
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuItem, setContextMenuItem] = useState(null);

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenuItem(item);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  // Add new function to handle file download
  const handleDownload = async (item) => {
    if (item.type !== 'file') return;

    try {
      setUploadStatus(`Downloading ${item.name}...`);
      
      // Debug logging
      // If we're in the root (desktop), don't include path parameter
      const downloadUrl = currentPath 
        ? `${url}/api/fs/download?path=${encodeURIComponent(currentPath)}&filename=${encodeURIComponent(item.name)}`
        : `${url}/api/fs/download?filename=${encodeURIComponent(item.name)}`;
      
      console.log('Download request:', {
        url: downloadUrl,
        currentPath: currentPath || 'desktop', // Show 'desktop' for empty path
        filename: item.name,
        fullPath: currentPath ? `${currentPath}/${item.name}` : item.name
      });
      
      // Fetch the file content
      const response = await fetch(downloadUrl, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Download failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Download failed: ${response.statusText}`);
      }

      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setUploadStatus(`Successfully downloaded ${item.name}`);
    } catch (error) {
      // console.error('Download error:', error);
      setUploadStatus(`Error downloading ${item.name}: ${error.message}`);
    }

    // Clear status after 3 seconds
    setTimeout(() => {
      setUploadStatus(null);
    }, 3000);
  };

  // Add drag start handler for files
  const handleDragStart = (e, item) => {
    if (item.type !== 'file') return;
    
    // Set the drag data
    e.dataTransfer.setData('text/plain', item.name);
    e.dataTransfer.effectAllowed = 'copy';
    
    // Add a custom class to the dragged item
    e.target.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    // Remove the dragging class
    e.target.classList.remove('dragging');
  };

  // Add copy functionality
  const handleCopy = async (item) => {
    try {
      // For files, we need to read the content
      if (item.type === 'file') {
        const response = await fetch(`${url}/api/fs/read/${encodeURIComponent(item.name)}?path=${encodeURIComponent(currentPath)}`, {
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
          path: currentPath
        });
      } else {
        // For folders, just store the path
        setClipboard({
          type: 'folder',
          name: item.name,
          path: currentPath
        });
      }
      // console.log('Copied to clipboard:', item.name);
    } catch (error) {
      // console.error('Error copying item:', error);
      alert(error.message || 'Failed to copy item');
    }
  };

  // Add paste functionality
  const handlePaste = async () => {
    if (!clipboard) return;

    try {
      if (clipboard.type === 'file') {
        // For files, create a new file with the content
        const response = await fetch(`${url}/api/fs/write/${encodeURIComponent(clipboard.name)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            content: clipboard.content,
            path: currentPath
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to paste file');
        }
      } else {
        // For folders, create a new directory
        const response = await fetch(`${url}/api/fs/mkdir`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            name: clipboard.name,
            path: currentPath
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to paste folder');
        }
      }

      // Refresh the file list
      refresh();
      // console.log('Pasted successfully');
    } catch (error) {
      // console.error('Error pasting item:', error);
      alert(error.message || 'Failed to paste item');
    }
  };

  // Update handleContextMenuAction to include copy and paste
  const handleContextMenuAction = async (action) => {
    if (!contextMenuItem) return;

    switch (action) {
      case 'open':
        if (contextMenuItem.type === 'folder') {
          const newPath = currentPath ? `${currentPath}/${contextMenuItem.name}` : contextMenuItem.name;
          setCurrentPath(newPath);
        } else if (contextMenuItem.type === 'file') {
          const extension = contextMenuItem.name.split('.').pop().toLowerCase();
          if (extension === 'txt') {
            onOpenFile({
              name: contextMenuItem.name,
              path: currentPath
            });
          } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
            onOpenMusicFile({
              name: contextMenuItem.name,
              path: currentPath
            });
          }
        }
        break;
      case 'copy':
        await handleCopy(contextMenuItem);
        break;
      case 'paste':
        if (clipboard) {
          await handlePaste();
        }
        break;
      case 'delete':
        setSelectedItems([contextMenuItem]);
        handleDeleteItems();
        break;
      case 'download':
        if (contextMenuItem.type === 'file') {
          handleDownload(contextMenuItem);
        }
        break;
    }
    setShowContextMenu(false);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Sort items
  const sortedItems = [...items].sort((a, b) => {
    const order = sortOrder === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'name':
        return order * a.name.localeCompare(b.name);
      case 'type':
        return order * (a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
      case 'date':
        // TODO: Add date sorting when we implement file dates
        return 0;
      default:
        return 0;
    }
  });

  // Get current path segments for breadcrumb
  const pathSegments = currentPath ? currentPath.split('/') : [];
  const breadcrumbPath = ['desktop', ...pathSegments];

  // Add drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    console.log('FileManager - Drop event:', {
      currentPath,
      files: files.map(f => f.name)
    });

    // Upload each file to the current directory
    for (const file of files) {
      try {
        // Log the current path before upload
        // console.log('FileManager - Current path before upload:', currentPath);
        
        setUploadStatus(`Uploading ${file.name} to ${currentPath || 'desktop'}...`);
        setUploadProgress(0);

        const formData = new FormData();
        formData.append('file', file);
        // Remove the path from formData since we'll use URL query parameter

        // Log the form data to verify
        console.log('FileManager - Upload request details:', {
          fileName: file.name,
          currentPath,
          formDataEntries: Array.from(formData.entries())
        });

        // Add currentPath as a query parameter to the URL
        const uploadUrl = `${url}/api/fs/upload${currentPath ? `?path=${encodeURIComponent(currentPath)}` : ''}`;
        
        const response = await fetch(uploadUrl, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          // console.error('FileManager - Upload failed:', errorData);
          throw new Error(errorData.error || `Failed to upload ${file.name}`);
        }

        const result = await response.json();
        // console.log('FileManager - Upload successful:', result);

        setUploadStatus(`Successfully uploaded ${file.name} to ${currentPath || 'desktop'}`);
        // Refresh the file list to show the new file
        await refresh();
      } catch (error) {
        // console.error('FileManager - Upload error:', error);
        setUploadStatus(`Error uploading ${file.name}: ${error.message}`);
      }
    }

    // Clear upload status after 3 seconds
    setTimeout(() => {
      setUploadStatus(null);
      setUploadProgress(null);
    }, 3000);
  };

  // Add debug logging for path changes
  useEffect(() => {
    console.log('FileManager - Current path updated:', currentPath);
  }, [currentPath]);

  return (
    <div 
      className={`file-manager-window ${isMaximized ? 'maximized' : ''}`}
      ref={windowRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div 
        className="file-manager-header"
        ref={headerRef}
        onMouseDown={handleHeaderMouseDown}
      >
        <div className="file-manager-title">File Manager</div>
      </div>

      {/* Toolbar */}
      <div className="file-manager-toolbar">
        <div className="toolbar-group">
          <button onClick={() => setShowNewItemMenu(!showNewItemMenu)}>
            <i className="fas fa-plus"></i> New
          </button>
          <button onClick={handleDeleteItems} disabled={selectedItems.length === 0}>
            <i className="fas fa-trash"></i> Delete
          </button>
          {clipboard && (
            <button onClick={handlePaste}>
              <i className="fas fa-paste"></i> Paste
            </button>
          )}
        </div>
        <div className="toolbar-group">
          <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'active' : ''}>
            <i className="fas fa-th-large"></i>
          </button>
          <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'active' : ''}>
            <i className="fas fa-list"></i>
          </button>
        </div>
        <div className="toolbar-group">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Name</option>
            <option value="type">Type</option>
            <option value="date">Date</option>
          </select>
          <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
            <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="file-manager-breadcrumb">
        {breadcrumbPath.map((segment, index) => {
          // Calculate the path up to this segment
          const pathUpToSegment = breadcrumbPath.slice(1, index + 1).join('/');
          return (
            <React.Fragment key={index}>
              {index > 0 && <span className="breadcrumb-separator">/</span>}
              <button 
                className="breadcrumb-item"
                onClick={() => handleNavigate(pathUpToSegment)}
                title={pathUpToSegment || 'desktop'} // Add tooltip showing full path
              >
                {segment}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Main Content */}
      <div className={`file-manager-content ${isDraggingOver ? 'drag-over' : ''}`}>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <>
            {/* Upload Status Overlay */}
            {uploadStatus && (
              <div className="upload-status-overlay">
                <div className="upload-status-content">
                  <div className="upload-status-text">{uploadStatus}</div>
                  {uploadProgress !== null && (
                    <div className="upload-progress-bar">
                      <div 
                        className="upload-progress-fill"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Current Path Indicator */}
            <div className="current-path-indicator">
              Current Location: {currentPath === '/' ? 'desktop' : currentPath}
            </div>

            <div className={`file-grid ${viewMode}`}>
              {sortedItems.map((item) => (
                <div
                  key={item.name}
                  className={`file-item ${selectedItems.includes(item) ? 'selected' : ''}`}
                  onClick={(e) => handleItemClick(item, e)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  draggable={item.type === 'file'}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="file-icon">
                    <i className={`fas fa-${item.type === 'folder' ? 'folder' : 'file'}`}></i>
                  </div>
                  <div className="file-name">{item.name}</div>
                  {item.type === 'file' && (
                    <div className="file-actions">
                      <button 
                        className="download-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(item);
                        }}
                        title="Download"
                      >
                        <i className="fas fa-download"></i>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* New Item Menu */}
      {showNewItemMenu && (
        <div className="new-item-menu">
          <div className="new-item-header">
            <h3>Create New</h3>
            <button onClick={() => setShowNewItemMenu(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="new-item-options">
            <label>
              <input
                type="radio"
                value="folder"
                checked={newItemType === 'folder'}
                onChange={(e) => setNewItemType(e.target.value)}
              />
              Folder
            </label>
            <label>
              <input
                type="radio"
                value="file"
                checked={newItemType === 'file'}
                onChange={(e) => setNewItemType(e.target.value)}
              />
              File
            </label>
          </div>
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder={`Enter ${newItemType} name`}
            autoFocus
          />
          <div className="new-item-actions">
            <button onClick={() => setShowNewItemMenu(false)}>Cancel</button>
            <button onClick={handleCreateItem} disabled={!newItemName}>Create</button>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {showContextMenu && contextMenuItem && (
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenuPosition.y,
            left: contextMenuPosition.x,
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={() => handleContextMenuAction('open')}>
            <i className="fas fa-folder-open"></i>
            <span>Open</span>
          </div>
          <div className="context-menu-item" onClick={() => handleContextMenuAction('copy')}>
            <i className="fas fa-copy"></i>
            <span>Copy</span>
          </div>
          {clipboard && (
            <div className="context-menu-item" onClick={() => handleContextMenuAction('paste')}>
              <i className="fas fa-paste"></i>
              <span>Paste</span>
            </div>
          )}
          {contextMenuItem.type === 'file' && (
            <div className="context-menu-item" onClick={() => handleContextMenuAction('download')}>
              <i className="fas fa-download"></i>
              <span>Download</span>
            </div>
          )}
          <div className="context-menu-item" onClick={() => handleContextMenuAction('delete')}>
            <i className="fas fa-trash"></i>
            <span>Delete</span>
          </div>
        </div>
      )}

      {/* Add resize handle */}
      {!isMaximized && (
        <div 
          className="resize-handle" 
          onMouseDown={handleResizeMouseDown}
          title="Resize"
        ></div>
      )}
    </div>
  );
};

export default FileManager;