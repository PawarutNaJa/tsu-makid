const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_dormmart_key'; 
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const PRODUCT_STATUSES = ['AVAILABLE', 'RESERVED', 'SOLD'];

const validateProductData = (input, partial = false) => {
  const requiredFields = ['title', 'description', 'price', 'category', 'condition', 'meetingLocation'];
  if (!partial && requiredFields.some(field => !String(input[field] ?? '').trim())) {
    const error = new Error('กรุณากรอกข้อมูลสินค้าให้ครบถ้วน');
    error.statusCode = 400;
    throw error;
  }

  if (input.price !== undefined && (!Number.isFinite(Number(input.price)) || Number(input.price) < 0)) {
    const error = new Error('ราคาต้องเป็นตัวเลขและไม่ติดลบ');
    error.statusCode = 400;
    throw error;
  }

  if (input.status !== undefined && !PRODUCT_STATUSES.includes(input.status)) {
    const error = new Error('สถานะสินค้าไม่ถูกต้อง');
    error.statusCode = 400;
    throw error;
  }

  if (input.image) {
    const dataImage = input.image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (input.image.startsWith('data:') && !dataImage) {
      const error = new Error('รองรับเฉพาะรูปภาพ JPG, PNG หรือ WebP');
      error.statusCode = 400;
      throw error;
    }
    if (dataImage && Buffer.byteLength(dataImage[2], 'base64') > MAX_IMAGE_BYTES) {
      const error = new Error('รูปภาพมีขนาดเกิน 2 MB');
      error.statusCode = 400;
      throw error;
    }
  }
};

const productFields = ['title', 'description', 'price', 'category', 'condition', 'image', 'meetingLocation', 'status'];

const pickProductData = (input) => Object.fromEntries(
  productFields
    .filter(field => input[field] !== undefined)
    .map(field => [field, field === 'price' ? Number(input[field]) : input[field]])
);

// Middleware to authenticate
const authenticate = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(400).json({ error: 'Invalid token' });
  }
};

// GET all products (with search and filter)
router.get('/', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice } = req.query;
    
    let whereClause = {};
    
    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }
    
    if (category && category !== 'All') {
      whereClause.category = category;
    }

    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price.gte = Number(minPrice);
      if (maxPrice) whereClause.price.lte = Number(maxPrice);
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: { seller: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET products owned by the current user
router.get('/mine', authenticate, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: req.user.role === 'admin' ? {} : { sellerId: req.user.userId },
      include: { seller: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET related products in the same category
router.get('/:id/recommendations', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: Number(req.params.id) } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const recommendations = await prisma.product.findMany({
      where: { category: product.category, id: { not: product.id }, status: { not: 'SOLD' } },
      include: { seller: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 4
    });
    res.json(recommendations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: { seller: { select: { name: true } } }
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create product
router.post('/', authenticate, async (req, res) => {
  try {
    validateProductData(req.body);
    const data = pickProductData({ ...req.body, status: req.body.status || 'AVAILABLE' });
    
    const product = await prisma.product.create({
      data: {
        ...data,
        sellerId: req.user.userId
      }
    });
    
    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Internal server error' });
  }
});

// PUT update product
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.product.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const isOwner = existing.sellerId === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขประกาศนี้' });

    validateProductData(req.body, true);
    const data = pickProductData(req.body);

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data
    });
    
    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Internal server error' });
  }
});

// DELETE product
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.product.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const isOwner = existing.sellerId === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ลบประกาศนี้' });

    await prisma.product.delete({ where: { id: parseInt(id) } });
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
