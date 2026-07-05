// ==================== Food System ====================
// TH: ไฟล์นี้จัดการเรื่องการเกิดของอาหาร (Food Spawn) และการจัดการอาหารทั้งหมดในแผนที่
// มีระบบสุ่มเกิดอาหารตามจุดต่างๆ และระบบดรอปอาหารเมื่อมีงูตาย (มวลสาร 50% กลายเป็นอาหาร)
// EN: This file handles food spawning and managing all food items on the map.
// It features random food generation at various points and dropping food when a snake dies (50% of mass becomes food).
'use strict';

const { v4: uuidv4 } = require('uuid');
const SysConfig = require('../sys_config');

const {
  WORLD_WIDTH, WORLD_HEIGHT,
  FOOD_COUNT_TARGET, FOOD_RADIUS_MIN, FOOD_RADIUS_MAX,
  CORPSE_FOOD_LIFESPAN_SEC
} = SysConfig;

class Food {
  constructor(x, y, value, color, radius, isCorpse = false) {
    // id: รหัสไอดีของอาหาร เพื่อให้ Server และ Client อ้างอิงชิ้นเดียวกันได้ถูกต้อง
    this.id = uuidv4();
    // x, y: พิกัดตำแหน่งของอาหารบนแผนที่
    this.x = x !== undefined ? x : Math.random() * WORLD_WIDTH;
    this.y = y !== undefined ? y : Math.random() * WORLD_HEIGHT;
    // value: มูลค่าคะแนน/มวลสารที่งูจะได้เมื่อกินชิ้นนี้เข้าไป
    this.value = value || Math.floor(10 + Math.random() * 20);
    // radius: ขนาดของอาหารชิ้นนี้ที่แสดงผลบนหน้าจอ
    this.radius = radius || FOOD_RADIUS_MIN + Math.random() * (FOOD_RADIUS_MAX - FOOD_RADIUS_MIN);
    // color: สีของอาหาร
    this.color = color || this._randomColor();
    // pulse: ค่า offset (ระยะเยื้อง) สำหรับอนิเมชันให้วงกลมกระพริบในจังหวะที่ไม่พร้อมกัน
    this.pulse = Math.random() * Math.PI * 2; // phase offset for animation
    // expiresAt: เวลาที่อาหารนี้จะสลายไป (Timestamp) มีค่าเฉพาะอาหารจากซากงู
    this.expiresAt = isCorpse ? Date.now() + CORPSE_FOOD_LIFESPAN_SEC * 1000 : null;
  }

  _randomColor() {
    const palette = [
      '#ff6b6b', '#ffa07a', '#ffd700', '#98fb98',
      '#87ceeb', '#da70d6', '#ff69b4', '#00ced1',
      '#ff8c00', '#7fff00', '#ff1493', '#00fa9a',
    ];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  toJSON() {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      r: this.radius,
      c: this.color,
      v: this.value,
    };
  }
}

class FoodManager {
  constructor() {
    /** @type {Map<string, Food>} */
    this.items = new Map();
    this._populate();
  }

  _populate() {
    while (this.items.size < FOOD_COUNT_TARGET) {
      const food = new Food();
      this.items.set(food.id, food);
    }
  }

  /**
   * Spawn food at a specific location (e.g. when snake dies)
   * @param {number} x
   * @param {number} y
   * @param {number} value
   * @param {string} [color]
   * @param {boolean} [isCorpse]
   * @param {number} [customRadius]
   */
  spawnAt(x, y, value = 3, color = null, isCorpse = true, customRadius = null) {
    // Add some scatter
    const scatter = 30;
    const fx = x + (Math.random() - 0.5) * scatter;
    const fy = y + (Math.random() - 0.5) * scatter;
    const food = new Food(
      Math.max(0, Math.min(WORLD_WIDTH, fx)),
      Math.max(0, Math.min(WORLD_HEIGHT, fy)),
      value,
      color,
      customRadius || (FOOD_RADIUS_MIN + Math.random() * (FOOD_RADIUS_MAX - FOOD_RADIUS_MIN)),
      isCorpse
    );
    this.items.set(food.id, food);
    return food;
  }

  /**
   * Remove a food item and respawn a new one elsewhere
   * @param {string} id
   */
  consume(id) {
    this.items.delete(id);
    // Refill
    if (this.items.size < FOOD_COUNT_TARGET) {
      const food = new Food();
      this.items.set(food.id, food);
    }
  }

  /**
   * Check and remove food items that have expired
   */
  cleanupExpired() {
    const now = Date.now();
    for (const [id, food] of this.items) {
      if (food.expiresAt && now > food.expiresAt) {
        this.consume(id); // Removing it and optionally refilling if below target
      }
    }
  }

  /** Get all food as a plain array for serialization */
  toArray() {
    return Array.from(this.items.values()).map(f => f.toJSON());
  }
}

module.exports = { FoodManager, Food, FOOD_COUNT_TARGET };
