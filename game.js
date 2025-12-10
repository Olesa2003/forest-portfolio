// --- Настройки карты и героя ---

const MAP_WIDTH = 1152;
const MAP_HEIGHT = 768;

const gameCanvas = document.getElementById("game");
const ctx = gameCanvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const minimapCanvas = document.getElementById("minimap");
const minimapCtx = minimapCanvas.getContext("2d");
minimapCtx.imageSmoothingEnabled = false;

const avatarCanvas = document.getElementById("avatar");
const avatarCtx = avatarCanvas.getContext("2d");
avatarCtx.imageSmoothingEnabled = false;

const zoomInput = document.getElementById("minimapZoom");
let minimapZoom = parseFloat(zoomInput.value);

// Диалоги
const dialogOverlay = document.getElementById("dialogOverlay");
const dialogTitle = document.getElementById("dialogTitle");
const dialogText = document.getElementById("dialogText");
const dialogLink = document.getElementById("dialogLink");
const dialogCloseBtn = document.getElementById("dialogClose");
let dialogOpen = false;

// --- Ачивки и сохранение ---

const SAVE_KEY = "forestPortfolio_timur_v2";
const achievementsListEl = document.getElementById("achievementsList");

let achievements = {
  firstStep: false,
  firstProject: false,
  allProjects: false
};

const ACHIEVE_TEXT = {
  firstStep: "Сделать первые шаги по лесу",
  firstProject: "Открыть первый сундук с проектом",
  allProjects: "Открыть все сундуки с проектами"
};

let openedProjects = new Set();
let totalSteps = 0;

function refreshAchievementsUI() {
  achievementsListEl.innerHTML = "";
  Object.entries(ACHIEVE_TEXT).forEach(([key, label]) => {
    const li = document.createElement("li");
    if (achievements[key]) li.classList.add("completed");
    const badge = document.createElement("span");
    badge.className = "badge";
    const text = document.createElement("span");
    text.textContent = label;
    li.appendChild(badge);
    li.appendChild(text);
    achievementsListEl.appendChild(li);
  });
}

function loadSave() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (data.achievements) {
      achievements = Object.assign(achievements, data.achievements);
    }
    if (Array.isArray(data.openedProjects)) {
      openedProjects = new Set(data.openedProjects);
    }
  } catch (e) {
    console.warn("save parse error", e);
  }
}

