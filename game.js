// -----------------------------------------------------------
//  Game Portfolio Platformer
//  Тимур / Hiki
// -----------------------------------------------------------

// --- Константы мира ---

const WORLD = {
  width: 1536,  // уточняется после загрузки фоновой карты
  height: 1024
};

// Физика (px/сек, px/сек^2)
const MOVE_SPEED = 220;      // скорость бега
const JUMP_SPEED = 520;      // сила прыжка
const GRAVITY = 900;        // гравитация
const MAX_FALL_SPEED = 1400; // лимит падения

// ниже этого считаем, что герой "упал в пропасть"
let FALL_Y_LIMIT = WORLD.height + 300;

// Включить/выключить отрисовку хитбоксов платформ
const DEBUG_PLATFORMS = true;

// --- Канвас и контекст ---

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

// --- UI элементы ---

const taskTextEl = document.getElementById("taskText");
const controlsHintEl = document.getElementById("controlsHint");

const gameOverOverlay = document.getElementById("gameOverOverlay");
const gameOverTextEl = document.getElementById("gameOverText");
const gameOverRestartBtn = document.getElementById("gameOverRestart");

const boardOverlay = document.getElementById("boardOverlay");
const boardCloseBtn = document.getElementById("boardClose");

// --- Загрузка картинок ---

const bgImage = new Image();
bgImage.src = "map_forest.png";

const heroFrontImg = new Image();
heroFrontImg.src = "hero_front.png";

const heroLeftImg = new Image();
heroLeftImg.src = "hero_left.png";

const heroRightImg = new Image();
heroRightImg.src = "hero_right.png";

const heroBackImg = new Image();
heroBackImg.src = "idle_up.png";

// --- Платформы и триггеры ---------------------------------
// Координаты подобраны под фон 1536x1024 (как на скрине)

const platforms = [
  // запасная "земля" далеко внизу — на всякий случай
  { x: 0, y: 3000, w: 1536, h: 124 },

  // нижняя большая платформа слева
  { x: 80,  y: 830, w: 540, h: 40 },

  // ступеньки вверх вправо
  { x: 470, y: 700, w: 260, h: 40 },
  { x: 680, y: 610, w: 160, h: 40 },
  { x: 820, y: 540, w: 260, h: 40 },

  // финальная платформа под доской
  { x: 1020, y: 400, w: 300, h: 40 }
];

// Прямоугольник, где стоит доска объявлений
const boardTrigger = {
  x: 1060,
  y: 260,
  w: 320,
  h: 220
};

// --- Состояние героя --------------------------------------
// Ставим героя СРАЗУ на первую реальную платформу (index = 1)

const HERO_WIDTH = 72;
const HERO_HEIGHT = 96;

const hero = {
  x: platforms[1].x + 40,
  y: platforms[1].y - HERO_HEIGHT,
  width: HERO_WIDTH,
  height: HERO_HEIGHT,
  vx: 0,
  vy: 0,
  onGround: false,
  dir: "right", // "left" | "right"
  animTime: 0
};

// --- Ввод с клавиатуры ------------------------------------

const keys = {
  left: false,
  right: false,
  jump: false,
  jumpPressedThisFrame: false,
  restart: false
};

window.addEventListener("keydown", e => {
  switch (e.key) {
    case "a":
    case "A":
    case "ArrowLeft":
      keys.left = true;
      break;
    case "d":
    case "D":
    case "ArrowRight":
      keys.right = true;
      break;
    case "w":
    case "W":
    case "ArrowUp":
    case " ":
      keys.jump = true;
      keys.jumpPressedThisFrame = true;
      break;
    case "r":
    case "R":
      keys.restart = true;
      break;
  }
});

window.addEventListener("keyup", e => {
  switch (e.key) {
    case "a":
    case "A":
    case "ArrowLeft":
      keys.left = false;
      break;
    case "d":
    case "D":
    case "ArrowRight":
      keys.right = false;
      break;
    case "w":
    case "W":
    case "ArrowUp":
    case " ":
      keys.jump = false;
      break;
    case "r":
    case "R":
      keys.restart = false;
      break;
  }
});

// --- Game Over / Restart ----------------------------------

