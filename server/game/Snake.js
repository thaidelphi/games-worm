// ==================== Snake Entity ====================
// TH: ไฟล์นี้จัดการเกี่ยวกับตัวละคร "งู" (Snake) ในเกม 
// รวมถึงการคำนวณตำแหน่งข้อต่อ (Segments), การเคลื่อนที่แบบ Inverse Kinematics, 
// การเลี้ยว (Steer), การโตขึ้นเมื่อกินอาหาร (Grow), และการหักคะแนนเมื่อเร่งความเร็ว (Boost)
// EN: This file manages the "Snake" entity in the game.
// It includes segment position calculations, Inverse Kinematics movement,
// steering, growing when eating food, and score deduction when boosting.
'use strict';

const { v4: uuidv4 } = require('uuid');

const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;
const SEGMENT_DISTANCE = 12;       // distance between segments (increased to look better)
// ==========================================
// ⚙️ ตั้งค่าความเร็ว (กำหนดเองได้ที่นี่)
// ==========================================
const BASE_SPEED = 6.0;            // ความเร็วปกติ (เดิม 3.5)
const BOOST_SPEED = 12.0;          // ความเร็วตอนคลิกเร่ง (เดิม 7.0)
// ==========================================
const BASE_RADIUS = 12;
const MAX_RADIUS = 35;
const INITIAL_LENGTH = 15;         // number of segments on spawn

class Snake {
  /**
   * @param {string} name
   * @param {boolean} isBot
   * @param {string} [id]
   */
  constructor(name, isBot = false, id = null) {
    this.id = id || uuidv4();
    this.name = name;
    this.isBot = isBot;
    this.alive = true;
    this.score = 0;
    this.boosting = false;

    // Spawn at a random position with some margin
    const margin = 300;
    const x = margin + Math.random() * (WORLD_WIDTH - margin * 2);
    const y = margin + Math.random() * (WORLD_HEIGHT - margin * 2);
    this.angle = Math.random() * Math.PI * 2;

    // Build initial segments
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

  /** Move the snake forward based on current angle using Inverse Kinematics */
  move() {
    if (!this.alive) return;

    const speed = this.boosting ? BOOST_SPEED : BASE_SPEED;

    // 1. Move head
    this.segments[0].x += Math.cos(this.angle) * speed;
    this.segments[0].y += Math.sin(this.angle) * speed;

    // Clamp head inside world
    this.segments[0].x = Math.max(this.radius, Math.min(WORLD_WIDTH - this.radius, this.segments[0].x));
    this.segments[0].y = Math.max(this.radius, Math.min(WORLD_HEIGHT - this.radius, this.segments[0].y));

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
   * @param {number} n
   */
  grow(n = 1) {
    this.score += n;
    const targetLength = INITIAL_LENGTH + Math.floor(this.score / 20);
    this._growPending = Math.max(0, targetLength - this.segments.length);
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
    return {
      id: this.id,
      name: this.name,
      score: Math.floor(this.score),
      color: this.color,
      radius: this.radius,
      boosting: this.boosting,
      angle: this.angle,
      segments: this.segments,
    };
  }

  _randomColor() {
    const hues = [0, 30, 60, 120, 180, 210, 270, 300, 330];
    const h = hues[Math.floor(Math.random() * hues.length)];
    return `hsl(${h}, 100%, 60%)`;
  }
}

module.exports = { Snake, WORLD_WIDTH, WORLD_HEIGHT, SEGMENT_DISTANCE, BASE_RADIUS };
