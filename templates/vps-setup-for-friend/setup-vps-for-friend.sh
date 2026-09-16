#!/bin/bash
# ==============================================================================
# Script: setup-vps-for-friend.sh
# วัตถุประสงค์: เตรียมสภาพแวดล้อมบนเซิร์ฟเวอร์ VPS (IP: 157.254.192.71)
# สำหรับรองรับแอปพลิเคชัน dormloop-app (พอร์ต 3002) โดยแยกอิสระจาก FitMate 100%
# ==============================================================================

set -e

# สีสำหรับการแสดงผล
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================${NC}"
echo -e "${BLUE}      VPS Setup for DormLoop App (Port: 3002)         ${NC}"
echo -e "${BLUE}======================================================${NC}"

# 1. ตรวจสอบสิทธิ์ Root / Sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] กรุณารันสคริปต์นี้ด้วยสิทธิ์ root หรือ sudo เช่น:${NC}"
  echo -e "  sudo bash setup-vps-for-friend.sh yourdomain.com"
  exit 1
fi

# 2. รับค่าชื่อโดเมน
DOMAIN="$1"
if [ -z "$DOMAIN" ]; then
  echo -e "${YELLOW}[?] คุณยังไม่ได้ระบุชื่อโดเมนในคำสั่ง${NC}"
  read -p "กรุณากรอกชื่อโดเมนที่ต้องการใช้งาน (เช่น dormloop.example.com): " DOMAIN
fi

if [ -z "$DOMAIN" ]; then
  echo -e "${RED}[ERROR] ไม่พบชื่อโดเมน ยกเลิกการทำงาน${NC}"
  exit 1
fi

echo -e "${GREEN}[+] ใช้งานโดเมน: $DOMAIN${NC}"

# 3. สร้างโฟลเดอร์สำหรับวางงาน ~/friend-project
TARGET_USER="${SUDO_USER:-$USER}"
if [ "$TARGET_USER" = "root" ]; then
  USER_HOME="/root"
else
  USER_HOME="/home/$TARGET_USER"
fi

PROJECT_DIR="$USER_HOME/friend-project"
echo -e "${GREEN}[+] กำลังสร้างโฟลเดอร์โปรเจกต์ที่: $PROJECT_DIR${NC}"
mkdir -p "$PROJECT_DIR/data"

# กำหนดสิทธิ์ให้ user ปกติสามารถใช้งานได้
if [ "$TARGET_USER" != "root" ]; then
  chown -R "$TARGET_USER:$TARGET_USER" "$PROJECT_DIR"
fi

# 4. ตรวจสอบและสร้าง Swap Memory 2GB (กันแรมเต็มเวลารัน Docker หลายตัว)
echo -e "${GREEN}[+] กำลังตรวจสอบระบบ Swap Memory...${NC}"
SWAP_COUNT=$(swapon --show | wc -l)
if [ "$SWAP_COUNT" -le 1 ]; then
  echo -e "${YELLOW}[!] เซิร์ฟเวอร์ยังไม่มี Swap กำลังสร้าง Swap ขนาด 2GB...${NC}"
  if command -v fallocate &> /dev/null; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  else
    dd if=/dev/zero of=/swapfile bs=1M count=2048
  fi
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile

  # บันทึกลง /etc/fstab เพื่อให้บูตเครื่องแล้วยังใช้งาน Swap ได้
  if ! grep -q "/swapfile" /etc/fstab; then
    echo "/swapfile none swap sw 0 0" >> /etc/fstab
  fi
  echo -e "${GREEN}[✓] สร้างและเปิดใช้งาน Swap 2GB เรียบร้อยแล้ว${NC}"
else
  echo -e "${GREEN}[✓] ตรวจพบระบบ Swap อยู่แล้ว ข้ามขั้นตอนนี้${NC}"
fi

# 5. ตั้งค่า Nginx Reverse Proxy ให้ชี้ไปยังพอร์ต 3002 (แยกไฟล์เด็ดขาด ไม่ทับ FitMate)
echo -e "${GREEN}[+] กำลังสร้างไฟล์คอนฟิก Nginx สำหรับ $DOMAIN...${NC}"

NGINX_CONF_AVAILABLE="/etc/nginx/sites-available/dormloop-app.conf"
NGINX_CONF_ENABLED="/etc/nginx/sites-enabled/dormloop-app.conf"

# สร้างโฟลเดอร์ถ้ายังไม่มี
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

cat << EOF > "$NGINX_CONF_AVAILABLE"
# ==============================================================================
# Isolated Nginx configuration for dormloop-app ($DOMAIN)
# Forwarding to 127.0.0.1:3002 (FitMate is running on 3001)
# ==============================================================================
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;

        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# จัดการ Symlink ใน sites-enabled หรือ conf.d
if [ -d "/etc/nginx/sites-enabled" ]; then
  ln -sf "$NGINX_CONF_AVAILABLE" "$NGINX_CONF_ENABLED"
fi

# รองรับกรณีที่ Nginx ใช้ conf.d แทน sites-available
if [ -d "/etc/nginx/conf.d" ] && [ ! -d "/etc/nginx/sites-enabled" ]; then
  cp "$NGINX_CONF_AVAILABLE" "/etc/nginx/conf.d/dormloop-app.conf"
fi

# 6. ตรวจสอบ Syntax ของ Nginx ก่อน Reload (หัวใจสำคัญ: ป้องกัน FitMate สะดุด)
echo -e "${GREEN}[+] กำลังทดสอบความถูกต้องของ Nginx Configuration...${NC}"
if nginx -t; then
  echo -e "${GREEN}[✓] Nginx configuration ถูกต้อง กำลัง Reload Service...${NC}"
  systemctl reload nginx
  echo -e "${GREEN}[✓] Nginx Reload สำเร็จ! พร้อมรับการเชื่อมต่อไปยังพอร์ต 3002${NC}"
else
  echo -e "${RED}[ERROR] การทดสอบ Nginx ล้มเหลว! กำลังยกเลิกไฟล์คอนฟิกใหม่เพื่อความปลอดภัยของระบบเดิม...${NC}"
  rm -f "$NGINX_CONF_ENABLED"
  rm -f "/etc/nginx/conf.d/dormloop-app.conf"
  nginx -t && systemctl reload nginx
  echo -e "${RED}[!] ระบบเดิม (FitMate) ยังคงทำงานปกติ โปรดตรวจสอบข้อผิดพลาดข้างต้น${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}======================================================${NC}"
echo -e "${GREEN}    การตั้งค่า VPS สำหรับ DormLoop App สำเร็จแล้ว!     ${NC}"
echo -e "${BLUE}======================================================${NC}"
echo -e "รายละเอียดระบบ:"
echo -e "  - ที่ตั้งโปรเจกต์:   ${YELLOW}$PROJECT_DIR${NC}"
echo -e "  - โดเมน:            ${YELLOW}$DOMAIN${NC}"
echo -e "  - พอร์ต Reverse Proxy: ${YELLOW}127.0.0.1:3002${NC}"
echo ""
echo -e "${YELLOW}ขั้นตอนต่อไป:${NC}"
echo -e "1. ตรวจสอบว่าชี้ DNS A Record ของ $DOMAIN มาที่ 157.254.192.71 เรียบร้อยแล้ว"
echo -e "2. ติดตั้งใบรับรองความปลอดภัย SSL (HTTPS) ฟรีด้วยคำสั่ง:"
echo -e "   ${GREEN}sudo certbot --nginx -d $DOMAIN${NC}"
echo -e "======================================================"
