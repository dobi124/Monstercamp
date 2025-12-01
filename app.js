// app.js — глобальная карта → локация → бой (match-3 + скиллы + анимации)

import {
  createBoard,
  findMatchGroups,
  groupsToTiles,
  removeMatches,
  collapse,
  refill,
} from "./match3.js";

import { PLAYER_TEAM, ENEMY } from "./monsters.js";
import { getLocations, completeQuest } from "./world.js";

// ========================= SCENE STATE ===========================

let currentLocation = null;
let currentQuest = null;

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => (s.style.display = "none"));
  const screen = document.getElementById(id);
  if (screen) screen.style.display = "block";

  const back = document.getElementById("back-btn");
  if (!back) return;

  if (id === "world-screen") {
    back.style.display = "none";
  } else {
    back.style.display = "block";
  }
}

document.getElementById("back-btn").addEventListener("click", () => {
  if (currentQuest) {
    currentQuest = null;
    if (currentLocation) showLocation(currentLocation);
  } else if (currentLocation) {
    currentLocation = null;
    showWorld();
  } else {
    showWorld();
  }
});

// ========================= WORLD SCREEN ===========================

function showWorld() {
  const list = document.getElementById("location-list");
  list.innerHTML = "";

  getLocations().forEach((loc) => {
    const card = document.createElement("div");
    card.className = "location-card" + (loc.unlocked ? "" : " locked");

    const img = document.createElement("div");
    img.className = "location-img";
    img.style.backgroundImage = `url('${loc.icon}')`;

    const name = document.createElement("div");
    name.textContent = loc.name;
    name.style.marginTop = "6px";

    card.appendChild(img);
    card.appendChild(name);

    if (loc.unlocked) {
      card.addEventListener("click", () => showLocation(loc));
    }

    list.appendChild(card);
  });

  currentLocation = null;
  currentQuest = null;

  showScreen("world-screen");
}

// ========================= LOCATION SCREEN ===========================

function showLocation(loc) {
  currentLocation = loc;

  const title = document.getElementById("loc-title");
  const list = document.getElementById("quest-list");

  title.textContent = loc.name;
  list.innerHTML = "";

  loc.quests.forEach((q) => {
    const card = document.createElement("div");
    card.className = "quest-card";

    const name = document.createElement("div");
    name.textContent = q.name;
    const desc = document.createElement("small");
    desc.textContent = q.description;

    card.appendChild(name);
    card.appendChild(desc);

    if (!q.completed) {
      const btn = document.createElement("button");
      btn.className = "quest-btn";
      btn.textContent = "Сразиться";
      btn.addEventListener("click", () => startBattle(loc, q));
      card.appendChild(btn);
    } else {
      const done = document.createElement("div");
      done.textContent = "Выполнено ✔";
      done.style.color = "#7cff7c";
      done.style.marginTop = "8px";
      card.appendChild(done);
    }

    list.appendChild(card);
  });

  showScreen("location-screen");
}

// ========================= BATTLE STATE ===========================

const SIZE = 6;
const DRAG_TIME_MS = 5000;

let board = null;
let dragging = false;
let dragX = 0;
let dragY = 0;
let dragTimer = null;
let isProcessing = false;
let battleOver = false;
let comboCount = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ============ HELPERS: RESET TEAM & ENEMY ============

function resetTeamAndEnemy() {
  ENEMY.hp = ENEMY.maxHp;

  PLAYER_TEAM.forEach((m) => {
    m.hp = m.maxHp;
    m.sp = 0;
    m.damageBuff = 0;
    m.buffTurns = 0;
    m.shield = 0;
    m.shieldTurns = 0;
  });
}

// ========================= BATTLE UI ===========================

function loadMonsters() {
  const enemyImg = document.getElementById("enemy-img");
  if (enemyImg) enemyImg.src = ENEMY.img;
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
    hpBar.innerHTML = `<div class="ally-hp-fill"></div>`;

    const spBar = document.createElement("div");
    spBar.className = "ally-sp-bar";
    spBar.innerHTML = `<div class="ally-sp-fill"></div>`;

    box.appendChild(img);
    box.appendChild(hpBar);
    box.appendChild(spBar);

    zone.appendChild(box);
  });

  updatePlayerHpUI();
  updatePlayerSpUI();
  updateSkillButtons();
}