function saveGame() {
  const data = {
    achievements,
    openedProjects: Array.from(openedProjects)
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

// --- Спрайты ---

const mapImg = new Image();
mapImg.src = "map_forest.png";

const heroFrontImg = new Image();
heroFrontImg.src = "hero_front.png";

const heroLeftImg = new Image();
heroLeftImg.src = "hero_left.png";

const heroRightImg = new Image();
heroRightImg.src = "hero_right.png";

// Герой
const hero = {
  x: MAP_WIDTH / 2,
  y: MAP_HEIGHT * 0.7,
  width: 80,
  height: 80,
  speed: 2.8,
  dir: "down",
  moving: false
};

// фаза шага для лёгкой «анимации»
let walkPhase = 0;

// --- Проекты / сундуки ---
// Всё завязано на твой реальный путь

const projects = [
  {
    id: "path-story",
    x: 360,
    y: 620,
    radius: 45,
    title: "Путь из офлайна в креатив",
    text:
      "Склад, фастфуд, стройка, айтишник в колледже, B2B-линия и почти 2 года в Яндексе в адаптации. " +
      "Этот этап дал мне дисциплину, умение работать по регламентам и объяснять сложное простым языком.",
    linkText: "Кратко обо мне (портфолио)",
    linkHref: "https://t.me/+zv4JItiEl1ZlYTAy"
  },
  {
    id: "edit-showreel",
    x: 910,
    y: 340,
    radius: 45,
    title: "Монтаж и моушн — основной профиль",
    text:
      "Я видео-монтажёр и моушн-дизайнер: Premiere Pro + After Effects. " +
      "Делаю Reels / Shorts / YouTube для крипто-каналов, блогеров и образовательных проектов. " +
      "Работаю по ТЗ, соблюдаю дедлайны и слежу за ритмом, звуком и деталями.",
    linkText: "Портфолио монтажёра (Telegram)",
    linkHref: "https://t.me/+zv4JItiEl1ZlYTAy"
  },
  {
    id: "ai-tools",
    x: 1010,
    y: 395,
    radius: 45,
    title: "AI-инструменты и визуальные эксперименты",
    text:
      "Использую GPT / Gemini для идей и сценариев, Veo / Sora и другие модели для анимаций. " +
      "Генерирую персонажей и сцены, комбинирую нейросети с монтажом и моушном, строю свои визуальные миры.",
    linkText: "Примеры AI-работ (портфолио)",
    linkHref: "https://t.me/+zv4JItiEl1ZlYTAy"
  },
  {
    id: "yt-channel",
    x: 520,
    y: 260,
    radius: 45,
    title: "Личный YouTube-канал",
    text:
      "Канал mr.hiki1 — там я играю в игры, монтажом и юмором. " +
      "Через канал формирую свой стиль.",
    linkText: "Канал mr.hiki1 на YouTube",
    linkHref: "https://www.youtube.com/@mr.hiki1"
  },
  {
    id: "contacts",
    x: 200,
    y: 260,
    radius: 45,
    title: "Формат работы и контакты",
    text:
      "Открыт к удалённым проектам: монтаж, моушн, креативные интеграции, упаковка каналов. " +
      "Опыт адаптации сотрудников в Яндексе помогает выстраивать процессы и командную работу.",
    linkText: "Связаться (Telegram)",
    linkHref: "https://t.me/+zv4JItiEl1ZlYTAy"
  }
];

// какой сундук сейчас подсвечиваем подсказкой "E"
let activeHintProject = null;

// --- Управление ---

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  w: false,
  a: false,
  s: false,
  d: false,
  e: false,
  Enter: false
};

window.addEventListener("keydown", (e) => {
  if (dialogOpen) {
    if (["Escape", " ", "Enter"].includes(e.key)) {
      closeDialog();
      e.preventDefault();
    }
    return;
  }

  if (e.key in keys) {
    keys[e.key] = true;
    if (e.key.startsWith("Arrow")) e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.key in keys) keys[e.key] = false;
});

// --- Диалоги ---

function openDialog(project) {
  dialogTitle.textContent = project.title;
  dialogText.textContent = project.text;

  if (project.linkHref && project.linkText) {
    dialogLink.textContent = project.linkText;
    dialogLink.href = project.linkHref;
    dialogLink.style.display = "inline-block";
  } else {
    dialogLink.style.display = "none";
  }

  dialogOverlay.classList.remove("hidden");
  dialogOpen = true;
}

function closeDialog() {
  dialogOverlay.classList.add("hidden");
  dialogOpen = false;
}

dialogCloseBtn.addEventListener("click", closeDialog);

// --- Движение героя ---

function moveHero(dt) {
  let dx = 0;
  let dy = 0;

  if (keys.ArrowUp || keys.w) dy -= 1;
  if (keys.ArrowDown || keys.s) dy += 1;
  if (keys.ArrowLeft || keys.a) dx -= 1;
  if (keys.ArrowRight || keys.d) dx += 1;

  hero.moving = dx !== 0 || dy !== 0;

  if (!hero.moving) return;

  // Направление под твои спрайты
  if (dx < 0) hero.dir = "left";
  else if (dx > 0) hero.dir = "right";
  else hero.dir = "down";

  // Ачивка «первые шаги»
  if (!achievements.firstStep) {
    totalSteps += Math.abs(dx) + Math.abs(dy);
    if (totalSteps > 20) {
      achievements.firstStep = true;
      saveGame();
      refreshAchievementsUI();
    }
  }

  // Нормализация диагонали
  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv;
    dy *= inv;
  }

  const dist = hero.speed * (dt / 16.67);
  hero.x += dx * dist;
  hero.y += dy * dist;

  const halfW = hero.width / 2;
  const halfH = hero.height / 2;

  if (hero.x < halfW) hero.x = halfW;
  if (hero.x > MAP_WIDTH - halfW) hero.x = MAP_WIDTH - halfW;
  if (hero.y < halfH) hero.y = halfH;
  if (hero.y > MAP_HEIGHT - halfH) hero.y = MAP_HEIGHT - halfH;
}

// --- Взаимодействие с сундуками ---

