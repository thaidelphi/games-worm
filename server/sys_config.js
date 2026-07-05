/**
 * ========================================================
 * SYSTEM CONFIGURATION (sys_config.js)
 * ========================================================
 * TH: ไฟล์นี้คือศูนย์รวมตัวแปรและการตั้งค่าทั้งหมดของเกม (Config)
 * ทั้งฝั่งเซิร์ฟเวอร์ (Node.js) และฝั่งไคลเอนต์ (Browser) จะดึงค่าจากไฟล์นี้ไปใช้
 * หากต้องการปรับสมดุลเกม (Balance) หรือแก้ขนาดแผนที่ ให้แก้ที่นี่ที่เดียว
 *
 * EN: Central configuration file for all game mechanics.
 * Both the Node.js server and Browser client read from this file.
 * Tweak balances, map sizes, and speeds here.
 */

const SysConfig = {
  // ==================== WORLD SETTINGS ====================
  // WORLD_SHAPE: รูปร่างของแผนที่ ('rectangle' หรือ 'circle')
  WORLD_SHAPE: 'circle',
  // ขนาดความกว้าง-ยาว ของแผนที่
  WORLD_WIDTH: 5000,
  WORLD_HEIGHT: 5000,
  // อัตราการอัปเดตของเซิร์ฟเวอร์ต่อวินาที (Ticks Per Second)
  TICK_RATE: 20,

  // ==================== SNAKE SETTINGS ====================
  // ความเร็วปกติของงู (พิกเซลต่อ Tick)
  BASE_SPEED: 6.0,
  // ความเร็วเมื่อกดวิ่งเร่ง (พิกเซลต่อ Tick)
  BOOST_SPEED: 12.0,
  // ความยาวเริ่มต้นของงูตอนเกิด
  INITIAL_LENGTH: 15,
  // ระยะห่างระหว่างแต่ละข้อต่อ
  SEGMENT_DISTANCE: 12,
  // BASE_RADIUS: ความอ้วนเริ่มต้นของหัวและตัวงู
  BASE_RADIUS: 12,
  // MAX_RADIUS: ความอ้วนสูงสุดที่งูสามารถเติบโตได้
  MAX_RADIUS: 35,
  // BORDER_DAMAGE_PERCENT_PER_SEC: เปอร์เซ็นต์ของคะแนนที่ลดลงต่อวินาทีเมื่อเอาหัวชนขอบแผนที่
  BORDER_DAMAGE_PERCENT_PER_SEC: 20,

  // ==================== FOOD SETTINGS ====================
  // จำนวนอาหารบนแผนที่ที่ระบบจะพยายามรักษาไว้
  FOOD_COUNT_TARGET: 600,
  // รัศมีอาหารเล็กสุด-ใหญ่สุด
  FOOD_RADIUS_MIN: 4,
  FOOD_RADIUS_MAX: 9,
  // เวลา (วินาที) ที่ซากอาหารจากงูที่ตายจะยังคงอยู่ ก่อนจะสลายหายไป
  CORPSE_FOOD_LIFESPAN_SEC: 25,

  // ==================== BOT SETTINGS ====================
  // จำนวนบอทเป้าหมายในเซิร์ฟเวอร์ที่จะรักษาไว้
  BOT_COUNT_TARGET: 8,
  // รายชื่อบอทแบบสุ่ม
  BOT_NAMES: [
    'ShadowSerpent', 'NeonViper', 'CyberCoil', 'GlitchWorm', 'PixelPython', 'VoidCrawler', 'StarSlither', 'NightAdder',
    'PlasmaWorm', 'PhantomBoa', 'MechaCobra', 'ToxicMamba', 'AlphaSnake', 'OmegaWorm', 'TurboCrawler', 'VenomStrike',
    'GoldenPython', 'SilverAdder', 'DarkBoa', 'LightSerpent', 'IceWorm', 'FireCobra', 'WindSlither', 'EarthViper',
    'GhostWorm', 'NinjaSnake', 'SamuraiWorm', 'PirateSerpent', 'RobotSnake', 'CyborgWorm', 'AlienAnaconda', 'ZombiePython',
    'DragonWorm', 'DemonSnake', 'AngelSerpent', 'GodOfWorms', 'KingCobra', 'QueenViper', 'PrinceAnaconda', 'PrincessPython',
    'MasterSnake', 'ProWorm', 'NoobCrawler', 'EpicSlither', 'LegendaryBoa', 'MythicAdder', 'UltraSerpent', 'MegaWorm',
    'GigaPython', 'TeraCobra',
    'งูดิน', 'น้องหนอน', 'งูเขียวหางบอบช้ำ', 'อสรพิษ', 'สเน็คสไลเดอร์', 'เลื้อยสยอง', 'หนอนซิ่ง', 'ไส้เดือนติดปีก',
    'ตัวตึง', 'เจ้าเวหา', 'งูสายฟ้า', 'หนอนชาเขียว', 'งูหลาม', 'งูเหลือม', 'งูเห่า', 'งูจงอาง', 'งูสิง',
    'งูแมวเซา', 'งูทางมะพร้าว', 'งูปี่แก้ว', 'งูเขียวพระอินทร์', 'งูดินลาย', 'หนอนผีเสื้อ', 'หนอนไหม', 'ไส้เดือนดิน', 'พยาธิตัวตืด',
    'พยาธิเส้นด้าย', 'มังกรโคโมโด', 'พญานาค', 'มังกรหยก', 'ปลาไหล', 'ม้านิลมังกร', 'สุดสาคร', 'ผีเสื้อสมุทร', 'สินสมุทร',
    'พระอภัยมณี', 'หนุมาน', 'ทศกัณฐ์', 'พระราม', 'ไมยราพ', 'สุครีพ', 'พาลี', 'สายันต์', 'ลุงตูบ', 'ลุงป้อม',
    'นักเลงคีย์บอร์ด', 'วัยรุ่นสร้างตัว', 'เด็กแว้น', 'สายหมอบ', 'นอนน้อยแต่นอนนะ', 'หิวข้าว', 'ข้าวมันไก่', 'หมูกรอบ', 'กะเพราไก่ไข่ดาว'
  ],

  // ==================== SPECIAL ITEMS ====================
  // เปิด/ปิด การดรอปไอเทมพิเศษ
  ENABLE_SPECIAL_ITEMS: true,
  // โอกาสดรอปไอเทมพิเศษ (เช่น 0.05 = 5% เวลาสุ่มเกิดอาหาร)
  SPECIAL_ITEM_DROP_CHANCE: 0.05,

  // ระยะเวลาของไอเทมคูณคะแนนแต่ละชนิด (วินาที)
  ITEM_DURATION_X2: 30,
  ITEM_DURATION_X3: 20,
  ITEM_DURATION_X5: 10,
  // ระยะเวลาของไอเทมซูมหน้าจอ (วินาที)
  ITEM_DURATION_ZOOM: 30,
  // จำนวนคะแนนที่ได้รับจากก้อนพลังพิเศษ
  SPECIAL_ITEM_MASS_VALUE: 500,

  // ==================== CLIENT (UI) SETTINGS ====================
  // อัตราการลดพลังงานเมื่อกดวิ่งเร็ว
  BOOST_DRAIN: 0.008,
  // อัตราฟื้นฟูพลังงานเมื่อไม่ได้วิ่ง
  BOOST_REGEN: 0.003,
  // ขีดจำกัดการซูมเข้า/ซูมออก
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 2.0,
  // อัตราการปรับระยะซูมต่อการสครอลเมาส์
  ZOOM_STEP: 0.1,
};

// ========================================================
// Universal Module Definition (UMD)
// ทำให้ไฟล์นี้โหลดใช้งานได้ทั้งใน Node.js (require) และ Browser (script tag)
// ========================================================
if (typeof module !== 'undefined' && module.exports) {
  // ฝั่ง Node.js Server
  module.exports = SysConfig;
} else if (typeof window !== 'undefined') {
  // ฝั่ง Browser Client
  window.SysConfig = SysConfig;
}
