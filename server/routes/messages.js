const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = 'supersecret_dormmart_key';

const authenticate = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนส่งข้อความ' });

  try {
    req.user = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/', authenticate, async (req, res) => {
  const productId = Number(req.body.productId);
  const content = String(req.body.content || '').trim();

  if (!Number.isInteger(productId) || !content) {
    return res.status(400).json({ error: 'กรุณาระบุข้อความและสินค้าให้ถูกต้อง' });
  }
  if (content.length > 1000) {
    return res.status(400).json({ error: 'ข้อความต้องมีความยาวไม่เกิน 1,000 ตัวอักษร' });
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'ไม่พบสินค้า' });
    if (product.sellerId === req.user.userId) {
      return res.status(400).json({ error: 'ไม่สามารถส่งข้อความหาตัวเองได้' });
    }

    const message = await prisma.message.create({
      data: {
        content,
        productId,
        senderId: req.user.userId,
        recipientId: product.sellerId
      },
      include: {
        sender: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
        product: { select: { id: true, title: true } }
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ไม่สามารถส่งข้อความได้' });
  }
});

router.get('/product/:productId', authenticate, async (req, res) => {
  const productId = Number(req.params.productId);

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'ไม่พบสินค้า' });

    const messages = await prisma.message.findMany({
      where: {
        productId,
        OR: [
          { senderId: req.user.userId },
          { recipientId: req.user.userId }
        ]
      },
      include: {
        sender: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ไม่สามารถโหลดข้อความได้' });
  }
});

module.exports = router;
