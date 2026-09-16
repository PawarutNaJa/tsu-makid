# DormLoop

เว็บตลาดซื้อขายสินค้าสำหรับนักศึกษา ใช้ React และ Vite เป็น frontend และใช้ Express, Prisma และ SQLite เป็น backend

รายละเอียดภาพรวม การออกแบบ และการสะท้อนผลการเรียนรู้อยู่ใน [รายงานโครงงาน](REPORT.md)

## สิ่งที่ต้องมี

- Node.js 18 ขึ้นไป
- npm

## การติดตั้ง

เปิด PowerShell ที่โฟลเดอร์โปรเจกต์ แล้วรันคำสั่งต่อไปนี้:

```powershell
npm install
npm install --prefix server
Push-Location server
npx prisma generate --schema prisma/schema.prisma
npx prisma migrate deploy
Pop-Location
```

ไฟล์ `server/.env` ต้องมีค่าฐานข้อมูล เช่น:

```env
DATABASE_URL="file:./dev.db"
```

หากเป็นฐานข้อมูลใหม่และต้องการข้อมูลตัวอย่าง ให้รันคำสั่งนี้เพียงครั้งเดียว:

```powershell
npm --prefix server run prisma:seed
```

## การรันโปรเจกต์

รัน frontend และ backend พร้อมกันด้วยคำสั่งเดียว:

```powershell
npm run dev:all
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- API ผ่าน Vite proxy: `http://localhost:3000/api`

หรือรันแยกกัน:

เปิด PowerShell สองหน้าต่าง แล้วรันคำสั่งละหน้าต่าง:

```powershell
# หน้าต่างที่ 1
npm run dev:server
```

```powershell
# หน้าต่างที่ 2
npm run dev
```

อย่าปิดหน้าต่างที่รัน `npm run dev:server` ขณะใช้งานเว็บ เพราะ frontend จะส่งคำขอ `/api` ไปที่ backend พอร์ต 5000

## Deploy ด้วย Docker

บนเซิร์ฟเวอร์ที่ติดตั้ง Docker และ Docker Compose แล้ว ให้เตรียมค่า environment ก่อน:

```powershell
Copy-Item .env.example .env
notepad .env
```

เปลี่ยนค่า `JWT_SECRET` เป็นข้อความสุ่มที่ยาว และเปิดระบบด้วยคำสั่ง:

```powershell
docker compose up -d --build
```

ระบบจะให้บริการทั้งหน้าเว็บและ API ที่ `http://เซิร์ฟเวอร์:5000` และจะ migrate ฐานข้อมูลอัตโนมัติเมื่อ container เริ่มทำงาน ฐานข้อมูล SQLite จะถูกเก็บไว้ในโฟลเดอร์ `data/` บนเซิร์ฟเวอร์

ดู log หรือลงระบบใหม่:

```powershell
docker compose logs -f
docker compose down
```

## แก้ปัญหา 502 หรือ ECONNREFUSED

ข้อผิดพลาดนี้หมายความว่า Vite ติดต่อ backend ที่ `http://localhost:5000` ไม่ได้ ให้ทำตามขั้นตอนนี้:

```powershell
npm install --prefix server
Push-Location server
npx prisma generate --schema prisma/schema.prisma
Pop-Location
npm run dev:all
```

ตรวจสอบว่า backend ทำงานอยู่ด้วยคำสั่ง:

```powershell
Invoke-WebRequest http://localhost:5000/
```

ผลลัพธ์ที่ถูกต้องควรเป็น `API is running...` หากพอร์ต 3000 ถูกใช้งาน Vite อาจเลือกพอร์ต 3001 ให้เปิด URL ที่แสดงใน terminal แต่ backend ยังคงต้องทำงานที่พอร์ต 5000 เสมอ

## คำสั่งที่ใช้บ่อย

```powershell
npm run build    # ตรวจสอบและ build frontend สำหรับ production
npm run lint     # ตรวจสอบรูปแบบและข้อผิดพลาดเบื้องต้น
npm run preview  # preview ไฟล์ที่ build แล้ว
```

## โครงสร้างสำคัญ

- `src/pages/` หน้าหลักของระบบ เช่น ร้านค้า ตะกร้า เข้าสู่ระบบ และจัดการสินค้า
- `src/context/` state กลางของผู้ใช้ สินค้า ตะกร้า และภาษา
- `server/routes/` API สำหรับ authentication และ products
- `server/prisma/` schema, migration และ seed ของฐานข้อมูล
