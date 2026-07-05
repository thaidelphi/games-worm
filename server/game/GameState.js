// ==================== Game State Manager ====================
'use strict';

const { Snake, WORLD_WIDTH, WORLD_HEIGHT, SEGMENT_DISTANCE } = require('./Snake');
const { FoodManager } = require('./Food');
const { BotManager } = require('./Bot');

const TICK_RATE = 20; // ticks per second
const TICK_MS = 1000 / TICK_RATE;

class GameState {
  constructor(io) {
    this.io = io;
    /** @type {Map<string, Snake>} */
    this.players = new Map();
    this.food = new FoodManager();
    this.bots = new BotManager();
    this._tickInterval = null;
  }

  // ---- Lifecycle ----

  start() {
    this._tickInterval = setInterval(() => this._tick(), TICK_MS);
    console.log(`[GameState] Game loop started at ${TICK_RATE} TPS`);
  }

  stop() {
    if (this._tickInterval) clearInterval(this._tickInterval);
  }

  // ---- Player Management ----

  addPlayer(socketId, name) {
    const snake = new Snake(name, false, socketId);
    this.players.set(socketId, snake);
    console.log(`[+] Player "${name}" joined (${socketId})`);
    return snake;
  }

  removePlayer(socketId) {
    const snake = this.players.get(socketId);
    if (snake) {
      this._dropFood(snake);
      this.players.delete(socketId);
      console.log(`[-] Player "${snake.name}" left (${socketId})`);
    }
  }

  setPlayerInput(socketId, angle, boosting) {
    const snake = this.players.get(socketId);
    if (snake && snake.alive) {
      snake.steer(angle);
      snake.boosting = !!boosting;
    }
  }

  respawnPlayer(socketId) {
    const old = this.players.get(socketId);
    if (!old) return null;
    const snake = new Snake(old.name, false, socketId);
    this.players.set(socketId, snake);
    return snake;
  }

  // ---- Main Tick ----

  _tick() {
    // All snakes = players + bots
    const allSnakes = new Map([...this.players, ...this.bots.bots]);
    const foodList = this.food.toArray();

    // Move players
    for (const snake of this.players.values()) {
      if (snake.alive) snake.move();
    }

    // Tick bots (they steer + move inside)
    this.bots.tick(allSnakes, foodList);

    // Food collisions
    this._checkFoodCollisions(allSnakes);

    // Snake-vs-snake collisions
    this._checkSnakeCollisions(allSnakes);

    // Broadcast
    this._broadcast(allSnakes);
  }

  // ---- Collision Detection ----

  _checkFoodCollisions(allSnakes) {
    for (const snake of allSnakes.values()) {
      if (!snake.alive) continue;
      const head = snake.head;
      const eatRadius = snake.radius + 10;

      for (const [id, food] of this.food.items) {
        const dx = food.x - head.x;
        const dy = food.y - head.y;
        const dist2 = dx * dx + dy * dy;
        const eatDist = eatRadius + food.radius;
        if (dist2 < eatDist * eatDist) {
          snake.grow(food.value);
          this.food.consume(id);
          // Notify the specific player
          if (!snake.isBot) {
            const socket = this.io.sockets.sockets.get(snake.id);
            if (socket) socket.emit('foodEaten', { foodId: id, score: snake.score });
          }
        }
      }
    }
  }

  _checkSnakeCollisions(allSnakes) {
    const snakeArr = Array.from(allSnakes.values()).filter(s => s.alive);

    for (const snake of snakeArr) {
      if (!snake.alive) continue;
      const head = snake.head;

      for (const other of snakeArr) {
        if (!other.alive) continue;
        if (other.id === snake.id) continue; // Skip self collision entirely

        // Check snake's head vs other snake's body segments
        const segments = other.segments;

        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const dx = head.x - seg.x;
          const dy = head.y - seg.y;
          const dist2 = dx * dx + dy * dy;
          const minDist = snake.radius + other.radius * 0.85;
          if (dist2 < minDist * minDist) {
            this._killSnake(snake, allSnakes);
            break;
          }
        }

        if (!snake.alive) break;
      }
    }
  }

  _killSnake(snake, allSnakes) {
    if (!snake.alive) return;
    snake.alive = false;

    console.log(`[x] Snake "${snake.name}" died (score: ${snake.score})`);

    // Drop food from every N-th segment
    const dropEvery = 3;
    for (let i = 0; i < snake.segments.length; i += dropEvery) {
      const seg = snake.segments[i];
      const value = Math.max(1, Math.floor(snake.score / (snake.segments.length / dropEvery)));
      this.food.spawnAt(seg.x, seg.y, value, snake.color);
    }

    // Notify player of death
    if (!snake.isBot) {
      const socket = this.io.sockets.sockets.get(snake.id);
      if (socket) {
        socket.emit('died', { score: Math.floor(snake.score) });
      }
    }
  }

  _dropFood(snake) {
    // Drop some food when player disconnects
    for (let i = 0; i < snake.segments.length; i += 5) {
      const seg = snake.segments[i];
      this.food.spawnAt(seg.x, seg.y, 2, snake.color);
    }
  }

  // ---- Broadcast ----

  _broadcast(allSnakes) {
    const aliveSnakes = Array.from(allSnakes.values()).filter(s => s.alive);
    const snakesArr = aliveSnakes.map(s => s.toCompact());
    const leaderboard = aliveSnakes
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(s => ({ id: s.id, name: s.name, score: Math.floor(s.score), color: s.color }));

    // Send full food list periodically, otherwise only deltas
    // For simplicity: send full state every tick (can be optimized)
    this.io.emit('gameState', {
      snakes: snakesArr,
      food: this.food.toArray(),
      leaderboard,
    });
  }

  // ---- Info ----

  getInitState() {
    const allSnakes = new Map([...this.players, ...this.bots.bots]);
    return {
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
      snakes: Array.from(allSnakes.values()).map(s => s.toCompact()),
      food: this.food.toArray(),
    };
  }
}

module.exports = { GameState, TICK_RATE };
