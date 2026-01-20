const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Audio Context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Sound generation functions
function playBeep(frequency = 800, duration = 0.1, volume = 0.3) {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  
  osc.frequency.value = frequency;
  osc.type = 'sine';
  
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + duration);
}

function playShootSound() {
  playBeep(400, 0.05, 0.3);
}

function playExplosionSound() {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  
  osc.frequency.setValueAtTime(150, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);
  
  gain.gain.setValueAtTime(0.3, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + 0.3);
}

function playGameOverSound() {
  playBeep(300, 0.2, 0.5);
  setTimeout(() => playBeep(200, 0.3, 0.5), 150);
}

function playLevelUpSound() {
  playBeep(600, 0.1, 0.5);
  setTimeout(() => playBeep(800, 0.1, 0.5), 100);
  setTimeout(() => playBeep(1000, 0.2, 0.5), 200);
}

function playPowerUpSound() {
  playBeep(1200, 0.05, 0.4);
  setTimeout(() => playBeep(1400, 0.05, 0.4), 50);
}

// Sounds (dummy objects for compatibility)
const shootSound = { play: playShootSound };
const explosionSound = { play: playExplosionSound };
const gameOverSound = { play: playGameOverSound };
const levelUpSound = { play: playLevelUpSound };
const powerUpSound = { play: playPowerUpSound };

// Helper function to play sound safely
function playSound(sound) {
  try {
    sound.play();
  } catch (e) {
    console.log("Audio error:", e);
  }
}

// Player
const player = { x: 375, y: 450, w: 50, h: 20, speed: 6 };

// Game State
let bullets = [];
let enemies = [];
let enemyBullets = [];
let powerUps = [];
let score = 0;
let level = 1;
let gameOver = false;

// Power states
let shieldActive = false;
let doubleFire = false;

// Controls
let left = false, right = false;

// Keyboard
document.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") left = true;
  if (e.key === "ArrowRight") right = true;
  if (e.code === "Space") shoot();
});
document.addEventListener("keyup", e => {
  if (e.key === "ArrowLeft") left = false;
  if (e.key === "ArrowRight") right = false;
  if (e.key.toLowerCase() === "r" && gameOver) restartGame();
});

// Mobile
document.getElementById("left").ontouchstart = () => left = true;
document.getElementById("left").ontouchend = () => left = false;
document.getElementById("right").ontouchstart = () => right = true;
document.getElementById("right").ontouchend = () => right = false;
document.getElementById("shoot").ontouchstart = shoot;

// Shoot
function shoot() {
  bullets.push({ x: player.x + 22, y: player.y, speed: 8 });
  if (doubleFire) {
    bullets.push({ x: player.x + 5, y: player.y, speed: 8 });
    bullets.push({ x: player.x + 40, y: player.y, speed: 8 });
  }
  playSound(shootSound);
}

// Enemy Spawn
function spawnEnemy() {
  enemies.push({
    x: Math.random() * 760,
    y: 0,
    w: 40,
    h: 20,
    speed: 2 + level,
    shootCooldown: 0
  });
}
setInterval(() => !gameOver && spawnEnemy(), 1200);

// Enemy Shooting
function enemyShoot(e) {
  enemyBullets.push({
    x: e.x + e.w / 2,
    y: e.y + e.h,
    speed: 4 + level
  });
}

// Power Ups
function spawnPowerUp() {
  const types = ["shield", "double"];
  powerUps.push({
    x: Math.random() * 760,
    y: 0,
    type: types[Math.floor(Math.random() * 2)]
  });
}
setInterval(spawnPowerUp, 8000);

// Collision
function collide(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + 5 > b.x &&
    a.y < b.y + b.h &&
    a.y + 10 > b.y
  );
}

// Restart Game
function restartGame() {
  bullets = [];
  enemies = [];
  enemyBullets = [];
  powerUps = [];
  score = 0;
  level = 1;
  gameOver = false;
  shieldActive = false;
  doubleFire = false;
  player.x = 375;
}

// Dodge AI
function dodgeAI(enemy) {
  bullets.forEach(b => {
    if (Math.abs(b.x - enemy.x) < 30 && b.y < enemy.y + 40) {
      enemy.x += (enemy.x - b.x) * 0.15;
    }
  });
}


// Update
function update() {
  if (gameOver) return;

  if (left && player.x > 0) player.x -= player.speed;
  if (right && player.x < canvas.width - player.w)
    player.x += player.speed;

  bullets.forEach(b => b.y -= b.speed);
  bullets = bullets.filter(b => b.y > 0);

  enemies.forEach(e => {
    e.y += e.speed;
    dodgeAI(e);

    e.shootCooldown++;
    if (e.shootCooldown > 80) {
      enemyShoot(e);
      e.shootCooldown = 0;
    }
  });

  enemyBullets.forEach(b => b.y += b.speed);
  enemyBullets = enemyBullets.filter(b => b.y < canvas.height);

  // Bullet vs Enemy
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (collide(b, e)) {
        bullets.splice(bi, 1);
        enemies.splice(ei, 1);
        playSound(explosionSound);
        score += 10;
      }
    });
  });

  // Enemy bullet vs Player
  enemyBullets.forEach((b, bi) => {
    if (
      b.x > player.x &&
      b.x < player.x + player.w &&
      b.y > player.y
    ) {
      enemyBullets.splice(bi, 1);
      if (!shieldActive) {
        gameOver = true;
        playSound(gameOverSound);
      }
    }
  });

  // Power-ups
  powerUps.forEach((p, pi) => {
    p.y += 2;
    if (
      p.x > player.x &&
      p.x < player.x + player.w &&
      p.y > player.y
    ) {
      if (p.type === "shield") {
        shieldActive = true;
        playSound(powerUpSound);
        setTimeout(() => shieldActive = false, 5000);
      }
      if (p.type === "double") {
        doubleFire = true;
        playSound(powerUpSound);
        setTimeout(() => doubleFire = false, 5000);
      }
      powerUps.splice(pi, 1);
    }
  });

  if (score > level * 100) {
    level++;
    playSound(levelUpSound);
  }
}

// Draw
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Player
  ctx.fillStyle = "cyan";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  if (shieldActive) {
    ctx.strokeStyle = "cyan";
    ctx.strokeRect(player.x - 5, player.y - 5, player.w + 10, player.h + 10);
  }

  // Bullets
  ctx.fillStyle = "yellow";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, 5, 10));

  // Enemies
  ctx.fillStyle = "red";
  enemies.forEach(e => ctx.fillRect(e.x, e.y, e.w, e.h));

  // Enemy Bullets
  ctx.fillStyle = "orange";
  enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, 5, 10));

  // Power-ups
  powerUps.forEach(p => {
    ctx.fillStyle = p.type === "shield" ? "lime" : "magenta";
    ctx.fillRect(p.x, p.y, 20, 20);
  });

  // HUD
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText(`Score: ${score}  Level: ${level}`, 10, 25);

  if (gameOver) {
    ctx.font = "40px Arial";
    ctx.fillText("GAME OVER", 260, 250);
    ctx.font = "20px Arial";
    ctx.fillText("Press R to Restart", 280, 300);
  }
}

// Loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