function updateEnemyHp() {
  const fill = document.getElementById("enemy-hp-fill");
  if (!fill) return;
  const perc = Math.max(0, (ENEMY.hp / ENEMY.maxHp) * 100);
  fill.style.width = perc + "%";
}

function updatePlayerHpUI() {
  const zone = document.getElementById("team-zone");
  const slots = zone.querySelectorAll(".ally-slot");

  PLAYER_TEAM.forEach((m, index) => {
    const slot = slots[index];
    if (!slot) return;

    const fill = slot.querySelector(".ally-hp-fill");
    if (fill) fill.style.width = (m.hp / m.maxHp) * 100 + "%";

    const img = slot.querySelector(".ally-img");
    if (img) {
      if (m.isDead()) {
        img.style.filter = "grayscale(1) brightness(0.4)";
        img.style.opacity = "0.7";
      } else {
        img.style.filter = "";
        img.style.opacity = "1";
      }
    }
  });
}

function updatePlayerSpUI() {
  const zone = document.getElementById("team-zone");
  const slots = zone.querySelectorAll(".ally-slot");

  PLAYER_TEAM.forEach((m, index) => {
    const slot = slots[index];
    if (!slot) return;

    const spFill = slot.querySelector(".ally-sp-fill");
    if (spFill) {
      spFill.style.width = (m.sp / m.maxSp) * 100 + "%";
    }
  });
}

function isTeamAlive() {
  return PLAYER_TEAM.some((m) => !m.isDead());
}

// -------------- ANIMATION HELPERS -------------

function getAllySlot(index) {
  const zone = document.getElementById("team-zone");
  const slots = zone.querySelectorAll(".ally-slot");
  return slots[index] || null;
}

function animateAllyAttack(index) {
  const slot = getAllySlot(index);
  if (!slot) return;
  const img = slot.querySelector(".ally-img");
  if (!img) return;

  img.style.transition = "transform 0.15s, filter 0.15s";
  img.style.transform = "translateY(-8px) scale(1.05)";
  img.style.filter = "drop-shadow(0 0 10px rgba(255,180,80,0.8))";

  setTimeout(() => {
    img.style.transform = "translateY(0) scale(1)";
    img.style.filter = "";
  }, 150);
}

function animateSkillCast(index) {
  const slot = getAllySlot(index);
  if (!slot) return;
  const img = slot.querySelector(".ally-img");
  if (!img) return;

  img.style.transition = "transform 0.2s, filter 0.2s";
  img.style.transform = "scale(1.15)";
  img.style.filter = "drop-shadow(0 0 14px rgba(255,230,120,0.9))";

  setTimeout(() => {
    img.style.transform = "scale(1)";
    img.style.filter = "";
  }, 220);
}

function animateEnemyHit() {
  const enemyImg = document.getElementById("enemy-img");
  if (!enemyImg) return;

  enemyImg.style.transition = "transform 0.08s, filter 0.08s";
  enemyImg.style.filter = "brightness(1.4)";
  enemyImg.style.transform = "translateX(-5px)";

  setTimeout(() => {
    enemyImg.style.transform = "translateX(5px)";
    setTimeout(() => {
      enemyImg.style.transform = "translateX(0)";
      enemyImg.style.filter = "";
    }, 80);
  }, 80);
}

function animateAllyHit(index) {
  const slot = getAllySlot(index);
  if (!slot) return;
  const img = slot.querySelector(".ally-img");
  if (!img) return;

  img.style.transition = "transform 0.1s, filter 0.1s";
  img.style.transform = "translateX(-4px)";
  img.style.filter = "brightness(1.4)";

  setTimeout(() => {
    img.style.transform = "translateX(4px)";
    setTimeout(() => {
      img.style.transform = "translateX(0)";
      img.style.filter = "";
    }, 100);
  }, 100);
}

// ========================= BOARD RENDER ===========================

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

// ========================= TURN TIMER ===========================

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

// ========================= SKILLS UI ===========================

function updateSkillButtons() {
  const buttons = document.querySelectorAll(".skill-btn");

  PLAYER_TEAM.forEach((m, i) => {
    const btn = buttons[i];
    if (!btn) return;

    if (m.isDead()) {
      btn.classList.remove("ready");
      btn.disabled = true;
      btn.style.opacity = "0.2";
      return;
    }

    if (m.isReady()) {
      btn.classList.add("ready");
      btn.disabled = false;
      btn.style.opacity = "1";
    } else {
      btn.classList.remove("ready");
      btn.disabled = true;
      btn.style.opacity = "0.5";
    }
  });
}

