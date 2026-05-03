require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Supplier = require('../models/Supplier');
const Product = require('../models/Product');
const Batch = require('../models/Batch');
const Sale = require('../models/Sale');
const saleService = require('../services/saleService');

const sampleSuppliers = [
  {
    supplierName: 'Fresh Valley Farms',
    contactPerson: 'Nimal Fernando',
    email: 'orders@freshvalley.lk',
    phone: '+94 77 123 4567',
    category: 'Produce',
    status: 'Active',
    deliveryDays: 2,
    rating: 4.8,
    productsSupplied: 2,
    lastOrderDate: '2026-05-01',
    address: 'Dambulla, Sri Lanka',
    notes: 'Primary source for fresh vegetables used in demo inventory.',
  },
  {
    supplierName: 'Ceylon Dairy Distributors',
    contactPerson: 'Amani Silva',
    email: 'supply@ceylondairy.lk',
    phone: '+94 71 223 8899',
    category: 'Dairy',
    status: 'Active',
    deliveryDays: 3,
    rating: 4.4,
    productsSupplied: 2,
    lastOrderDate: '2026-05-02',
    address: 'Colombo, Sri Lanka',
    notes: 'Handles chilled dairy deliveries for milk and yogurt.',
  },
  {
    supplierName: 'BakeHouse Wholesale',
    contactPerson: 'Shan Perera',
    email: 'hello@bakehouse.lk',
    phone: '+94 76 554 1200',
    category: 'Bakery',
    status: 'Active',
    deliveryDays: 1,
    rating: 4.9,
    productsSupplied: 2,
    lastOrderDate: '2026-05-03',
    address: 'Maharagama, Sri Lanka',
    notes: 'Fast-moving bakery supplier for fresh daily stock.',
  },
  {
    supplierName: 'Island Beverage Traders',
    contactPerson: 'Ruvin Jayasekara',
    email: 'trade@islandbeverages.lk',
    phone: '+94 75 990 1188',
    category: 'Beverages',
    status: 'Active',
    deliveryDays: 4,
    rating: 4.3,
    productsSupplied: 1,
    lastOrderDate: '2026-04-28',
    address: 'Kelaniya, Sri Lanka',
    notes: 'Supplies bottled and boxed beverage stock.',
  },
  {
    supplierName: 'Pantry Prime Imports',
    contactPerson: 'Dilshi Samarasinghe',
    email: 'ops@pantryprime.lk',
    phone: '+94 70 448 7711',
    category: 'Dry Goods',
    status: 'Active',
    deliveryDays: 5,
    rating: 4.5,
    productsSupplied: 1,
    lastOrderDate: '2026-04-25',
    address: 'Kandy, Sri Lanka',
    notes: 'Dry goods supplier used for shelf-stable staples.',
  },
];

const sampleProducts = [
  {
    key: 'tomatoes',
    name: 'Tomatoes 1kg Tray',
    category: 'Produce',
    sku: 'INV-DEMO-001',
    barcode: '8901000000011',
    brand: 'Fresh Valley',
    supplier: 'Fresh Valley Farms',
    unitType: 'tray',
    buyingPrice: 220,
    sellingPrice: 320,
  },
  {
    key: 'lettuce',
    name: 'Iceberg Lettuce Head',
    category: 'Produce',
    sku: 'INV-DEMO-002',
    barcode: '8901000000028',
    brand: 'Fresh Valley',
    supplier: 'Fresh Valley Farms',
    unitType: 'head',
    buyingPrice: 90,
    sellingPrice: 150,
  },
  {
    key: 'milk',
    name: 'Full Cream Milk 1L',
    category: 'Dairy',
    sku: 'INV-DEMO-003',
    barcode: '8901000000035',
    brand: 'Ceylon Dairy',
    supplier: 'Ceylon Dairy Distributors',
    unitType: 'bottle',
    buyingPrice: 290,
    sellingPrice: 380,
  },
  {
    key: 'yogurt',
    name: 'Greek Yogurt 450g',
    category: 'Dairy',
    sku: 'INV-DEMO-004',
    barcode: '8901000000042',
    brand: 'Ceylon Dairy',
    supplier: 'Ceylon Dairy Distributors',
    unitType: 'cup',
    buyingPrice: 260,
    sellingPrice: 340,
  },
  {
    key: 'bread',
    name: 'Sandwich Bread Loaf',
    category: 'Bakery',
    sku: 'INV-DEMO-005',
    barcode: '8901000000059',
    brand: 'BakeHouse',
    supplier: 'BakeHouse Wholesale',
    unitType: 'loaf',
    buyingPrice: 140,
    sellingPrice: 220,
  },
  {
    key: 'muffins',
    name: 'Chocolate Muffin Pack',
    category: 'Bakery',
    sku: 'INV-DEMO-006',
    barcode: '8901000000066',
    brand: 'BakeHouse',
    supplier: 'BakeHouse Wholesale',
    unitType: 'pack',
    buyingPrice: 280,
    sellingPrice: 420,
  },
  {
    key: 'juice',
    name: 'Orange Juice 1L',
    category: 'Beverages',
    sku: 'INV-DEMO-007',
    barcode: '8901000000073',
    brand: 'Island Sips',
    supplier: 'Island Beverage Traders',
    unitType: 'carton',
    buyingPrice: 300,
    sellingPrice: 450,
  },
  {
    key: 'rice',
    name: 'Basmati Rice 5kg',
    category: 'Dry Goods',
    sku: 'INV-DEMO-008',
    barcode: '8901000000080',
    brand: 'Pantry Prime',
    supplier: 'Pantry Prime Imports',
    unitType: 'bag',
    buyingPrice: 1350,
    sellingPrice: 1650,
  },
];

