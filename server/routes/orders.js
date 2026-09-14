const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = 'supersecret_dormmart_key';

const authenticate = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' });

  try {
    req.user = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  }
};

// GET /api/orders/buyer - รายการคำสั่งซื้อที่ฉันซื้อ (ฝั่งผู้รับ)
router.get('/buyer', authenticate, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { buyerId: req.user.userId },
      include: {
        product: true,
        buyer: {
          select: { id: true, name: true, email: true, phone: true, studentId: true, addresses: true }
        },
        seller: {
          select: { id: true, name: true, email: true, phone: true, studentId: true, addresses: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching buyer orders:', error);
    res.status(500).json({ error: 'ไม่สามารถโหลดประวัติการสั่งซื้อได้' });
  }
});

// GET /api/orders/seller - รายการสินค้าที่ฉันต้องไปส่งมอบ (ฝั่งผู้ขาย)
router.get('/seller', authenticate, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { sellerId: req.user.userId },
      include: {
        product: true,
        buyer: {
          select: { id: true, name: true, email: true, phone: true, studentId: true, addresses: true }
        },
        seller: {
          select: { id: true, name: true, email: true, phone: true, studentId: true, addresses: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    res.status(500).json({ error: 'ไม่สามารถโหลดรายการจัดส่งได้' });
  }
});

// POST /api/orders/checkout - ชำระเงินและสร้างคำสั่งซื้อ (ระบบทำหน้าที่เป็นตัวกลางถือเงิน)
router.post('/checkout', authenticate, async (req, res) => {
  const { deliveryAddress, meetingLocation, note, buyerPhone, items: directItems } = req.body;

  try {
    let orderItems = [];

    if (directItems && Array.isArray(directItems) && directItems.length > 0) {
      // Direct checkout for specific items
      for (const item of directItems) {
        const product = await prisma.product.findUnique({
          where: { id: Number(item.productId) },
          include: { seller: true }
        });
        if (product) {
          orderItems.push({ product, quantity: item.quantity || 1 });
        }
      }
    } else {
      // Checkout from user's active cart
      const cartItems = await prisma.cartItem.findMany({
        where: { userId: req.user.userId },
        include: { product: { include: { seller: true } } }
      });

      if (cartItems.length === 0) {
        return res.status(400).json({ error: 'ไม่มีสินค้าในตะกร้า' });
      }

      orderItems = cartItems.map(c => ({ product: c.product, quantity: c.quantity }));
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ error: 'ไม่พบรายการสินค้าที่ต้องการสั่งซื้อ' });
    }

    // Fetch buyer info for default phone if not passed
    const buyer = await prisma.user.findUnique({ where: { id: req.user.userId } });

    const createdOrders = [];

    // Create an order for each item/product
    for (const item of orderItems) {
      if (item.product.sellerId === req.user.userId) {
        return res.status(400).json({ error: `คุณไม่สามารถซื้อสินค้าของตัวเองได้ (${item.product.title})` });
      }
      if (item.product.status === 'SOLD') {
        return res.status(400).json({ error: `สินค้า "${item.product.title}" ถูกขายไปแล้ว` });
      }

      const totalAmount = item.product.price * item.quantity;
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const order = await prisma.order.create({
        data: {
          orderNumber,
          buyerId: req.user.userId,
          sellerId: item.product.sellerId,
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
          totalAmount,
          status: 'PAID_ESCROW', // เว็บเป็นตัวกลางถือเงินไว้
          meetingLocation: meetingLocation || item.product.meetingLocation || 'นัดรับตามตกลง',
          deliveryAddress: deliveryAddress || 'จุดนัดรับที่ระบุ',
          buyerPhone: buyerPhone || buyer?.phone || null,
          sellerPhone: item.product.seller?.phone || null
        },
        include: {
          product: true,
          seller: { select: { id: true, name: true, email: true, phone: true } }
        }
      });

      // Mark product as RESERVED so others can't buy it concurrently
      await prisma.product.update({
        where: { id: item.product.id },
        data: { status: 'RESERVED' }
      });

      // Remove from cart
      await prisma.cartItem.deleteMany({
        where: {
          userId: req.user.userId,
          productId: item.product.id
        }
      });

      createdOrders.push(order);
    }

    res.status(201).json({
      message: 'ชำระเงินสำเร็จ ระบบตัวกลางได้ดูแลเงินของคุณเรียบร้อยแล้ว',
      orders: createdOrders
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสั่งซื้อ' });
  }
});

// PUT /api/orders/:id/deliver - ผู้ส่ง (ผู้ขาย) กดยืนยันว่านำของไปส่งให้ผู้ซื้อแล้ว
router.put('/:id/deliver', authenticate, async (req, res) => {
  const orderId = Number(req.params.id);

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'ไม่พบรายการคำสั่งซื้อ' });

    if (order.sellerId !== req.user.userId) {
      return res.status(403).json({ error: 'คุณไม่ใช่ผู้ขายของคำสั่งซื้อนี้' });
    }

    if (order.status !== 'PAID_ESCROW') {
      return res.status(400).json({ error: `ไม่สามารถยืนยันส่งของได้ในสถานะ ${order.status}` });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        sellerDeliveredAt: new Date()
      },
      include: {
        product: true,
        buyer: { select: { id: true, name: true, email: true, phone: true } }
      }
    });

    res.json({
      message: 'ยืนยันการส่งมอบสินค้าแล้ว รอผู้ซื้อกดยืนยันรับสินค้า',
      order: updated
    });
  } catch (error) {
    console.error('Error confirming delivery:', error);
    res.status(500).json({ error: 'ไม่สามารถยืนยันการส่งมอบได้' });
  }
});

