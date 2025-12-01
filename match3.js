const ELEMENTS = [
  { type: "fire",  img: "assets/elements/fire.png" },
  { type: "water", img: "assets/elements/water.png" },
  { type: "earth", img: "assets/elements/earth.png" },
  { type: "light", img: "assets/elements/light.png" },
  { type: "dark",  img: "assets/elements/dark.png" }
];

export function createBoard(size) {
  const board = [];

  for (let y = 0; y < size; y++) {
    board[y] = [];
    for (let x = 0; x < size; x++) {
      board[y][x] = randomElement();
    }
  }
  return board;
}

function randomElement() {
  const e = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
  return { type: e.type, img: e.img };
}

export function findMatches(board) {
  const size = board.length;
  const matches = [];

  // горизонтали
  for (let y = 0; y < size; y++) {
    let streak = 1;
    for (let x = 1; x < size; x++) {
      if (board[y][x].type === board[y][x - 1].type) {
        streak++;
      } else {
        if (streak >= 3) {
          for (let k = 0; k < streak; k++)
            matches.push({ x: x - 1 - k, y });
        }
        streak = 1;
      }
    }
    if (streak >= 3) {
      for (let k = 0; k < streak; k++)
        matches.push({ x: size - 1 - k, y });
    }
  }

  // вертикали
  for (let x = 0; x < size; x++) {
    let streak = 1;
    for (let y = 1; y < size; y++) {
      if (board[y][x].type === board[y - 1][x].type) {
        streak++;
      } else {
        if (streak >= 3) {
          for (let k = 0; k < streak; k++)
            matches.push({ x, y: y - 1 - k });
        }
        streak = 1;
      }
    }
    if (streak >= 3) {
      for (let k = 0; k < streak; k++)
        matches.push({ x, y: size - 1 - k });
    }
  }

  return matches;
}

export function removeMatches(board, matches) {
  matches.forEach((m) => {
    board[m.y][m.x] = null;
  });
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
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] === null) {
        board[y][x] = randomElement();
      }
    }
  }
}
