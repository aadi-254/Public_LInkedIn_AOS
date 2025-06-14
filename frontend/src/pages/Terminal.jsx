import React, { useState, useEffect, useRef } from 'react';
import { useFileSystem } from '../hooks/useFileSystem';
import './Terminal.css';

const Terminal = ({ onDrag, onResize, isMinimized, isMaximized }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([{ type: 'output', content: 'Welcome to CloudOS Terminal\nType "help" for available commands.' }]);
  const { items, loading, error, currentPath, setCurrentPath, createDirectory, createFile, removeItem, readFile, writeFile, refresh } = useFileSystem();
  const terminalRef = useRef(null);
  const headerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const prevSize = useRef(null);
  const prevPos = useRef(null);

  // Auto-scroll to bottom when history updates
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  

  // Handle maximize/minimize transitions
  useEffect(() => {
    if (isMaximized) {
      // Store current size and position before maximizing
      const rect = terminalRef.current.getBoundingClientRect();
      prevSize.current = { width: rect.width, height: rect.height };
      prevPos.current = { x: rect.left, y: rect.top };
    } else if (prevSize.current && prevPos.current) {
      // Restore previous size and position when unmaximizing
      onResize(prevSize.current);
      onDrag(prevPos.current);
    }
  }, [isMaximized]);

  const addToHistory = (content, type = 'output') => {
    setHistory(prev => [...prev, { type, content }]);
  };

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
    const rect = terminalRef.current.getBoundingClientRect();
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
      const newWidth = Math.max(300, startSize.current.width + dx);
      const newHeight = Math.max(200, startSize.current.height + dy);
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

  const executeCommand = async (cmd) => {
    const [command, ...args] = cmd.trim().split(' ');
    
    // Add command to history
    addToHistory(`$ ${cmd}`, 'input');

    const commands = {
      ls: async () => {
        if (loading) {
          addToHistory('Loading directory contents...');
          return;
        }
        if (error) {
          addToHistory(`Error: ${error}`);
          return;
        }
        const output = items.map(item => 
          `${item.type === 'folder' ? '📁' : '📄'} ${item.name}`
        ).join('\n');
        addToHistory(output || 'Directory is empty');
      },

      cd: async () => {
        const target = args[0];
        if (!target || target === '..') {
          if (currentPath) {
            const newPath = currentPath.split('/').slice(0, -1).join('/');
            setCurrentPath(newPath);
            addToHistory(`Changed directory to /desktop${newPath ? '/' + newPath : ''}`);
          } else {
            addToHistory('Already at desktop directory');
          }
          return;
        }

        const targetDir = items.find(item => item.name === target && item.type === 'folder');
        if (targetDir) {
          const newPath = currentPath ? `${currentPath}/${target}` : target;
          setCurrentPath(newPath);
          addToHistory(`Changed directory to /desktop/${newPath}`);
        } else {
          addToHistory(`Error: Directory '${target}' not found`);
        }
      },

      mkdir: async () => {
        const name = args[0];
        if (!name) {
          addToHistory('Error: Please specify directory name');
          return;
        }

        const success = await createDirectory(name);
        if (success) {
          addToHistory(`Created directory '${name}'`);
        } else {
          addToHistory(`Error: Failed to create directory '${name}'`);
        }
      },

      touch: async () => {
        const name = args[0];
        if (!name) {
          addToHistory('Error: Please specify file name');
          return;
        }

        const success = await createFile(name);
        if (success) {
          addToHistory(`Created file '${name}'`);
        } else {
          addToHistory(`Error: Failed to create file '${name}'`);
        }
      },

      cat: async () => {
        const name = args[0];
        if (!name) {
          addToHistory('Error: Please specify file name');
          return;
        }

        const content = await readFile(name);
        if (content !== null) {
          addToHistory(content || '(empty file)');
        } else {
          addToHistory(`Error: Failed to read file '${name}'`);
        }
      },

      rmdir: async () => {
        const name = args[0];
        if (!name) {
          addToHistory('Error: Please specify directory name');
          return;
        }

        const dir = items.find(item => item.name === name && item.type === 'folder');
        if (!dir) {
          addToHistory(`Error: Directory '${name}' not found`);
          return;
        }

        const success = await removeItem(name);
        if (success) {
          addToHistory(`Removed directory '${name}'`);
        } else {
          addToHistory(`Error: Failed to remove directory '${name}'`);
        }
      },

      clear: () => {
        setHistory([]);
      },

      help: () => {
        const helpText = `Available commands:
ls - List directory contents
cd [dir] - Change directory (use '..' to go up)
mkdir [name] - Create new directory
touch [name] - Create new file
cat [file] - Display file contents
rmdir [name] - Remove directory
clear - Clear terminal
help - Show this help message

Note: All operations are performed within your desktop directory.`;
        addToHistory(helpText);
      }
    };

    // Execute command
    if (commands[command]) {
      await commands[command]();
    } else if (command) {
      addToHistory(`Error: Command '${command}' not found. Type 'help' for available commands.`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      executeCommand(input);
      setInput('');
    }
  };

  if (isMinimized || isClosed) {
    return null;
  }

  return (
    <div className={`terminal-window ${isMaximized ? 'maximized' : ''}`}>
      <div 
        className="terminal-header"
        ref={headerRef}
        onMouseDown={handleHeaderMouseDown}
      >
        <div className="terminal-title">CloudOS Terminal</div>
      </div>
      <div className="terminal-body" ref={terminalRef}>
        {history.map((item, index) => (
          <div key={index} className={`terminal-line ${item.type}`}>
            {item.content}
          </div>
        ))}
        <form onSubmit={handleSubmit} className="terminal-input-line">
          <span className="prompt">/desktop{currentPath ? '/' + currentPath : ''} $</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            spellCheck="false"
            autoComplete="off"
            autoCapitalize="off"
          />
        </form>
      </div>
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

export default Terminal;
