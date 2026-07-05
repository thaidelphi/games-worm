// ==================== Food System ====================
'use strict';

const { v4: uuidv4 } = require('uuid');
const { WORLD_WIDTH, WORLD_HEIGHT } = require('./Snake');

const FOOD_COUNT_TARGET = 600;    // keep this many food items in world
const FOOD_RADIUS_MIN = 4;
const FOOD_RADIUS_MAX = 9;

class Food {
  constructor(x, y, value, color, radius) {
    this.id = uuidv4();
    this.x = x !== undefined ? x : Math.random() * WORLD_WIDTH;
    this.y = y !== undefined ? y : Math.random() * WORLD_HEIGHT;
    this.value = value || Math.floor(10 + Math.random() * 20);
    this.radius = radius || FOOD_RADIUS_MIN + Math.random() * (FOOD_RADIUS_MAX - FOOD_RADIUS_MIN);
    this.color = color || this._randomColor();
    this.pulse = Math.random() * Math.PI * 2; // phase offset for animation
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
   */
  spawnAt(x, y, value = 3, color = null) {
    // Add some scatter
    const scatter = 30;
    const fx = x + (Math.random() - 0.5) * scatter;
    const fy = y + (Math.random() - 0.5) * scatter;
    const food = new Food(
      Math.max(0, Math.min(WORLD_WIDTH, fx)),
      Math.max(0, Math.min(WORLD_HEIGHT, fy)),
      value,
      color,
      FOOD_RADIUS_MIN + Math.random() * (FOOD_RADIUS_MAX - FOOD_RADIUS_MIN)
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

  /** Get all food as a plain array for serialization */
  toArray() {
    return Array.from(this.items.values()).map(f => f.toJSON());
  }
}

module.exports = { FoodManager, Food, FOOD_COUNT_TARGET };
