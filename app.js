// app.js — продвинутый Battle Camp-style Match-3

import {
  createBoard,
  findMatchGroups,
  groupsToTiles,
  removeMatches,
  collapse,
  refill,
} from "./match3.js";

import { PLAYER_TEAM, ENEMY } from "./monsters.js";

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

// ------------------ MONSTERS UI ------------------

function loadMonsters() {
  const enemyImg = document.getElementById("enemy-img");
  enemyImg.src = ENEMY.img;
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
  const fill = document.getElementById("enemy-hp-fill");
  fill.style.width = (ENEMY.hp / ENEMY.maxHp) * 100 + "%";
}

// ------------------ BOARD RENDER ------------------

function getBoardEl() {
  return document.getElementById("board");
}

function getTileEl(x, y) {
  return document.querySelector(`.tile[data-x="${x}"][data-y="${y}"]`);
}

function renderBoard() {
  const boardEl = getBoardEl();
  boardEl.innerHTML = "";

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.x = x;
      tile.dataset.y = y;
      tile.style.transform = `translate(calc(${x} * var(--cell)), calc(${y} * var(--cell)))`;

      const img = document.createElement("img");
      img.className = "tile-img";
      img.src = board[y][x].img;
      tile.appendChild(img);

      // старт драга
      tile.addEventListener("mousedown", (e) => {
        e.preventDefault();
        startDrag(x, y);
      });

      tile.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          startDrag(x, y);
        },
        { passive: false }
      );

      boardEl.appendChild(tile);
    }
  }
}

// ------------------ TURN TIMER ------------------

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

// ------------------ DRAG / BATTLE CAMP LOGIC ------------------

function startDrag(x, y) {
  if (isProcessing) return;
  dragging = true;
  dragX = x;
  dragY = y;

  showTurnTimer();
  dragTimer = setTimeout(forceEndDrag, DRAG_TIME_MS);
}

// общий обработчик движения
function handleMove(clientX, clientY) {
  if (!dragging) return;

  const boardEl = getBoardEl();
  const rect = boardEl.getBoundingClientRect();
  const cellSize = rect.width / SIZE;

  const nx = Math.floor((clientX - rect.left) / cellSize);
  const ny = Math.floor((clientY - rect.top) / cellSize);

  if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) return;
  if (nx === dragX && ny === dragY) return;

  // здесь магия Battle Camp: каждый шаг — swap с соседней клеткой по пути
  swapTiles(dragX, dragY, nx, ny);
  dragX = nx;
  dragY = ny;
}

function endDrag() {
  if (!dragging) return;
  dragging = false;

  hideTurnTimer();
  if (dragTimer) {
    clearTimeout(dragTimer);
    dragTimer = null;
  }

  runMatchCycle();
}

function forceEndDrag() {
  if (!dragging) return;
  dragging = false;
  hideTurnTimer();
  dragTimer = null;
  runMatchCycle();
}

// глобальные события движения
document.addEventListener("mousemove", (e) => {
  handleMove(e.clientX, e.clientY);
});
document.addEventListener("mouseup", endDrag);

document.addEventListener(
  "touchmove",
  (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    handleMove(t.clientX, t.clientY);
  },
  { passive: false }
);
document.addEventListener("touchend", endDrag);

// ------------------ SWAP UTILS ------------------

function swapTiles(x1, y1, x2, y2) {
  // обновляем данные
  const tmp = board[y1][x1];
  board[y1][x1] = board[y2][x2];
  board[y2][x2] = tmp;

  // обновляем DOM: двигаем две плитки, НЕ перерисовывая всё поле
  const el1 = getTileEl(x1, y1);
  const el2 = getTileEl(x2, y2);
  if (!el1 || !el2) {
    // если что-то пошло не так — просто перерисуем всё поле
    renderBoard();
    return;
  }

  // поменяем их data-x/data-y
  el1.dataset.x = x2;
  el1.dataset.y = y2;
  el1.style.transform = `translate(calc(${x2} * var(--cell)), calc(${y2} * var(--cell)))`;

  el2.dataset.x = x1;
  el2.dataset.y = y1;
  el2.style.transform = `translate(calc(${x1} * var(--cell)), calc(${y1} * var(--cell)))`;
}

// ------------------ COMBO & PARTICLES ------------------

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
  for (let i = 0; i < 14; i++) {
    const p = document.createElement("div");
    p.className = "combo-particle";

    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * 25;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;

    box.appendChild(p);

    setTimeout(() => {
      p.style.transition = "transform .5s, opacity .5s";
      p.style.transform = `translate(${x}px, ${y}px) scale(0.2)`;
      p.style.opacity = "0";
    }, 10);

    setTimeout(() => p.remove(), 600);
  }
}

// ------------------ MATCH-3 RESOLUTION LOOP ------------------

async function runMatchCycle() {
  if (isProcessing) return;
  isProcessing = true;
  comboCount = 0;

  while (true) {
    const groups = findMatchGroups(board);
    if (!groups.length) break;

    comboCount++;
    showCombo(comboCount);

    const tiles = groupsToTiles(groups);

    // подсветка
    tiles.forEach((m) => {
      const el = getTileEl(m.x, m.y);
      if (el) el.style.filter = "brightness(1.4)";
    });
    await sleep(120);

    // поочерёдное исчезновение
    const sorted = [...tiles].sort((a, b) => a.y - b.y || a.x - b.x);
    for (const m of sorted) {
      const el = getTileEl(m.x, m.y);
      if (el) {
        el.style.opacity = "0";
        el.style.transform += " scale(0.6)";
      }
      await sleep(60);
    }

    // обновляем данные
    removeMatches(board, tiles);
    collapse(board);
    refill(board);

    // теперь можно полностью перерисовать поле
    renderBoard();
    await sleep(150);
  }

  isProcessing = false;
}

// ------------------ INIT ------------------

document.addEventListener("DOMContentLoaded", () => {
  loadMonsters();
  renderBoard();
});
