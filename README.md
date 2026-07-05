# 🐍 Slither Arena

เกม multiplayer แนว Slither.io — งูกินอาหาร โต ชนคู่แข่ง!

## วิธีรันเกม

### ต้องการ: Node.js

```powershell
# รันด้วย bootstrap (ติดตั้ง dependencies อัตโนมัติ)
$node = "C:\Users\tewan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
& $node bootstrap.js

# หรือถ้ามี npm แล้ว
cd server
npm install
npm start
```

เปิดเบราเซอร์ไปที่ → **http://localhost:3000**

---

## โครงสร้างโปรเจค

```
slither/
├── bootstrap.js        ← ติดตั้ง + รันเซิร์ฟเวอร์อัตโนมัติ
├── server/
│   ├── server.js       ← Express + Socket.IO
│   └── game/
│       ├── GameState.js← Game loop, collision detection
│       ├── Snake.js    ← Snake entity
│       ├── Food.js     ← Food spawning
│       └── Bot.js      ← AI bot behavior
└── client/
    ├── index.html      ← Game UI
    ├── style.css       ← Dark neon theme
    └── js/
        ├── main.js     ← Socket events, game loop
        ├── Renderer.js ← Canvas rendering engine
        └── InputHandler.js ← Mouse/touch/scroll
```

## วิธีเล่น

| ปุ่ม | การกระทำ |
|---|---|
| Mouse Move | บังคับทิศทางงู |
| Left Click (hold) | Boost เร่งความเร็ว (งูจะหดลงเล็กน้อย) |
| Scroll Wheel | ซูมเข้า/ออก |
| Touch (1 นิ้ว) | บังคับทิศทาง |
| Touch (2 นิ้ว) | Boost |

## Features

- 🌐 **Multiplayer** real-time ผ่าน WebSocket
- 🤖 **AI Bots** 8 ตัว เติมห้องอัตโนมัติ
- 🏆 **Leaderboard** อัพเดท real-time
- 🗺️ **Minimap** แสดงตำแหน่งผู้เล่นทั้งหมด
- ⚡ **Boost** ระบบพลังงาน (กด คลิก)
- 💥 **Death drops** งูตายแล้ว body กลาย food
- ✨ **Particle effects** กิน food และตาย
- 🔍 **Zoom** scroll wheel ปรับได้ 0.5x–2.0x
- 🎨 **Neon glow** dark space theme

## Tech Stack

- **Server**: Node.js + Express + Socket.IO (20 TPS)
- **Client**: HTML5 Canvas + Vanilla JS (ES Modules)
- **Style**: Vanilla CSS, Google Fonts (Outfit)