function showSkillPopup(text) {
  const box = document.createElement("div");
  box.textContent = text;
  box.style.position = "fixed";
  box.style.left = "50%";
  box.style.top = "50%";
  box.style.transform = "translate(-50%, -50%)";
  box.style.padding = "12px 22px";
  box.style.background = "rgba(0,0,0,0.7)";
  box.style.color = "#ffd37f";
  box.style.fontSize = "22px";
  box.style.fontWeight = "bold";
  box.style.borderRadius = "10px";
  box.style.textShadow = "0 0 10px #ffcc55";
  box.style.opacity = "1";
  box.style.zIndex = "1000";
  box.style.transition = "0.5s";

  document.body.appendChild(box);

  setTimeout(() => (box.style.opacity = "0"), 600);
  setTimeout(() => box.remove(), 1100);
}

// ========================= DRAG LOGIC ===========================

function startDrag(x, y) {
  if (isProcessing || battleOver) return;
  dragging = true;
  dragX = x;
  dragY = y;

  showTurnTimer();
  dragTimer = setTimeout(forceEndDrag, DRAG_TIME_MS);
}

function handleMove(clientX, clientY) {
  if (!dragging) return;

  const boardEl = getBoardEl();
  const rect = boardEl.getBoundingClientRect();
  const cellSize = rect.width / SIZE;

  const nx = Math.floor((clientX - rect.left) / cellSize);
  const ny = Math.floor((clientY - rect.top) / cellSize);

  if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) return;
  if (nx === dragX && ny === dragY) return;

  swapTiles(dragX, dragY, nx, ny);
  dragX = nx;
  dragY = ny;
}

function endDrag() {
  if (!dragging) return;
  dragging = false;

  hideTurnTimer();
  if (dragTimer) clearTimeout(dragTimer);

  runMatchCycle();
}

function forceEndDrag() {
  if (!dragging) return;
  dragging = false;
  hideTurnTimer();
  dragTimer = null;
  runMatchCycle();
}

function setupInputListeners() {
  document.addEventListener("mousemove", (e) =>
    handleMove(e.clientX, e.clientY)
  );
  document.addEventListener("mouseup", endDrag);

  document.addEventListener(
    "touchmove",
    (e) => {
      if (!dragging) return;
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: false }
  );
  document.addEventListener("touchend", endDrag);
}

// ========================= SWAP ===========================

function swapTiles(x1, y1, x2, y2) {
  const tmp = board[y1][x1];
  board[y1][x1] = board[y2][x2];
  board[y2][x2] = tmp;
  renderBoard();
}

// ========================= DAMAGE SYSTEM ===========================

function getElementMultiplier(attType, defType) {
  if (attType === "fire" && defType === "earth") return 2;
  if (attType === "earth" && defType === "water") return 2;
  if (attType === "water" && defType === "fire") return 2;
  if (attType === "light" && defType === "dark") return 2;
  if (attType === "dark" && defType === "light") return 2;
  return 1;
}

function getMonsterByElement(el) {
  return PLAYER_TEAM.find((m) => m.element === el) || null;
}

function calculateDamageForGroups(groups, comboIndex) {
  let total = 0;
  const comboMultiplier = 1 + (comboIndex - 1) * 0.5;

  for (const g of groups) {
    const attacker = getMonsterByElement(g.type);
    if (!attacker || attacker.isDead()) continue;

    const matchCount = g.tiles.length;
    const baseAttack = attacker.attack;
    const elemMult = getElementMultiplier(g.type, ENEMY.element);

    let bonus = 1 + attacker.damageBuff;

    const dmg = Math.round(
      baseAttack * matchCount * comboMultiplier * elemMult * bonus
    );

    total += dmg;
  }

  return total;
}

function getAttackingIndexesFromGroups(groups) {
  const used = new Set();
  const indexes = [];
  groups.forEach((g) => {
    PLAYER_TEAM.forEach((m, i) => {
      if (!m.isDead() && m.element === g.type && !used.has(i)) {
        used.add(i);
        indexes.push(i);
      }
    });
  });
  return indexes;
}

// ========================= ENEMY DAMAGE ===========================

