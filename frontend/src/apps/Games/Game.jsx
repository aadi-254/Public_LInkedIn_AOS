import React, { useState } from 'react';
import './Game.css';

import Sudoku from './game/Sudoku';
import Snake from './game/Snake';

const Game = () => {
  const [selectedGame, setSelectedGame] = useState(null);

  const games = [
    
    {
      id: 'sudoku',
      title: 'Sudoku',
      description: 'Fill the grid with numbers following Sudoku rules.',
      icon: '🔢',
      component: Sudoku,
      color: '#4CAF50'
    },
    {
      id: 'snake',
      title: 'Snake',
      description: 'Control the snake, eat food, and grow without hitting the walls!',
      icon: '🐍',
      component: Snake,
      color: '#2196F3'
    }
  ];

  const handleGameSelect = (game) => {
    setSelectedGame(game);
  };

  const handleBack = () => {
    setSelectedGame(null);
  };

  if (selectedGame) {
    const GameComponent = selectedGame.component;
    return (
      <div className="game-container">
        <div className="game-header">
          <button className="back-button" onClick={handleBack}>
            ← Back to Games
          </button>
          <h1>{selectedGame.title}</h1>
        </div>
        <div className="game-content">
          <GameComponent />
        </div>
      </div>
    );
  }

  return (
    <div className="games-page">
      <div className="games-header">
        <h1>Games</h1>
        <p>Choose a game to play</p>
      </div>
      <div className="games-grid">
        {games.map(game => (
          <div
            key={game.id}
            className="game-card"
            onClick={() => handleGameSelect(game)}
            style={{ '--card-color': game.color }}
          >
            <div className="game-icon">{game.icon}</div>
            <h2>{game.title}</h2>
            <p>{game.description}</p>
            <button className="play-button">Play Now</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Game;
