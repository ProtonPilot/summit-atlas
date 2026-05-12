const board = document.getElementById("game-board");
const context = board.getContext("2d");
const scoreText = document.getElementById("score");
const bestScoreText = document.getElementById("best-score");
const statusText = document.getElementById("status");
const startButton = document.getElementById("start-button");

const tileSize = 20;
const tileCount = board.width / tileSize;
const tickDelay = 140;
const bestScoreKey = "snake-best-score";

let snake;
let direction;
let nextDirection;
let food;
let score;
let gameLoop;
let isRunning = false;

function loadBestScore() {
  const saved = Number(window.localStorage.getItem(bestScoreKey));
  return Number.isFinite(saved) ? saved : 0;
}

let bestScore = loadBestScore();
bestScoreText.textContent = bestScore;

function resetGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  food = spawnFood();
  score = 0;
  isRunning = false;
  scoreText.textContent = "0";
  statusText.textContent = "Press Start or hit an arrow key to begin.";
  draw();
}

function startGame() {
  if (gameLoop) {
    clearInterval(gameLoop);
  }

  resetGame();
  isRunning = true;
  statusText.textContent = "Game on. Grab the food!";
  gameLoop = window.setInterval(step, tickDelay);
}

function spawnFood() {
  let nextFood;

  do {
    nextFood = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount)
    };
  } while (snake && snake.some((segment) => segment.x === nextFood.x && segment.y === nextFood.y));

  return nextFood;
}

function setDirection(x, y) {
  const isTryingToReverse = direction.x === -x && direction.y === -y;

  if (!isRunning) {
    startGame();
  }

  if (!isTryingToReverse) {
    nextDirection = { x, y };
  }
}

function step() {
  direction = nextDirection;

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };

  const hitWall =
    head.x < 0 ||
    head.y < 0 ||
    head.x >= tileCount ||
    head.y >= tileCount;

  const hitSelf = snake.some((segment) => segment.x === head.x && segment.y === head.y);

  if (hitWall || hitSelf) {
    endGame();
    return;
  }

  snake.unshift(head);

  const ateFood = head.x === food.x && head.y === food.y;

  if (ateFood) {
    score += 1;
    scoreText.textContent = String(score);
    food = spawnFood();

    if (score > bestScore) {
      bestScore = score;
      window.localStorage.setItem(bestScoreKey, String(bestScore));
      bestScoreText.textContent = String(bestScore);
    }
  } else {
    snake.pop();
  }

  draw();
}

function endGame() {
  isRunning = false;
  clearInterval(gameLoop);
  statusText.textContent = "Game over. Press Start to try again.";
  draw();
}

function draw() {
  context.clearRect(0, 0, board.width, board.height);

  context.fillStyle = "#203225";
  context.fillRect(0, 0, board.width, board.height);

  context.fillStyle = "#ff7a59";
  context.beginPath();
  context.roundRect(food.x * tileSize + 2, food.y * tileSize + 2, tileSize - 4, tileSize - 4, 6);
  context.fill();

  snake.forEach((segment, index) => {
    context.fillStyle = index === 0 ? "#b8ff91" : "#7ee081";
    context.beginPath();
    context.roundRect(
      segment.x * tileSize + 1.5,
      segment.y * tileSize + 1.5,
      tileSize - 3,
      tileSize - 3,
      6
    );
    context.fill();
  });
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
  }

  if (key === "arrowup" || key === "w") {
    setDirection(0, -1);
  } else if (key === "arrowdown" || key === "s") {
    setDirection(0, 1);
  } else if (key === "arrowleft" || key === "a") {
    setDirection(-1, 0);
  } else if (key === "arrowright" || key === "d") {
    setDirection(1, 0);
  }
});

startButton.addEventListener("click", startGame);

resetGame();
