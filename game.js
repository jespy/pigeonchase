const game = document.getElementById("game");
const playerEl = document.getElementById("player");

const caughtCountEl = document.getElementById("caughtCount");
const targetCountEl = document.getElementById("targetCount");
const scoreEl = document.getElementById("score");
const timerEl = document.getElementById("timer");
const messageEl = document.getElementById("message");

const startScreen = document.getElementById("startScreen");
const endScreen = document.getElementById("endScreen");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

const endTitle = document.getElementById("endTitle");
const endMessage = document.getElementById("endMessage");
const endIcon = document.getElementById("endIcon");
const finalScore = document.getElementById("finalScore");

const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");
const jumpButton = document.getElementById("jumpButton");
const catchButton = document.getElementById("catchButton");

const TARGET_PIGEONS = 10;
const GAME_TIME = 60;
const PLAYER_SPEED = 265;
const JUMP_STRENGTH = 650;
const GRAVITY = 1650;
const CATCH_DISTANCE = 95;
const MAX_PIGEONS = 4;

let gameRunning = false;
let score = 0;
let caught = 0;
let timeRemaining = GAME_TIME;
let timerAccumulator = 0;
let lastTime = 0;
let spawnAccumulator = 0;
let messageTimeout = null;

const keys = {
  left: false,
  right: false
};

const player = {
  x: 80,
  y: 0,
  vy: 0,
  width: 54,
  height: 106,
  grounded: true,
  facing: 1,
  catchCooldown: 0
};

let pigeons = [];

targetCountEl.textContent = TARGET_PIGEONS;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function groundY() {
  return game.clientHeight * 0.07;
}

function updateHUD() {
  caughtCountEl.textContent = caught;
  scoreEl.textContent = score;
  timerEl.textContent = timeRemaining;
}

function resetGame() {
  gameRunning = false;
  score = 0;
  caught = 0;
  timeRemaining = GAME_TIME;
  timerAccumulator = 0;
  spawnAccumulator = 0;
  lastTime = 0;

  keys.left = false;
  keys.right = false;

  player.x = Math.max(30, game.clientWidth * 0.08);
  player.y = 0;
  player.vy = 0;
  player.grounded = true;
  player.facing = 1;
  player.catchCooldown = 0;

  pigeons.forEach(pigeon => pigeon.el.remove());
  pigeons = [];

  playerEl.classList.remove("moving", "jumping", "catching");
  playerEl.style.left = `${player.x}px`;
  playerEl.style.bottom = `${groundY()}px`;
  playerEl.style.transform = "scaleX(1)";

  updateHUD();
}

function beginGame() {
  resetGame();
  startScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
  gameRunning = true;

  for (let i = 0; i < 3; i++) {
    spawnPigeon(i * 120);
  }

  requestAnimationFrame(gameLoop);
}

function createPigeonElement() {
  const el = document.createElement("div");
  el.className = "pigeon walking";
  el.innerHTML = `
    <div class="pigeon-body">
      <div class="pigeon-neck"></div>
      <div class="pigeon-wing"></div>
    </div>
    <div class="pigeon-head">
      <div class="pigeon-eye"></div>
      <div class="pigeon-beak"></div>
    </div>
    <div class="pigeon-leg one"></div>
    <div class="pigeon-leg two"></div>
  `;
  game.appendChild(el);
  return el;
}

function spawnPigeon(offset = 0) {
  if (!gameRunning && !lastTime) return;
  if (pigeons.length >= MAX_PIGEONS) return;

  const el = createPigeonElement();
  const side = Math.random() > 0.5 ? 1 : -1;
  const margin = 55;
  const x = side === 1
    ? game.clientWidth - margin - offset
    : margin + offset;

  const pigeon = {
    el,
    x: clamp(x, 18, game.clientWidth - 70),
    y: 0,
    vx: (Math.random() * 34 + 22) * (Math.random() > 0.5 ? 1 : -1),
    vy: 0,
    width: 52,
    height: 40,
    state: "walking",
    fleeTimer: 0,
    wanderTimer: Math.random() * 1.5 + 0.5,
    active: true
  };

  pigeons.push(pigeon);
  renderPigeon(pigeon);
}