const sampleBatches = [
  {
    productKey: 'tomatoes',
    batchNumber: 'DEMO-TOM-01',
    receivedOffsetDays: -2,
    expiryOffsetDays: 5,
    quantityOnHand: 18,
    storageCondition: 'Ambient shelf',
    location: 'Aisle A / Rack 1',
    costPerUnit: 220,
    supplierName: 'Fresh Valley Farms',
    notes: 'Fresh stock for POS sales checks.',
  },
  {
    productKey: 'tomatoes',
    batchNumber: 'DEMO-TOM-02',
    receivedOffsetDays: -1,
    expiryOffsetDays: 11,
    quantityOnHand: 20,
    storageCondition: 'Ambient shelf',
    location: 'Aisle A / Rack 2',
    costPerUnit: 225,
    supplierName: 'Fresh Valley Farms',
    notes: 'Second tomato batch to test FEFO allocation.',
  },
  {
    productKey: 'lettuce',
    batchNumber: 'DEMO-LET-01',
    receivedOffsetDays: -1,
    expiryOffsetDays: 4,
    quantityOnHand: 12,
    storageCondition: 'Chilled display',
    location: 'Cooler 1',
    costPerUnit: 90,
    supplierName: 'Fresh Valley Farms',
    notes: 'Single fresh-produce batch.',
  },
  {
    productKey: 'milk',
    batchNumber: 'DEMO-MLK-01',
    receivedOffsetDays: -3,
    expiryOffsetDays: 8,
    quantityOnHand: 16,
    storageCondition: 'Refrigerated',
    location: 'Cooler 2',
    costPerUnit: 290,
    supplierName: 'Ceylon Dairy Distributors',
    notes: 'First milk batch for FEFO test coverage.',
  },
  {
    productKey: 'milk',
    batchNumber: 'DEMO-MLK-02',
    receivedOffsetDays: -1,
    expiryOffsetDays: 18,
    quantityOnHand: 20,
    storageCondition: 'Refrigerated',
    location: 'Cooler 2',
    costPerUnit: 295,
    supplierName: 'Ceylon Dairy Distributors',
    notes: 'Second milk batch with longer shelf life.',
  },
  {
    productKey: 'yogurt',
    batchNumber: 'DEMO-YGT-01',
    receivedOffsetDays: -2,
    expiryOffsetDays: 12,
    quantityOnHand: 14,
    storageCondition: 'Refrigerated',
    location: 'Cooler 3',
    costPerUnit: 260,
    supplierName: 'Ceylon Dairy Distributors',
    notes: 'Demo yogurt stock.',
  },
  {
    productKey: 'bread',
    batchNumber: 'DEMO-BRD-01',
    receivedOffsetDays: -1,
    expiryOffsetDays: 2,
    quantityOnHand: 4,
    storageCondition: 'Bread shelf',
    location: 'Bakery Front',
    costPerUnit: 140,
    supplierName: 'BakeHouse Wholesale',
    notes: 'Short-dated bread batch for FEFO order.',
  },
  {
    productKey: 'bread',
    batchNumber: 'DEMO-BRD-02',
    receivedOffsetDays: 0,
    expiryOffsetDays: 5,
    quantityOnHand: 6,
    storageCondition: 'Bread shelf',
    location: 'Bakery Back',
    costPerUnit: 145,
    supplierName: 'BakeHouse Wholesale',
    notes: 'Second bread batch to leave low stock after sample sales.',
  },
  {
    productKey: 'muffins',
    batchNumber: 'DEMO-MFN-01',
    receivedOffsetDays: -1,
    expiryOffsetDays: 6,
    quantityOnHand: 10,
    storageCondition: 'Bakery shelf',
    location: 'Bakery Front',
    costPerUnit: 280,
    supplierName: 'BakeHouse Wholesale',
    notes: 'Fresh muffins for add-to-cart testing.',
  },
  {
    productKey: 'juice',
    batchNumber: 'DEMO-JCE-01',
    receivedOffsetDays: -4,
    expiryOffsetDays: 45,
    quantityOnHand: 18,
    storageCondition: 'Cool dry area',
    location: 'Aisle C / Rack 4',
    costPerUnit: 300,
    supplierName: 'Island Beverage Traders',
    notes: 'Longer-life beverage stock.',
  },
  {
    productKey: 'rice',
    batchNumber: 'DEMO-RCE-01',
    receivedOffsetDays: -8,
    expiryOffsetDays: 160,
    quantityOnHand: 12,
    storageCondition: 'Dry storage',
    location: 'Aisle D / Pallet 2',
    costPerUnit: 1350,
    supplierName: 'Pantry Prime Imports',
    notes: 'Shelf-stable dry goods sample stock.',
  },
];

