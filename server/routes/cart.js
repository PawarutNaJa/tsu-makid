const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = 'supersecret_dormmart_key';

const authenticate = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้ตะกร้า' });

  try {
    req.user = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const getQuantity = (value) => {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity > 0 ? quantity : null;
};

const includeProduct = {
  product: {
    include: { seller: { select: { name: true } } }
  }
};

router.get('/', authenticate, async (req, res) => {
  try {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.user.userId },
      include: includeProduct,
      orderBy: { createdAt: 'desc' }
    });
    res.json(items.map(item => ({ ...item.product, quantity: item.quantity })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ไม่สามารถโหลดตะกร้าได้' });
  }
});

router.post('/', authenticate, async (req, res) => {
  const productId = Number(req.body.productId);
  const quantity = getQuantity(req.body.quantity || 1);
  if (!Number.isInteger(productId) || !quantity) return res.status(400).json({ error: 'ข้อมูลสินค้าในตะกร้าไม่ถูกต้อง' });

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'ไม่พบสินค้า' });
    if (product.status === 'SOLD') return res.status(400).json({ error: 'สินค้านี้ขายแล้ว' });

    const item = await prisma.cartItem.upsert({
      where: { userId_productId: { userId: req.user.userId, productId } },
      update: { quantity: { increment: quantity } },
      create: { userId: req.user.userId, productId, quantity },
      include: includeProduct
    });
    res.status(201).json({ ...item.product, quantity: item.quantity });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'ไม่สามารถเพิ่มสินค้าในตะกร้าได้' });
  }
});

router.patch('/:productId', authenticate, async (req, res) => {
  const productId = Number(req.params.productId);
  const quantity = getQuantity(req.body.quantity);
  if (!Number.isInteger(productId) || !quantity) return res.status(400).json({ error: 'จำนวนสินค้าไม่ถูกต้อง' });

  try {
    const item = await prisma.cartItem.update({
      where: { userId_productId: { userId: req.user.userId, productId } },
      data: { quantity },
      include: includeProduct
    });
    res.json({ ...item.product, quantity: item.quantity });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'ไม่พบสินค้าในตะกร้า' });
    res.status(500).json({ error: 'ไม่สามารถแก้ไขตะกร้าได้' });
  }
});

router.delete('/:productId', authenticate, async (req, res) => {
  const productId = Number(req.params.productId);
  try {
    await prisma.cartItem.delete({ where: { userId_productId: { userId: req.user.userId, productId } } });
    res.json({ message: 'นำสินค้าออกจากตะกร้าแล้ว' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'ไม่พบสินค้าในตะกร้า' });
    res.status(500).json({ error: 'ไม่สามารถลบสินค้าออกจากตะกร้าได้' });
  }
});

router.delete('/', authenticate, async (req, res) => {
  try {
    await prisma.cartItem.deleteMany({ where: { userId: req.user.userId } });
    res.json({ message: 'ล้างตะกร้าแล้ว' });
  } catch (error) {
    res.status(500).json({ error: 'ไม่สามารถล้างตะกร้าได้' });
  }
});

module.exports = router;