function renderPigeon(pigeon) {
  pigeon.el.style.left = `${pigeon.x}px`;
  pigeon.el.style.bottom = `${groundY() + pigeon.y}px`;
  pigeon.el.style.transform = `scaleX(${pigeon.vx >= 0 ? 1 : -1})`;
}

function playerCenter() {
  return {
    x: player.x + player.width / 2,
    y: groundY() + player.y + player.height / 2
  };
}

function pigeonCenter(pigeon) {
  return {
    x: pigeon.x + pigeon.width / 2,
    y: groundY() + pigeon.y + pigeon.height / 2
  };
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function jump() {
  if (!gameRunning || !player.grounded) return;

  player.vy = JUMP_STRENGTH;
  player.grounded = false;
  playerEl.classList.add("jumping");
}

function tryCatch() {
  if (!gameRunning || player.catchCooldown > 0) return;

  player.catchCooldown = 0.38;
  playerEl.classList.add("catching");
  setTimeout(() => playerEl.classList.remove("catching"), 160);

  const pCenter = playerCenter();

  let closest = null;
  let closestDistance = Infinity;

  for (const pigeon of pigeons) {
    if (!pigeon.active) continue;
    const dist = distanceBetween(pCenter, pigeonCenter(pigeon));

    const isInFront =
      player.facing === 1
        ? pigeon.x >= player.x - 12
        : pigeon.x <= player.x + player.width + 12;

    if (isInFront && dist < closestDistance) {
      closest = pigeon;
      closestDistance = dist;
    }
  }

  if (closest && closestDistance <= CATCH_DISTANCE) {
    catchPigeon(closest);
  } else {
    showMessage("Missed!", 500);
  }
}

function catchPigeon(pigeon) {
  pigeon.active = false;
  score += pigeon.state === "flying" ? 150 : 100;
  caught += 1;
  updateHUD();

  pigeon.el.style.transition = "transform .18s, opacity .18s";
  pigeon.el.style.transform += " scale(.25)";
  pigeon.el.style.opacity = "0";

  setTimeout(() => {
    pigeon.el.remove();
    pigeons = pigeons.filter(item => item !== pigeon);
  }, 200);

  showMessage(pigeon.state === "flying" ? "+150 flying catch!" : "+100 caught!", 700);

  if (caught >= TARGET_PIGEONS) {
    endGame(true);
  }
}

function showMessage(text, duration = 700) {
  clearTimeout(messageTimeout);
  messageEl.textContent = text;
  messageEl.classList.add("show");

  messageTimeout = setTimeout(() => {
    messageEl.classList.remove("show");
  }, duration);
}

function endGame(won) {
  if (!gameRunning) return;
  gameRunning = false;

  if (won) {
    endIcon.textContent = "🎉";
    endTitle.textContent = "You did it!";
    endMessage.textContent = `Mateo caught all ${TARGET_PIGEONS} pigeons before time ran out.`;
  } else {
    endIcon.textContent = "⏰";
    endTitle.textContent = "Time's up!";
    endMessage.textContent = `You caught ${caught} out of ${TARGET_PIGEONS} pigeons.`;
  }

  finalScore.textContent = score;
  endScreen.classList.remove("hidden");
}

function updatePlayer(dt) {
  let direction = 0;
  if (keys.left) direction -= 1;
  if (keys.right) direction += 1;

  if (direction !== 0) {
    player.facing = direction;
    player.x += direction * PLAYER_SPEED * dt;
    playerEl.classList.add("moving");
  } else {
    playerEl.classList.remove("moving");
  }

  player.x = clamp(player.x, 5, game.clientWidth - player.width - 5);

  if (!player.grounded) {
    player.vy -= GRAVITY * dt;
    player.y += player.vy * dt;

    if (player.y <= 0) {
      player.y = 0;
      player.vy = 0;
      player.grounded = true;
      playerEl.classList.remove("jumping");
    }
  }

  if (player.catchCooldown > 0) {
    player.catchCooldown -= dt;
  }

  playerEl.style.left = `${player.x}px`;
  playerEl.style.bottom = `${groundY() + player.y}px`;
  playerEl.style.transform = `scaleX(${player.facing})`;
}

function scareNearbyPigeons() {
  const pCenter = playerCenter();

  for (const pigeon of pigeons) {
    if (!pigeon.active || pigeon.state === "flying") continue;

    const distance = distanceBetween(pCenter, pigeonCenter(pigeon));

    if (distance < 145) {
      const awayDirection = pigeon.x < player.x ? -1 : 1;
      pigeon.state = "flying";
      pigeon.fleeTimer = 1.8 + Math.random() * 1.2;
      pigeon.vx = awayDirection * (170 + Math.random() * 70);
      pigeon.vy = 210 + Math.random() * 90;
      pigeon.el.classList.remove("walking");
      pigeon.el.classList.add("flying");
    }
  }
}

function updatePigeons(dt) {
  const floorWidth = game.clientWidth;

  for (const pigeon of [...pigeons]) {
    if (!pigeon.active) continue;

    if (pigeon.state === "walking") {
      pigeon.wanderTimer -= dt;

      if (pigeon.wanderTimer <= 0) {
        pigeon.vx = (Math.random() * 34 + 18) * (Math.random() > 0.5 ? 1 : -1);
        pigeon.wanderTimer = Math.random() * 1.7 + 0.5;
      }

      pigeon.x += pigeon.vx * dt;

      if (pigeon.x <= 8 || pigeon.x >= floorWidth - pigeon.width - 8) {
        pigeon.vx *= -1;
        pigeon.x = clamp(pigeon.x, 8, floorWidth - pigeon.width - 8);
      }
    } else {
      pigeon.fleeTimer -= dt;
      pigeon.x += pigeon.vx * dt;
      pigeon.y += pigeon.vy * dt;
      pigeon.vy += 85 * dt;

      if (
        pigeon.fleeTimer <= 0 ||
        pigeon.x < -100 ||
        pigeon.x > floorWidth + 100 ||
        pigeon.y > game.clientHeight
      ) {
        pigeon.active = false;
        pigeon.el.remove();
        pigeons = pigeons.filter(item => item !== pigeon);
        continue;
      }
    }

    renderPigeon(pigeon);
  }
}

function gameLoop(timestamp) {
  if (!gameRunning) return;

  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.034);
  lastTime = timestamp;

  updatePlayer(dt);
  scareNearbyPigeons();
  updatePigeons(dt);

  timerAccumulator += dt;
  spawnAccumulator += dt;

  if (timerAccumulator >= 1) {
    timerAccumulator -= 1;
    timeRemaining -= 1;
    updateHUD();

    if (timeRemaining <= 0) {
      endGame(false);
      return;
    }
  }

  if (spawnAccumulator >= 1.65) {
    spawnAccumulator = 0;
    spawnPigeon();
  }

  requestAnimationFrame(gameLoop);
}