function dist(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

function tryInteract() {
  const cx = hero.x;
  const cy = hero.y;

  for (const proj of projects) {
    if (dist(cx, cy, proj.x, proj.y) <= proj.radius) {
      if (!openedProjects.has(proj.id)) {
        openedProjects.add(proj.id);

        if (!achievements.firstProject) achievements.firstProject = true;
        if (openedProjects.size === projects.length) achievements.allProjects = true;

        saveGame();
        refreshAchievementsUI();
      }
      openDialog(proj);
      break;
    }
  }
}

// --- Рисование ---

function drawMap() {
  ctx.drawImage(mapImg, 0, 0, MAP_WIDTH, MAP_HEIGHT);
}

function drawHero() {
  let img = heroFrontImg;
  if (hero.dir === "left") img = heroLeftImg;
  else if (hero.dir === "right") img = heroRightImg;

  // лёгкая «анимация шага»: подпрыгивание при движении
  let bobOffset = 0;
  if (hero.moving) {
    bobOffset = Math.sin(walkPhase) * 3; // 3px вверх-вниз
  }

  const drawX = hero.x - hero.width / 2;
  const drawY = hero.y - hero.height / 2 + bobOffset;

  ctx.drawImage(img, drawX, drawY, hero.width, hero.height);
}

function drawProjectHalos() {
  ctx.save();
  ctx.globalAlpha = 0.8;

  activeHintProject = null;
  let bestDist = Infinity;

  projects.forEach((p) => {
    // мягкий подсвет вокруг сундука
    const gradient = ctx.createRadialGradient(p.x, p.y, 5, p.x, p.y, p.radius);
    gradient.addColorStop(0, "rgba(251,191,36,0.45)");
    gradient.addColorStop(1, "rgba(251,191,36,0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    // ищем ближайший к игроку сундук
    const d = dist(hero.x, hero.y, p.x, p.y);
    if (d < p.radius + 30 && d < bestDist) {
      bestDist = d;
      activeHintProject = p;
    }
  });

  ctx.restore();

  // рисуем подсказку "E" над активным сундуком
  if (activeHintProject) {
    const p = activeHintProject;
    const hintY = p.y - p.radius - 10;

    ctx.save();
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const text = "E";
    const metrics = ctx.measureText(text);
    const w = metrics.width + 10;
    const h = 18;

    ctx.fillStyle = "rgba(15,23,42,0.95)";
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(p.x - w / 2, hintY - h / 2, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fbbf24";
    ctx.fillText(text, p.x, hintY);
    ctx.restore();
  }
}

// Аватар в левом верхнем HUD
function drawAvatar() {
  avatarCtx.clearRect(0, 0, avatarCanvas.width, avatarCanvas.height);
  avatarCtx.drawImage(
    heroFrontImg,
    0, 0, heroFrontImg.width, heroFrontImg.height,
    0, 0, avatarCanvas.width, avatarCanvas.height
  );
}

// Миникарта
function drawMinimap() {
  const w = minimapCanvas.width;
  const h = minimapCanvas.height;

  minimapCtx.clearRect(0, 0, w, h);

  const scaledW = w * minimapZoom;
  const scaledH = h * minimapZoom;
  const offsetX = (w - scaledW) / 2;
  const offsetY = (h - scaledH) / 2;

  minimapCtx.drawImage(mapImg, 0, 0, MAP_WIDTH, MAP_HEIGHT,
    offsetX, offsetY, scaledW, scaledH);

  const scaleX = scaledW / MAP_WIDTH;
  const scaleY = scaledH / MAP_HEIGHT;

  // Проекты
  minimapCtx.fillStyle = "#f97316";
  projects.forEach((p) => {
    minimapCtx.fillRect(
      offsetX + p.x * scaleX - 2,
      offsetY + p.y * scaleY - 2,
      4,
      4
    );
  });

  // Герой
  minimapCtx.fillStyle = "#ffffff";
  minimapCtx.fillRect(
    offsetX + hero.x * scaleX - 2,
    offsetY + hero.y * scaleY - 2,
    4,
    4
  );
}

// Хинт внизу экрана, пока не открыт первый сундук
function drawIntroHint() {
  if (achievements.firstProject) return;

  ctx.save();
  const text = "Подойди к сундуку и нажми E";
  ctx.font = "14px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const paddingX = 16;
  const paddingY = 6;
  const metrics = ctx.measureText(text);
  const w = metrics.width + paddingX * 2;
  const h = 28;

  const x = MAP_WIDTH / 2 - w / 2;
  const y = MAP_HEIGHT - h - 16;

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(15,23,42,0.9)";
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#e5e7eb";
  ctx.fillText(text, MAP_WIDTH / 2, y + h / 2 + 1);
  ctx.restore();
}

// --- Игровой цикл ---

let lastTime = 0;

function loop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  moveHero(dt);

  if (hero.moving) {
    walkPhase += dt * 0.02;
  } else {
    walkPhase = 0;
  }

  if ((keys.e || keys.Enter) && !dialogOpen) {
    tryInteract();
    keys.e = false;
    keys.Enter = false;
  }

  drawMap();
  drawProjectHalos();
  drawHero();
  drawAvatar();
  drawMinimap();
  drawIntroHint();

  requestAnimationFrame(loop);
}

// --- Старт ---

zoomInput.addEventListener("input", () => {
  minimapZoom = parseFloat(zoomInput.value);
});

loadSave();
refreshAchievementsUI();

let imagesLoaded = 0;
[mapImg, heroFrontImg, heroLeftImg, heroRightImg].forEach((img) => {
  img.addEventListener("load", () => {
    imagesLoaded++;
    if (imagesLoaded === 4) {
      gameCanvas.width = MAP_WIDTH;
      gameCanvas.height = MAP_HEIGHT;
      requestAnimationFrame(loop);
    }
  });
});
