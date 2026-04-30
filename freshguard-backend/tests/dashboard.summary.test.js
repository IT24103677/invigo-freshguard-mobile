const mongoose = require("mongoose");
const request = require("supertest");

const app = require("../src/app");
const Sale = require("../src/models/Sale");
const User = require("../src/models/User");
const generateToken = require("../src/utils/generateToken");

const buildSaleItem = ({ quantity, unitPriceSnapshot, lineTotal }) => ({
  productId: new mongoose.Types.ObjectId(),
  productNameSnapshot: "Test Product",
  unitPriceSnapshot,
  quantity,
  discountRateApplied: 0,
  lineTotal,
  allocations: [
    {
      batchId: new mongoose.Types.ObjectId(),
      qtyDeducted: quantity,
      expiryDateSnapshot: new Date("2026-05-10T00:00:00.000Z"),
    },
  ],
});

describe("GET /dashboard/summary", () => {
  it("uses ACTIVE sales for operational totals and counts VOID sales separately", async () => {
    const manager = await User.create({
      name: "Manager User",
      email: "manager@example.com",
      passwordHash: "hashed-password",
      role: "MANAGER",
    });

    const token = generateToken(manager);

    const now = new Date();
    const todayMorning = new Date(now);
    todayMorning.setHours(9, 0, 0, 0);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(16, 0, 0, 0);

    await Sale.create([
      {
        saleGroupId: "BILL-TODAY-ACTIVE",
        saleDateTime: todayMorning,
        recordedBy: manager._id,
        status: "ACTIVE",
        notes: null,
        customerName: null,
        customerEmail: null,
        subTotal: 500,
        discountTotal: 0,
        grandTotal: 500,
        amountGiven: 600,
        changeGiven: 100,
        items: [
          buildSaleItem({
            quantity: 2,
            unitPriceSnapshot: 250,
            lineTotal: 500,
          }),
        ],
      },
      {
        saleGroupId: "BILL-TODAY-VOID",
        saleDateTime: todayMorning,
        recordedBy: manager._id,
        status: "VOID",
        notes: null,
        customerName: null,
        customerEmail: null,
        subTotal: 300,
        discountTotal: 0,
        grandTotal: 300,
        amountGiven: 300,
        changeGiven: 0,
        voidReason: "Voided for test",
        items: [
          buildSaleItem({
            quantity: 1,
            unitPriceSnapshot: 300,
            lineTotal: 300,
          }),
        ],
      },
      {
        saleGroupId: "BILL-YESTERDAY-ACTIVE",
        saleDateTime: yesterday,
        recordedBy: manager._id,
        status: "ACTIVE",
        notes: null,
        customerName: null,
        customerEmail: null,
        subTotal: 900,
        discountTotal: 0,
        grandTotal: 900,
        amountGiven: 1000,
        changeGiven: 100,
        items: [
          buildSaleItem({
            quantity: 3,
            unitPriceSnapshot: 300,
            lineTotal: 900,
          }),
        ],
      },
    ]);

    const response = await request(app)
      .get("/dashboard/summary")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.todaysRevenue).toBe(500);
    expect(response.body.data.todaysActiveBills).toBe(1);
    expect(response.body.data.todaysUnitsSold).toBe(2);
    expect(response.body.data.voidedSalesCount).toBe(1);
    expect(response.body.data.latestActiveSale.saleGroupId).toBe(
      "BILL-TODAY-ACTIVE"
    );
  });
});
