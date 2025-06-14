import React, { useState } from 'react';
import './Calculator.css';

const Calculator = () => {
  const [display, setDisplay] = useState('0');
  const [memory, setMemory] = useState(0);
  const [currentOperation, setCurrentOperation] = useState(null);
  const [prevValue, setPrevValue] = useState(null);
  const [mode, setMode] = useState('standard');
  const [theme, setTheme] = useState('dark');
  const [isNewInput, setIsNewInput] = useState(true);

  const scientificFunctions = {
    sin: (x) => Math.sin(x * Math.PI / 180),
    cos: (x) => Math.cos(x * Math.PI / 180),
    tan: (x) => Math.tan(x * Math.PI / 180),
    asin: (x) => Math.asin(x) * 180 / Math.PI,
    acos: (x) => Math.acos(x) * 180 / Math.PI,
    atan: (x) => Math.atan(x) * 180 / Math.PI,
    log: (x) => Math.log10(x),
    ln: (x) => Math.log(x),
    sqrt: (x) => Math.sqrt(x),
    square: (x) => x * x,
    pi: () => Math.PI,
    e: () => Math.E,
  };

  const conversions = {
    length: {
      mm: { cm: 0.1, m: 0.001, km: 0.000001 },
      cm: { mm: 10, m: 0.01, km: 0.00001 },
      m: { mm: 1000, cm: 100, km: 0.001 },
      km: { mm: 1000000, cm: 100000, m: 1000 },
    },
    weight: {
      mg: { g: 0.001, kg: 0.000001, ton: 0.000000001 },
      g: { mg: 1000, kg: 0.001, ton: 0.000001 },
      kg: { mg: 1000000, g: 1000, ton: 0.001 },
      ton: { mg: 1000000000, g: 1000000, kg: 1000 },
    },
  };

  const handleNumber = (num) => {
    if (isNewInput || display === '0' || display === 'Error') {
      setDisplay(num.toString());
      setIsNewInput(false);
    } else {
      setDisplay(display + num.toString());
    }
  };

  const handleDecimal = () => {
    if (isNewInput || display === 'Error') {
      setDisplay('0.');
      setIsNewInput(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleOperation = (op) => {
    if (display === 'Error') return;
    if (prevValue !== null && !isNewInput) {
      handleEquals();
    }
    setPrevValue(parseFloat(display));
    setCurrentOperation(op);
    setIsNewInput(true);
  };

  const handleEquals = () => {
    if (prevValue === null || currentOperation === null || display === 'Error') return;
    const current = parseFloat(display);
    let result;

    switch (currentOperation) {
      case '+':
        result = prevValue + current;
        break;
      case '-':
        result = prevValue - current;
        break;
      case '*':
        result = prevValue * current;
        break;
      case '/':
        result = current !== 0 ? prevValue / current : 'Error';
        break;
      default:
        return;
    }

    setDisplay(isNaN(result) || !isFinite(result) ? 'Error' : result.toString());
    setCurrentOperation(null);
    setPrevValue(null);
    setIsNewInput(true);
  };

  const handleScientific = (func) => {
    if (display === 'Error') return;
    const value = parseFloat(display);
    if (isNaN(value)) return;
    const result = scientificFunctions[func](value);
    setDisplay(isNaN(result) || !isFinite(result) ? 'Error' : result.toString());
    setIsNewInput(true);
  };

  const handleConstant = (func) => {
    const result = scientificFunctions[func]();
    setDisplay(result.toString());
    setIsNewInput(true);
  };

  const handleConversion = (from, to, type) => {
    if (display === 'Error') return;
    const value = parseFloat(display);
    if (isNaN(value)) return;
    const result = value * conversions[type][from][to];
    setDisplay(isNaN(result) ? 'Error' : result.toString());
    setIsNewInput(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setCurrentOperation(null);
    setPrevValue(null);
    setIsNewInput(true);
  };

  const handleMemory = (action) => {
    const value = parseFloat(display);
    if (isNaN(value) || display === 'Error') return;
    switch (action) {
      case 'MC':
        setMemory(0);
        break;
      case 'MR':
        setDisplay(memory.toString());
        setIsNewInput(true);
        break;
      case 'M+':
        setMemory(memory + value);
        setIsNewInput(true);
        break;
      case 'M-':
        setMemory(memory - value);
        setIsNewInput(true);
        break;
      default:
        break;
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className={`calculator ${theme}`}>
      <div className="header">
        <div className="mode-selector">
          <button
            className={mode === 'standard' ? 'active' : ''}
            onClick={() => setMode('standard')}
          >
            Standard
          </button>
          <button
            className={mode === 'scientific' ? 'active' : ''}
            onClick={() => setMode('scientific')}
          >
            Scientific
          </button>
          <button
            className={mode === 'conversion' ? 'active' : ''}
            onClick={() => setMode('conversion')}
          >
            Conversion
          </button>
        </div>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="display">{display}</div>

      {mode === 'standard' && (
        <div className="keypad">
          <button onClick={() => handleMemory('MC')}>MC</button>
          <button onClick={() => handleMemory('MR')}>MR</button>
          <button onClick={() => handleMemory('M+')}>M+</button>
          <button onClick={() => handleMemory('M-')}>M-</button>
          <button onClick={handleClear}>C</button>
          <button onClick={() => handleClear()}>AC</button>
          <button onClick={() => handleOperation('/')}>÷</button>
          <button onClick={() => handleNumber(7)}>7</button>
          <button onClick={() => handleNumber(8)}>8</button>
          <button onClick={() => handleNumber(9)}>9</button>
          <button onClick={() => handleOperation('*')}>×</button>
          <button onClick={() => handleNumber(4)}>4</button>
          <button onClick={() => handleNumber(5)}>5</button>
          <button onClick={() => handleNumber(6)}>6</button>
          <button onClick={() => handleOperation('-')}>-</button>
          <button onClick={() => handleNumber(1)}>1</button>
          <button onClick={() => handleNumber(2)}>2</button>
          <button onClick={() => handleNumber(3)}>3</button>
          <button onClick={() => handleOperation('+')}>+</button>
          <button onClick={() => handleNumber(0)}>0</button>
          <button onClick={handleDecimal}>.</button>
          <button onClick={handleEquals}>=</button>
        </div>
      )}

      {mode === 'scientific' && (
        <div className="keypad scientific-keypad">
          <button onClick={() => handleScientific('sin')}>sin</button>
          <button onClick={() => handleScientific('cos')}>cos</button>
          <button onClick={() => handleScientific('tan')}>tan</button>
          <button onClick={() => handleScientific('asin')}>asin</button>
          <button onClick={() => handleScientific('acos')}>acos</button>
          <button onClick={() => handleScientific('atan')}>atan</button>
          <button onClick={() => handleScientific('log')}>log</button>
          <button onClick={() => handleScientific('ln')}>ln</button>
          <button onClick={() => handleScientific('sqrt')}>√</button>
          <button onClick={() => handleScientific('square')}>x²</button>
          <button onClick={() => handleConstant('pi')}>π</button>
          <button onClick={() => handleConstant('e')}>e</button>
          <button onClick={() => handleMemory('MC')}>MC</button>
          <button onClick={() => handleMemory('MR')}>MR</button>
          <button onClick={() => handleMemory('M+')}>M+</button>
          <button onClick={() => handleMemory('M-')}>M-</button>
          <button onClick={handleClear}>C</button>
          <button onClick={() => handleClear()}>AC</button>
          <button onClick={() => handleOperation('/')}>÷</button>
          <button onClick={() => handleNumber(7)}>7</button>
          <button onClick={() => handleNumber(8)}>8</button>
          <button onClick={() => handleNumber(9)}>9</button>
          <button onClick={() => handleOperation('*')}>×</button>
          <button onClick={() => handleNumber(4)}>4</button>
          <button onClick={() => handleNumber(5)}>5</button>
          <button onClick={() => handleNumber(6)}>6</button>
          <button onClick={() => handleOperation('-')}>-</button>
          <button onClick={() => handleNumber(1)}>1</button>
          <button onClick={() => handleNumber(2)}>2</button>
          <button onClick={() => handleNumber(3)}>3</button>
          <button onClick={() => handleOperation('+')}>+</button>
          <button onClick={() => handleNumber(0)}>0</button>
          <button onClick={handleDecimal}>.</button>
          <button onClick={handleEquals}>=</button>
        </div>
      )}

      {mode === 'conversion' && (
        <div className="conversion-panel">
          <div className="conversion-type">
            <h3>Length</h3>
            <select
              onChange={(e) => handleConversion('mm', e.target.value, 'length')}
            >
              <option value="cm">mm to cm</option>
              <option value="m">mm to m</option>
              <option value="km">mm to km</option>
            </select>
            <select
              onChange={(e) => handleConversion('cm', e.target.value, 'length')}
            >
              <option value="mm">cm to mm</option>
              <option value="m">cm to m</option>
              <option value="km">cm to km</option>
            </select>
          </div>
          <div className="conversion-type">
            <h3>Weight</h3>
            <select
              onChange={(e) => handleConversion('mg', e.target.value, 'weight')}
            >
              <option value="g">mg to g</option>
              <option value="kg">mg to kg</option>
              <option value="ton">mg to ton</option>
            </select>
            <select
              onChange={(e) => handleConversion('kg', e.target.value, 'weight')}
            >
              <option value="mg">kg to mg</option>
              <option value="g">kg to g</option>
              <option value="ton">kg to ton</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calculator