const request = require("supertest");

const app = require("../src/app");
const User = require("../src/models/User");
const Product = require("../src/models/Product");
const Batch = require("../src/models/Batch");
const Sale = require("../src/models/Sale");
const generateToken = require("../src/utils/generateToken");

describe("Sales checkout flow", () => {
  const createManager = async () => {
    const user = await User.create({
      name: "Manager User",
      email: "manager@example.com",
      passwordHash: "hashed-password",
      role: "MANAGER",
    });

    return {
      user,
      token: generateToken(user),
    };
  };

  const createProductWithBatch = async (quantityOnHand = 10) => {
    const product = await Product.create({
      name: "Fresh Milk 1L",
      category: "DAIRY",
      unitType: "pcs",
      buyingPrice: 200,
      sellingPrice: 300,
      isActive: true,
    });

    const batch = await Batch.create({
      productId: product._id,
      batchNumber: "BATCH-001",
      receivedDate: new Date("2026-04-29T00:00:00.000Z"),
      expiryDate: new Date("2026-05-10T00:00:00.000Z"),
      quantityOnHand,
      isActive: true,
    });

    return { product, batch };
  };

  it("records a sale and deducts FEFO stock", async () => {
    const { token, user } = await createManager();
    const { product, batch } = await createProductWithBatch(10);

    const response = await request(app)
      .post("/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        customerName: "Walk-in Customer",
        customerEmail: "walkin@example.com",
        notes: "Checkout flow test",
        amountGiven: 1000,
        items: [
          {
            productId: product._id.toString(),
            quantity: 2,
            discountRateApplied: 0,
          },
        ],
      })
      .expect(201);

    const updatedBatch = await Batch.findById(batch._id);

    expect(response.body.success).toBe(true);
    expect(response.body.data.recordedBy.toString()).toBe(user._id.toString());
    expect(response.body.data.customerName).toBe("Walk-in Customer");
    expect(response.body.data.customerEmail).toBe("walkin@example.com");
    expect(response.body.data.grandTotal).toBe(600);
    expect(response.body.data.changeGiven).toBe(400);
    expect(updatedBatch.quantityOnHand).toBe(8);
  });

  it("rejects insufficient payment without deducting stock", async () => {
    const { token } = await createManager();
    const { product, batch } = await createProductWithBatch(10);

    const response = await request(app)
      .post("/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amountGiven: 200,
        items: [
          {
            productId: product._id.toString(),
            quantity: 1,
            discountRateApplied: 0,
          },
        ],
      })
      .expect(400);

    const unchangedBatch = await Batch.findById(batch._id);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Amount given cannot be less than the grand total."
    );
    expect(unchangedBatch.quantityOnHand).toBe(10);
  });

  it("requires amount given before recording a sale", async () => {
    const { token } = await createManager();
    const { product, batch } = await createProductWithBatch(10);

    const response = await request(app)
      .post("/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        items: [
          {
            productId: product._id.toString(),
            quantity: 1,
            discountRateApplied: 0,
          },
        ],
      })
      .expect(400);

    const unchangedBatch = await Batch.findById(batch._id);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain("\"amountGiven\" is required");
    expect(unchangedBatch.quantityOnHand).toBe(10);
  });

  it("voids a sale and restores stock to the original batch", async () => {
    const { token } = await createManager();
    const { product, batch } = await createProductWithBatch(10);

    const saleResponse = await request(app)
      .post("/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amountGiven: 1000,
        items: [
          {
            productId: product._id.toString(),
            quantity: 2,
            discountRateApplied: 0,
          },
        ],
      })
      .expect(201);

    await request(app)
      .post(`/sales/${saleResponse.body.data._id}/void`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        voidReason: "Customer canceled",
      })
      .expect(200);

    const restoredBatch = await Batch.findById(batch._id);
    const voidedSale = await Sale.findById(saleResponse.body.data._id);

    expect(restoredBatch.quantityOnHand).toBe(10);
    expect(voidedSale.status).toBe("VOID");
    expect(voidedSale.voidReason).toBe("Customer canceled");
  });

  it("attaches a receipt image to an existing sale", async () => {
    const { token } = await createManager();
    const { product } = await createProductWithBatch(10);

    const saleResponse = await request(app)
      .post("/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amountGiven: 1000,
        items: [
          {
            productId: product._id.toString(),
            quantity: 1,
            discountRateApplied: 0,
          },
        ],
      })
      .expect(201);

    const uploadResponse = await request(app)
      .post(`/sales/${saleResponse.body.data._id}/receipt`)
      .set("Authorization", `Bearer ${token}`)
      .attach("receipt", Buffer.from("fake-image-content"), "receipt-test.jpg")
      .expect(200);

    expect(uploadResponse.body.success).toBe(true);
    expect(uploadResponse.body.data.receiptImageUrl).toContain(
      "/uploads/receipts/"
    );

    const updatedSale = await Sale.findById(saleResponse.body.data._id);
    expect(updatedSale.receiptImageUrl).toContain("/uploads/receipts/");
  });

  it("rejects duplicate checkout submissions with the same request key", async () => {
    const { token } = await createManager();
    const { product } = await createProductWithBatch(10);
    const clientRequestKey = "sale-request-test-001";

    await request(app)
      .post("/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        clientRequestKey,
        amountGiven: 1000,
        items: [
          {
            productId: product._id.toString(),
            quantity: 1,
            discountRateApplied: 0,
          },
        ],
      })
      .expect(201);

    const duplicateResponse = await request(app)
      .post("/sales")
      .set("Authorization", `Bearer ${token}`)
      .send({
        clientRequestKey,
        amountGiven: 1000,
        items: [
          {
            productId: product._id.toString(),
            quantity: 1,
            discountRateApplied: 0,
          },
        ],
      })
      .expect(409);

    const saleCount = await Sale.countDocuments();

    expect(duplicateResponse.body.success).toBe(false);
    expect(duplicateResponse.body.message).toBe(
      "Possible duplicate sale detected. Refresh the sales history before retrying."
    );
    expect(saleCount).toBe(1);
  });
});
