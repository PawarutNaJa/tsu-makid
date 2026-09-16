const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_dormmart_key';
const DEFAULT_CATEGORIES = ['Electronics', 'Furniture', 'Dorm Essentials', 'Books', 'Clothes', 'Others'];

const authenticate = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    req.user = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(400).json({ error: 'Invalid token' });
  }
};

router.get('/', async (req, res) => {
  try {
    const approved = await prisma.category.findMany({ where: { approved: true }, orderBy: { name: 'asc' } });
    res.json([...DEFAULT_CATEGORIES, ...approved.map(category => category.name).filter(name => !DEFAULT_CATEGORIES.includes(name))]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'กรุณาระบุชื่อหมวดหมู่' });
  if (DEFAULT_CATEGORIES.includes(name)) return res.status(400).json({ error: 'หมวดหมู่นี้มีอยู่แล้ว' });

  try {
    const category = await prisma.category.create({
      data: { name, requestedBy: req.user.userId },
      select: { id: true, name: true, approved: true }
    });
    res.status(201).json({ ...category, message: 'ส่งคำขอหมวดหมู่แล้ว รอแอดมินอนุมัติ' });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'มีคำขอหมวดหมู่นี้แล้ว' });
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/pending', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'เฉพาะแอดมินเท่านั้น' });

  const categories = await prisma.category.findMany({ where: { approved: false }, include: { requester: { select: { name: true, email: true } } }, orderBy: { createdAt: 'asc' } });
  res.json(categories);
});

router.patch('/:id/approve', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'เฉพาะแอดมินเท่านั้น' });

  try {
    const category = await prisma.category.update({ where: { id: Number(req.params.id) }, data: { approved: true } });
    res.json(category);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'ไม่พบคำขอหมวดหมู่' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
