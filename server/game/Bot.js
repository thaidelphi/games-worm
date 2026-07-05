// ==================== AI Bot Behavior ====================
// TH: ไฟล์นี้ควบคุมพฤติกรรมของ AI (Bot) ในเกม 
// บอทสามารถหลบกำแพง (Wall avoidance), หนีงูตัวอื่นที่ใหญ่กว่า (Enemy avoidance), 
// ไล่กินอาหารที่อยู่ใกล้ (Chase food), หรือเลื้อยแบบสุ่ม (Wander) ได้
// EN: This file controls the behavior of AI bots in the game.
// Bots can avoid walls, flee from larger snakes, chase nearby food, or wander randomly.
'use strict';

const { Snake, WORLD_WIDTH, WORLD_HEIGHT } = require('./Snake');

// ตัวแปร BOT_NAMES: ใช้เก็บรายชื่อที่บอทจะสุ่มไปใช้แสดงผลตอนเกิด
const BOT_NAMES = [
  'ShadowSerpent', 'NeonViper', 'CyberCoil', 'GlitchWorm',
  'PixelPython', 'VoidCrawler', 'StarSlither', 'NightAdder',
  'PlasmaWorm',  'PhantomBoa',
];

// ตัวแปร BOT_COUNT_TARGET: จำนวนบอทเป้าหมายที่จะรักษาไว้ในเซิร์ฟเวอร์เสมอ
// ผลคือถ้าน้อยกว่าค่านี้ ระบบจะสุ่มเกิดบอทใหม่มาเติมให้เต็ม
const BOT_COUNT_TARGET = 8; // keep this many bots alive

class Bot extends Snake {
  constructor(name) {
    super(name || BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)], true);
    // _state: เก็บสถานะปัจจุบันของบอท ('wander' = เดินสุ่ม, 'chase' = ล่าอาหาร, 'flee' = หนี)
    this._state = 'wander';   // 'wander' | 'chase' | 'flee'
    // _targetAngle: มุมองศาเป้าหมายที่บอทต้องการหันไปหา (บอทจะไม่หันทีเดียว แต่ค่อยๆ เลี้ยวไปหามุมนี้)
    this._targetAngle = this.angle;
    // _wanderTimer: ตัวนับเวลา (Tick) ว่าบอทเดินสุ่มมานานแค่ไหนแล้ว
    this._wanderTimer = 0;
    // _wanderInterval: รอบเวลา (Tick) ที่บอทจะสุ่มเปลี่ยนทิศทางเดินใหม่ (กันบอทเดินชนขอบตลอดเวลา)
    this._wanderInterval = 80 + Math.floor(Math.random() * 120); // ticks
  }

  /**
   * Update bot AI logic
   * @param {Map<string, Snake>} snakes   all snakes (for awareness)
   * @param {Array}             foodList  [{x,y,r,v}]
   */
  updateAI(snakes, foodList) {
    if (!this.alive) return;

    const head = this.head;

    // --- Danger avoidance: look ahead for collisions ---
    const lookAhead = this.radius * 8;
    const aheadX = head.x + Math.cos(this.angle) * lookAhead;
    const aheadY = head.y + Math.sin(this.angle) * lookAhead;

    // Wall avoidance
    const wallMargin = 200;
    let wallFlee = false;
    if (aheadX < wallMargin || aheadX > WORLD_WIDTH - wallMargin ||
        aheadY < wallMargin || aheadY > WORLD_HEIGHT - wallMargin) {
      // Turn towards center
      const cx = WORLD_WIDTH / 2;
      const cy = WORLD_HEIGHT / 2;
      this._targetAngle = Math.atan2(cy - head.y, cx - head.x);
      wallFlee = true;
    }

    if (!wallFlee) {
      // --- Enemy avoidance ---
      let fleeing = false;
      for (const [id, snake] of snakes) {
        if (id === this.id || !snake.alive) continue;
        const dx = snake.head.x - head.x;
        const dy = snake.head.y - head.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150 && snake.radius >= this.radius) {
          // Flee away from the threat
          this._targetAngle = Math.atan2(-dy, -dx);
          fleeing = true;
          break;
        }
      }

      if (!fleeing) {
        // --- Chase nearest food ---
        let bestFood = null;
        let bestDist = Infinity;
        for (const food of foodList) {
          const dx = food.x - head.x;
          const dy = food.y - head.y;
          const dist = Math.sqrt(dx * dx + dy * dy) - food.r * food.v; // weight by value
          if (dist < bestDist) {
            bestDist = dist;
            bestFood = food;
          }
        }

        if (bestFood && bestDist < 400) {
          this._targetAngle = Math.atan2(bestFood.y - head.y, bestFood.x - head.x);
        } else {
          // Wander
          this._wanderTimer++;
          if (this._wanderTimer >= this._wanderInterval) {
            this._wanderTimer = 0;
            this._wanderInterval = 60 + Math.floor(Math.random() * 120);
            this._targetAngle = this.angle + (Math.random() - 0.5) * Math.PI;
          }
        }
      }
    }

    // Smooth steer
    this.steer(this._targetAngle);
    this.move();
  }
}

class BotManager {
  constructor() {
    /** @type {Map<string, Bot>} */
    this.bots = new Map();
    this._initBots();
  }

  _initBots() {
    for (let i = 0; i < BOT_COUNT_TARGET; i++) {
      this._spawnBot();
    }
  }

  _spawnBot() {
    const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const bot = new Bot(name);
    this.bots.set(bot.id, bot);
    return bot;
  }

  /**
   * Tick all bots
   * @param {Map<string, Snake>} allSnakes  (includes players)
   * @param {Array}              foodList
   */
  tick(allSnakes, foodList) {
    for (const bot of this.bots.values()) {
      if (bot.alive) {
        bot.updateAI(allSnakes, foodList);
      }
    }

    // Remove dead bots
    for (const [id, bot] of this.bots) {
      if (!bot.alive) {
        this.bots.delete(id);
      }
    }
    // Maintain bot count
    while (this.bots.size < BOT_COUNT_TARGET) {
      this._spawnBot();
    }
  }
}

module.exports = { BotManager, Bot, BOT_COUNT_TARGET };
