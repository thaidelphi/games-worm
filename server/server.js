// ==================== Express + Socket.IO Server ====================
// TH: ไฟล์นี้คือจุดเริ่มต้นของเซิร์ฟเวอร์ (Entry point) 
// ทำหน้าที่รัน Web Server ด้วย Express และจัดการ WebSocket ด้วย Socket.IO
// เพื่อรับส่งข้อมูลแบบ Real-time ระหว่างผู้เล่นและ Game State
// EN: This file is the entry point of the server.
// It runs the Web Server using Express and handles WebSockets via Socket.IO
// to transmit real-time data between players and the Game State.
'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { GameState } = require('./game/GameState');

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 2000,
  pingTimeout: 5000,
});

// Serve static client files
app.use(express.static(path.join(__dirname, '..', 'client')));

// Expose configuration file to the client
app.get('/sys_config.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'sys_config.js'));
});

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// ---- Game ----
const game = new GameState(io);
game.start();

// ---- Socket Events ----
io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // Client sends their chosen name to join
  socket.on('join', (data) => {
    const name = (data?.name || 'Player').toString().slice(0, 20).trim() || 'Player';
    const snake = game.addPlayer(socket.id, name);
    socket.emit('joined', {
      myId: socket.id,
      snake: snake.toJSON(),
      ...game.getInitState(),
    });
  });

  // Client sends steering input
  socket.on('input', (data) => {
    if (typeof data?.angle === 'number') {
      game.setPlayerInput(socket.id, data.angle, data.boost === true);
    }
  });

  // Client requests respawn after death
  socket.on('respawn', () => {
    const snake = game.respawnPlayer(socket.id);
    if (snake) {
      socket.emit('respawned', { snake: snake.toJSON(), ...game.getInitState() });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
    game.removePlayer(socket.id);
  });
});

const os = require('os');
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🐍 TEWAN.WORM Server is running!\n`);
  console.log(`- Local:   http://localhost:${PORT}`);
  console.log(`- Network: http://${getLocalIp()}:${PORT}\n`);
});
