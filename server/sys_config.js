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
  BOT_COUNT_TARGET: 12,
  // รายชื่อบอทแบบสุ่ม
  BOT_NAMES: [
    'งูดิน', 'น้องหนอน', 'งูเขียวหางบอบช้ำ', 'อสรพิษ', 'สเน็คสไลเดอร์',
    'เลื้อยสยอง', 'หนอนซิ่ง', 'ไส้เดือนติดปีก', 'ตัวตึง', 'เจ้าเวหา',
    'งูสายฟ้า', 'หนอนชาเขียว', 'งูหลาม', 'งูเหลือม', 'งูเห่า',
    'งูจงอาง', 'งูสิง', 'งูแมวเซา', 'งูทางมะพร้าว', 'งูปี่แก้ว',
    'งูเขียวพระอินทร์', 'งูดินลาย', 'หนอนผีเสื้อ', 'หนอนไหม', 'ไส้เดือนดิน',
    'พยาธิตัวตืด', 'พยาธิเส้นด้าย', 'มังกรโคโมโด', 'พญานาค', 'มังกรหยก',
    'ปลาไหล', 'ม้านิลมังกร', 'สุดสาคร', 'ผีเสื้อสมุทร', 'สินสมุทร',
    'พระอภัยมณี', 'หนุมาน', 'ทศกัณฐ์', 'พระราม', 'ไมยราพ',
    'สุครีพ', 'พาลี', 'สายันต์', 'ลุงตูบ', 'ลุงป้อม',
    'นักเลงคีย์บอร์ด', 'วัยรุ่นสร้างตัว', 'เด็กแว้น', 'สายหมอบ', 'นอนน้อยแต่นอนนะ',
    'หิวข้าว', 'ข้าวมันไก่', 'หมูกรอบ', 'กะเพราไก่ไข่ดาว', 'ShadowSerpent',
    'NeonViper', 'CyberCoil', 'GlitchWorm', 'PixelPython', 'VoidCrawler',
    'StarSlither', 'NightAdder', 'PlasmaWorm', 'PhantomBoa', 'MechaCobra',
    'ToxicMamba', 'AlphaSnake', 'OmegaWorm', 'TurboCrawler', 'VenomStrike',
    'GoldenPython', 'SilverAdder', 'DarkBoa', 'LightSerpent', 'IceWorm',
    'FireCobra', 'WindSlither', 'EarthViper', 'GhostWorm', 'NinjaSnake',
    'SamuraiWorm', 'PirateSerpent', 'RobotSnake', 'CyborgWorm', 'AlienAnaconda',
    'ZombiePython', 'DragonWorm', 'DemonSnake', 'AngelSerpent', 'GodOfWorms',
    'KingCobra', 'QueenViper', 'PrinceAnaconda', 'PrincessPython', 'MasterSnake',
    'ProWorm', 'NoobCrawler', 'EpicSlither', 'LegendaryBoa', 'MythicAdder',
    'UltraSerpent', 'MegaWorm', 'GigaPython', 'TeraCobra', 'งูสีแดง',
    'งูไฟลุก', 'งูสายซิ่ง', 'งูมหาภัย', 'งูเทพ', 'งูสุดโหด',
    'งูมืดมิด', 'งูสยอง', 'งูสายหมอบ', 'งูซ่า', 'งูบินได้',
    'งูมหากาฬ', 'งูในตำนาน', 'งูผู้กล้า', 'งูสุดหล่อ', 'งูสายฮา',
    'งูซ่อนแอบ', 'งูจอมมาร', 'งูไร้พ่าย', 'งูยอดนักสู้', 'งูตัวตึง',
    'งูปากดี', 'งูใจเกเร', 'งูสุดปัง', 'งูชาเขียว', 'งูชานม',
    'หนอนสีแดง', 'หนอนไฟลุก', 'หนอนสายซิ่ง', 'หนอนมหาภัย', 'หนอนเทพ',
    'หนอนสุดโหด', 'หนอนมืดมิด', 'หนอนสยอง', 'หนอนสายหมอบ', 'หนอนซ่า',
    'หนอนบินได้', 'หนอนมหากาฬ', 'หนอนในตำนาน', 'หนอนผู้กล้า', 'หนอนสุดหล่อ',
    'หนอนสายฮา', 'หนอนซ่อนแอบ', 'หนอนจอมมาร', 'หนอนไร้พ่าย', 'หนอนยอดนักสู้',
    'หนอนตัวตึง', 'หนอนปากดี', 'หนอนใจเกเร', 'หนอนสุดปัง', 'หนอนชานม',
    'พญานาคสีแดง', 'พญานาคไฟลุก', 'พญานาคสายซิ่ง', 'พญานาคมหาภัย', 'พญานาคเทพ',
    'พญานาคสุดโหด', 'พญานาคมืดมิด', 'พญานาคสยอง', 'พญานาคสายหมอบ', 'พญานาคซ่า',
    'พญานาคบินได้', 'พญานาคมหากาฬ', 'พญานาคในตำนาน', 'พญานาคผู้กล้า', 'พญานาคสุดหล่อ',
    'พญานาคสายฮา', 'พญานาคซ่อนแอบ', 'พญานาคจอมมาร', 'พญานาคไร้พ่าย', 'พญานาคยอดนักสู้',
    'พญานาคตัวตึง', 'พญานาคปากดี', 'พญานาคใจเกเร', 'พญานาคสุดปัง', 'พญานาคชาเขียว',
    'พญานาคชานม', 'มังกรสีแดง', 'มังกรไฟลุก', 'มังกรสายซิ่ง', 'มังกรมหาภัย',
    'มังกรเทพ', 'มังกรสุดโหด', 'มังกรมืดมิด', 'มังกรสยอง', 'มังกรสายหมอบ',
    'มังกรซ่า', 'มังกรบินได้', 'มังกรมหากาฬ', 'มังกรในตำนาน', 'มังกรผู้กล้า',
    'มังกรสุดหล่อ', 'มังกรสายฮา', 'มังกรซ่อนแอบ', 'มังกรจอมมาร', 'มังกรไร้พ่าย',
    'มังกรยอดนักสู้', 'มังกรตัวตึง', 'มังกรปากดี', 'มังกรใจเกเร', 'มังกรสุดปัง',
    'มังกรชาเขียว', 'มังกรชานม', 'ไส้เดือนสีแดง', 'ไส้เดือนไฟลุก', 'ไส้เดือนสายซิ่ง',
    'ไส้เดือนมหาภัย', 'ไส้เดือนเทพ', 'ไส้เดือนสุดโหด', 'ไส้เดือนมืดมิด', 'ไส้เดือนสยอง',
    'ไส้เดือนสายหมอบ', 'ไส้เดือนซ่า', 'ไส้เดือนบินได้', 'ไส้เดือนมหากาฬ', 'ไส้เดือนในตำนาน',
    'ไส้เดือนผู้กล้า', 'ไส้เดือนสุดหล่อ', 'ไส้เดือนสายฮา', 'ไส้เดือนซ่อนแอบ', 'ไส้เดือนจอมมาร',
    'ไส้เดือนไร้พ่าย', 'ไส้เดือนยอดนักสู้', 'ไส้เดือนตัวตึง', 'ไส้เดือนปากดี', 'ไส้เดือนใจเกเร',
    'ไส้เดือนสุดปัง', 'ไส้เดือนชาเขียว', 'ไส้เดือนชานม', 'ปลาไหลสีแดง', 'ปลาไหลไฟลุก',
    'ปลาไหลสายซิ่ง', 'ปลาไหลมหาภัย', 'ปลาไหลเทพ', 'ปลาไหลสุดโหด', 'ปลาไหลมืดมิด',
    'ปลาไหลสยอง', 'ปลาไหลสายหมอบ', 'ปลาไหลซ่า', 'ปลาไหลบินได้', 'ปลาไหลมหากาฬ',
    'ปลาไหลในตำนาน', 'ปลาไหลผู้กล้า', 'ปลาไหลสุดหล่อ', 'ปลาไหลสายฮา', 'ปลาไหลซ่อนแอบ',
    'DarkSnake', 'DarkViper', 'DarkCobra', 'DarkPython', 'DarkWorm',
    'DarkSerpent', 'DarkAdder', 'DarkAnaconda', 'DarkCrawler', 'DarkDragon',
    'DarkLizard', 'DarkMonster', 'DarkBeast', 'DarkTitan', 'DarkGiant',
    'DarkPhantom', 'DarkShadow', 'DarkNinja', 'DarkSamurai', 'DarkPirate',
    'DarkKnight', 'DarkKing', 'DarkQueen', 'DarkLord', 'DarkMaster',
    'LightSnake', 'LightViper', 'LightCobra', 'LightPython', 'LightWorm',
    'LightAdder', 'LightBoa', 'LightAnaconda', 'LightCrawler', 'LightDragon',
    'LightLizard', 'LightMonster', 'LightBeast', 'LightTitan', 'LightGiant',
    'LightPhantom', 'LightShadow', 'LightNinja', 'LightSamurai', 'LightPirate',
    'LightKnight', 'LightKing', 'LightQueen', 'LightLord', 'LightMaster',
    'FireSnake', 'FireViper', 'FirePython', 'FireWorm', 'FireSerpent',
    'FireAdder', 'FireBoa', 'FireAnaconda', 'FireCrawler', 'FireDragon',
    'FireLizard', 'FireMonster', 'FireBeast', 'FireTitan', 'FireGiant',
    'FirePhantom', 'FireShadow', 'FireNinja', 'FireSamurai', 'FirePirate',
    'FireKnight', 'FireKing', 'FireQueen', 'FireLord', 'FireMaster',
    'IceSnake', 'IceViper', 'IceCobra', 'IcePython', 'IceSerpent',
    'IceAdder', 'IceBoa', 'IceAnaconda', 'IceCrawler', 'IceDragon',
    'IceLizard', 'IceMonster', 'IceBeast', 'IceTitan', 'IceGiant',
    'IcePhantom', 'IceShadow', 'IceNinja', 'IceSamurai', 'IcePirate',
    'IceKnight', 'IceKing', 'IceQueen', 'IceLord', 'IceMaster',
    'VenomSnake', 'VenomViper', 'VenomCobra', 'VenomPython', 'VenomWorm',
    'VenomSerpent', 'VenomAdder', 'VenomBoa', 'VenomAnaconda', 'VenomCrawler',
    'VenomDragon', 'VenomLizard', 'VenomMonster', 'VenomBeast', 'VenomTitan',
    'VenomGiant', 'VenomPhantom', 'VenomShadow', 'VenomNinja', 'VenomSamurai',
    'VenomPirate', 'VenomKnight', 'VenomKing', 'VenomQueen', 'VenomLord',
    'VenomMaster', 'CyberSnake', 'CyberViper', 'CyberCobra', 'CyberPython',
    'CyberWorm', 'CyberSerpent', 'CyberAdder', 'CyberBoa', 'CyberAnaconda',
    'CyberCrawler', 'CyberDragon', 'CyberLizard', 'CyberMonster', 'CyberBeast',
    'CyberTitan', 'CyberGiant', 'CyberPhantom', 'CyberShadow', 'CyberNinja',
    'CyberSamurai', 'CyberPirate', 'CyberKnight', 'CyberKing', 'CyberQueen',
    'CyberLord', 'CyberMaster', 'ToxicSnake', 'ToxicViper', 'ToxicCobra',
    'ToxicPython', 'ToxicWorm', 'ToxicSerpent', 'ToxicAdder', 'ToxicBoa',
    'ToxicAnaconda', 'ToxicCrawler', 'ToxicDragon', 'ToxicLizard', 'ToxicMonster',
    'ToxicBeast', 'ToxicTitan', 'ToxicGiant', 'ToxicPhantom', 'ToxicShadow',
    'ToxicNinja', 'ToxicSamurai', 'ToxicPirate', 'ToxicKnight', 'ToxicKing',
    'ToxicQueen', 'ToxicLord', 'ToxicMaster', 'GhostSnake', 'GhostViper',
    'GhostCobra', 'GhostPython', 'GhostSerpent', 'GhostAdder', 'GhostBoa',
    'GhostAnaconda', 'GhostCrawler', 'GhostDragon', 'GhostLizard', 'GhostMonster',
    'GhostBeast', 'GhostTitan', 'GhostGiant', 'GhostPhantom', 'GhostShadow',
    'GhostNinja', 'GhostSamurai', 'GhostPirate', 'GhostKnight', 'GhostKing',
    'GhostQueen', 'GhostLord', 'GhostMaster', 'GoldenSnake', 'GoldenViper',
    'GoldenCobra', 'GoldenWorm', 'GoldenSerpent', 'GoldenAdder', 'GoldenBoa',
    'GoldenAnaconda', 'GoldenCrawler', 'GoldenDragon', 'GoldenLizard', 'GoldenMonster',
    'GoldenBeast', 'GoldenTitan', 'GoldenGiant', 'GoldenPhantom', 'GoldenShadow',
    'GoldenNinja', 'GoldenSamurai', 'GoldenPirate', 'GoldenKnight', 'GoldenKing',
    'GoldenQueen', 'GoldenLord', 'GoldenMaster', 'SilverSnake', 'SilverViper',
    'SilverCobra', 'SilverPython', 'SilverWorm', 'SilverSerpent', 'SilverBoa',
    'SilverAnaconda', 'SilverCrawler', 'SilverDragon', 'SilverLizard', 'SilverMonster',
    'SilverBeast', 'SilverTitan', 'SilverGiant', 'SilverPhantom', 'SilverShadow',
    'SilverNinja', 'SilverSamurai', 'SilverPirate', 'SilverKnight', 'SilverKing'

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
  // ไอเทมวิ่งเร็วพิเศษ (ความเร็วเพิ่มขึ้น)
  ITEM_DURATION_SPEED: 20,
  SPEED_EXTRA_MULTIPLIER: 10,
  // จำนวนคะแนนที่ได้รับจากก้อนพลังพิเศษ
  SPECIAL_ITEM_MASS_VALUE: 200,

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