// PUT /api/orders/:id/receive - ผู้รับ (ผู้ซื้อ) กดยืนยันว่าได้รับสินค้าแล้ว
// เงื่อนไขหลักการ: ต้องให้ผู้ส่งกดยืนยันว่าส่งแล้ว (DELIVERED) หน้าผู้รับจึงจะกดได้
router.put('/:id/receive', authenticate, async (req, res) => {
  const orderId = Number(req.params.id);

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'ไม่พบรายการคำสั่งซื้อ' });

    if (order.buyerId !== req.user.userId) {
      return res.status(403).json({ error: 'คุณไม่ใช่ผู้ซื้อของคำสั่งซื้อนี้' });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({
        error: 'ผู้ขายยังไม่ได้กดยืนยันว่าส่งมอบสินค้าแล้ว ไม่สามารถกดยืนยันรับสินค้าได้'
      });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'RECEIVED',
        buyerReceivedAt: new Date()
      },
      include: {
        product: true,
        seller: { select: { id: true, name: true, email: true, phone: true } }
      }
    });

    res.json({
      message: 'ยืนยันการรับสินค้าเรียบร้อยแล้ว ระบบได้เปิดสิทธิ์ให้ผู้ขายสามารถกดรับเงินได้',
      order: updated
    });
  } catch (error) {
    console.error('Error confirming receive:', error);
    res.status(500).json({ error: 'ไม่สามารถยืนยันการรับสินค้าได้' });
  }
});

// PUT /api/orders/:id/payout - ผู้ขายกดรับเงินหลังจากผู้ซื้อกดยืนยันว่าได้รับสินค้าแล้ว
// เงื่อนไข: สถานะต้องเป็น RECEIVED เท่านั้น (ผู้ซื้อกดยืนยันรับของแล้ว)
router.put('/:id/payout', authenticate, async (req, res) => {
  const orderId = Number(req.params.id);

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'ไม่พบรายการคำสั่งซื้อ' });

    if (order.sellerId !== req.user.userId) {
      return res.status(403).json({ error: 'คุณไม่ใช่ผู้ขายของคำสั่งซื้อนี้' });
    }

    if (order.status !== 'RECEIVED') {
      return res.status(400).json({
        error: 'ผู้ซื้อยังไม่ได้กดยืนยันว่าได้รับสินค้าแล้ว ระบบจึงยังไม่อนุญาตให้รับเงิน'
      });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        sellerPayoutAt: new Date()
      },
      include: {
        product: true,
        buyer: { select: { id: true, name: true, email: true, phone: true } }
      }
    });

    // Mark product as SOLD
    await prisma.product.update({
      where: { id: order.productId },
      data: { status: 'SOLD' }
    });

    res.json({
      message: `รับเงินค่าสินค้า ฿${order.totalAmount} เข้าบัญชีเรียบร้อยแล้ว การซื้อขายเสร็จสมบูรณ์!`,
      order: updated
    });
  } catch (error) {
    console.error('Error claiming payout:', error);
    res.status(500).json({ error: 'ไม่สามารถดำเนินการรับเงินได้' });
  }
});

// PUT /api/orders/:id/handover - แก้ไขรายละเอียดการนัดรับ (จุดนัดรับ / ที่อยู่ส่งมอบ / เบอร์ติดต่อ)
router.put('/:id/handover', authenticate, async (req, res) => {
  const orderId = Number(req.params.id);
  const { meetingLocation, deliveryAddress, contactPhone } = req.body;

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });

    if (order.buyerId !== req.user.userId && order.sellerId !== req.user.userId) {
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์แก้ไขคำสั่งซื้อนี้' });
    }

    const dataToUpdate = {};
    if (meetingLocation !== undefined && meetingLocation.trim()) {
      dataToUpdate.meetingLocation = meetingLocation.trim();
    }
    if (deliveryAddress !== undefined && deliveryAddress.trim()) {
      dataToUpdate.deliveryAddress = deliveryAddress.trim();
    }
    if (contactPhone !== undefined && contactPhone.trim()) {
      if (order.buyerId === req.user.userId) dataToUpdate.buyerPhone = contactPhone.trim();
      if (order.sellerId === req.user.userId) dataToUpdate.sellerPhone = contactPhone.trim();
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: dataToUpdate,
      include: {
        product: true,
        buyer: { select: { id: true, name: true, email: true, phone: true, studentId: true, addresses: true } },
        seller: { select: { id: true, name: true, email: true, phone: true, studentId: true, addresses: true } }
      }
    });

    res.json({
      message: 'อัปเดตรายละเอียดการนัดส่ง-รับของสำเร็จ',
      order: updated
    });
  } catch (error) {
    console.error('Error updating handover details:', error);
    res.status(500).json({ error: 'ไม่สามารถอัปเดตข้อมูลได้' });
  }
});

module.exports = router;
