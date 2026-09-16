const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_dormmart_key'; // Use env in prod

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

// GET current user profile with addresses
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { addresses: { orderBy: { createdAt: 'desc' } } }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      studentId: user.studentId,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      addresses: user.addresses
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, studentId, avatar } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        studentId: studentId ? studentId.trim() : undefined,
        avatar: avatar !== undefined ? avatar : undefined
      }
    });

    // Generate new token because name might have changed
    const token = jwt.sign(
      { userId: updatedUser.id, name: updatedUser.name, studentId: updatedUser.studentId, email: updatedUser.email, role: updatedUser.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user: { id: updatedUser.id, name: updatedUser.name, studentId: updatedUser.studentId, email: updatedUser.email, phone: updatedUser.phone, avatar: updatedUser.avatar, role: updatedUser.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST add address
router.post('/addresses', authenticate, async (req, res) => {
  try {
    const { title, addressText, isDefault } = req.body;
    
    if (!title || !addressText) {
      return res.status(400).json({ error: 'Title and Address Text are required' });
    }

    // If making this default, unset others
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.userId },
        data: { isDefault: false }
      });
    }

    const address = await prisma.address.create({
      data: {
        title,
        addressText,
        isDefault: Boolean(isDefault),
        userId: req.user.userId
      }
    });

    res.status(201).json(address);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update address
router.put('/addresses/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, addressText, isDefault } = req.body;
    
    const existing = await prisma.address.findFirst({ where: { id: parseInt(id), userId: req.user.userId } });
    if (!existing) return res.status(404).json({ error: 'Address not found' });

    if (isDefault && !existing.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.userId },
        data: { isDefault: false }
      });
    }

    const updated = await prisma.address.update({
      where: { id: parseInt(id) },
      data: { title, addressText, isDefault: Boolean(isDefault) }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE address
router.delete('/addresses/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.address.findFirst({ where: { id: parseInt(id), userId: req.user.userId } });
    if (!existing) return res.status(404).json({ error: 'Address not found' });

    await prisma.address.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Address deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT set default address
router.put('/addresses/:id/default', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.address.findFirst({ where: { id: parseInt(id), userId: req.user.userId } });
    if (!existing) return res.status(404).json({ error: 'Address not found' });

    await prisma.address.updateMany({
      where: { userId: req.user.userId },
      data: { isDefault: false }
    });

    const updated = await prisma.address.update({
      where: { id: parseInt(id) },
      data: { isDefault: true }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
