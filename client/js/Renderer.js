// ==================== Canvas Renderer ====================
// TH: ไฟล์นี้รับผิดชอบการวาดกราฟิกทั้งหมดลงบน HTML5 Canvas
// รวมถึงการวาดงู (ด้วยเทคนิค lineCap='round' เพื่อความลื่นไหล), อาหารเรืองแสง, 
// เอฟเฟกต์อนุภาค (Particles), ตารางพื้นหลัง (Grid) และแผนที่ย่อ (Minimap)
// EN: This file is responsible for drawing all graphics onto the HTML5 Canvas.
// This includes drawing snakes (using lineCap='round' for smoothness), glowing food,
// particle effects, background grid, and the minimap.

const config = window.SysConfig || {};

// ตัวแปร WORLD_WIDTH, WORLD_HEIGHT: ขนาดของโลก (ต้องตรงกับฝั่งเซิร์ฟเวอร์)
const WORLD_WIDTH  = config.WORLD_WIDTH || 5000;
const WORLD_HEIGHT = config.WORLD_HEIGHT || 5000;
const GRID_SIZE    = 80;

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLCanvasElement} minimap
   * @param {string} worldShape
   */
  constructor(canvas, minimap, worldShape = 'rectangle') {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.mm = minimap;
    this.mmCtx   = minimap.getContext('2d');
    this.worldShape = worldShape;

    this.myId    = null;
    // _zoom: ระดับการซูมของมุมกล้องปัจจุบัน
    this.zoom    = 1.0;
    this.camX    = WORLD_WIDTH  / 2;
    this.camY    = WORLD_HEIGHT / 2;

    // particles: Array เก็บเอฟเฟกต์จุดสี (Particles) เมื่อมีคนตายหรือกินอาหาร
    this.particles = [];

    // Cursor tracking
    this._cx = 0;
    this._cy = 0;

    // glowMultiplier: ตัวคูณความฟุ้ง (0.0 = ปิด, 1.0 = ปกติ) จากหน้าจอตั้งค่า
    this.glowMultiplier = 1.0;

    this._resize();
    window.addEventListener('resize', () => this._resize());
    window.addEventListener('mousemove', e => { this._cx = e.clientX; this._cy = e.clientY; });
  }

  _resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setZoom(z) {
    this.zoom = Math.max(0.5, Math.min(2.0, z));
  }

  // ======================================================
  // Main render entry
  // ======================================================
  render(snakes, foodList, myId) {
    const ctx = this.ctx;
    const W   = this.canvas.width;
    const H   = this.canvas.height;
    this.myId = myId;

    // Follow my snake (smooth camera lerp)
    const me = snakes.find(s => s.id === myId);
    if (me && me.segments?.length > 0) {
      const targetCamX = me.segments[0].x;
      const targetCamY = me.segments[0].y;
      
      // If camera is way off (e.g. just spawned), snap it
      if (Math.abs(this.camX - targetCamX) > W || Math.abs(this.camY - targetCamY) > H) {
        this.camX = targetCamX;
        this.camY = targetCamY;
      } else {
        // Smooth lerp
        this.camX += (targetCamX - this.camX) * 0.1;
        this.camY += (targetCamY - this.camY) * 0.1;
      }
    }

    // Clear
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, W, H);

    // Camera transform
    ctx.save();
    ctx.translate(
      W / 2 - this.camX * this.zoom,
      H / 2 - this.camY * this.zoom
    );
    ctx.scale(this.zoom, this.zoom);

    // Background grid
    const viewW = W / this.zoom;
    const viewH = H / this.zoom;
    this._drawGrid(ctx, this.camX - viewW / 2, this.camY - viewH / 2, viewW, viewH);

    // Food with Viewport Culling
    const now = performance.now() / 1000;
    const margin = 100;
    const minX = this.camX - viewW / 2 - margin;
    const maxX = this.camX + viewW / 2 + margin;
    const minY = this.camY - viewH / 2 - margin;
    const maxY = this.camY + viewH / 2 + margin;

    for (const food of foodList) {
      if (food.x < minX || food.x > maxX || food.y < minY || food.y > maxY) continue;
      this._drawFood(ctx, food, now);
    }

    // Snakes — draw from tail to head so head is always on top
    for (const snake of snakes) {
      if (!snake.segments || snake.segments.length === 0) continue;
      this._drawSnake(ctx, snake, snake.id === myId, now);
    }

    // Particles
    this._updateParticles(ctx);

    ctx.restore();

    // Custom cursor
    this._drawCursor(ctx);

    // Minimap
    this._drawMinimap(snakes, myId);
  }

  // ======================================================
  // Grid
  // ======================================================
  _drawGrid(ctx, x, y, w, h) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#2d3748';

    ctx.save();
    if (this.worldShape === 'circle') {
      ctx.beginPath();
      ctx.arc(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH / 2, 0, Math.PI * 2);
      ctx.clip();
    }

    const gridSize = 100;
    const startX = Math.floor(x / gridSize) * gridSize;
    const startY = Math.floor(y / gridSize) * gridSize;
    ctx.beginPath();
    for (let gx = startX; gx < x + w; gx += gridSize) {
      ctx.moveTo(gx, Math.max(0, y));
      ctx.lineTo(gx, Math.min(WORLD_HEIGHT, y + h));
    }
    for (let gy = startY; gy < y + h; gy += gridSize) {
      ctx.moveTo(Math.max(0, x), gy);
      ctx.lineTo(Math.min(WORLD_WIDTH, x + w), gy);
    }
    ctx.stroke();
    ctx.restore();

    // Map boundary (เส้นขอบแผนที่)
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#374151';
    if (this.worldShape === 'circle') {
      ctx.beginPath();
      ctx.arc(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH / 2 - 3, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(3, 3, WORLD_WIDTH - 6, WORLD_HEIGHT - 6);
    }
  }

  // ======================================================
  // Border
  // ======================================================
  _drawBorder(ctx) {
    ctx.save();
    ctx.shadowColor = '#7c3aed';
    ctx.shadowBlur  = 24 * this.glowMultiplier;
    ctx.strokeStyle = 'rgba(124,58,237,0.8)';
    ctx.lineWidth   = 5;
    ctx.strokeRect(3, 3, WORLD_WIDTH - 6, WORLD_HEIGHT - 6);
    ctx.restore();
  }

  // ======================================================
  // Food — pulsing glow orbs
  // ======================================================
  _drawFood(ctx, food, now) {
    const phase = (food.id ? food.id.charCodeAt(0) : 0) * 0.1;
    const pulse = 0.75 + 0.25 * Math.sin(now * 3 + phase);
    const r = food.r * pulse;

    if (food.t && food.t !== 'normal' && food.t !== 'mass') {
      // สำหรับไอเทมพิเศษ (ยกเว้น mass) วาดเป็นกล่องลอยๆ หมุนได้ เพื่อให้เด่นชัด
      ctx.save();
      // ลอยขึ้นลงนิดหน่อย
      const floatY = Math.sin(now * 4 + phase) * 4;
      ctx.translate(food.x, food.y + floatY);
      // หมุนกล่อง
      ctx.rotate(now + phase);
      
      const boxSize = r * 1.6;
      
      ctx.shadowColor = food.c;
      ctx.shadowBlur = (15 + 10 * pulse) * this.glowMultiplier;
      
      // วาดกล่องหลัก
      ctx.fillStyle = food.c;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-boxSize, -boxSize, boxSize * 2, boxSize * 2, 4) : ctx.rect(-boxSize, -boxSize, boxSize * 2, boxSize * 2);
      ctx.fill();
      
      // วาดขอบกล่อง
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      
      // ลวดลายตรงกลางกล่อง
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-boxSize * 0.4, -boxSize * 0.4, boxSize * 0.8, boxSize * 0.8, 2) : ctx.rect(-boxSize * 0.4, -boxSize * 0.4, boxSize * 0.8, boxSize * 0.8);
      ctx.fill();
      
      ctx.restore();

      let labelText = food.t.toUpperCase();
      if (food.t === 'mass') {
        labelText = 'MASS';
      }

      ctx.save();
      ctx.font = `900 ${Math.max(12, r * 1.1)}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      // เงาข้อความแบบแข็งๆ ให้อ่านง่าย
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4 * this.glowMultiplier;
      ctx.shadowOffsetX = 1.5;
      ctx.shadowOffsetY = 1.5;
      // ให้ข้อความลอยตามกล่องด้วย
      ctx.fillText(labelText, food.x, food.y + floatY);
      ctx.restore();
    } else {
      // อาหารปกติ วาดเป็นวงกลมเรืองแสง
      ctx.save();
      ctx.shadowColor = food.c;
      ctx.shadowBlur  = 12 * this.glowMultiplier;

      const grad = ctx.createRadialGradient(food.x, food.y, 0, food.x, food.y, r + 2);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, food.c);
      grad.addColorStop(1,   'rgba(0,0,0,0)');

      ctx.beginPath();
      ctx.arc(food.x, food.y, r + 2, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
  }

  _drawSnake(ctx, snake, isMe, now) {
    const segs  = snake.segments;
    if (!segs || segs.length < 2) return;

    const r     = snake.radius || 9;
    const color = snake.color  || '#7c3aed';

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur  = (isMe ? 18 : (snake.boosting ? 22 : 8)) * this.glowMultiplier;

    const totalSegs = segs.length;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;

    for (let i = totalSegs - 1; i >= 1; i--) {
      const curr = segs[i];
      const prev = segs[i - 1];
      const t    = i / totalSegs;
      const segR = r * (0.45 + 0.55 * (1 - t)); 

      ctx.beginPath();
      ctx.moveTo(curr.x, curr.y);
      ctx.lineTo(prev.x, prev.y);
      ctx.lineWidth = segR * 2;
      ctx.stroke();
    }

    const head  = segs[0];
    const headR = r * 1.15;

    ctx.beginPath();
    ctx.arc(head.x, head.y, headR, 0, Math.PI * 2);

    const hGrad = ctx.createRadialGradient(
      head.x - headR * 0.3, head.y - headR * 0.3, headR * 0.05,
      head.x, head.y, headR
    );
    hGrad.addColorStop(0, this._lightenHsl(color, 25));
    hGrad.addColorStop(1, color);
    ctx.fillStyle = hGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth   = 1;
    ctx.stroke();

    this._drawEyes(ctx, head, snake.angle || 0, headR);
    ctx.restore();
    this._drawLabel(ctx, head, snake, headR, isMe, color);
  }

  _drawEyes(ctx, head, angle, r) {
    const fwdX   = Math.cos(angle);
    const fwdY   = Math.sin(angle);
    const perpX  = -fwdY;
    const perpY  =  fwdX;
    const eyeOff = r * 0.5;
    const fwdOff = r * 0.35;
    const eyeR   = r * 0.32;
    const pupilR = eyeR * 0.5;

    for (const side of [-1, 1]) {
      const ex = head.x + fwdX * fwdOff + perpX * eyeOff * side;
      const ey = head.y + fwdY * fwdOff + perpY * eyeOff * side;

      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        ex + fwdX * pupilR * 0.5,
        ey + fwdY * pupilR * 0.5,
        pupilR, 0, Math.PI * 2
      );
      ctx.fillStyle = '#111111';
      ctx.fill();
    }
  }

  _drawLabel(ctx, head, snake, r, isMe, color) {
    let displayName = snake.name;
    if (snake.m && snake.m > 1 && snake.e > 0) {
      displayName = `[x${snake.m} - ${snake.e}s] ${snake.name}`;
    }

    const fontSize = Math.max(11, r * 1.1);
    ctx.save();
    ctx.font         = `${isMe ? 700 : 500} ${fontSize}px Outfit, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor  = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur   = 5 * this.glowMultiplier;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    
    if (snake.m && snake.m > 1) {
      ctx.fillStyle = '#fcd34d';
    } else {
      ctx.fillStyle = isMe ? '#ffffff' : color;
    }
    
    ctx.fillText(displayName, head.x, head.y - r * 2.0);
    ctx.restore();
  }

  _darkenHsl(hslStr, amount) {
    return hslStr.replace(/(\d+)%\)$/, (_, l) =>
      `${Math.max(0, parseInt(l) - amount)}%)`
    );
  }
  _lightenHsl(hslStr, amount) {
    return hslStr.replace(/(\d+)%\)$/, (_, l) =>
      `${Math.min(100, parseInt(l) + amount)}%)`
    );
  }

  spawnParticles(x, y, color, count = 10) {
    // จำกัดจำนวน Particle ในระบบเพื่อไม่ให้กระตุกเมื่อกินอาหารเยอะๆ พร้อมกัน
    if (this.particles.length > 150) {
      // ถ้ามีเยอะแล้ว ให้ลบของเก่าทิ้งบางส่วน
      this.particles.splice(0, this.particles.length - 150);
    }

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r:  2 + Math.random() * 4,
        color,
        life:  1.0,
        decay: 0.018 + Math.random() * 0.022,
      });
    }
  }

  _updateParticles(ctx) {
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) {
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   += 0.06;
      p.life -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      // ปิด shadowBlur สำหรับ particles เพื่อลดภาระการ์ดจอและซีพียู
      ctx.shadowBlur = 0; 
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0, p.r * p.life), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    }
  }

  _drawCursor(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur  = 8 * this.glowMultiplier;
    ctx.beginPath();
    ctx.arc(this._cx, this._cy, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this._cx, this._cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
  }

  _drawMinimap(snakes, myId) {
    const ctx  = this.mmCtx;
    const W    = this.mm.width;
    const H    = this.mm.height;
    const sx   = W / WORLD_WIDTH;
    const sy   = H / WORLD_HEIGHT;

    ctx.clearRect(0, 0, W, H);

    ctx.save();
    if (this.worldShape === 'circle') {
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fill();
      ctx.clip();
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, W, H);
    }

    for (const snake of snakes) {
      if (!snake.segments?.length) continue;
      const head = snake.segments[0];
      const x    = head.x * sx;
      const y    = head.y * sy;
      const r    = snake.id === myId ? 4 : 2.5;

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle   = snake.color || '#7c3aed';
      ctx.shadowColor = snake.id === myId ? snake.color : 'transparent';
      ctx.shadowBlur  = (snake.id === myId ? 6 : 0) * this.glowMultiplier;
      ctx.fill();
    }

    // Viewport rect
    const vW = (window.innerWidth  / this.zoom) * sx;
    const vH = (window.innerHeight / this.zoom) * sy;
    const vx = (this.camX - window.innerWidth  / (2 * this.zoom)) * sx;
    const vy = (this.camY - window.innerHeight / (2 * this.zoom)) * sy;
    
    ctx.restore(); // Restore clip

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth   = 1;
    ctx.shadowBlur  = 0;
    ctx.strokeRect(vx, vy, vW, vH);

    // วาดกรอบมินิแมป
    if (this.worldShape === 'circle') {
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, W / 2 - 1, 0, Math.PI * 2);
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, W, H);
    }
  }
}
