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

// ---- State ----
let socket   = null;
let renderer = null;
let input    = null;
let myId     = null;
let alive    = false;
let clientSnakes = new Map(); // Smooth interpolated snakes
let food     = [];
let score    = 0;
let zoom     = 1.0;
let boostEnergy = 1.0; // 0..1
const BOOST_DRAIN = 0.008;
const BOOST_REGEN = 0.003;
let rafId    = null;

// ---- Zoom helpers ----
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;

function setZoom(z) {
  zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
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
        cs.radius = s.radius;
        cs.boosting = s.boosting;
        cs.score = s.score;
        cs.angle = s.angle;
        cs.name = s.name;
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
playBtn.addEventListener('click', () => {
  const name = nameInput.value.trim() || 'Player';
  renderer = new Renderer(canvas, minimapEl);
  input    = new InputHandler();
  setZoom(1.0);

  // Zoom via scroll
  input.onZoom((delta) => setZoom(zoom + delta * ZOOM_STEP));

  // Zoom via buttons
  zoomInBtn .addEventListener('click', () => setZoom(zoom + ZOOM_STEP));
  zoomOutBtn.addEventListener('click', () => setZoom(zoom - ZOOM_STEP));

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
