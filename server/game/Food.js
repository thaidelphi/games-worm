// ==================== Food System ====================
// TH: ไฟล์นี้จัดการเรื่องการเกิดของอาหาร (Food Spawn) และการจัดการอาหารทั้งหมดในแผนที่
// มีระบบสุ่มเกิดอาหารตามจุดต่างๆ และระบบดรอปอาหารเมื่อมีงูตาย (มวลสาร 50% กลายเป็นอาหาร)
// EN: This file handles food spawning and managing all food items on the map.
// It features random food generation at various points and dropping food when a snake dies (50% of mass becomes food).
'use strict';

const { v4: uuidv4 } = require('uuid');
const SysConfig = require('../sys_config');

const {
  WORLD_SHAPE, WORLD_WIDTH, WORLD_HEIGHT,
  FOOD_COUNT_TARGET, FOOD_RADIUS_MIN, FOOD_RADIUS_MAX,
  CORPSE_FOOD_LIFESPAN_SEC,
  ENABLE_SPECIAL_ITEMS, SPECIAL_ITEM_DROP_CHANCE,
  SPECIAL_ITEM_MASS_VALUE
} = SysConfig;

class Food {
  constructor(x, y, value, color, radius, isCorpse = false, type = 'normal') {
    // id: รหัสไอดีของอาหาร เพื่อให้ Server และ Client อ้างอิงชิ้นเดียวกันได้ถูกต้อง
    this.id = uuidv4();
    // x, y: พิกัดตำแหน่งของอาหารบนแผนที่
    if (x !== undefined && y !== undefined) {
      this.x = x;
      this.y = y;
    } else {
      if (WORLD_SHAPE === 'circle') {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * (WORLD_WIDTH / 2);
        this.x = (WORLD_WIDTH / 2) + Math.cos(angle) * r;
        this.y = (WORLD_HEIGHT / 2) + Math.sin(angle) * r;
      } else {
        this.x = Math.random() * WORLD_WIDTH;
        this.y = Math.random() * WORLD_HEIGHT;
      }
    }
    // value: มูลค่าคะแนน/มวลสารที่งูจะได้เมื่อกินชิ้นนี้เข้าไป
    this.value = value || Math.floor(10 + Math.random() * 20);
    // radius: ขนาดของอาหารชิ้นนี้ที่แสดงผลบนหน้าจอ
    this.radius = radius || FOOD_RADIUS_MIN + Math.random() * (FOOD_RADIUS_MAX - FOOD_RADIUS_MIN);
    // color: สีของอาหาร
    this.color = color || this._randomColor();
    // pulse: ค่า offset (ระยะเยื้อง) สำหรับอนิเมชันให้วงกลมกระพริบในจังหวะที่ไม่พร้อมกัน
    this.pulse = Math.random() * Math.PI * 2; // phase offset for animation

    // type: ประเภทของอาหาร
    let finalType = type;
    if (!isCorpse && finalType === 'normal' && ENABLE_SPECIAL_ITEMS && Math.random() < SPECIAL_ITEM_DROP_CHANCE) {
      const rand = Math.random();
      if (rand < 0.1) finalType = 'x5';       // 10%
      else if (rand < 0.25) finalType = 'x3';  // 15%
      else if (rand < 0.45) finalType = 'x2';  // 20%
      else if (rand < 0.65) finalType = 'zoom';// 20%
      else finalType = 'mass';                 // 35%
    }
    this.type = finalType;

    // ปรับค่าสำหรับไอเทมพิเศษที่เกิดบนแผนที่
    if (this.type === 'mass') {
      this.value = SPECIAL_ITEM_MASS_VALUE;
      this.radius = FOOD_RADIUS_MAX * 2.5;
    }

    // ถ้าเป็นซากงูที่ตาย ให้เริ่มนับเวลาถอยหลัง (expiresAt)
    this.expiresAt = isCorpse ? Date.now() + (CORPSE_FOOD_LIFESPAN_SEC * 1000) : null;
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
      x:  Math.round(this.x),
      y:  Math.round(this.y),
      r:  Math.round(this.radius),
      c:  this.color,
      t:  this.type, // ส่งประเภทไปให้ Client วาดรูป ('normal', 'x2', 'x3', 'x5')
      v:  this.value,
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
   * @param {number} [customRadius]
   * @param {boolean} [isCorpse]
   * @param {string} [itemType]
   */
  spawnAt(x, y, value = 3, color = null, customRadius = null, isCorpse = true, itemType = 'normal') {
    // Add some scatter
    const scatter = 30;
    const fx = x + (Math.random() - 0.5) * scatter;
    const fy = y + (Math.random() - 0.5) * scatter;
    
    // สุ่มประเภทไอเทมถ้าระบบเปิดใช้งาน
    let finalType = itemType;
    if (finalType === 'normal' && ENABLE_SPECIAL_ITEMS && Math.random() < SPECIAL_ITEM_DROP_CHANCE) {
      const rand = Math.random();
      if (rand < 0.1) finalType = 'x5';       // 10%
      else if (rand < 0.25) finalType = 'x3';  // 15%
      else if (rand < 0.45) finalType = 'x2';  // 20%
      else if (rand < 0.65) finalType = 'zoom';// 20%
      else finalType = 'mass';                 // 35%
    }
    
    let finalValue = value;
    let finalRadius = customRadius || (FOOD_RADIUS_MIN + Math.random() * (FOOD_RADIUS_MAX - FOOD_RADIUS_MIN));

    if (finalType === 'mass') {
      finalValue = SPECIAL_ITEM_MASS_VALUE;
      finalRadius = FOOD_RADIUS_MAX * 2.5; // ก้อนใหญ่กว่าปกติมาก
    }

    let boundedX = fx;
    let boundedY = fy;

    if (WORLD_SHAPE === 'circle') {
      const cx = WORLD_WIDTH / 2;
      const cy = WORLD_HEIGHT / 2;
      const maxR = (WORLD_WIDTH / 2) - finalRadius;
      let dx = fx - cx;
      let dy = fy - cy;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxR && dist > 0) {
        boundedX = cx + (dx / dist) * maxR;
        boundedY = cy + (dy / dist) * maxR;
      }
    } else {
      boundedX = Math.max(0, Math.min(WORLD_WIDTH, fx));
      boundedY = Math.max(0, Math.min(WORLD_HEIGHT, fy));
    }

    const food = new Food(
      boundedX,
      boundedY,
      finalValue,
      color,
      finalRadius,
      isCorpse,
      finalType
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
