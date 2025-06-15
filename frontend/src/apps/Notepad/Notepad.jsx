import React, { useState, useEffect } from 'react';
import './Notepad.css';

const Notepad = ({ initialFile = null }) => {
    const [text, setText] = useState('');
    const [fileName, setFileName] = useState('untitled.txt');
    const [isSaved, setIsSaved] = useState(true);
    const [fontSize, setFontSize] = useState(16);
    const [theme, setTheme] = useState('dark');
    const [currentPath, setCurrentPath] = useState(''); // Changed from 'desktop/' to ''
    const [folders, setFolders] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showOpenDialog, setShowOpenDialog] = useState(false);
    const [files, setFiles] = useState([]);

    // Load initial file if provided (when double-clicking a .txt file)
    useEffect(() => {
        if (initialFile) {
            loadFile(initialFile.path, initialFile.name);
        } else {
            // For new files, just reset the state
            setText('');
            setFileName('untitled.txt');
            setCurrentPath('');
            setIsSaved(true);
        }
    }, [initialFile]);

    const loadFile = async (filePath, name) => {
        try {
            // Remove 'desktop/' from the path if it exists
            const cleanPath = filePath.replace(/^desktop\//, '');
            console.log('Opening file:', name, 'from path:', cleanPath);
            
            const response = await fetch(`https://browseros-aos.onrender.com/api/fs/read/${encodeURIComponent(name)}?path=${encodeURIComponent(cleanPath)}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Please log in to access files');
                }
                if (response.status === 404) {
                    throw new Error('File not found');
                }
                throw new Error('Failed to load file');
            }

            const data = await response.json();
            console.log('File loaded:', data);

            if (data && typeof data.content === 'string') {
                setText(data.content);
                setFileName(name);
                setCurrentPath(cleanPath);
                setIsSaved(true);
                console.log('File loaded successfully');
            } else {
                throw new Error('Invalid file content');
            }
        } catch (error) {
            console.error('Error loading file:', error);
            alert(error.message || 'Failed to load file. Please try again.');
        }
    };

    // Load files and folders when open dialog opens
    useEffect(() => {
        if (showOpenDialog) {
            loadFilesAndFolders();
        }
    }, [showOpenDialog, currentPath]);

    // Load initial files when component mounts
    useEffect(() => {
        loadFilesAndFolders();
    }, []); // Empty dependency array means this runs once on mount

    const loadFilesAndFolders = async () => {
        setIsLoading(true);
        try {
            // For the root desktop folder, send empty string
            const cleanPath = currentPath === 'desktop/' ? '' : currentPath.replace(/^desktop\//, '');
            console.log('Loading files from path:', cleanPath);
            
            const response = await fetch(`https://browseros-aos.onrender.com/api/fs/list?path=${encodeURIComponent(cleanPath)}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            console.log('Response status:', response.status);
            const responseText = await response.text();
            console.log('Raw response:', responseText);

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Please log in to access files');
                }
                try {
                    const errorData = JSON.parse(responseText);
                    throw new Error(errorData.error || 'Failed to load files');
                } catch (e) {
                    throw new Error('Failed to load files: ' + responseText);
                }
            }

            let data;
            try {
                data = JSON.parse(responseText);
                console.log('Parsed data:', data);
            } catch (e) {
                console.error('Failed to parse response:', e);
                throw new Error('Invalid server response');
            }
            
            if (data && data.items) {
                console.log('Setting folders and files:', data.items);
                setFolders(data.items.filter(item => item.type === 'folder'));
                setFiles(data.items.filter(item => item.type === 'file' && item.name.endsWith('.txt')));
            } else {
                console.log('No items in response');
                setFolders([]);
                setFiles([]);
            }
        } catch (error) {
            console.error('Error loading items:', error);
            alert(error.message || 'Failed to load files. Please try again.');
            setFolders([]);
            setFiles([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpen = () => {
        if (!isSaved && window.confirm('Do you want to save changes before opening a new file?')) {
            handleSave();
        }
        setShowOpenDialog(true);
    };

    const handleTextChange = (e) => {
        setText(e.target.value);
        setIsSaved(false);
    };

    const handleFileNameChange = (e) => {
        setFileName(e.target.value);
        setIsSaved(false);
    };

    const handleSave = async () => {
        try {
            // For untitled.txt, we need to show the save dialog
            if (fileName === 'untitled.txt') {
                // Show save dialog to get the location and filename
                const savePath = prompt('Enter the location to save the file (e.g., folder/subfolder):', '');
                if (!savePath) return; // User cancelled

                const newFileName = prompt('Enter the filename (must end with .txt):', 'untitled.txt');
                if (!newFileName) return; // User cancelled

                if (!newFileName.endsWith('.txt')) {
                    alert('Filename must end with .txt');
                    return;
                }

                // Update the filename and path
                setFileName(newFileName);
                setCurrentPath(savePath);
            }

            // Ensure we have a valid filename
            if (!fileName) {
                throw new Error('Invalid filename');
            }

            // Remove 'desktop/' from the path if it exists
            const cleanPath = currentPath.replace(/^desktop\//, '');
            console.log('Saving file:', fileName, 'to path:', cleanPath);

            const response = await fetch(`https://browseros-aos.onrender.com/api/fs/write/${encodeURIComponent(fileName)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    content: text,
                    path: cleanPath
                })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Please log in to save files');
                }
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save file');
            }

            const result = await response.json();
            console.log('Save result:', result);
            
            if (result.message === 'File written successfully') {
                setIsSaved(true);
                console.log('File saved successfully');
            } else {
                throw new Error('Failed to save file');
            }
        } catch (error) {
            console.error('Error saving file:', error);
            alert(error.message || 'Failed to save file. Please try again.');
        }
    };

    // Modify auto-save to not trigger for untitled.txt
    useEffect(() => {
        let saveTimeout;
        if (!isSaved && text && fileName !== 'untitled.txt') {
            saveTimeout = setTimeout(() => {
                handleSave();
            }, 2000); // Auto-save after 2 seconds of no changes
        }
        return () => {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
        };
    }, [text, isSaved, fileName]);

    // Add unsaved changes warning
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (!isSaved) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isSaved]);

    const handleNew = () => {
        if (!isSaved && window.confirm('Do you want to save changes?')) {
            handleSave();
        }
        setText('');
        setFileName('untitled.txt');
        setCurrentPath('');
        setIsSaved(true);
    };

    const navigateToFolder = (folderName) => {
        const newPath = folderName === '..' 
            ? currentPath.split('/').slice(0, -1).join('/')
            : `${currentPath}${currentPath ? '/' : ''}${folderName}`;
        setCurrentPath(newPath);
    };

    // Add a function to handle file double-click from desktop
    const handleFileOpen = (file) => {
        if (file.name.endsWith('.txt')) {
            console.log('Opening txt file:', file);
            loadFile(file.path, file.name);
        } else {
            alert('Only .txt files can be opened in Notepad');
        }
    };

    // Add this to your component's props
    useEffect(() => {
        // Listen for file open events from desktop
        const handleFileOpenEvent = (event) => {
            if (event.detail && event.detail.type === 'file' && event.detail.name.endsWith('.txt')) {
                handleFileOpen(event.detail);
            }
        };

        window.addEventListener('fileOpen', handleFileOpenEvent);
        return () => {
            window.removeEventListener('fileOpen', handleFileOpenEvent);
        };
    }, []);

    // Update the file click handler in the open dialog
    const handleFileClick = (file) => {
        if (file.name.endsWith('.txt')) {
            loadFile(currentPath, file.name);
            setShowOpenDialog(false);
        } else {
            alert('Only .txt files can be opened in Notepad');
        }
    };

    return (
        <div className={`notepad-container ${theme}`}>
            <div className="notepad-toolbar">
                <div className="toolbar-left">
                    <button onClick={handleNew} className="toolbar-button">
                        New
                    </button>
                    <button onClick={handleOpen} className="toolbar-button">
                        Open
                    </button>
                    <button onClick={handleSave} className="toolbar-button">
                        Save
                    </button>
                    <input
                        type="text"
                        value={fileName}
                        onChange={handleFileNameChange}
                        className="filename-input"
                        placeholder="Enter filename"
                    />
                </div>
                <div className="toolbar-right">
                    <select
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="font-size-select"
                    >
                        <option value="12">12px</option>
                        <option value="14">14px</option>
                        <option value="16">16px</option>
                        <option value="18">18px</option>
                        <option value="20">20px</option>
                    </select>
                    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="theme-toggle">
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                </div>
            </div>
            <div className="status-bar">
                {!isSaved && <span className="unsaved-indicator">●</span>}
                <span className="status-text">
                    {!isSaved ? 'Unsaved changes' : 'All changes saved'}
                </span>
                <span className="file-path">
                    Location: desktop/{currentPath}{fileName}
                </span>
            </div>
            <textarea
                value={text}
                onChange={handleTextChange}
                className="notepad-textarea"
                style={{ fontSize: `${fontSize}px` }}
                placeholder="Start typing..."
            />

            {/* Open Dialog */}
            {showOpenDialog && (
                <div className="save-dialog-overlay">
                    <div className="save-dialog">
                        <h3>Open File</h3>
                        <div className="save-dialog-content">
                            <div className="folder-navigation">
                                <div className="current-path">
                                    Current Path: desktop/{currentPath}
                                </div>
                                <div className="folders-list">
                                    {currentPath !== 'desktop/' && (
                                        <div 
                                            className="folder-item"
                                            onClick={() => navigateToFolder('..')}
                                        >
                                            <i className="fas fa-arrow-up"></i> ..
                                        </div>
                                    )}
                                    {isLoading ? (
                                        <div className="loading">Loading...</div>
                                    ) : (
                                        <>
                                            {folders.map((folder, index) => (
                                                <div
                                                    key={`folder-${index}`}
                                                    className="folder-item"
                                                    onClick={() => navigateToFolder(folder.name)}
                                                >
                                                    <i className="fas fa-folder"></i> {folder.name}
                                                </div>
                                            ))}
                                            {files.map((file, index) => (
                                                <div
                                                    key={`file-${index}`}
                                                    className="folder-item"
                                                    onClick={() => handleFileClick(file)}
                                                >
                                                    <i className="fas fa-file-alt"></i> {file.name}
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="save-dialog-buttons">
                                <button 
                                    className="save-dialog-button cancel"
                                    onClick={() => setShowOpenDialog(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notepad;