let isGameOver = false;

function showGameOver(reasonText) {
  isGameOver = true;
  gameOverTextEl.textContent =
    reasonText || "Ты сорвался вниз. Попробуй ещё раз!";
  gameOverOverlay.classList.remove("hidden");
}

function hideGameOver() {
  isGameOver = false;
  gameOverOverlay.classList.add("hidden");
}

function resetHero() {
  hero.x = platforms[1].x + 40;
  hero.y = platforms[1].y - hero.height;
  hero.vx = 0;
  hero.vy = 0;
  hero.onGround = false;
  hero.dir = "right";
  hero.animTime = 0;
}

gameOverRestartBtn.addEventListener("click", () => {
  hideGameOver();
  resetHero();
});

// --- Работа с доской объявлений ---------------------------

let boardOpenedOnce = false;

function isHeroInBoardZone() {
  const cx = hero.x + hero.width / 2;
  const cy = hero.y + hero.height / 2;
  return (
    cx > boardTrigger.x &&
    cx < boardTrigger.x + boardTrigger.w &&
    cy > boardTrigger.y &&
    cy < boardTrigger.y + boardTrigger.h
  );
}

function openBoard() {
  if (boardOpenedOnce) return;
  boardOpenedOnce = true;
  boardOverlay.classList.remove("hidden");
}

function closeBoard() {
  boardOverlay.classList.add("hidden");
}

boardCloseBtn.addEventListener("click", closeBoard);

// --- Вспомогательные функции ------------------------------

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.width > b.x &&
    a.y < b.y + b.h &&
    a.y + a.height > b.y
  );
}

// --- Обновление физики героя ------------------------------

function updateHero(dt) {
  // предыдущее положение для корректной коллизии
  const prevX = hero.x;
  const prevY = hero.y;
  const prevBottom = prevY + hero.height;
  const prevTop = prevY;

  // Горизонталь
  let dir = 0;
  if (keys.left) dir -= 1;
  if (keys.right) dir += 1;

  hero.vx = dir * MOVE_SPEED;

  if (dir < 0) hero.dir = "left";
  else if (dir > 0) hero.dir = "right";

  // Прыжок
  if (keys.jumpPressedThisFrame && hero.onGround) {
    hero.vy = -JUMP_SPEED;
    hero.onGround = false;
  }
  keys.jumpPressedThisFrame = false;

  // Гравитация
  hero.vy += GRAVITY * dt;
  if (hero.vy > MAX_FALL_SPEED) hero.vy = MAX_FALL_SPEED;

  // Перемещение
  hero.x += hero.vx * dt;
  hero.y += hero.vy * dt;
  hero.onGround = false;

  // Стенки мира по X
  if (hero.x < 0) hero.x = 0;
  if (hero.x + hero.width > WORLD.width) {
    hero.x = WORLD.width - hero.width;
  }

  // Коллизии с платформами (нормальный вариант: по пересечению пред/текущего)
  const curBottom = hero.y + hero.height;
  const curTop = hero.y;
  const curLeft = hero.x;
  const curRight = hero.x + hero.width;

  for (const p of platforms) {
    if (!rectsOverlap(hero, p)) continue;

    const platTop = p.y;
    const platBottom = p.y + p.h;
    const platLeft = p.x;
    const platRight = p.x + p.w;

    // Приземление сверху
    if (prevBottom <= platTop && curBottom >= platTop) {
      hero.y = platTop - hero.height;
      hero.vy = 0;
      hero.onGround = true;
    }
    // Удар головой снизу
    else if (prevTop >= platBottom && curTop <= platBottom) {
      hero.y = platBottom;
      hero.vy = 0;
    }
    // Горизонтальные толчки (если не было вертикального пересечения)
    else {
      if (prevX + hero.width <= platLeft && curRight > platLeft) {
        // вошёл справа налево
        hero.x = platLeft - hero.width;
      } else if (prevX >= platRight && curLeft < platRight) {
        // вошёл слева направо
        hero.x = platRight;
      }
    }
  }

  // Верх мира
  if (hero.y < 0) {
    hero.y = 0;
    if (hero.vy < 0) hero.vy = 0;
  }

  // Проверка на падение в пропасть
  if (hero.y > FALL_Y_LIMIT && !isGameOver) {
    showGameOver("Ты упал в пропасть. Попробуй снова!");
  }

  hero.animTime += dt;
}