const sampleSales = [
  {
    clientRequestKey: 'seed-sale-001',
    saleDateTime: () => new Date(Date.now() - (2 * 60 * 60 * 1000)),
    customerName: 'Walk-in Customer',
    amountGiven: 2500,
    notes: 'Demo checkout sale for same-day history checks.',
    items: [
      { productKey: 'tomatoes', quantity: 4, discountRateApplied: 0 },
      { productKey: 'bread', quantity: 2, discountRateApplied: 5 },
      { productKey: 'milk', quantity: 1, discountRateApplied: 0 },
    ],
  },
  {
    clientRequestKey: 'seed-sale-002',
    saleDateTime: () => new Date(Date.now() - (5 * 60 * 60 * 1000)),
    customerName: 'Cash Counter Sale',
    amountGiven: 2500,
    notes: 'Second same-day bill for dashboard revenue.',
    items: [
      { productKey: 'milk', quantity: 2, discountRateApplied: 0 },
      { productKey: 'yogurt', quantity: 2, discountRateApplied: 0 },
      { productKey: 'juice', quantity: 1, discountRateApplied: 0 },
    ],
  },
  {
    clientRequestKey: 'seed-sale-003',
    saleDateTime: () => new Date(Date.now() - (27 * 60 * 60 * 1000)),
    customerName: 'Office Pantry',
    customerEmail: 'pantry@example.com',
    amountGiven: 3000,
    notes: 'Yesterday sale to populate recent history.',
    items: [
      { productKey: 'rice', quantity: 1, discountRateApplied: 0 },
      { productKey: 'milk', quantity: 1, discountRateApplied: 0 },
      { productKey: 'muffins', quantity: 1, discountRateApplied: 10 },
    ],
  },
  {
    clientRequestKey: 'seed-sale-004',
    saleDateTime: () => new Date(Date.now() - (4 * 24 * 60 * 60 * 1000)),
    customerName: 'Cafe Corner',
    amountGiven: 4000,
    notes: 'Earlier weekly sale for report comparisons.',
    items: [
      { productKey: 'lettuce', quantity: 2, discountRateApplied: 0 },
      { productKey: 'tomatoes', quantity: 6, discountRateApplied: 0 },
      { productKey: 'juice', quantity: 2, discountRateApplied: 0 },
    ],
  },
  {
    clientRequestKey: 'seed-sale-005',
    saleDateTime: () => new Date(Date.now() - (15 * 24 * 60 * 60 * 1000)),
    customerName: 'Early Demo Order',
    amountGiven: 2500,
    notes: 'Older sample sale so All Time differs from current month.',
    items: [
      { productKey: 'bread', quantity: 5, discountRateApplied: 0 },
      { productKey: 'milk', quantity: 2, discountRateApplied: 0 },
    ],
  },
];

