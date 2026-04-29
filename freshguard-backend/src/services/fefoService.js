const Batch = require("../models/Batch");
const createHttpError = require("../utils/httpError");

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const allocateStockWithFefo = async ({
  productId,
  requestedQuantity,
  session,
}) => {
  const sellableBatches = await Batch.find({
    productId,
    isActive: true,
    quantityOnHand: { $gt: 0 },
    expiryDate: { $gte: startOfToday() },
  })
    .sort({ expiryDate: 1, createdAt: 1 })
    .session(session);

  let remaining = requestedQuantity;
  const allocations = [];

  for (const batch of sellableBatches) {
    if (remaining <= 0) {
      break;
    }

    const qtyDeducted = Math.min(batch.quantityOnHand, remaining);
    batch.quantityOnHand -= qtyDeducted;

    allocations.push({
      batchId: batch._id,
      qtyDeducted,
      expiryDateSnapshot: batch.expiryDate,
    });

    await batch.save({ session });
    remaining -= qtyDeducted;
  }

  if (remaining > 0) {
    throw createHttpError(
      409,
      "Insufficient sellable stock to complete this sale."
    );
  }

  return allocations;
};

module.exports = {
  allocateStockWithFefo,
};
