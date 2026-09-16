FROM node:20-bookworm-slim AS build

WORKDIR /app

# ติดตั้ง OpenSSL สำหรับ Prisma CLI ในการ Generate Client
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY server/package*.json ./server/
RUN npm ci
RUN npm ci --prefix server

COPY . .
RUN npm run build
RUN npx prisma generate --schema server/prisma/schema.prisma

FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# ติดตั้ง OpenSSL สำหรับ Prisma Engine ตอนรัน Production (แก้ปัญหา libc / openssl not found)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server

RUN mkdir -p /app/server/prisma/data
EXPOSE 3000

WORKDIR /app/server
CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/schema.prisma && node index.js"]