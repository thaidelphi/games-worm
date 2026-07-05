// ==================== Main Game Client ====================
// TH: ไฟล์หลักของฝั่งไคลเอนต์ (Frontend) จัดการเรื่อง UI, การเชื่อมต่อ Socket.IO กับเซิร์ฟเวอร์, 
// การรับข้อมูล Game State เพื่อนำมาทำ Interpolation (ทำให้การเคลื่อนที่ลื่นไหลไม่กระตุก),
// และควบคุม Game Loop ฝั่งผู้เล่น (requestAnimationFrame)
// EN: The main client-side (Frontend) file handling UI, Socket.IO connection to the server,
// receiving Game State for interpolation (ensuring smooth movement without stutter),
// and controlling the player's Game Loop (requestAnimationFrame).
import { Renderer } from './Renderer.js';
import { InputHandler } from './InputHandler.js';

// ---- DOM refs ----
const canvas       = document.getElementById('game-canvas');
const minimapEl    = document.getElementById('minimap');
const startScreen  = document.getElementById('start-screen');
const deathScreen  = document.getElementById('death-screen');
const hud          = document.getElementById('hud');
const playBtn      = document.getElementById('play-btn');
const respawnBtn   = document.getElementById('respawn-btn');
const nameInput    = document.getElementById('player-name-input');
const hudScore     = document.getElementById('hud-score-value');
const finalScore   = document.getElementById('final-score');
const deathRank    = document.getElementById('death-rank');
const lbList       = document.getElementById('lb-list');
const boostBar     = document.getElementById('boost-bar');
const zoomInBtn    = document.getElementById('zoom-in-btn');
const zoomOutBtn   = document.getElementById('zoom-out-btn');
const zoomLevel    = document.getElementById('zoom-level');
const glowRange    = document.getElementById('glow-range');
const glowValue    = document.getElementById('glow-value');

// ---- State (ตัวแปรสถานะของเกมฝั่ง Client) ----
// socket: ใช้เก็บการเชื่อมต่อ WebSocket
let socket   = null;
// renderer: ตัวจัดการวาดกราฟิกลง Canvas (คลาส Renderer)
let renderer = null;
// input: ตัวจัดการรับค่าเมาส์ คีย์บอร์ด ทัชสกรีน (คลาส InputHandler)
let input    = null;
// myId: ไอดีของผู้เล่น (Socket ID ของตัวเอง)
let myId     = null;
let worldShape = 'rectangle';
// alive: สถานะว่าผู้เล่นยังมีชีวิตอยู่หรือไม่
let alive    = false;
// clientSnakes: Map เก็บข้อมูลงูทั้งหมดที่ได้รับจากเซิร์ฟเวอร์ (ใช้ทำ Interpolation เคลื่อนที่ลื่นไหล)
let clientSnakes = new Map(); // Smooth interpolated snakes
// food: Array เก็บข้อมูลอาหารทั้งหมดบนจอ
let food     = [];
// score: คะแนนปัจจุบันของผู้เล่น
let score    = 0;
// zoom: ระดับการซูมปัจจุบัน
let zoom     = 1.0;
// boostEnergy: หลอดพลังงานวิ่งเร็ว (0.0 ถึง 1.0)
let boostEnergy = 1.0; // 0..1

const config = window.SysConfig || {};

// BOOST_DRAIN: อัตราการลดพลังงานเมื่อกดวิ่งเร็ว
const BOOST_DRAIN = config.BOOST_DRAIN || 0.008;
// BOOST_REGEN: อัตราการฟื้นฟูพลังงานเมื่อไม่ได้วิ่ง
const BOOST_REGEN = config.BOOST_REGEN || 0.003;
// rafId: ตัวเก็บ ID ของ requestAnimationFrame ไว้สำหรับยกเลิกลูป
let rafId    = null;

// ---- Zoom helpers (ตัวแปรควบคุมระบบซูม) ----
// MIN_ZOOM, MAX_ZOOM: ระยะซูมเข้า/ออก สูงสุดและต่ำสุด
const MIN_ZOOM = config.MIN_ZOOM || 0.5;
const MAX_ZOOM = config.MAX_ZOOM || 2.0;
// ZOOM_STEP: อัตราการซูมต่อการคลิกหรือเลื่อนลูกกลิ้ง 1 ครั้ง
const ZOOM_STEP = config.ZOOM_STEP || 0.1;

// userZoomMult: ตัวคูณซูมที่ผู้เล่นปรับเอง
let userZoomMult = 1.0;

function setZoom(z, overrideMin = false) {
  // ฟังก์ชันนี้เก็บไว้ใช้ในกรณีอื่น ถ้าจำเป็น
  const min = overrideMin ? 0.25 : MIN_ZOOM;
  zoom = Math.max(min, Math.min(MAX_ZOOM * 2, z));
  renderer?.setZoom(zoom);
  zoomLevel.textContent = `${zoom.toFixed(1)}×`;
}