function offsetDate(days, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function ensureAdmin() {
  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@invigo.lk';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin12345';
  const adminName = process.env.SEED_ADMIN_NAME || 'Admin User';

  let admin = await User.findOne({ username: adminUsername });

  if (!admin) {
    admin = await User.create({
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      doj: new Date().toISOString().slice(0, 10),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    console.log(`Created admin: ${adminUsername} / ${adminPassword}`);
  } else {
    console.log(`Admin already exists: ${adminUsername}`);
  }

  return admin;
}

async function upsertSuppliers(createdBy) {
  for (const supplier of sampleSuppliers) {
    await Supplier.findOneAndUpdate(
      { supplierName: supplier.supplierName },
      {
        ...supplier,
        name: supplier.supplierName,
        createdBy,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  console.log(`Suppliers ready: ${sampleSuppliers.length}`);
}

async function upsertProducts(createdBy) {
  const productMap = new Map();

  for (const product of sampleProducts) {
    const savedProduct = await Product.findOneAndUpdate(
      { sku: product.sku },
      {
        ...product,
        createdBy,
        isActive: true,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    productMap.set(product.key, savedProduct);
  }

  console.log(`Products ready: ${sampleProducts.length}`);
  return productMap;
}

async function ensureBatches(productMap, createdBy) {
  let createdCount = 0;
  let existingCount = 0;

  for (const batch of sampleBatches) {
    const product = productMap.get(batch.productKey);
    if (!product) {
      throw new Error(`Missing product for batch seed: ${batch.batchNumber}`);
    }

    const existingBatch = await Batch.findOne({
      productId: product._id,
      batchNumber: batch.batchNumber,
    });

    if (existingBatch) {
      existingCount += 1;
      continue;
    }

    await Batch.create({
      productId: product._id,
      batchNumber: batch.batchNumber,
      receivedDate: offsetDate(batch.receivedOffsetDays, 9),
      expiryDate: offsetDate(batch.expiryOffsetDays, 12),
      quantityOnHand: batch.quantityOnHand,
      storageCondition: batch.storageCondition,
      location: batch.location,
      costPerUnit: batch.costPerUnit,
      supplierName: batch.supplierName,
      notes: batch.notes,
      createdBy,
      isActive: true,
    });

    createdCount += 1;
  }

  console.log(`Batches ready: ${createdCount} created, ${existingCount} already present`);
}

async function ensureSales(productMap, recordedBy) {
  let createdCount = 0;
  let skippedCount = 0;

  for (const sale of sampleSales) {
    const existingSale = await Sale.findOne({
      recordedBy,
      clientRequestKey: sale.clientRequestKey,
    });

    if (existingSale) {
      skippedCount += 1;
      continue;
    }

    const items = sale.items.map((item) => {
      const product = productMap.get(item.productKey);

      if (!product) {
        throw new Error(`Missing product for sale seed: ${sale.clientRequestKey}`);
      }

      return {
        productId: product._id.toString(),
        quantity: item.quantity,
        discountRateApplied: item.discountRateApplied ?? 0,
      };
    });

    try {
      const createdSale = await saleService.createSale({
        clientRequestKey: sale.clientRequestKey,
        recordedBy,
        customerName: sale.customerName ?? null,
        customerEmail: sale.customerEmail ?? null,
        amountGiven: sale.amountGiven,
        notes: sale.notes ?? null,
        items,
      });

      createdSale.saleDateTime = sale.saleDateTime();
      await createdSale.save();
      createdCount += 1;
    } catch (error) {
      skippedCount += 1;
      console.warn(
        `Skipped ${sale.clientRequestKey}: ${error.message}`
      );
    }
  }

  console.log(`Sample sales ready: ${createdCount} created, ${skippedCount} skipped`);
}

async function seed() {
  await connectDB();

  const admin = await ensureAdmin();
  await upsertSuppliers(admin._id);
  const productMap = await upsertProducts(admin._id);
  await ensureBatches(productMap, admin._id);
  await ensureSales(productMap, admin._id);

  console.log('Seed completed with sample suppliers, products, batches, and sales.');
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
