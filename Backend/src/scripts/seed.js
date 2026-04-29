require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Supplier = require('../models/Supplier');

async function seed() {
  await connectDB();

  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@invigo.lk';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin12345';
  const adminName = process.env.SEED_ADMIN_NAME || 'Admin User';

  const existingAdmin = await User.findOne({ username: adminUsername });
  if (!existingAdmin) {
    await User.create({
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      doj: new Date().toISOString().slice(0, 10),
      role: 'ADMIN',
    });
    console.log(`Created admin: ${adminUsername} / ${adminPassword}`);
  } else {
    console.log(`Admin already exists: ${adminUsername}`);
  }

  const sampleSuppliers = [
    {
      supplierName: 'Fresh Valley Farms',
      name: 'Fresh Valley Farms',
      contactPerson: 'Nimal Fernando',
      email: 'orders@freshvalley.lk',
      phone: '+94 77 123 4567',
      category: 'Produce',
      status: 'Active',
      deliveryDays: 2,
      rating: 4.7,
      productsSupplied: 18,
      lastOrderDate: '2026-04-20',
      address: 'Dambulla, Sri Lanka',
      notes: 'High reliability',
    },
    {
      supplierName: 'Ceylon Dairy Distributors',
      name: 'Ceylon Dairy Distributors',
      contactPerson: 'Amani Silva',
      email: 'supply@ceylondairy.lk',
      phone: '+94 71 223 8899',
      category: 'Dairy',
      status: 'Pending',
      deliveryDays: 3,
      rating: 3.8,
      productsSupplied: 9,
      lastOrderDate: '2026-04-17',
      address: 'Colombo, Sri Lanka',
      notes: 'Needs quality review',
    },
    {
      supplierName: 'BakeHouse Wholesale',
      name: 'BakeHouse Wholesale',
      contactPerson: 'Shan Perera',
      email: 'hello@bakehouse.lk',
      phone: '+94 76 554 1200',
      category: 'Bakery',
      status: 'Active',
      deliveryDays: 1,
      rating: 4.9,
      productsSupplied: 12,
      lastOrderDate: '2026-04-24',
      address: 'Maharagama, Sri Lanka',
      notes: 'Fast delivery',
    },
  ];

  for (const supplier of sampleSuppliers) {
    await Supplier.findOneAndUpdate(
      { supplierName: supplier.supplierName },
      supplier,
      { upsert: true, new: true }
    );
  }

  console.log('Seed completed.');
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