// ---- Show / Hide screens ----
function showScreen(name) {
  startScreen.classList.remove('active');
  deathScreen.classList.remove('active');
  hud.classList.add('hidden');

  if (name === 'start') { startScreen.classList.add('active'); }
  if (name === 'death') { deathScreen.classList.add('active'); }
  if (name === 'game')  { hud.classList.remove('hidden'); }
}

// ---- Connect & Join ----
function connect(name) {
  // Support hosting under subfolders (e.g. /worm)
  socket = io({
    path: '/socket.io',
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('[socket] connected as', socket.id);
    socket.emit('join', { name });
  });

  socket.on('joined', (data) => {
    myId   = data.myId;
    config.WORLD_WIDTH = data.worldWidth;
    config.WORLD_HEIGHT = data.worldHeight;
    worldShape = data.worldShape || 'rectangle';

    if (!renderer) {
      renderer = new Renderer(canvas, config, worldShape);
    } else {
      renderer.worldShape = worldShape;
    }
    
    clientSnakes.clear();
    for (const s of (data.snakes || [])) {
      clientSnakes.set(s.id, { ...s, segments: s.segments.map(seg => ({...seg})) });
    }
    
    food   = data.food   || [];
    alive  = true;
    boostEnergy = 1.0;
    showScreen('game');
    startGameLoop();
  });

  socket.on('respawned', (data) => {
    myId   = data.myId || myId;
    config.WORLD_WIDTH = data.worldWidth;
    config.WORLD_HEIGHT = data.worldHeight;
    worldShape = data.worldShape || 'rectangle';

    if (renderer) renderer.worldShape = worldShape;

    clientSnakes.clear();
    for (const s of (data.snakes || [])) {
      clientSnakes.set(s.id, { ...s, segments: s.segments.map(seg => ({...seg})) });
    }
    food   = data.food   || [];
    alive  = true;
    boostEnergy = 1.0;
    showScreen('game');
  });

  socket.on('gameState', (state) => {
    // Update target state for interpolation
    const serverSnakes = state.snakes || [];
    
    for (const s of serverSnakes) {
      if (!clientSnakes.has(s.id)) {
        // New snake
        clientSnakes.set(s.id, { ...s, segments: s.segments.map(seg => ({...seg})) });
      } else {
        // Update existing
        let cs = clientSnakes.get(s.id);
        cs.targetSegments = s.segments;
        cs.color = s.color;
        cs.radius = s.r;
        cs.boosting = s.b;
        cs.score = s.score;
        cs.angle = s.angle;
        cs.name = s.name;
        cs.m = s.m;
        cs.e = s.e;
        cs.z = s.z;
      }
    }
    
    // Remove dead snakes
    const serverIds = new Set(serverSnakes.map(s => s.id));
    for (const id of clientSnakes.keys()) {
      if (!serverIds.has(id)) clientSnakes.delete(id);
    }
    
    food   = state.food   || food;
    updateLeaderboard(state.leaderboard || []);
    const me = clientSnakes.get(myId);
    if (me) {
      score = me.score || 0;
      hudScore.textContent = score;
    }
  });

  socket.on('foodEaten', (data) => {
    // Spawn particles at last known food position (approximate)
    if (renderer) {
      const me = clientSnakes.get(myId);
      if (me?.segments?.length) {
        renderer.spawnParticles(me.segments[0].x, me.segments[0].y, '#39ff14', 8);
      }
    }
  });

  socket.on('died', (data) => {
    alive = false;
    finalScore.textContent = data.score ?? score;

    // Show rank in death screen
    const lb = Array.from(document.querySelectorAll('.lb-item'));
    const rank = lb.findIndex(el => el.dataset.id === myId);
    deathRank.textContent = rank >= 0 ? `You were rank #${rank + 1}` : '';

    // Spawn death particles
    if (renderer) {
      const me = clientSnakes.get(myId);
      if (me?.segments) {
        for (let i = 0; i < me.segments.length; i += 4) {
          renderer.spawnParticles(me.segments[i].x, me.segments[i].y, me.color || '#7c3aed', 6);
        }
      }
    }

    // Show death screen after short delay for dramatic effect
    setTimeout(() => showScreen('death'), 500);
  });

  socket.on('disconnect', () => {
    console.log('[socket] disconnected');
  });
}

// ---- Game Loop ----
let lastInputTime = 0;
const INPUT_THROTTLE = 16; // ms (~60fps input sending for smoother turning)