function applyDamageToEnemy(dmg) {
  if (dmg <= 0 || battleOver || ENEMY.hp <= 0) return;

  ENEMY.takeDamage(dmg);
  updateEnemyHp();
  animateEnemyHit();
  showDamagePopup(dmg);

  if (ENEMY.hp <= 0) {
    battleOver = true;
    showVictory();
  }
}

function showDamagePopup(amount) {
  const img = document.getElementById("enemy-img");
  const r = img.getBoundingClientRect();

  const el = document.createElement("div");
  el.textContent = `-${amount}`;
  el.style.position = "fixed";
  el.style.left = r.left + r.width / 2 + "px";
  el.style.top = r.top + "px";
  el.style.transform = "translate(-50%,0)";
  el.style.fontSize = "24px";
  el.style.fontWeight = "bold";
  el.style.color = "#ff5555";
  el.style.textShadow = "0 0 8px #ff0000";
  el.style.transition = "0.6s";
  el.style.zIndex = "1500";

  document.body.appendChild(el);

  requestAnimationFrame(() => {
    el.style.transform = "translate(-50%,-40px)";
    el.style.opacity = "0";
  });

  setTimeout(() => el.remove(), 700);
}

function showVictory() {
  const popup = document.createElement("div");
  popup.textContent = "ПОБЕДА!";
  popup.style.position = "fixed";
  popup.style.left = "50%";
  popup.style.top = "40%";
  popup.style.transform = "translate(-50%,-50%)";
  popup.style.padding = "16px 24px";
  popup.style.background = "rgba(0,0,0,0.85)";
  popup.style.fontSize = "28px";
  popup.style.fontWeight = "bold";
  popup.style.color = "#ffdd55";
  popup.style.borderRadius = "12px";
  popup.style.zIndex = "2000";
  document.body.appendChild(popup);

  // отметить квест выполненным и вернуться к локации
  setTimeout(() => {
    popup.remove();
    if (currentLocation && currentQuest) {
      const { unlockedLocation } = completeQuest(
        currentLocation.id,
        currentQuest.id
      );
      currentQuest = null;
      if (unlockedLocation) {
        alert("Открыта новая локация: " + unlockedLocation.name);
      }
      showLocation(currentLocation);
    } else {
      showWorld();
    }
  }, 1200);
}

// ========================= ENEMY TURN ===========================

function getAliveAllies() {
  return PLAYER_TEAM.map((m, i) => ({ m, i })).filter((o) => !o.m.isDead());
}

async function enemyTurn() {
  if (battleOver || !isTeamAlive()) return;

  const alive = getAliveAllies();
  if (!alive.length) return;

  const { m: target, i } = alive[Math.floor(Math.random() * alive.length)];

  const enemyImg = document.getElementById("enemy-img");
  if (enemyImg) {
    enemyImg.style.transition = "transform 0.08s";
    enemyImg.style.transform = "translateX(-4px)";
    setTimeout(() => {
      enemyImg.style.transform = "translateX(4px)";
      setTimeout(() => {
        enemyImg.style.transform = "translateX(0)";
      }, 80);
    }, 80);
  }

  await sleep(250);

  const base = ENEMY.attack;
  let dmg = Math.round(base * (0.9 + Math.random() * 0.4));

  if (target.shieldTurns > 0) {
    dmg = Math.round(dmg * (1 - target.shield));
    target.shieldTurns--;
    if (target.shieldTurns <= 0) target.shield = 0;
  }

  target.takeDamage(dmg);
  updatePlayerHpUI();
  animateAllyHit(i);
  showEnemyDamagePopup(dmg, i);

  if (!isTeamAlive()) {
    battleOver = true;
    showDefeat();
  }

  await sleep(300);
}

function showEnemyDamagePopup(amount, index) {
  const zone = document.getElementById("team-zone");
  const slot = zone.querySelectorAll(".ally-slot")[index];
  const r = slot.getBoundingClientRect();

  const el = document.createElement("div");
  el.textContent = `-${amount}`;
  el.style.position = "fixed";
  el.style.left = r.left + r.width / 2 + "px";
  el.style.top = r.top + "px";
  el.style.transform = "translate(-50%,0)";
  el.style.fontSize = "22px";
  el.style.fontWeight = "bold";
  el.style.color = "#55aaff";
  el.style.textShadow = "0 0 8px #0088ff";
  el.style.transition = "0.6s";
  el.style.zIndex = "1600";

  document.body.appendChild(el);

  requestAnimationFrame(() => {
    el.style.transform = "translate(-50%,-40px)";
    el.style.opacity = "0";
  });

  setTimeout(() => el.remove(), 700);
}

