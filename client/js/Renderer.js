// ==================== Canvas Renderer ====================
// ไฟล์นี้รับผิดชอบการวาดกราฟิกทั้งหมดลงบน HTML5 Canvas
// รวมถึงการวาดงู (ด้วยเทคนิค lineCap='round' เพื่อความลื่นไหล), อาหารเรืองแสง, 
// เอฟเฟกต์อนุภาค (Particles), ตารางพื้นหลัง (Grid) และแผนที่ย่อ (Minimap)

const WORLD_WIDTH  = 5000;
const WORLD_HEIGHT = 5000;
const GRID_SIZE    = 80;

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLCanvasElement} minimap
   */
  constructor(canvas, minimap) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.mm      = minimap;
    this.mmCtx   = minimap.getContext('2d');

    this.myId    = null;
    this.zoom    = 1.0;
    this.camX    = WORLD_WIDTH  / 2;
    this.camY    = WORLD_HEIGHT / 2;

    // Particle system
    this.particles = [];

    // Cursor tracking
    this._cx = 0;
    this._cy = 0;

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
    this._drawGrid(ctx, W, H);

    // World border
    this._drawBorder(ctx);

    // Food
    const now = performance.now() / 1000;
    for (const food of foodList) {
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
  _drawGrid(ctx, W, H) {
    const tx = W / 2 - this.camX * this.zoom;
    const ty = H / 2 - this.camY * this.zoom;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;

    const startX = Math.floor((-tx / this.zoom) / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor((-ty / this.zoom) / GRID_SIZE) * GRID_SIZE;
    const cols   = Math.ceil(W / this.zoom / GRID_SIZE) + 2;
    const rows   = Math.ceil(H / this.zoom / GRID_SIZE) + 2;

    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const x = startX + c * GRID_SIZE;
      ctx.moveTo(x, startY);
      ctx.lineTo(x, startY + rows * GRID_SIZE);
    }
    for (let r = 0; r <= rows; r++) {
      const y = startY + r * GRID_SIZE;
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + cols * GRID_SIZE, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ======================================================
  // Border
  // ======================================================
  _drawBorder(ctx) {
    ctx.save();
    ctx.shadowColor = '#7c3aed';
    ctx.shadowBlur  = 24;
    ctx.strokeStyle = 'rgba(124,58,237,0.8)';
    ctx.lineWidth   = 5;
    ctx.strokeRect(3, 3, WORLD_WIDTH - 6, WORLD_HEIGHT - 6);
    ctx.restore();
  }

  // ======================================================
  // Food — pulsing glow orbs
  // ======================================================
  _drawFood(ctx, food, now) {
    // Use food id's first char code as phase offset
    const phase = (food.id ? food.id.charCodeAt(0) : 0) * 0.1;
    const pulse = 0.75 + 0.25 * Math.sin(now * 3 + phase);
    const r = food.r * pulse;

    ctx.save();
    ctx.shadowColor = food.c;
    ctx.shadowBlur  = 12;

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

  // ======================================================
  // Snake — proper Slither.io style rendering
  // Draw every segment as a filled circle, connect pairs
  // with a filled rectangle so there are no gaps.
  // ======================================================
  _drawSnake(ctx, snake, isMe, now) {
    const segs  = snake.segments;
    if (!segs || segs.length < 2) return;

    const r     = snake.radius || 9;
    const color = snake.color  || '#7c3aed';
    const dark  = this._darkenHsl(color, 30);

    ctx.save();

    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur  = isMe ? 18 : (snake.boosting ? 22 : 8);

    const totalSegs = segs.length;

    // Use highly optimized native round caps instead of manual polygon math
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;

    // ---- Draw body (tail → head) ----
    for (let i = totalSegs - 1; i >= 1; i--) {
      const curr = segs[i];
      const prev = segs[i - 1];

      // Taper factor: body narrows toward tail
      const t    = i / totalSegs;      // 1 = tail, 0 = head
      const segR = r * (0.45 + 0.55 * (1 - t)); 

      ctx.beginPath();
      ctx.moveTo(curr.x, curr.y);
      ctx.lineTo(prev.x, prev.y);
      ctx.lineWidth = segR * 2;
      ctx.stroke();
    }

    // ---- Head circle ----
    const head  = segs[0];
    const headR = r * 1.15;

    ctx.beginPath();
    ctx.arc(head.x, head.y, headR, 0, Math.PI * 2);

    // Radial gradient on head for depth
    const hGrad = ctx.createRadialGradient(
      head.x - headR * 0.3, head.y - headR * 0.3, headR * 0.05,
      head.x, head.y, headR
    );
    hGrad.addColorStop(0, this._lightenHsl(color, 25));
    hGrad.addColorStop(1, color);
    ctx.fillStyle = hGrad;
    ctx.fill();

    // Outline on head
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth   = 1;
    ctx.stroke();

    // ---- Eyes ----
    this._drawEyes(ctx, head, snake.angle || 0, headR);

    ctx.restore();

    // ---- Name label (no shadow, drawn after restore for performance) ----
    this._drawLabel(ctx, head, snake.name, headR, isMe, color);
  }

  // ======================================================
  // Eyes
  // ======================================================
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

      // White sclera
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fill();

      // Pupil
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

  // ======================================================
  // Name label
  // ======================================================
  _drawLabel(ctx, head, name, r, isMe, color) {
    const fontSize = Math.max(11, r * 1.1);
    ctx.save();
    ctx.font         = `${isMe ? 700 : 500} ${fontSize}px Outfit, sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';

    // Drop shadow for readability
    ctx.shadowColor  = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur   = 5;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle    = isMe ? '#ffffff' : color;
    ctx.fillText(name, head.x, head.y - r * 2.0);
    ctx.restore();
  }

  // ======================================================
  // Color helpers
  // ======================================================
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

  // ======================================================
  // Particles
  // ======================================================
  spawnParticles(x, y, color, count = 10) {
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
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0, p.r * p.life), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    }
  }

  // ======================================================
  // Custom cursor
  // ======================================================
  _drawCursor(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.arc(this._cx, this._cy, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this._cx, this._cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.restore();
  }

  // ======================================================
  // Minimap
  // ======================================================
  _drawMinimap(snakes, myId) {
    const ctx  = this.mmCtx;
    const W    = this.mm.width;
    const H    = this.mm.height;
    const sx   = W / WORLD_WIDTH;
    const sy   = H / WORLD_HEIGHT;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    // Draw each snake as a dot
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
      ctx.shadowBlur  = snake.id === myId ? 6 : 0;
      ctx.fill();
    }

    // Viewport rect
    const vW = (window.innerWidth  / this.zoom) * sx;
    const vH = (window.innerHeight / this.zoom) * sy;
    const vx = (this.camX - window.innerWidth  / (2 * this.zoom)) * sx;
    const vy = (this.camY - window.innerHeight / (2 * this.zoom)) * sy;

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth   = 1;
    ctx.shadowBlur  = 0;
    ctx.strokeRect(vx, vy, vW, vH);
  }
}
