const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// โหลด .env
const serverEnvPath = path.join(__dirname, '..', '.env');
const rootEnvPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(serverEnvPath)) dotenv.config({ path: serverEnvPath });
if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath });

const serverDir = path.join(__dirname, '..');
const databaseUrl = process.env.DATABASE_URL || 'file:/app/server/prisma/data/dev.db';
process.env.DATABASE_URL = databaseUrl;

console.log('========================================================');
console.log('        DormLoop Database Initialization Script         ');
console.log('========================================================');
console.log(`[InitDB] Working Directory: ${serverDir}`);
console.log(`[InitDB] DATABASE_URL: ${databaseUrl}`);

// ดึงตำแหน่งโฟลเดอร์ของไฟล์ SQLite เพื่อสร้างโฟลเดอร์เตรียมไว้
if (databaseUrl.startsWith('file:')) {
  let dbFilePath = databaseUrl.replace(/^file:/, '');
  // หากเป็น Relative path ให้ resolve เทียบกับ serverDir หรือ schema.prisma
  if (!path.isAbsolute(dbFilePath)) {
    dbFilePath = path.resolve(serverDir, 'prisma', dbFilePath);
  }
  const dbDir = path.dirname(dbFilePath);
  if (!fs.existsSync(dbDir)) {
    console.log(`[InitDB] Creating database directory: ${dbDir}`);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // หากไฟล์ DB ยังไม่มี และมี dev.db ต้นฉบับอยู่ใน server/prisma/dev.db
  const seedTemplateDb = path.join(serverDir, 'prisma', 'dev.db');
  if (!fs.existsSync(dbFilePath) && fs.existsSync(seedTemplateDb) && seedTemplateDb !== dbFilePath) {
    try {
      console.log(`[InitDB] Copying initial database template from ${seedTemplateDb} to ${dbFilePath}...`);
      fs.copyFileSync(seedTemplateDb, dbFilePath);
      console.log('[InitDB] Initial database template copied successfully!');
    } catch (err) {
      console.warn(`[InitDB] Warning: Could not copy initial template: ${err.message}`);
    }
  }
}

// รัน Prisma Migrate Deploy เพื่อปรับ Schema ให้ล่าสุดเสมอ
console.log('[InitDB] Running prisma migrate deploy...');
try {
  execSync('npx prisma migrate deploy --schema prisma/schema.prisma', {
    cwd: serverDir,
    stdio: 'inherit',
    env: process.env
  });
  console.log('[InitDB] Migration deployed successfully.');
} catch (error) {
  console.error('[InitDB] Error during prisma migrate deploy:', error.message);
  process.exit(1);
}

// ตรวจสอบข้อมูลเริ่มต้นใน Database หากยังไม่มีข้อมูล ให้รัน seed.js
async function checkAndSeed() {
  const prisma = require('../db');
  try {
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();

    console.log(`[InitDB] Current counts -> Users: ${userCount}, Products: ${productCount}`);

    if (productCount === 0 || userCount === 0) {
      console.log('[InitDB] Database has no products or users. Running seed script...');
      execSync('node prisma/seed.js', {
        cwd: serverDir,
        stdio: 'inherit',
        env: process.env
      });
      console.log('[InitDB] Seed data populated successfully!');
    } else {
      console.log('[InitDB] Database already has data. Skipping seed.');
    }
  } catch (err) {
    console.error('[InitDB] Error checking/seeding database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndSeed().then(() => {
  console.log('[InitDB] Database initialization finished ready for Express.');
  console.log('========================================================');
});
