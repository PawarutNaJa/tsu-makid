const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// โหลด .env จากทั้ง server/.env และ root .env ตามลำดับ
const serverEnvPath = path.join(__dirname, '.env');
const rootEnvPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

// กำหนด Fallback DATABASE_URL หากใน environment ยังไม่ได้กำหนด
if (!process.env.DATABASE_URL) {
  const defaultDbPath = path.join(__dirname, 'prisma', 'dev.db');
  process.env.DATABASE_URL = `file:${defaultDbPath}`;
  console.log(`[DB] DATABASE_URL not explicitly set, defaulting to: ${process.env.DATABASE_URL}`);
}

const { PrismaClient } = require('@prisma/client');

// สร้าง PrismaClient แบบ Singleton เพื่อลดภาระ Connection และรองรับการทำงานทุกสภาพแวดล้อม
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

module.exports = prisma;
