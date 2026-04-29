const mongoose = require("mongoose");

const Product = require("../models/Product");
const Batch = require("../models/Batch");
const Sale = require("../models/Sale");
const { allocateStockWithFefo } = require("./fefoService");
const createHttpError = require("../utils/httpError");

const generateSaleGroupId = () => {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `BILL-${year}-${random}`;
};

const calculateLineTotal = ({ quantity, unitPriceSnapshot, discountRateApplied }) => {
  const gross = quantity * unitPriceSnapshot;
  const discountAmount = gross * (discountRateApplied / 100);
  return Number((gross - discountAmount).toFixed(2));
};

const createSale = async (payload) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const saleItems = [];
    let subTotal = 0;
    let discountTotal = 0;

    for (const requestedItem of payload.items) {
      const product = await Product.findOne({
        _id: requestedItem.productId,
        isActive: true,
      }).session(session);

      if (!product) {
        throw createHttpError(404, "Product not found or inactive.");
      }

      const unitPriceSnapshot =
        requestedItem.unitPriceOverride ?? product.sellingPrice;
      const discountRateApplied = requestedItem.discountRateApplied ?? 0;
      const gross = requestedItem.quantity * unitPriceSnapshot;
      const lineTotal = calculateLineTotal({
        quantity: requestedItem.quantity,
        unitPriceSnapshot,
        discountRateApplied,
      });

      const allocations = await allocateStockWithFefo({
        productId: product._id,
        requestedQuantity: requestedItem.quantity,
        session,
      });

      saleItems.push({
        productId: product._id,
        productNameSnapshot: product.name,
        unitPriceSnapshot,
        quantity: requestedItem.quantity,
        discountRateApplied,
        lineTotal,
        allocations,
      });

      subTotal += gross;
      discountTotal += gross - lineTotal;
    }

    const sale = await Sale.create(
      [
        {
          saleGroupId: generateSaleGroupId(),
          recordedBy: payload.recordedBy ?? null,
          notes: payload.notes ?? null,
          customerName: payload.customerName ?? null,
          customerEmail: payload.customerEmail ?? null,
          amountGiven: payload.amountGiven ?? null,
          changeGiven:
            payload.amountGiven != null
              ? Number((payload.amountGiven - (subTotal - discountTotal)).toFixed(2))
              : null,
          subTotal: Number(subTotal.toFixed(2)),
          discountTotal: Number(discountTotal.toFixed(2)),
          grandTotal: Number((subTotal - discountTotal).toFixed(2)),
          items: saleItems,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return sale[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getSales = async (query) => {
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.recordedBy) {
    filter.recordedBy = query.recordedBy;
  }

  if (query.from || query.to) {
    filter.saleDateTime = {};
    if (query.from) {
      filter.saleDateTime.$gte = new Date(query.from);
    }
    if (query.to) {
      filter.saleDateTime.$lte = new Date(query.to);
    }
  }

  return Sale.find(filter).sort({ saleDateTime: -1 });
};

const getSaleById = async (saleId) => {
  const sale = await Sale.findById(saleId);

  if (!sale) {
    throw createHttpError(404, "Sale not found.");
  }

  return sale;
};

const voidSale = async ({ saleId, voidReason, voidedBy }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const sale = await Sale.findById(saleId).session(session);

    if (!sale) {
      throw createHttpError(404, "Sale not found.");
    }

    if (sale.status === "VOID") {
      throw createHttpError(409, "Sale is already void.");
    }

    for (const item of sale.items) {
      for (const allocation of item.allocations) {
        const batch = await Batch.findById(allocation.batchId).session(session);

        if (!batch) {
          throw createHttpError(
            404,
            "A referenced batch could not be found while restoring stock."
          );
        }

        batch.quantityOnHand += allocation.qtyDeducted;
        await batch.save({ session });
      }
    }

    sale.status = "VOID";
    sale.voidReason = voidReason;
    sale.voidedBy = voidedBy ?? null;
    sale.voidedAt = new Date();

    await sale.save({ session });
    await session.commitTransaction();

    return sale;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  createSale,
  getSales,
  getSaleById,
  voidSale,
};