function setControl(control, active) {
  keys[control] = active;
}

function bindHoldButton(button, control) {
  const press = event => {
    event.preventDefault();
    setControl(control, true);
    button.classList.add("active");
  };

  const release = event => {
    event.preventDefault();
    setControl(control, false);
    button.classList.remove("active");
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
}

bindHoldButton(leftButton, "left");
bindHoldButton(rightButton, "right");

jumpButton.addEventListener("pointerdown", event => {
  event.preventDefault();
  jump();
});

catchButton.addEventListener("pointerdown", event => {
  event.preventDefault();
  tryCatch();
});

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if (["arrowleft", "arrowright", " ", "enter"].includes(key)) {
    event.preventDefault();
  }

  if (key === "arrowleft" || key === "a") keys.left = true;
  if (key === "arrowright" || key === "d") keys.right = true;
  if (key === " " || key === "arrowup" || key === "w") jump();
  if (key === "e" || key === "enter") tryCatch();
});

window.addEventListener("keyup", event => {
  const key = event.key.toLowerCase();

  if (key === "arrowleft" || key === "a") keys.left = false;
  if (key === "arrowright" || key === "d") keys.right = false;
});

window.addEventListener("blur", () => {
  keys.left = false;
  keys.right = false;
});

window.addEventListener("resize", () => {
  player.x = clamp(player.x, 5, game.clientWidth - player.width - 5);
  playerEl.style.left = `${player.x}px`;
  playerEl.style.bottom = `${groundY() + player.y}px`;

  for (const pigeon of pigeons) {
    pigeon.x = clamp(pigeon.x, 8, game.clientWidth - pigeon.width - 8);
    renderPigeon(pigeon);
  }
});

startButton.addEventListener("click", beginGame);
restartButton.addEventListener("click", beginGame);

resetGame();
