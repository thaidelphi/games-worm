// ==================== Snake Entity ====================
// TH: ไฟล์นี้จัดการเกี่ยวกับตัวละคร "งู" (Snake) ในเกม 
// รวมถึงการคำนวณตำแหน่งข้อต่อ (Segments), การเคลื่อนที่แบบ Inverse Kinematics, 
// การเลี้ยว (Steer), การโตขึ้นเมื่อกินอาหาร (Grow), และการหักคะแนนเมื่อเร่งความเร็ว (Boost)
// EN: This file manages the "Snake" entity in the game.
// It includes segment position calculations, Inverse Kinematics movement,
// steering, growing when eating food, and score deduction when boosting.
'use strict';

const { v4: uuidv4 } = require('uuid');
const SysConfig = require('../sys_config');

// ดึงค่าคงที่จาก sys_config มาใช้แทน
const {
  WORLD_SHAPE, WORLD_WIDTH, WORLD_HEIGHT, SEGMENT_DISTANCE,
  BASE_SPEED, BOOST_SPEED, INITIAL_LENGTH,
  BASE_RADIUS, MAX_RADIUS
} = SysConfig;

class Snake {
  /**
   * @param {string} name
   * @param {boolean} isBot
   * @param {string} [id]
   * @param {object} [spawnPos]
   */
  constructor(name, isBot = false, id = null, spawnPos = null) {
    // id: รหัสอ้างอิงเฉพาะ (UUID) ของงูตัวนี้ ใช้แยกแยะระหว่างผู้เล่นแต่ละคน
    this.id = id || uuidv4();
    // name: ชื่อผู้เล่นหรือบอทที่จะไปแสดงใน Leaderboard และบนหัวงู
    this.name = name;
    // isBot: สถานะว่านี่คือบอทใช่หรือไม่
    this.isBot = isBot;
    // alive: สถานะมีชีวิต หากเป็น false จะไม่ถูกนำไปประมวลผลต่อและจะถูกลบออกจากเกม
    this.alive = true;
    // score: คะแนนปัจจุบัน (ใช้ตีความหมายถึงมวลสาร/Mass ของงู) ยิ่งมากงูจะยิ่งยาว
    this.score = 0;
    // boosting: สถานะว่าผู้เล่นกำลังกดปุ่มเร่งความเร็วอยู่หรือไม่
    this.boosting = false;
    // angle: มุมหันหน้าปัจจุบันของงู (ในหน่วยเรเดียน 0 - 2*PI)
    this.angle = Math.random() * Math.PI * 2;
    // newSegments: ตัวนับว่าต้องเพิ่มความยาวตัวอีกกี่ข้อต่อ (เมื่อกินอาหาร)
    this.newSegments = INITIAL_LENGTH;

    // buffEndTimes: เวลาที่บัฟซ้อนทับกัน
    this.buffEndTimes = {
      x2: 0,
      x3: 0,
      x5: 0
    };
    this.buffEndTime = 0; // เก็บเวลาบัฟที่ใช้งานอยู่ (สำหรับ Client)
    
    // zoomEndTime: เวลาที่บัฟซูมจะหมดอายุ (Timestamp)
    this.zoomEndTime = 0;

    // speedEndTime: เวลาที่บัฟวิ่งเร็วจะหมดอายุ (Timestamp)
    this.speedEndTime = 0;

    // speedInventory: จำนวนไอเทมสปีดที่เก็บได้สะสมไว้สำหรับกดใช้เอง
    this.speedInventory = 0;

    // Spawn at a random position with some margin
    const margin = 300;
    let x = 0, y = 0;
    
    if (spawnPos) {
      x = spawnPos.x;
      y = spawnPos.y;
    } else {
      if (WORLD_SHAPE === 'circle') {
        const spawnAngle = Math.random() * Math.PI * 2;
        const maxSpawnRadius = Math.max(0, (WORLD_WIDTH / 2) - margin);
        const spawnR = Math.sqrt(Math.random()) * maxSpawnRadius;
        x = (WORLD_WIDTH / 2) + Math.cos(spawnAngle) * spawnR;
        y = (WORLD_HEIGHT / 2) + Math.sin(spawnAngle) * spawnR;
      } else {
        x = margin + Math.random() * (WORLD_WIDTH - margin * 2);
        y = margin + Math.random() * (WORLD_HEIGHT - margin * 2);
      }
    }

    // segments: Array เก็บออบเจ็กต์ {x, y} ของข้อต่อแต่ละอัน (Index 0 คือหัว, ตำแหน่งสุดท้ายคือหาง)
    this.segments = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
      this.segments.push({
        x: x - Math.cos(this.angle) * SEGMENT_DISTANCE * i,
        y: y - Math.sin(this.angle) * SEGMENT_DISTANCE * i,
      });
    }

