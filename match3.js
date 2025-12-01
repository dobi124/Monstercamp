// match3.js — движок Match-3

const ELEMENTS = [
  { type: "fire",  img: "assets/elements/fire.png" },
  { type: "water", img: "assets/elements/water.png" },
  { type: "earth", img: "assets/elements/earth.png" },
  { type: "light", img: "assets/elements/light.png" },
  { type: "dark",  img: "assets/elements/dark.png" }
];

export function createBoard(size = 6) {
  const board = [];
  for (let y = 0; y < size; y++) {
    board[y] = [];
    for (let x = 0; x < size; x++) {
      board[y][x] = randomElement();

      if (
        x >= 2 &&
        board[y][x].type === board[y][x - 1].type &&
        board[y][x].type === board[y][x - 2].type
      ) board[y][x] = randomElement(board[y][x].type);

      if (
        y >= 2 &&
        board[y][x].type === board[y - 1][x].type &&
        board[y][x].type === board[y - 2][x].type
      ) board[y][x] = randomElement(board[y][x].type);
    }
  }
  return board;
}

function randomElement(avoid = null) {
  let pool = ELEMENTS;
  if (avoid) pool = ELEMENTS.filter(e => e.type !== avoid);
  const e = pool[Math.floor(Math.random() * pool.length)];
  return { type: e.type, img: e.img };
}

export function findMatchGroups(board) {
  const size = board.length;
  const visited = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );
  const groups = [];

  // Horizontal
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size - 2) {
      const t = board[y][x].type;
      let run = 1;

      for (let k = x + 1; k < size; k++) {
        if (board[y][k].type === t) run++;
        else break;
      }

      if (run >= 3) {
        const tiles = [];
        for (let i = 0; i < run; i++) {
          if (!visited[y][x + i]) {
            visited[y][x + i] = true;
            tiles.push({ x: x+i, y });
          }
        }
        groups.push({ type: t, tiles });
      }

      x += run;
    }
  }

  // Vertical
  for (let x = 0; x < size; x++) {
    let y = 0;
    while (y < size - 2) {
      const t = board[y][x].type;
      let run = 1;

      for (let k = y + 1; k < size; k++) {
        if (board[k][x].type === t) run++;
        else break;
      }

      if (run >= 3) {
        let group = groups.find(
          g => g.type === t && g.tiles.some(p => p.x === x)
        );
        if (!group) {
          group = { type: t, tiles: [] };
          groups.push(group);
        }

        for (let i = 0; i < run; i++) {
          if (!visited[y + i][x]) {
            visited[y + i][x] = true;
            group.tiles.push({ x, y: y+i });
          }
        }
      }

      y += run;
    }
  }

  return groups;
}

export function groupsToTiles(groups) {
  return groups.flatMap(g => g.tiles);
}

export function removeMatches(board, tiles) {
  tiles.forEach(t => board[t.y][t.x] = null);
}

export function collapse(board) {
  const size = board.length;
  for (let x = 0; x < size; x++) {
    let write = size - 1;
    for (let y = size - 1; y >= 0; y--) {
      if (board[y][x] !== null) {
        board[write][x] = board[y][x];
        if (write !== y) board[y][x] = null;
        write--;
      }
    }
  }
}

export function refill(board) {
  const size = board.length;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (board[y][x] === null) board[y][x] = randomElement();
}