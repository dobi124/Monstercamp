// ========================================
// IMPORTS
// ========================================

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


// ========================================
// CONSTANTS
// ========================================

const SIZE = 6;
const DRAG_TIME_MS = 5000;

let board = createBoard(SIZE);

let dragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragX = 0;
let dragY = 0;

let touchStartX = 0;
let touchStartY = 0;

let dragTimer = null;
let isProcessing = false;
let comboCount = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


// ========================================
// RENDER MONSTERS
// ========================================

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

    const hpBar = document.createElement("div");
    hpBar.className = "ally-hp-bar";

    const fill = document.createElement("div");
    fill.className = "ally-hp-fill";
    fill.style.width = (m.hp / m.maxHp) * 100 + "%";

    hpBar.appendChild(fill);
    box.appendChild(img);
    box.appendChild(hpBar);
    zone.appendChild(box);
  });
}

function updateEnemyHp() {
  document.getElementById("enemy-hp-fill").style.width =
    (ENEMY.hp / ENEMY.maxHp) * 100 + "%";
}


// ========================================
// RENDER BOARD
// ========================================

function renderBoard() {
  const boardEl = document.getElementById("board");
  boardEl.innerHTML = "";

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const t = document.createElement("div");
      t.className = "tile";
      t.dataset.x = x;
      t.dataset.y = y;
      t.style.transform = `translate(calc(${x} * var(--cell)), calc(${y} * var(--cell)))`;

      const img = document.createElement("img");
      img.className = "tile-img";
      img.src = board[y][x].img;
      t.appendChild(img);

      // MOUSE START
      t.addEventListener("mousedown", (e) =>
        startDrag(x, y, e.clientX, e.clientY)
      );

      // TOUCH START
      t.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          const t = e.touches[0];
          startDrag(x, y, t.clientX, t.clientY);
        },
        { passive: false }
      );

      boardEl.appendChild(t);
    }
  }
}


// ========================================
// TURN TIMER
// ========================================

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


// ========================================
// 🔥 DRAG & MOVE ACROSS FULL BOARD
// ========================================

function startDrag(x, y, cx, cy) {
  if (isProcessing) return;

  dragging = true;

  dragStartX = x;
  dragStartY = y;
  dragX = x;
  dragY = y;

  touchStartX = cx;
  touchStartY = cy;

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
  if (nx === dragX && ny === dragY) return; // still same tile

  // Swap with new tile along the path
  const tmp = board[dragY][dragX];
  board[dragY][dragX] = board[ny][nx];
  board[ny][nx] = tmp;

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


// MOUSE EVENTS
document.addEventListener("mousemove", (e) => dragMove(e.clientX, e.clientY));
document.addEventListener("mouseup", endDrag);

// TOUCH EVENTS
document.addEventListener(
  "touchmove",
  (e) => {
    const t = e.touches[0];
    dragMove(t.clientX, t.clientY);
  },
  { passive: false }
);
document.addEventListener("touchend", endDrag);


// ========================================
// COMBO & PARTICLES
// ========================================

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
  }, 600);
}

function spawnParticles() {
  const box = document.getElementById("combo-particles");

  for (let i = 0; i < 12; i++) {
    const p = document.createElement("div");
    p.style.position = "absolute";
    p.style.width = "10px";
    p.style.height = "10px";
    p.style.background = "#ff5500";
    p.style.borderRadius = "50%";

    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 25;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;

    box.appendChild(p);

    setTimeout(() => {
      p.style.transition = "transform .5s, opacity .5s";
      p.style.transform = `translate(${x}px, ${y}px) scale(0.1)`;
      p.style.opacity = "0";
    }, 10);

    setTimeout(() => p.remove(), 600);
  }
}


// ========================================
// MATCH-3 SEQUENCE
// ========================================

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
      const el = document.querySelector(
        `.tile[data-x="${m.x}"][data-y="${m.y}"]`
      );
      if (el) el.style.filter = "brightness(1.4)";
    });

    await sleep(120);

    for (let m of sorted) {
      const el = document.querySelector(
        `.tile[data-x="${m.x}"][data-y="${m.y}"]`
      );
      if (el) {
        el.style.opacity = "0";
        el.style.transform += " scale(0.6)";
      }
      await sleep(70);
    }

    removeMatches(board, sorted);
    collapse(board);
    refill(board);

    renderBoard();
    await sleep(150);
  }

  isProcessing = false;
}


// ========================================
// INIT
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  loadMonsters();
  renderBoard();
});
