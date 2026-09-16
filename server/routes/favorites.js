const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_dormmart_key';

const authenticate = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนจัดการรายการโปรด' });

  try {
    req.user = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  }
};

// GET /api/favorites - ดึงรายการโปรดทั้งหมดของผู้ใช้จาก Database
router.get('/', authenticate, async (req, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.userId },
      include: {
        product: {
          include: {
            seller: {
              select: { id: true, name: true, phone: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // ส่งคืนรายการสินค้าพร้อม favoriteId
    const items = favorites.map(fav => ({
      ...fav.product,
      favoriteId: fav.id,
      favoritedAt: fav.createdAt
    }));

    res.json(items);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'ไม่สามารถโหลดรายการโปรดได้' });
  }
});

// GET /api/favorites/ids - ดึงเฉพาะ Product IDs ที่ผู้ใช้บันทึกไว้ (สำหรับปุ่มหัวใจในหน้าสินค้า)
router.get('/ids', authenticate, async (req, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.userId },
      select: { productId: true }
    });

    res.json(favorites.map(f => f.productId));
  } catch (error) {
    console.error('Error fetching favorite ids:', error);
    res.status(500).json({ error: 'ไม่สามารถตรวจสอบรายการโปรดได้' });
  }
});

// POST /api/favorites/toggle - สลับสถานะเพิ่ม/ลบรายการโปรด
router.post('/toggle', authenticate, async (req, res) => {
  const productId = Number(req.body.productId);
  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: 'รหัสสินค้าไม่ถูกต้อง' });
  }

  try {
    // Check product exists
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: 'ไม่พบสินค้านี้ในระบบ' });
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: req.user.userId,
          productId
        }
      }
    });

    if (existing) {
      // Remove from favorites
      await prisma.favorite.delete({
        where: { id: existing.id }
      });
      return res.json({
        favorited: false,
        productId,
        message: 'นำออกจากรายการโปรดแล้ว'
      });
    } else {
      // Add to favorites
      await prisma.favorite.create({
        data: {
          userId: req.user.userId,
          productId
        }
      });
      return res.json({
        favorited: true,
        productId,
        message: 'เพิ่มลงในรายการโปรดเรียบร้อยแล้ว'
      });
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'ไม่สามารถบันทึกรายการโปรดได้' });
  }
});

// DELETE /api/favorites/:productId - นำออกจากรายการโปรดโดยตรง
router.delete('/:productId', authenticate, async (req, res) => {
  const productId = Number(req.params.productId);

  try {
    await prisma.favorite.deleteMany({
      where: {
        userId: req.user.userId,
        productId
      }
    });

    res.json({ message: 'นำออกจากรายการโปรดแล้ว', productId });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'ไม่สามารถลบออกจากรายการโปรดได้' });
  }
});

module.exports = router;
