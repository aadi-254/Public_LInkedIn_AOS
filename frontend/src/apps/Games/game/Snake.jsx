import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Snake.css';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 }
];
const INITIAL_DIRECTION = 'UP';
const GAME_SPEED = 100;
const SPEED_INCREMENT = 2;
const MAX_SPEED = 50;

const Snake = () => {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(GAME_SPEED);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const gameLoopRef = useRef(null);
  const lastDirectionRef = useRef(INITIAL_DIRECTION);

  // Generate random food position
  const generateFood = useCallback(() => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    // Make sure food doesn't spawn on snake
    if (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
      return generateFood();
    }
    return newFood;
  }, [snake]);

  // Initialize game
  const startGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    lastDirectionRef.current = INITIAL_DIRECTION;
    setFood(generateFood());
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setGameSpeed(GAME_SPEED);
    setIsGameStarted(true);
  }, [generateFood]);

  // Handle keyboard controls
  const handleKeyPress = useCallback((event) => {
    if (!isGameStarted || gameOver) return;

    const key = event.key.toLowerCase();
    const directions = {
      arrowup: 'UP',
      arrowdown: 'DOWN',
      arrowleft: 'LEFT',
      arrowright: 'RIGHT',
      w: 'UP',
      s: 'DOWN',
      a: 'LEFT',
      d: 'RIGHT'
    };

    const newDirection = directions[key];
    if (!newDirection) return;

    const opposites = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT'
    };

    // Prevent 180-degree turns
    if (opposites[newDirection] !== lastDirectionRef.current) {
      setDirection(newDirection);
      lastDirectionRef.current = newDirection;
    }

    // Pause/Resume with spacebar
    if (key === ' ' || key === 'p') {
      setIsPaused(prev => !prev);
    }
  }, [isGameStarted, gameOver]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameOver || isPaused || !isGameStarted) return;

    setSnake(prevSnake => {
      const head = { ...prevSnake[0] };
      
      // Move head based on direction
      switch (direction) {
        case 'UP':
          head.y -= 1;
          break;
        case 'DOWN':
          head.y += 1;
          break;
        case 'LEFT':
          head.x -= 1;
          break;
        case 'RIGHT':
          head.x += 1;
          break;
        default:
          break;
      }

      // Check for collisions
      if (
        head.x < 0 || head.x >= GRID_SIZE ||
        head.y < 0 || head.y >= GRID_SIZE ||
        prevSnake.some(segment => segment.x === head.x && segment.y === head.y)
      ) {
        setGameOver(true);
        if (score > highScore) {
          setHighScore(score);
        }
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      // Check if food is eaten
      if (head.x === food.x && head.y === food.y) {
        setFood(generateFood());
        setScore(prev => prev + 1);
        // Increase speed
        setGameSpeed(prev => Math.max(prev - SPEED_INCREMENT, MAX_SPEED));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, gameOver, isPaused, isGameStarted, score, highScore, generateFood]);

  // Set up game loop
  useEffect(() => {
    if (isGameStarted && !gameOver && !isPaused) {
      gameLoopRef.current = setInterval(gameLoop, gameSpeed);
    }
    return () => clearInterval(gameLoopRef.current);
  }, [gameLoop, isGameStarted, gameOver, isPaused, gameSpeed]);

  // Set up keyboard controls
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Handle touch controls for mobile
  const handleTouchStart = useCallback((event) => {
    if (!isGameStarted || gameOver) return;

    const touch = event.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;

    const handleTouchEnd = (event) => {
      const touch = event.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;

      const deltaX = endX - startX;
      const deltaY = endY - startY;

      // Determine swipe direction
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0 && lastDirectionRef.current !== 'LEFT') {
          setDirection('RIGHT');
          lastDirectionRef.current = 'RIGHT';
        } else if (deltaX < 0 && lastDirectionRef.current !== 'RIGHT') {
          setDirection('LEFT');
          lastDirectionRef.current = 'LEFT';
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && lastDirectionRef.current !== 'UP') {
          setDirection('DOWN');
          lastDirectionRef.current = 'DOWN';
        } else if (deltaY < 0 && lastDirectionRef.current !== 'DOWN') {
          setDirection('UP');
          lastDirectionRef.current = 'UP';
        }
      }

      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchend', handleTouchEnd);
  }, [isGameStarted, gameOver]);

  return (
    <div className="snake-container">
      <div className="game-header">
        <div className="score-display">
          <div className="current-score">Score: {score}</div>
          <div className="high-score">High Score: {highScore}</div>
        </div>
        <div className="game-controls">
          <button 
            className="control-button"
            onClick={() => setIsPaused(prev => !prev)}
            disabled={!isGameStarted || gameOver}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button 
            className="control-button"
            onClick={startGame}
          >
            {isGameStarted ? 'Restart' : 'Start Game'}
          </button>
        </div>
      </div>

      <div 
        className="game-board"
        style={{
          width: GRID_SIZE * CELL_SIZE,
          height: GRID_SIZE * CELL_SIZE,
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`
        }}
        onTouchStart={handleTouchStart}
      >
        {/* Grid cells */}
        {Array(GRID_SIZE * GRID_SIZE).fill().map((_, index) => {
          const x = index % GRID_SIZE;
          const y = Math.floor(index / GRID_SIZE);
          const isSnake = snake.some(segment => segment.x === x && segment.y === y);
          const isHead = snake[0]?.x === x && snake[0]?.y === y;
          const isFood = food.x === x && food.y === y;

          return (
            <div
              key={index}
              className={`cell ${isSnake ? 'snake' : ''} ${isHead ? 'head' : ''} ${isFood ? 'food' : ''}`}
            />
          );
        })}
      </div>

      {gameOver && (
        <div className="game-over">
          <h2>Game Over!</h2>
          <p>Score: {score}</p>
          <p>High Score: {highScore}</p>
          <button onClick={startGame}>Play Again</button>
        </div>
      )}

      {!isGameStarted && !gameOver && (
        <div className="game-start">
          <h2>Snake Game</h2>
          <p>Use arrow keys or WASD to move</p>
          <p>Press Space to pause</p>
          <button onClick={startGame}>Start Game</button>
        </div>
      )}

      <div className="mobile-controls">
        <div className="control-row">
          <button 
            className="direction-button"
            onClick={() => {
              if (lastDirectionRef.current !== 'DOWN') {
                setDirection('UP');
                lastDirectionRef.current = 'UP';
              }
            }}
            disabled={!isGameStarted || gameOver || isPaused}
          >
            ↑
          </button>
        </div>
        <div className="control-row">
          <button 
            className="direction-button"
            onClick={() => {
              if (lastDirectionRef.current !== 'RIGHT') {
                setDirection('LEFT');
                lastDirectionRef.current = 'LEFT';
              }
            }}
            disabled={!isGameStarted || gameOver || isPaused}
          >
            ←
          </button>
          <button 
            className="direction-button"
            onClick={() => {
              if (lastDirectionRef.current !== 'LEFT') {
                setDirection('RIGHT');
                lastDirectionRef.current = 'RIGHT';
              }
            }}
            disabled={!isGameStarted || gameOver || isPaused}
          >
            →
          </button>
        </div>
        <div className="control-row">
          <button 
            className="direction-button"
            onClick={() => {
              if (lastDirectionRef.current !== 'UP') {
                setDirection('DOWN');
                lastDirectionRef.current = 'DOWN';
              }
            }}
            disabled={!isGameStarted || gameOver || isPaused}
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  );
};

export default Snake;
