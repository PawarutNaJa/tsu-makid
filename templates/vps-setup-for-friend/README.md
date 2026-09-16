# VPS Deployment Guide for DormLoop App
> สำหรับติดตั้งบนเซิร์ฟเวอร์ VPS (IP: 157.254.192.71) ร่วมกับ FitMate อย่างปลอดภัย

---

## สรุปภาพรวมการแยกสิ่งแวดล้อม (Isolation)

- **พอร์ตของแอปบนเซิร์ฟเวอร์**: `127.0.0.1:3002` (FitMate รันบน `3001` แยกกันเด็ดขาด)
- **Container Name**: `dormloop-app` (FitMate คือ `fitmate-app`)
- **Base Image**: `node:20-bookworm-slim` พร้อม OpenSSL (หมดปัญหา Prisma Engine libc/openssl error บน Alpine)
- **โฟลเดอร์บน VPS**: `~/friend-project` (แยกโฟลเดอร์อิสระ)
- **Database Path**: `DATABASE_URL=file:/app/server/prisma/data/dev.db` (Full Path ตรงกับ Volume `./data` ชัดเจน 100%)
- **Nginx Configuration**: `/etc/nginx/sites-available/dormloop-app.conf` (ไม่แตะไฟล์คอนฟิกของ FitMate)

---

## 3 ไฟล์ที่อยู่ในโฟลเดอร์นี้

1. **`compose.yml`**
   - ไฟล์ Docker Compose สแตนด์อโลนสำหรับวางไว้ที่ `~/friend-project/compose.yml`
   - ผูกพอร์ต `127.0.0.1:3002:3000` และชื่อ container `dormloop-app`
   - กำหนด Persistent Volume สำหรับ SQLite Database ไว้ที่ `./data:/app/server/prisma/data`

2. **`friend-deploy.yml`**
   - เทมเพลต GitHub Actions CI/CD สำหรับนำไปวางใน Repo เพื่อนที่ `.github/workflows/deploy.yml`
   - ทำการ Build Image ขึ้น GitHub Container Registry (GHCR) และ SSH ไปรันคำสั่ง Docker Compose บน VPS แบบอัตโนมัติ

3. **`setup-vps-for-friend.sh`**
   - สคริปต์รันบนเซิร์ฟเวอร์ครั้งแรก ทำหน้าที่:
     1. สร้างโฟลเดอร์ `~/friend-project/data`
     2. เปิดใช้งาน Swap File 2GB (กันแรมเต็มเวลารันหลาย Docker พร้อมกัน)
     3. ติดตั้ง Nginx Reverse Proxy ชี้เข้า `http://127.0.0.1:3002`
     4. ตรวจสอบ Syntax ด้วย `nginx -t` ก่อน Reload ทุกครั้ง เพื่อรับประกันว่า FitMate จะไม่สะดุด

---

## วิธีใช้งานสคริปต์บน VPS (สำหรับเพื่อนเจ้าของเครื่อง หรือผู้ดูแล)

1. อัปโหลด `setup-vps-for-friend.sh` ขึ้นไปบน VPS หรือสร้างไฟล์บนเซิร์ฟเวอร์
2. รันคำสั่งพร้อมส่งชื่อโดเมนที่ต้องการ:
   ```bash
   sudo bash setup-vps-for-friend.sh yourdomain.com
   ```
3. ติดตั้ง SSL Certificate ฟรีด้วย Certbot:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

---

## วิธีตั้งค่า GitHub Actions CI/CD

ใน GitHub Repository ของโปรเจกต์ ไปที่ **Settings > Secrets and variables > Actions** และเพิ่ม Secrets ดังนี้:

- `VPS_HOST`: `157.254.192.71`
- `VPS_USERNAME`: บัญชีผู้ใช้บนเซิร์ฟเวอร์ (เช่น `root` หรือ `ubuntu`)
- `VPS_SSH_KEY`: Private Key (`id_ed25519`) ของคุณ
- `JWT_SECRET`: คีย์สุ่มสำหรับระบบล็อกอิน JWT
