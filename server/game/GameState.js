// ==================== Game State Manager ====================
// TH: ไฟล์นี้เป็นหัวใจหลักของเกมเซิร์ฟเวอร์ (Game Loop) ที่รันที่ 20 TPS (Ticks Per Second)
// ทำหน้าที่อัปเดตตำแหน่งผู้เล่น, ควบคุมการทำงานของบอท, ตรวจสอบการชน (Collision Detection)
// และบรอดแคสต์ (Broadcast) ข้อมูลสถานะเกมล่าสุดส่งไปยังผู้เล่นทุกคน
// EN: This file is the core of the game server (Game Loop) running at 20 TPS.
// It updates player positions, controls bots, performs collision detection,
// and broadcasts the latest game state to all players.
'use strict';

const { Snake } = require('./Snake');
const { FoodManager } = require('./Food');
const { BotManager } = require('./Bot');
const SysConfig = require('../sys_config');

const { 
  WORLD_WIDTH, WORLD_HEIGHT, TICK_RATE, FOOD_RADIUS_MIN,
  ITEM_DURATION_X2, ITEM_DURATION_X5, ITEM_DURATION_X10
} = SysConfig;
const TICK_MS = 1000 / TICK_RATE;

class GameState {
  constructor(io) {
    // io: อินสแตนซ์ของ Socket.IO เอาไว้ใช้สำหรับ Boardcast สถานะไปให้ทุก Client
    this.io = io;
    
    // snakes: แผนที่ (Map) เก็บงูทั้งหมดในเกม รวมถึงผู้เล่นจริงและบอท (Key = Socket ID หรือ UUID, Value = Snake object)
    this.players = new Map();
    
    // food: ตัวจัดการเรื่องจุดเกิด/ลบ อาหารในเกม (FoodManager)
    this.food = new FoodManager();
    
    // bots: ตัวจัดการควบคุมพฤติกรรมของบอททั้งหมด (BotManager)
    this.bots = new BotManager();
    
    // tickRate: จำนวนรอบการอัปเดตเซิร์ฟเวอร์ต่อวินาที (TPS)
    this.tickRate = TICK_RATE; 
    
    // tickInterval: ตัวจับเวลา (Timer) สำหรับรัน Game Loop ตามอัตรา tickRate
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

    const now = Date.now();
    for (const snake of allSnakes.values()) {
      if (snake.alive) snake.updateBuffs(now);
    }

    // Food collisions
    this._checkFoodCollisions(allSnakes);

    // Snake-vs-snake collisions
    this._checkSnakeCollisions(allSnakes);

    // Clean up expired corpse food
    this.food.cleanupExpired();

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

          // เช็คว่าเป็นไอเทมพิเศษหรือไม่
          if (food.type === 'x2') {
            snake.scoreMultiplier = 2;
            snake.buffEndTime = Date.now() + (ITEM_DURATION_X2 * 1000);
          } else if (food.type === 'x5') {
            snake.scoreMultiplier = 5;
            snake.buffEndTime = Date.now() + (ITEM_DURATION_X5 * 1000);
          } else if (food.type === 'x10') {
            snake.scoreMultiplier = 10;
            snake.buffEndTime = Date.now() + (ITEM_DURATION_X10 * 1000);
          }

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

    // Drop food conserving 50% of mass
    const dropEvery = 3;
    const numFoods = Math.max(1, Math.floor(snake.segments.length / dropEvery));
    const totalMassToDrop = snake.score * 0.5;
    const valuePerFood = Math.max(10, Math.floor(totalMassToDrop / numFoods));
    // คำนวณรัศมีสูงสุดของซากอาหารอิงตามความอ้วน (radius) ของงูตัวที่ตาย
    const maxFoodRadius = Math.max(FOOD_RADIUS_MIN, snake.radius * 0.75);

    for (let i = 0; i < snake.segments.length; i += dropEvery) {
      const seg = snake.segments[i];
      // สุ่มให้มีทั้งเม็ดเล็กเม็ดใหญ่ปนกัน
      const randomFoodRadius = FOOD_RADIUS_MIN + Math.random() * (maxFoodRadius - FOOD_RADIUS_MIN);
      this.food.spawnAt(seg.x, seg.y, valuePerFood, snake.color, true, randomFoodRadius);
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
    const numFoods = Math.max(1, Math.floor(snake.segments.length / 5));
    const valuePerFood = Math.max(10, Math.floor((snake.score * 0.5) / numFoods));
    const maxFoodRadius = Math.max(FOOD_RADIUS_MIN, snake.radius * 0.75);
    
    for (let i = 0; i < snake.segments.length; i += 5) {
      const seg = snake.segments[i];
      const randomFoodRadius = FOOD_RADIUS_MIN + Math.random() * (maxFoodRadius - FOOD_RADIUS_MIN);
      this.food.spawnAt(seg.x, seg.y, valuePerFood, snake.color, true, randomFoodRadius);
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