function startGameLoop() {
  if (rafId) cancelAnimationFrame(rafId);

  function loop(ts) {
    if (!renderer) return;

    // Boost energy management
    const boosting = input.boosting && alive && boostEnergy > 0;
    if (boosting) {
      boostEnergy = Math.max(0, boostEnergy - BOOST_DRAIN);
    } else {
      boostEnergy = Math.min(1.0, boostEnergy + BOOST_REGEN);
    }
    boostBar.style.width = `${boostEnergy * 100}%`;

    // Send input to server (throttled)
    if (alive && socket && ts - lastInputTime > INPUT_THROTTLE) {
      lastInputTime = ts;
      const angle = input.getAngle(window.innerWidth / 2, window.innerHeight / 2);
      socket.emit('input', { angle, boost: boosting });
    }

    // Client-side Interpolation (Lerp)
    for (const cs of clientSnakes.values()) {
      if (cs.targetSegments) {
        // Grow local segments to match server length
        while (cs.segments.length < cs.targetSegments.length) {
          let last = cs.segments[cs.segments.length - 1] || cs.targetSegments[0];
          cs.segments.push({ x: last.x, y: last.y });
        }
        // Shrink local segments
        while (cs.segments.length > cs.targetSegments.length) {
          cs.segments.pop();
        }
        
        // Lerp positions
        for (let i = 0; i < cs.segments.length; i++) {
          let target = cs.targetSegments[i];
          let current = cs.segments[i];
          // 0.3 factor provides smooth sliding without feeling laggy
          current.x += (target.x - current.x) * 0.3;
          current.y += (target.y - current.y) * 0.3;
        }
      }
    }

    // Dynamic auto-zoom based on snake size
    const me = clientSnakes.get(myId);
    let targetZoom = 2.0; // เริ่มต้นที่ 2x
    
    if (me && me.radius) {
      // 12 คือ BASE_RADIUS, ถ้างูใหญ่ขึ้นรัศมีจะเพิ่มทำให้ซูมลดลง
      targetZoom = 2.0 * (12 / Math.max(12, me.radius));
    }
    
    if (me && me.z > 0) {
      targetZoom *= 0.5; // ถ้ามีบัฟซูม จะถอยกล้องออกมาอีก
    }
    
    // คูณกับระดับซูมที่ผู้เล่นปรับเอง
    targetZoom *= userZoomMult;
    
    // ค่อยๆ เปลี่ยนระดับซูม (Lerp) เพื่อความนุ่มนวล
    zoom += (targetZoom - zoom) * 0.05;
    
    // จำกัดระดับซูม
    zoom = Math.max(0.25, Math.min(MAX_ZOOM * 2, zoom));
    renderer?.setZoom(zoom);
    zoomLevel.textContent = `${zoom.toFixed(1)}×`;

    // Render
    const snakesArr = Array.from(clientSnakes.values());
    renderer.render(snakesArr, food, myId);

    rafId = requestAnimationFrame(loop);
  }

  rafId = requestAnimationFrame(loop);
}

// ---- Leaderboard ----
function updateLeaderboard(lb) {
  lbList.innerHTML = '';
  const rankClass = ['gold', 'silver', 'bronze'];
  lb.forEach((entry, i) => {
    const li = document.createElement('li');
    li.className = `lb-item${entry.id === myId ? ' lb-me' : ''}`;
    li.dataset.id = entry.id;
    li.innerHTML = `
      <span class="lb-rank ${rankClass[i] || ''}">${i + 1}</span>
      <span class="lb-dot" style="color:${entry.color};background:${entry.color}"></span>
      <span class="lb-name">${escapeHtml(entry.name)}</span>
      <span class="lb-score">${entry.score}</span>
    `;
    lbList.appendChild(li);
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])
  );
}

// ---- UI Events ----
if (glowRange && glowValue) {
  glowRange.addEventListener('input', (e) => {
    glowValue.textContent = e.target.value;
  });
}

playBtn.addEventListener('click', () => {
  const name = nameInput.value.trim() || 'Player';
  const glowLevel = parseInt(glowRange?.value || '5', 10);
  
  renderer = new Renderer(canvas, minimapEl);
  renderer.glowMultiplier = glowLevel / 5.0; // ส่งระดับ 0.0 - 1.0 ไปให้ Renderer
  
  input    = new InputHandler();
  userZoomMult = 1.0;

  // Zoom via scroll (ปรับตัวคูณที่ผู้เล่นต้องการ)
  input.onZoom((delta) => {
    userZoomMult = Math.max(0.25, Math.min(3.0, userZoomMult + delta * ZOOM_STEP));
  });

  // Zoom via buttons
  zoomInBtn .addEventListener('click', () => userZoomMult = Math.min(3.0, userZoomMult + ZOOM_STEP));
  zoomOutBtn.addEventListener('click', () => userZoomMult = Math.max(0.25, userZoomMult - ZOOM_STEP));

  connect(name);
});

respawnBtn.addEventListener('click', () => {
  if (socket?.connected) {
    socket.emit('respawn');
    showScreen('game');
  }
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') playBtn.click();
});

// ---- Init ----
showScreen('start');
