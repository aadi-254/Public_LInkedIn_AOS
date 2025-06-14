import React, { useState, useEffect } from 'react';
import './Sudoku.css';

const Sudoku = () => {
  const [board, setBoard] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [solution, setSolution] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [selectedCell, setSelectedCell] = useState(null);
  const [isValid, setIsValid] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [notes, setNotes] = useState(Array(9).fill().map(() => Array(9).fill().map(() => new Set())));

  // Generate a new Sudoku puzzle
  const generatePuzzle = () => {
    const newBoard = Array(9).fill().map(() => Array(9).fill(0));
    const newSolution = solveSudoku(newBoard);
    
    if (newSolution) {
      setSolution(newSolution);
      const puzzle = createPuzzle(newSolution, difficulty);
      setBoard(puzzle);
      setNotes(Array(9).fill().map(() => Array(9).fill().map(() => new Set())));
      setSelectedCell(null);
      setIsValid(true);
      setIsComplete(false);
      setTimer(0);
      setIsTimerRunning(true);
    }
  };

  // Create a puzzle from a solution based on difficulty
  const createPuzzle = (solution, difficulty) => {
    const puzzle = solution.map(row => [...row]);
    const cellsToRemove = {
      easy: 30,
      medium: 40,
      hard: 50
    }[difficulty];

    let removed = 0;
    while (removed < cellsToRemove) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      if (puzzle[row][col] !== 0) {
        puzzle[row][col] = 0;
        removed++;
      }
    }
    return puzzle;
  };

  // Solve Sudoku using backtracking
  const solveSudoku = (board) => {
    const newBoard = board.map(row => [...row]);
    const emptyCell = findEmptyCell(newBoard);
    
    if (!emptyCell) return newBoard;
    
    const [row, col] = emptyCell;
    for (let num = 1; num <= 9; num++) {
      if (isValidMove(newBoard, row, col, num)) {
        newBoard[row][col] = num;
        const solution = solveSudoku(newBoard);
        if (solution) return solution;
        newBoard[row][col] = 0;
      }
    }
    return null;
  };

  // Find an empty cell in the board
  const findEmptyCell = (board) => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) return [row, col];
      }
    }
    return null;
  };

  // Check if a move is valid
  const isValidMove = (board, row, col, num) => {
    // Check row
    for (let x = 0; x < 9; x++) {
      if (board[row][x] === num) return false;
    }

    // Check column
    for (let x = 0; x < 9; x++) {
      if (board[x][col] === num) return false;
    }

    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[boxRow + i][boxCol + j] === num) return false;
      }
    }

    return true;
  };

  // Handle cell selection
  const handleCellClick = (row, col) => {
    if (board[row][col] === 0) {
      setSelectedCell([row, col]);
    }
  };

  // Handle number input
  const handleNumberInput = (num) => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = num;
    setBoard(newBoard);
    checkBoard(newBoard);
  };

  // Handle note input
  const handleNoteInput = (num) => {
    if (!selectedCell) return;
    const [row, col] = selectedCell;
    const newNotes = notes.map(r => r.map(c => new Set(c)));
    
    if (newNotes[row][col].has(num)) {
      newNotes[row][col].delete(num);
    } else {
      newNotes[row][col].add(num);
    }
    
    setNotes(newNotes);
  };

  // Check if the board is valid and complete
  const checkBoard = (currentBoard) => {
    // Check if board is complete
    const isBoardComplete = currentBoard.every(row => 
      row.every(cell => cell !== 0)
    );

    // Check if board is valid
    let isBoardValid = true;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const num = currentBoard[row][col];
        if (num !== 0) {
          currentBoard[row][col] = 0;
          if (!isValidMove(currentBoard, row, col, num)) {
            isBoardValid = false;
          }
          currentBoard[row][col] = num;
        }
      }
    }

    setIsValid(isBoardValid);
    setIsComplete(isBoardComplete && isBoardValid);
    if (isBoardComplete && isBoardValid) {
      setIsTimerRunning(false);
    }
  };

  // Timer effect
  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Format timer
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle difficulty change
  const handleDifficultyChange = (newDifficulty) => {
    setDifficulty(newDifficulty);
    generatePuzzle();
  };

  return (
    <div className="sudoku-container">
      <div className="game-header">
        <div className="timer">{formatTime(timer)}</div>
        <div className="difficulty-selector">
          <button 
            className={difficulty === 'easy' ? 'active' : ''} 
            onClick={() => handleDifficultyChange('easy')}
          >
            Easy
          </button>
          <button 
            className={difficulty === 'medium' ? 'active' : ''} 
            onClick={() => handleDifficultyChange('medium')}
          >
            Medium
          </button>
          <button 
            className={difficulty === 'hard' ? 'active' : ''} 
            onClick={() => handleDifficultyChange('hard')}
          >
            Hard
          </button>
        </div>
        <button className="new-game" onClick={generatePuzzle}>New Game</button>
      </div>

      <div className={`game-board ${!isValid ? 'invalid' : ''} ${isComplete ? 'complete' : ''}`}>
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {row.map((cell, colIndex) => {
              const isSelected = selectedCell && 
                selectedCell[0] === rowIndex && 
                selectedCell[1] === colIndex;
              const isInitial = cell !== 0 && 
                cell === solution[rowIndex][colIndex];
              const boxRow = Math.floor(rowIndex / 3);
              const boxCol = Math.floor(colIndex / 3);
              const isBoxHighlighted = selectedCell && 
                Math.floor(selectedCell[0] / 3) === boxRow && 
                Math.floor(selectedCell[1] / 3) === boxCol;
              const isRowHighlighted = selectedCell && 
                selectedCell[0] === rowIndex;
              const isColHighlighted = selectedCell && 
                selectedCell[1] === colIndex;

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`cell 
                    ${isSelected ? 'selected' : ''} 
                    ${isInitial ? 'initial' : ''}
                    ${isBoxHighlighted ? 'box-highlighted' : ''}
                    ${isRowHighlighted ? 'row-highlighted' : ''}
                    ${isColHighlighted ? 'col-highlighted' : ''}
                    ${(rowIndex + 1) % 3 === 0 && rowIndex !== 8 ? 'border-bottom' : ''}
                    ${(colIndex + 1) % 3 === 0 && colIndex !== 8 ? 'border-right' : ''}
                  `}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                >
                  {cell !== 0 ? (
                    <span className="number">{cell}</span>
                  ) : (
                    <div className="notes">
                      {Array.from(notes[rowIndex][colIndex]).map(note => (
                        <span key={note} className="note">{note}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="game-controls">
        <div className="number-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              className="number-button"
              onClick={() => handleNumberInput(num)}
            >
              {num}
            </button>
          ))}
        </div>
        <div className="action-buttons">
          <button 
            className="note-button"
            onClick={() => {
              if (selectedCell) {
                const [row, col] = selectedCell;
                const newNotes = notes.map(r => r.map(c => new Set(c)));
                newNotes[row][col].clear();
                setNotes(newNotes);
              }
            }}
          >
            Clear Notes
          </button>
          <button 
            className="note-button"
            onClick={() => {
              if (selectedCell) {
                const [row, col] = selectedCell;
                const newBoard = board.map(r => [...r]);
                newBoard[row][col] = 0;
                setBoard(newBoard);
                const newNotes = notes.map(r => r.map(c => new Set(c)));
                newNotes[row][col].clear();
                setNotes(newNotes);
              }
            }}
          >
            Clear Cell
          </button>
        </div>
      </div>

      {isComplete && (
        <div className="game-complete">
          <h2>Congratulations!</h2>
          <p>You completed the puzzle in {formatTime(timer)}</p>
          <button onClick={generatePuzzle}>Play Again</button>
        </div>
      )}
    </div>
  );
};

export default Sudoku;
