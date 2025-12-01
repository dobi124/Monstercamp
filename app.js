import {
  createBoard,
  findMatches,
  removeMatches,
  collapse,
  refill
} from "./match3.js";

import {
  PLAYER_TEAM,
  ENEMY
} from "./monsters.js";

const SIZE = 6;
const DRAG_TIME_MS = 5000;

let board = createBoard(SIZE);
let dragging = false;
let dragX = 0;
let dragY = 0;
let dragTimer = null;
let isProcessing = false;
let comboCount = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ==========================
    РЕНДЕР МОНСТРОВ
========================== */
function loadMonsters() {
  document.getElementById("enemy-img").src = ENEMY.img;
  updateEnemyHp();

  const zone = document.getElementById("team-zone");
  zone.innerHTML = "";

  PLAYER_TEAM.forEach((m) => {
    const box = document.createElement("div");
    box.className = "ally-slot";

    const img = document.createElement("img");
    img.className = "ally-img";
    img.src = m.img;

    const bar = document.createElement("div");
    bar.className = "ally-hp-bar";

    const fill = document.createElement("div");
    fill.className = "ally-hp-fill";
    fill.style.width = (m.hp / m.maxHp) * 100 + "%";

    bar.appendChild(fill);
    box.appendChild(img);
    box.appendChild(bar);

    zone.appendChild(box);
  });
}

function updateEnemyHp() {
  document.getElementById("enemy-hp-fill").style.width =
    (ENEMY.hp / ENEMY.maxHp) * 100 + "%";
}

/* ==========================
    MATCH-3 ОТРИСОВКА
========================== */
function renderBoard() {
  const boardEl = document.getElementById("board");
  boardEl.innerHTML = "";

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = board[y][x];

      const t = document.createElement("div");
      t.className = "tile";
      t.dataset.x = x;
      t.dataset.y = y;
      t.style.transform = `translate(calc(${x} * var(--cell)), calc(${y} * var(--cell)))`;

      const img = document.createElement("img");
      img.className = "tile-img";
      img.src = d.img;
      t.appendChild(img);

      t.addEventListener("mousedown", () => startDrag(x, y));
      t.addEventListener("touchstart", (e) => { e.preventDefault(); startDrag(x, y); }, { passive: false });

      boardEl.appendChild(t);
    }
  }
}

/* ==========================
      ТАЙМЕР ХОДА
========================== */
function showTurnTimer() {
  const bar = document.getElementById("turn-timer");
  const fill = document.getElementById("turn-timer-fill");

  bar.style.opacity = "1";
  fill.style.transition = "none";
  fill.style.transform = "scaleX(1)";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fill.style.transition = "transform 5s linear";
      fill.style.transform = "scaleX(0)";
    });
  });
}

function hideTurnTimer() {
  document.getElementById("turn-timer").style.opacity = "0";
}

/* ==========================
     DRAG & DROP
========================== */
function startDrag(x, y) {
  if (isProcessing) return;
  dragging = true;
  dragX = x;
  dragY = y;

  showTurnTimer();
  dragTimer = setTimeout(forceEndDrag, DRAG_TIME_MS);
}

function dragMove(cx, cy) {
  if (!dragging) return;

  const boardEl = document.getElementById("board");
  const rect = boardEl.getBoundingClientRect();
  const cell = rect.width / SIZE;

  const nx = Math.floor((cx - rect.left) / cell);
  const ny = Math.floor((cy - rect.top) / cell);
  if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) return;
  if (nx === dragX && ny === dragY) return;

  const temp = board[ny][nx];
  board[ny][nx] = board[dragY][dragX];
  board[dragY][dragX] = temp;

  dragX = nx;
  dragY = ny;

  renderBoard();
}

function endDrag() {
  if (!dragging) return;
  dragging = false;

  hideTurnTimer();
  clearTimeout(dragTimer);

  runMatchCycle();
}

function forceEndDrag() {
  dragging = false;
  hideTurnTimer();
  runMatchCycle();
}

document.addEventListener("mousemove", (e) => dragMove(e.clientX, e.clientY));
document.addEventListener("mouseup", endDrag);

document.addEventListener("touchmove", (e) => {
  const t = e.touches[0];
  dragMove(t.clientX, t.clientY);
}, { passive: false });

document.addEventListener("touchend", endDrag);

/* ==========================
   КОМБО & ЧАСТИЦЫ
========================== */
function showCombo(count) {
  if (count < 2) return;

  const el = document.getElementById("combo-popup");
  el.innerHTML = `🔥 Комбо ×${count}`;
  el.style.opacity = "1";
  el.style.transform = "scale(1)";

  spawnParticles();

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "scale(0.5)";
  }, 700);
}

function spawnParticles() {
  const container = document.getElementById("combo-particles");

  for (let i = 0; i < 14; i++) {
    const p = document.createElement("div");
    p.className = "combo-particle";
    p.style.width = "10px";
    p.style.height = "10px";
    p.style.borderRadius = "50%";
    p.style.background = "#ff5500";
    p.style.position = "absolute";

    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 30;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;

    container.appendChild(p);

    setTimeout(() => {
      p.style.transition = "transform 0.5s ease-out, opacity 0.5s";
      p.style.transform = `translate(${x}px, ${y}px) scale(0.3)`;
      p.style.opacity = "0";
    }, 10);

    setTimeout(() => p.remove(), 600);
  }
}

/* ==========================
     MATCH-3 ЦИКЛ
========================== */
async function runMatchCycle() {
  if (isProcessing) return;
  isProcessing = true;
  comboCount = 0;

  while (true) {
    const matches = findMatches(board);
    if (matches.length === 0) break;

    comboCount++;
    showCombo(comboCount);

    const sorted = [...matches].sort((a, b) => a.y - b.y);

    sorted.forEach((m) => {
      const el = document.querySelector(`.tile[data-x="${m.x}"][data-y="${m.y}"]`);
      if (el) el.style.filter = "brightness(1.6)";
    });

    await sleep(120);

    for (let m of sorted) {
      const el = document.querySelector(`.tile[data-x="${m.x}"][data-y="${m.y}"]`);
      if (el) {
        el.style.opacity = "0";
        el.style.transform += " scale(0.5)";
      }
      await sleep(90);
    }

    removeMatches(board, sorted);
    collapse(board);
    refill(board);

    renderBoard();
    await sleep(160);
  }

  isProcessing = false;
}

/* ==========================
        INIT
========================== */
document.addEventListener("DOMContentLoaded", () => {
  loadMonsters();
  renderBoard();
});