function showDefeat() {
  const popup = document.createElement("div");
  popup.textContent = "ПОРАЖЕНИЕ";
  popup.style.position = "fixed";
  popup.style.left = "50%";
  popup.style.top = "40%";
  popup.style.transform = "translate(-50%,-50%)";
  popup.style.padding = "16px 24px";
  popup.style.background = "rgba(0,0,0,0.85)";
  popup.style.fontSize = "28px";
  popup.style.fontWeight = "bold";
  popup.style.color = "#ff5555";
  popup.style.borderRadius = "12px";
  popup.style.zIndex = "2000";
  document.body.appendChild(popup);

  setTimeout(() => {
    popup.remove();
    if (currentLocation) {
      currentQuest = null;
      showLocation(currentLocation);
    } else {
      showWorld();
    }
  }, 1200);
}

// ========================= COMBO ===========================

function showCombo(n) {
  if (n < 2) return;
  const el = document.getElementById("combo-popup");
  if (!el) return;
  el.textContent = `🔥 Комбо ×${n}`;
  el.style.opacity = "1";
  el.style.transform = "scale(1)";
  spawnParticles();

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "scale(0.5)";
  }, 500);
}

function spawnParticles() {
  const box = document.getElementById("combo-particles");
  if (!box) return;

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

// ========================= MATCH CYCLE ===========================

async function runMatchCycle() {
  if (battleOver || isProcessing) return;
  isProcessing = true;
  comboCount = 0;

  while (true) {
    const groups = findMatchGroups(board);
    if (!groups.length) break;

    comboCount++;
    showCombo(comboCount);

    // SP зарядка
    for (const g of groups) {
      const m = getMonsterByElement(g.type);
      if (m && !m.isDead()) m.chargeSp(3);
    }
    updatePlayerSpUI();
    updateSkillButtons();

    const attackers = getAttackingIndexesFromGroups(groups);
    attackers.forEach(animateAllyAttack);

    const dmg = calculateDamageForGroups(groups, comboCount);
    const tiles = groupsToTiles(groups);

    tiles.forEach((t) => {
      const el = getTileEl(t.x, t.y);
      if (el) el.style.filter = "brightness(1.4)";
    });
    await sleep(100);

    for (const t of tiles) {
      const el = getTileEl(t.x, t.y);
      if (el) {
        el.style.opacity = "0";
        el.style.transform += " scale(0.7)";
      }
      await sleep(40);
    }

    if (dmg > 0) {
      applyDamageToEnemy(dmg);
      await sleep(200);
      if (battleOver) {
        isProcessing = false;
        return;
      }
    }

    removeMatches(board, tiles);
    collapse(board);
    refill(board);

    renderBoard();
    await sleep(120);

    // уменьшение баффов
    for (const m of PLAYER_TEAM) {
      if (m.buffTurns > 0) {
        m.buffTurns--;
        if (m.buffTurns <= 0) m.damageBuff = 0;
      }
    }
  }

  isProcessing = false;

  if (!battleOver && ENEMY.hp > 0 && isTeamAlive()) {
    await enemyTurn();
  }
}

// ========================= START BATTLE ===========================

function startBattle(loc, quest) {
  currentLocation = loc;
  currentQuest = quest;

  battleOver = false;
  resetTeamAndEnemy();
  board = createBoard(SIZE);

  loadMonsters();
  renderBoard();
  updatePlayerHpUI();
  updatePlayerSpUI();
  updateSkillButtons();
  updateEnemyHp();

  showScreen("battle-screen");
}

// ========================= INIT ===========================

document.addEventListener("DOMContentLoaded", () => {
  setupInputListeners();

  // skill buttons
  document.querySelectorAll(".skill-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.index);
      const user = PLAYER_TEAM[index];
      if (!user || !user.isReady() || user.isDead() || battleOver) return;

      animateSkillCast(index);
      user.skill(user, PLAYER_TEAM, ENEMY);
      user.resetSp();

      updatePlayerHpUI();
      updatePlayerSpUI();
      updateSkillButtons();
      updateEnemyHp();

      showSkillPopup(`${user.name} использует скилл!`);
    });
  });

  showWorld();
});
