const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      id: 1,
      name: 'TSU Student',
      email: 'test@tsu.ac.th',
      password: await bcrypt.hash('123456', 10),
      role: 'user'
    },
    {
      id: 2,
      name: 'TSU Admin',
      email: 'admin@tsu.ac.th',
      password: await bcrypt.hash('123456', 10),
      role: 'admin'
    }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: user,
      create: user
    });
  }

  const products = [
    {
      title: 'เสื้อกันหนาวนักศึกษา',
      description: 'เสื้อกันหนาวสภาพดี เหมาะสำหรับอากาศเย็นในหอพัก ใช้งานน้อย',
      price: 399,
      category: 'Clothes',
      condition: 'Like New',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
      meetingLocation: 'อาคารเรียนรวม 2',
      seller: { connect: { email: 'test@tsu.ac.th' } }
    },
    {
      title: 'โต๊ะทำงาน Mini',
      description: 'โต๊ะทำงานพับได้สำหรับห้องนอนหรือหอพัก ขนาดพอเหมาะ',
      price: 1250,
      category: 'Furniture',
      condition: 'Good',
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
      meetingLocation: 'ศูนย์หนังสือ',
      seller: { connect: { email: 'test@tsu.ac.th' } }
    },
    {
      title: 'AirPods Pro 2',
      description: 'ใช้งานเพียง 4 เดือน สภาพดี พร้อมเคสและชาร์จ',
      price: 3990,
      category: 'Electronics',
      condition: 'Like New',
      image: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=900&q=80',
      meetingLocation: 'หน้า Library',
      seller: { connect: { email: 'admin@tsu.ac.th' } }
    },
    {
      title: 'หนังสือเตรียมสอบ',
      description: 'หนังสือเตรียมสอบภาษอังกฤษและคณิตศาสตร์ สำหรับนักศึกษา',
      price: 250,
      category: 'Books',
      condition: 'Good',
      image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80',
      meetingLocation: 'หอสมุดกลาง',
      seller: { connect: { email: 'test@tsu.ac.th' } }
    },
    {
      title: 'เตียงเสริมสำหรับหอพัก',
      description: 'เตียงเสริมพร้อมฟุตเตอร์สำหรับห้องพัก ใช้งานดีมาก',
      price: 1800,
      category: 'Dorm Essentials',
      condition: 'Good',
      image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
      meetingLocation: 'ลานจอดรถหน้าอาคาร 7',
      seller: { connect: { email: 'admin@tsu.ac.th' } }
    }
  ];

  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { title: product.title }
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: product
      });
    } else {
      await prisma.product.create({ data: product });
    }
  }

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