    // Visual
    this.color = this._randomColor();
  }

  get head() {
    return this.segments[0];
  }

  get radius() {
    // radius grows with score, capped at MAX_RADIUS
    return Math.min(BASE_RADIUS + this.score * 0.015, MAX_RADIUS);
  }

  get length() {
    return this.segments.length;
  }

  get currentMultiplierTimeLeft() {
    return this.buffEndTime > Date.now() ? Math.ceil((this.buffEndTime - Date.now()) / 1000) : 0;
  }

  /** Move the snake forward based on current angle using Inverse Kinematics */
  move() {
    if (!this.alive) return;

    // BASE_SPEED decreases slightly as the snake grows to simulate weight
    const baseSpeed = Math.max(3, 8 - (this.segments.length * 0.005));
    const boostSpeedMultiplier = this.boosting ? 2.5 : 1.0;
    const itemSpeedMultiplier = this.speedEndTime > Date.now() ? SysConfig.SPEED_EXTRA_MULTIPLIER : 1.0;
    
    const speed = baseSpeed * boostSpeedMultiplier * itemSpeedMultiplier;

    // 1. Move head
    let nextX = this.segments[0].x + Math.cos(this.angle) * speed;
    let nextY = this.segments[0].y + Math.sin(this.angle) * speed;

    let isHittingNow = false;

    if (WORLD_SHAPE === 'circle') {
      const cx = WORLD_WIDTH / 2;
      const cy = WORLD_HEIGHT / 2;
      const maxRadius = (WORLD_WIDTH / 2) - this.radius;
      // ให้ margin 20 พิกเซลถ้างูกำลังชนขอบอยู่ เพื่อป้องกันกรณีตัวหดเร็วเกินไปจนขอบเด้งหนี
      const margin = this.isHittingBorder ? 20 : 0;

      let dx = nextX - cx;
      let dy = nextY - cy;
      let dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > maxRadius) {
        isHittingNow = true;
        // Clamp to circle border
        nextX = cx + (dx / dist) * maxRadius;
        nextY = cy + (dy / dist) * maxRadius;
      } else if (this.isHittingBorder && dist > maxRadius - margin) {
        // ให้ margin ถ้างูกำลังชนอยู่ ป้องกันตัวหดแล้วขอบเด้งหนี (แต่ไม่ Clamp เพื่อให้เลี้ยวออกได้)
        isHittingNow = true;
      }
    } else {
      const margin = this.isHittingBorder ? 20 : 0;
      if (nextX <= this.radius || nextX >= WORLD_WIDTH - this.radius ||
          nextY <= this.radius || nextY >= WORLD_HEIGHT - this.radius) {
        isHittingNow = true;
      } else if (this.isHittingBorder) {
        if (nextX <= this.radius + margin || nextX >= WORLD_WIDTH - this.radius - margin ||
            nextY <= this.radius + margin || nextY >= WORLD_HEIGHT - this.radius - margin) {
          isHittingNow = true;
        }
      }
      // Clamp to rectangle border
      nextX = Math.max(this.radius, Math.min(WORLD_WIDTH - this.radius, nextX));
      nextY = Math.max(this.radius, Math.min(WORLD_HEIGHT - this.radius, nextY));
    }

    if (isHittingNow && !this.isHittingBorder) {
      this.scoreAtBorderHit = this.score;
    }
    this.isHittingBorder = isHittingNow;

    // Update head
    this.segments[0].x = nextX;
    this.segments[0].y = nextY;

    // 2. Body follows leader (Inverse Kinematics)
    for (let i = 1; i < this.segments.length; i++) {
      let curr = this.segments[i];
      let prev = this.segments[i - 1];
      
      let dx = prev.x - curr.x;
      let dy = prev.y - curr.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > SEGMENT_DISTANCE) {
        let moveDist = dist - SEGMENT_DISTANCE;
        curr.x += (dx / dist) * moveDist;
        curr.y += (dy / dist) * moveDist;
      }
    }

    // 3. Handle growth
    if (this._growPending > 0) {
      this._growPending--;
      let last = this.segments[this.segments.length - 1];
      this.segments.push({ x: last.x, y: last.y });
    }

    // 4. Drain score on boost
    if (this.boosting && this.score > 0 && this.segments.length > INITIAL_LENGTH) {
      this.score = Math.max(0, this.score - 4); // Lose 4 score per tick (80/sec)
      
      const targetLength = INITIAL_LENGTH + Math.floor(this.score / 20);
      while (this.segments.length > Math.max(targetLength, INITIAL_LENGTH)) {
        this.segments.pop();
      }
    }
  }

  /**
   * Set target angle (smoothly turn)
   * @param {number} targetAngle
   */
  steer(targetAngle) {
    let delta = targetAngle - this.angle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    // Increased max turn for much snappier controls
    const maxTurn = 0.25; 
    delta = Math.max(-maxTurn, Math.min(maxTurn, delta));
    this.angle += delta;
  }

  /**
   * Grow the snake by n mass (score)
   * กินอาหารแล้วเพิ่มคะแนนและความยาว
   */
  grow(value, isCorpse = false) {
    // คำนวณคะแนนที่ได้ โดยคูณกับบัฟปัจจุบัน (ถ้าเป็นซากศพ จะไม่คูณเพื่อป้องกันคะแนนเฟ้อทะลุจักรวาล)
    const multiplier = isCorpse ? 1 : this.scoreMultiplier;
    const finalValue = Math.floor(value * multiplier);
    this.score += finalValue;
    const targetLength = INITIAL_LENGTH + Math.floor(this.score / 20);
    this._growPending = Math.max(0, targetLength - this.segments.length);
  }

  /**
   * อัปเดตและลบบัฟถ้าหมดเวลา
   */
  updateBuffs(now) {
    let maxMultiplier = 1;
    let bestEndTime = 0;

    if (this.buffEndTimes.x5 > now) {
      maxMultiplier = 5;
      bestEndTime = this.buffEndTimes.x5;
    } else if (this.buffEndTimes.x3 > now) {
      maxMultiplier = 3;
      bestEndTime = this.buffEndTimes.x3;
    } else if (this.buffEndTimes.x2 > now) {
      maxMultiplier = 2;
      bestEndTime = this.buffEndTimes.x2;
    }

    this.scoreMultiplier = maxMultiplier;
    this.buffEndTime = bestEndTime;

    if (this.zoomEndTime && now > this.zoomEndTime) {
      this.zoomEndTime = 0;
    }
  }

  /**
   * Serialize for network transmission (compact)
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      isBot: this.isBot,
      alive: this.alive,
      score: Math.floor(this.score),
      angle: this.angle,
      boosting: this.boosting,
      color: this.color,
      radius: this.radius,
      segments: this.segments,
    };
  }

  /** Returns a compact object for broadcast */
  toCompact() {
    const sp = this.speedEndTime > Date.now() ? Math.ceil((this.speedEndTime - Date.now()) / 1000) : 0;
    return {
      id: this.id,
      name: this.name,
      score: Math.floor(this.score),
      color: this.color,
      r: Math.round(this.radius),
      b: this.boosting,
      m: this.scoreMultiplier, // ส่งค่าบัฟตัวคูณให้ Client
      e: this.currentMultiplierTimeLeft, // เวลารวมของบัฟที่มีค่ามากสุด
      b2: this.buffEndTimes.x2 > Date.now() ? Math.ceil((this.buffEndTimes.x2 - Date.now()) / 1000) : 0,
      b3: this.buffEndTimes.x3 > Date.now() ? Math.ceil((this.buffEndTimes.x3 - Date.now()) / 1000) : 0,
      b5: this.buffEndTimes.x5 > Date.now() ? Math.ceil((this.buffEndTimes.x5 - Date.now()) / 1000) : 0,
      z: this.zoomEndTime > Date.now() ? Math.ceil((this.zoomEndTime - Date.now()) / 1000) : 0, // ส่งบัฟซูม
      sp: sp, // ส่งบัฟวิ่งเร็ว
      si: this.speedInventory, // ส่งจำนวนไอเทมวิ่งเร็วในตัว
      angle: this.angle,
      segments: this.segments,
    };
  }

  _randomColor() {
    const hues = [0, 30, 60, 120, 180, 210, 270, 300, 330];
    const h = hues[Math.floor(Math.random() * hues.length)];
    return `hsl(${h}, 100%, 50%)`;
  }

  useSpeedItem() {
    if (!this.alive) return false;
    if (this.speedInventory > 0) {
      this.speedInventory--;
      this.speedEndTime = Math.max(Date.now(), this.speedEndTime) + (SysConfig.ITEM_DURATION_SPEED * 1000);
      return true;
    }
    return false;
  }

  static getSafeSpawnPosition(allSnakes) {
    const margin = 300;
    const maxAttempts = 50;
    // ปลอดภัยถ้าอยู่ห่างจากหัวงูตัวอื่นอย่างน้อย 800 pixel
    const safeDistanceSq = 800 * 800; 

    for (let i = 0; i < maxAttempts; i++) {
      let x = 0, y = 0;
      if (WORLD_SHAPE === 'circle') {
        const spawnAngle = Math.random() * Math.PI * 2;
        const maxSpawnRadius = Math.max(0, (WORLD_WIDTH / 2) - margin);
        const spawnR = Math.sqrt(Math.random()) * maxSpawnRadius;
        x = (WORLD_WIDTH / 2) + Math.cos(spawnAngle) * spawnR;
        y = (WORLD_HEIGHT / 2) + Math.sin(spawnAngle) * spawnR;
      } else {
        x = margin + Math.random() * (WORLD_WIDTH - margin * 2);
        y = margin + Math.random() * (WORLD_HEIGHT - margin * 2);
      }

      let isSafe = true;
      if (allSnakes) {
        for (const snake of allSnakes.values()) {
          if (!snake.alive || snake.segments.length === 0) continue;
          const head = snake.segments[0];
          const dx = x - head.x;
          const dy = y - head.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < safeDistanceSq) {
            isSafe = false;
            break;
          }
        }
      }

      if (isSafe) {
        return { x, y };
      }
    }

    // Fallback if no 100% safe spot found
    return null;
  }
}

module.exports = { Snake, WORLD_WIDTH, WORLD_HEIGHT, SEGMENT_DISTANCE, BASE_RADIUS };