// --- Рендеринг --------------------------------------------

function drawBackground() {
  ctx.drawImage(bgImage, 0, 0, WORLD.width, WORLD.height);
}

function drawPlatformsDebug() {
  if (!DEBUG_PLATFORMS) return;

  platforms.forEach(p => {
    ctx.fillStyle = "rgba(0, 150, 255, 0.35)";
    ctx.fillRect(p.x, p.y, p.w, p.h);

    ctx.strokeStyle = "rgba(0, 255, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.w, p.h);

    ctx.fillStyle = "white";
    ctx.font = "12px monospace";
    ctx.fillText(`(${p.x}, ${p.y})`, p.x + 4, p.y - 6);
  });
}

function drawBoardHighlight() {
  ctx.save();
  const cx = boardTrigger.x + boardTrigger.w / 2;
  const cy = boardTrigger.y + boardTrigger.h / 2;

  const gradient = ctx.createRadialGradient(
    cx, cy, 10,
    cx, cy, 220
  );
  gradient.addColorStop(0, "rgba(56,189,248,0.25)");
  gradient.addColorStop(1, "rgba(56,189,248,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(
    boardTrigger.x - 120,
    boardTrigger.y - 120,
    boardTrigger.w + 240,
    boardTrigger.h + 240
  );
  ctx.restore();
}

function drawHero() {
  let sprite;

  const movingHorizontally = Math.abs(hero.vx) > 1;

  if (!movingHorizontally && hero.onGround) {
    sprite = heroFrontImg;
  } else {
    sprite = hero.dir === "left" ? heroLeftImg : heroRightImg;
  }

  const drawX = Math.round(hero.x);
  const drawY = Math.round(hero.y);

  ctx.drawImage(sprite, drawX, drawY, hero.width, hero.height);
}

function drawGameOverOverlayCanvas() {
  if (!isGameOver) return;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.fillStyle = "#e5e7eb";
  ctx.font = "32px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Game Over", WORLD.width / 2, WORLD.height / 2 - 20);

  ctx.font = "18px system-ui";
  ctx.fillText(
    "Нажми R, чтобы попробовать ещё раз",
    WORLD.width / 2,
    WORLD.height / 2 + 20
  );
  ctx.restore();
}

// --- Главный цикл -----------------------------------------

let lastTime = 0;
let assetsLoaded = 0;
const TOTAL_ASSETS = 5; // фон + 4 спрайта героя

function tryStartGame() {
  assetsLoaded++;
  if (assetsLoaded < TOTAL_ASSETS) return;

  WORLD.width = bgImage.width;
  WORLD.height = bgImage.height;
  canvas.width = WORLD.width;
  canvas.height = WORLD.height;

  FALL_Y_LIMIT = WORLD.height + 200;

  resetHero();
  requestAnimationFrame(loop);
}

bgImage.onload = tryStartGame;
heroFrontImg.onload = tryStartGame;
heroLeftImg.onload = tryStartGame;
heroRightImg.onload = tryStartGame;
heroBackImg.onload = tryStartGame;

function loop(timestamp) {
  const dt = (timestamp - lastTime) / 1000 || 0;
  lastTime = timestamp;

  if (keys.restart && isGameOver) {
    hideGameOver();
    resetHero();
  }

  if (!isGameOver) {
    updateHero(dt);

    if (isHeroInBoardZone()) {
      openBoard();
      taskTextEl.textContent =
        "Задание выполнено: ты добрался до доски объявлений!";
    }
  }

  drawBackground();
  drawBoardHighlight();
  drawPlatformsDebug();
  drawHero();
  drawGameOverOverlayCanvas();

  requestAnimationFrame(loop);
}

// --- Инициализация текста ---------------------------------

taskTextEl.textContent =
  "Доберись по платформам до доски объявлений в правой верхней части и коснись её.";
controlsHintEl.textContent =
  "Управление: A/D или ←/→ — ходьба · W/↑/Space — прыжок · R — перезапуск.";
