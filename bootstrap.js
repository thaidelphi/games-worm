// ==================== Auto Bootstrap Script ====================
// ไฟล์นี้เป็นสคริปต์ตัวช่วย (Helper) ที่จะเช็คและติดตั้งไลบรารีที่จำเป็นผ่าน npm อัตโนมัติ
// โดยไม่ต้องให้ผู้เล่นหรือแอดมินพิมพ์คำสั่ง npm install เอง
// พอติดตั้งเสร็จ มันจะสั่งรันตัวเซิร์ฟเวอร์หลัก (server/server.js) ขึ้นมาทันที
'use strict';

// Bootstrap: Download npm if missing and install dependencies
const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const zlib  = require('zlib');
const cp    = require('child_process');

const NODE  = process.execPath;
const CWD   = path.join(__dirname, 'server');
const NPM_PACKAGE = 'https://registry.npmjs.org/npm/-/npm-10.9.2.tgz';
const NPM_DIR = path.join(__dirname, '.npm-bootstrap');
const NPM_CLI = path.join(NPM_DIR, 'package', 'bin', 'npm-cli.js');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = url.startsWith('https') ? https : http;
    get.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => { fs.unlink(dest, () => {}); reject(err); });
  });
}

function extract(tgzPath, destDir) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    // Use Windows built-in bsdtar (works on local drives)
    const winTar = 'C:\\Windows\\System32\\tar.exe';
    // Copy tgz to temp local path to avoid Z: drive issues with tar
    const tmpTgz = 'C:\\Users\\tewan\\.cache\\slither-npm.tgz';
    const tmpDest = 'C:\\Users\\tewan\\.cache\\slither-npm-extract';
    fs.copyFileSync(tgzPath, tmpTgz);
    if (!fs.existsSync(tmpDest)) fs.mkdirSync(tmpDest, { recursive: true });
    const proc = cp.spawn(winTar, ['-xzf', tmpTgz, '-C', tmpDest], { stdio: 'inherit' });
    proc.on('close', code => {
      if (code !== 0) { reject(new Error('tar failed: ' + code)); return; }
      // Copy extracted files to destDir
      const extracted = path.join(tmpDest, 'package');
      if (fs.existsSync(extracted)) {
        // Copy package dir to destDir/package
        cp.spawnSync('robocopy', [extracted, path.join(destDir, 'package'), '/E', '/NFL', '/NDL', '/NJH', '/NJS'], { stdio: 'inherit' });
      }
      // Cleanup
      try { fs.unlinkSync(tmpTgz); } catch(_) {}
      resolve();
    });
  });
}

async function run() {
  // Check if npm-cli already extracted
  if (!fs.existsSync(NPM_CLI)) {
    console.log('[bootstrap] Downloading npm...');
    const tgz = path.join(__dirname, '_npm.tgz');
    await download(NPM_PACKAGE, tgz);
    console.log('[bootstrap] Extracting npm...');
    await extract(tgz, NPM_DIR);
    fs.unlinkSync(tgz);
    console.log('[bootstrap] npm ready:', NPM_CLI);
  } else {
    console.log('[bootstrap] npm already available');
  }

  // Run npm install
  console.log('[bootstrap] Running npm install in', CWD);
  const result = cp.spawnSync(NODE, [NPM_CLI, 'install'], {
    cwd: CWD,
    stdio: 'inherit',
    env: { ...process.env, npm_config_cache: path.join(__dirname, '.npm-cache') }
  });

  if (result.status !== 0) {
    console.error('[bootstrap] npm install failed with code', result.status);
    process.exit(1);
  }

  console.log('\n✅ Dependencies installed! Starting server...\n');

  // Start server
  cp.spawn(NODE, [path.join(CWD, 'server.js')], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '3000' }
  });
}

run().catch(e => { console.error(e); process.exit(1); });
