require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const InventoryBatch = require('../models/InventoryBatch');

const PRODUCTS = [
  {
    productId: 'PRD-BREAD-400',
    productName: 'Crust Top Bread 400g',
    mainCategory: 'Bakery',
    subCategory: 'Bread',
    supplier: 'Crust Bakers',
    costPrice: 160,
    sellingPrice: 220,
    imageUrl: '',
    reorderLevel: 20,
    stock: 50,
    sold: 10,
    riskLevel: 'LOW',
  },
  {
    productId: 'PRD-MILK-1L',
    productName: 'Farm Fresh Milk 1L',
    mainCategory: 'Dairy',
    subCategory: 'Milk',
    supplier: 'Farm Fresh Dairies',
    costPrice: 180,
    sellingPrice: 250,
    imageUrl: '',
    reorderLevel: 15,
    stock: 32,
    sold: 6,
    riskLevel: 'MEDIUM',
  },
  {
    productId: 'PRD-JUICE-250',
    productName: 'Tropical Juice 250ml',
    mainCategory: 'Beverages',
    subCategory: 'Juice',
    supplier: 'Sun Harvest',
    costPrice: 90,
    sellingPrice: 140,
    imageUrl: '',
    reorderLevel: 25,
    stock: 80,
    sold: 24,
    riskLevel: 'LOW',
  },
];

async function seed() {
  await connectDB();

  await InventoryBatch.deleteMany({});
  await Product.deleteMany({});

  const products = await Product.insertMany(PRODUCTS);

  await InventoryBatch.insertMany([
    {
      product: products[0]._id,
      batchNumber: 'B007',
      quantity: 60,
      expiryDate: '2026-05-06',
    },
  ]);

  console.log('Seed completed.');
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
