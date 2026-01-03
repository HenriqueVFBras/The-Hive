import { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/Game.css';

const Game = () => {
  const canvasRef = useRef(null);
  const shootSoundRef = useRef(null);
  const gameOverSoundRef = useRef(null);
  const getHitSoundRef = useRef(null);
  
  const [gameState, setGameState] = useState('menu'); // menu, playing, gameOver, paused
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [money, setMoney] = useState(50);
  const [showShop, setShowShop] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [upgrades, setUpgrades] = useState({
    damage: 1,
    fireRate: 1,
    maxHealth: 100
  });

  const gameDataRef = useRef({
    enemies: [],
    projectiles: [],
    particles: [],
    lastShot: 0,
    lastEnemySpawn: 0,
    difficulty: 1,
    enemySpawnRate: 2000,
    hive: { x: 400, y: 300, radius: 40 },
    gameStartTime: 0
  });

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setHealth(upgrades.maxHealth);
    setMoney(50);
    setShowShop(false);
    setIsPaused(false);
    gameDataRef.current = {
      enemies: [],
      projectiles: [],
      particles: [],
      lastShot: 0,
      lastEnemySpawn: 0,
      difficulty: 1,
      enemySpawnRate: 2000,
      hive: { x: 400, y: 300, radius: 40 },
      gameStartTime: Date.now()
    };
  };

  const spawnEnemy = useCallback(() => {
    const side = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    const speed = 0.5 + gameDataRef.current.difficulty * 0.1;

    switch(side) {
      case 0: // top
        x = Math.random() * 800;
        y = -20;
        break;
      case 1: // right
        x = 820;
        y = Math.random() * 600;
        break;
      case 2: // bottom
        x = Math.random() * 800;
        y = 620;
        break;
      case 3: // left
        x = -20;
        y = Math.random() * 600;
        break;
    }

    const angle = Math.atan2(300 - y, 400 - x);
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;

    gameDataRef.current.enemies.push({
      x, y, vx, vy,
      radius: 12,
      health: 2 + Math.floor(gameDataRef.current.difficulty / 2),
      maxHealth: 2 + Math.floor(gameDataRef.current.difficulty / 2)
    });
  }, []);

  const shoot = useCallback((targetX, targetY) => {
    const now = Date.now();
    const fireRate = 300 / upgrades.fireRate;
    
    if (now - gameDataRef.current.lastShot < fireRate) return;
    
    gameDataRef.current.lastShot = now;
    
    // Tocar som de disparo
    if (shootSoundRef.current) {
      shootSoundRef.current.currentTime = 0;
      shootSoundRef.current.play().catch(e => console.log('Erro ao tocar som:', e));
    }
    
    const hive = gameDataRef.current.hive;
    const angle = Math.atan2(targetY - hive.y, targetX - hive.x);
    const speed = 8;

    gameDataRef.current.projectiles.push({
      x: hive.x,
      y: hive.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 5,
      damage: upgrades.damage
    });
  }, [upgrades]);

  const createParticles = (x, y, color, count = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      gameDataRef.current.particles.push({
        x, y,
        vx: Math.cos(angle) * (2 + Math.random() * 2),
        vy: Math.sin(angle) * (2 + Math.random() * 2),
        life: 30,
        color
      });
    }
  };

  const buyUpgrade = (type, cost) => {
    if (money < cost) return;
    
    setMoney(m => m - cost);
    
    if (type === 'health') {
      setHealth(h => Math.min(h + 50, upgrades.maxHealth));
    } else if (type === 'damage') {
      setUpgrades(u => ({ ...u, damage: u.damage + 1 }));
    } else if (type === 'fireRate') {
      setUpgrades(u => ({ ...u, fireRate: u.fireRate + 0.5 }));
    } else if (type === 'maxHealth') {
      setUpgrades(u => ({ ...u, maxHealth: u.maxHealth + 50 }));
      setHealth(h => h + 50);
    }
  };

  const toggleShop = () => {
    setShowShop(!showShop);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const returnToMenu = () => {
    setGameState('menu');
    setIsPaused(false);
    setShowShop(false);
  };

  // Listener para ESC
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsPaused(p => !p);
        setShowShop(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Game Loop
  useEffect(() => {
    if (gameState !== 'playing' || isPaused || showShop) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      shoot(x, y);
    };

    canvas.addEventListener('click', handleClick);

    const gameLoop = () => {
      const now = Date.now();
      
      // Spawn enemies
      if (now - gameDataRef.current.lastEnemySpawn > gameDataRef.current.enemySpawnRate) {
        spawnEnemy();
        gameDataRef.current.lastEnemySpawn = now;
      }

      // Increase difficulty
      gameDataRef.current.difficulty += 0.0005;
      gameDataRef.current.enemySpawnRate = Math.max(500, 2000 - gameDataRef.current.difficulty * 50);

      // Update enemies
      const gd = gameDataRef.current;
      gd.enemies = gd.enemies.filter(enemy => {
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        const dx = enemy.x - gd.hive.x;
        const dy = enemy.y - gd.hive.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < gd.hive.radius + enemy.radius) {
          // Tocar som de levar hit
          if (getHitSoundRef.current) {
            getHitSoundRef.current.currentTime = 0;
            getHitSoundRef.current.play().catch(e => console.log('Erro ao tocar som:', e));
          }
          
          setHealth(h => {
            const newHealth = h - 10;
            if (newHealth <= 0) {
              setGameState('gameOver');
              // Tocar som de game over
              if (gameOverSoundRef.current) {
                gameOverSoundRef.current.currentTime = 0;
                gameOverSoundRef.current.play().catch(e => console.log('Erro ao tocar som:', e));
              }
            }
            return Math.max(0, newHealth);
          });
          createParticles(enemy.x, enemy.y, '#ff4444');
          return false;
        }

        return enemy.x > -50 && enemy.x < 850 && enemy.y > -50 && enemy.y < 650;
      });

      // Update projectiles
      gd.projectiles = gd.projectiles.filter(proj => {
        proj.x += proj.vx;
        proj.y += proj.vy;

        let hit = false;
        gd.enemies = gd.enemies.filter(enemy => {
          const dx = proj.x - enemy.x;
          const dy = proj.y - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < proj.radius + enemy.radius) {
            enemy.health -= proj.damage;
            hit = true;
            
            if (enemy.health <= 0) {
              setMoney(m => m + 5);
              createParticles(enemy.x, enemy.y, '#ffaa00');
              return false;
            }
          }
          return true;
        });

        if (hit) return false;

        return proj.x > 0 && proj.x < 800 && proj.y > 0 && proj.y < 600;
      });

      // Update particles
      gd.particles = gd.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        return p.life > 0;
      });

      // Update score (time survived) - baseado em tempo real
      const elapsedSeconds = (now - gameDataRef.current.gameStartTime) / 1000;
      setScore(Math.floor(elapsedSeconds));

      // Draw
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, 800, 600);

      // Draw grass
      ctx.fillStyle = '#90EE90';
      ctx.fillRect(0, 550, 800, 50);

      // Draw hive
      ctx.fillStyle = '#FFD700';
      ctx.strokeStyle = '#FFA500';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(gd.hive.x, gd.hive.y, gd.hive.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Draw hexagon pattern on hive
      ctx.fillStyle = '#FFA500';
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = gd.hive.x + Math.cos(angle) * 15;
        const y = gd.hive.y + Math.sin(angle) * 15;
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const hexAngle = (Math.PI / 3) * j;
          const hx = x + Math.cos(hexAngle) * 6;
          const hy = y + Math.sin(hexAngle) * 6;
          if (j === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fill();
      }

      // Draw enemies
      gd.enemies.forEach(enemy => {
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw wings
        ctx.fillStyle = 'rgba(200, 200, 255, 0.5)';
        ctx.beginPath();
        ctx.ellipse(enemy.x - 10, enemy.y, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(enemy.x + 10, enemy.y, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        const barWidth = enemy.radius * 2;
        const healthPercent = enemy.health / enemy.maxHealth;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x - barWidth/2, enemy.y - enemy.radius - 8, barWidth, 4);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(enemy.x - barWidth/2, enemy.y - enemy.radius - 8, barWidth * healthPercent, 4);
      });

      // Draw projectiles
      ctx.fillStyle = '#FFD700';
      gd.projectiles.forEach(proj => {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw particles
      gd.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(animationId);
      if (canvas) {
        canvas.removeEventListener('click', handleClick);
      }
    };
  }, [gameState, shoot, spawnEnemy, upgrades, isPaused, showShop]);

  const healthPercent = (health / upgrades.maxHealth) * 100;
  const healthClass = health > 50 ? 'high' : health > 25 ? 'medium' : 'low';

  return (
    <div className="game-container">
      {/* Sons do jogo */}
      <audio ref={shootSoundRef} src="/src/assets/sounds/Honey.mp3" preload="auto" />
      <audio ref={gameOverSoundRef} src="/src/assets/sounds/GameOver.mp3" preload="auto" />
      <audio ref={getHitSoundRef} src="/src/assets/sounds/GetHit.mp3" preload="auto" />
      
      {gameState === 'menu' && (
        <div className="menu-screen fade-in">
          <h1 className="menu-title">🐝 THE HIVE 🐝</h1>
          <p className="menu-subtitle">Defend your hive from the wasp invasion!</p>
          <button onClick={startGame} className="btn-primary">
            START GAME
          </button>
          <div className="menu-instructions">
            <p><strong>How to Play:</strong></p>
            <p>🎯 Click to shoot at wasps</p>
            <p>💰 Earn money by defeating enemies</p>
            <p>🛒 Buy upgrades in the shop</p>
            <p>❤️ Don't let wasps reach your hive!</p>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="game-canvas-container fade-in">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="game-canvas"
          />
          
          {/* HUD */}
          <div className="hud">
            <div className="hud-item">⏱️ Time: {score}s</div>
            <div className="hud-item">💰 Money: ${money}</div>
            <div className="hud-item">
              ❤️ Health:
              <div className="health-bar-container">
                <div 
                  className={`health-bar ${healthClass}`}
                  style={{ width: `${healthPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Shop Button */}
          <button onClick={toggleShop} className="shop-button">
            🛒 SHOP
          </button>

          {/* Pause Indicator */}
          {(isPaused || showShop) && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              padding: '20px 40px',
              borderRadius: '10px',
              fontSize: '32px',
              fontWeight: 'bold',
              pointerEvents: 'none',
              zIndex: 5
            }}>
              {isPaused ? '⏸️ PAUSED' : '🛒 SHOP OPEN'}
            </div>
          )}

          {/* Pause Menu */}
          {isPaused && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.9)',
              padding: '40px',
              borderRadius: '20px',
              textAlign: 'center',
              zIndex: 10
            }}>
              <h2 style={{ color: 'white', marginBottom: '30px', fontSize: '48px' }}>⏸️ PAUSED</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <button onClick={togglePause} className="btn-primary">
                  ▶️ RESUME
                </button>
                <button onClick={returnToMenu} className="btn-secondary">
                  🏠 MAIN MENU
                </button>
              </div>
              <p style={{ color: '#aaa', marginTop: '20px', fontSize: '14px' }}>
                Press ESC to resume
              </p>
            </div>
          )}

          {/* Shop Panel */}
          {showShop && (
            <div className="shop-panel">
              <h3 className="shop-title">UPGRADES</h3>
              
              <div className="shop-item">
                <button 
                  onClick={() => buyUpgrade('health', 30)} 
                  className={`shop-item-button ${money >= 30 ? 'available' : 'unavailable'}`}
                >
                  ❤️ +50 Health - $30
                </button>
              </div>

              <div className="shop-item">
                <button 
                  onClick={() => buyUpgrade('damage', 50)} 
                  className={`shop-item-button ${money >= 50 ? 'available' : 'unavailable'}`}
                >
                  ⚔️ +1 Damage - $50
                </button>
                <div className="shop-item-info">Current: {upgrades.damage}</div>
              </div>

              <div className="shop-item">
                <button 
                  onClick={() => buyUpgrade('fireRate', 75)} 
                  className={`shop-item-button ${money >= 75 ? 'available' : 'unavailable'}`}
                >
                  ⚡ Fire Rate +50% - $75
                </button>
                <div className="shop-item-info">Current: {upgrades.fireRate.toFixed(1)}x</div>
              </div>

              <div className="shop-item">
                <button 
                  onClick={() => buyUpgrade('maxHealth', 100)} 
                  className={`shop-item-button ${money >= 100 ? 'available' : 'unavailable'}`}
                >
                  💪 Max Health +50 - $100
                </button>
                <div className="shop-item-info">Current: {upgrades.maxHealth}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {gameState === 'gameOver' && (
        <div className="game-over-screen fade-in">
          <h1 className="game-over-title">GAME OVER</h1>
          <p className="game-over-stats">⏱️ Time Survived: {score} seconds</p>
          <p className="game-over-money">💰 Money Earned: ${money}</p>
          <div className="button-group">
            <button onClick={startGame} className="btn-primary">
              TRY AGAIN
            </button>
            <button onClick={() => setGameState('menu')} className="btn-secondary">
              MENU
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;