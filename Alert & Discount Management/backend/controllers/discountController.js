const Discount = require("../models/Discount");

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Attempt to enrich a discount document with productName / batchNumber
 * by fetching from external services (if they are injected via req.app.locals).
 * Falls back gracefully if those services are unavailable.
 */
const enrichDiscount = async (req, discount) => {
  try {
    // If your app stores product/inventory services in app.locals, use them here.
    // Example: const productService = req.app.locals.productService;
    // For now we just return the discount as-is; names are stored at creation time.
    return discount;
  } catch {
    return discount;
  }
};

// ─── GET /api/discounts ───────────────────────────────────────────────────────
exports.getAllDiscounts = async (req, res) => {
  try {
    const { active, productId } = req.query;

    const filter = {};
    if (active !== undefined) filter.active = active === "true";
    if (productId) filter.productId = Number(productId);

    const discounts = await Discount.find(filter).sort({ createdAt: -1 });

    return res.status(200).json(discounts);
  } catch (err) {
    console.error("[Discount] getAllDiscounts error:", err);
    return res.status(500).json({ message: "Failed to fetch discounts" });
  }
};

// ─── GET /api/discounts/:id ───────────────────────────────────────────────────
exports.getDiscountById = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) return res.status(404).json({ message: "Discount not found" });

    return res.status(200).json(discount);
  } catch (err) {
    console.error("[Discount] getDiscountById error:", err);
    return res.status(500).json({ message: "Failed to fetch discount" });
  }
};

// ─── POST /api/discounts ──────────────────────────────────────────────────────
exports.createDiscount = async (req, res) => {
  try {
    const {
      productId,
      productName,
      batchId,
      batchNumber,
      discountPercent,
      note,
      active,
      expiryDate,
      source,
    } = req.body;

    // Validation
    if (!productId) return res.status(400).json({ message: "productId is required" });
    if (!batchId) return res.status(400).json({ message: "batchId is required" });
    if (!discountPercent) return res.status(400).json({ message: "discountPercent is required" });

    const pct = Number(discountPercent);
    if (isNaN(pct) || !Number.isInteger(pct) || pct < 1 || pct > 90) {
      return res.status(400).json({
        message: "discountPercent must be a whole number between 1 and 90",
      });
    }

    // Check if discount already exists for this batch
    const existing = await Discount.findOne({ batchId: Number(batchId) });
    if (existing) {
      return res.status(409).json({
        message: `A discount already exists for batch ${batchNumber || batchId}. Edit or delete it first.`,
      });
    }

    const discount = await Discount.create({
      productId: Number(productId),
      productName: productName || "",
      batchId: Number(batchId),
      batchNumber: batchNumber || "",
      discountPercent: pct,
      note: note?.trim() || null,
      active: active !== undefined ? Boolean(active) : true,
      expiryDate: expiryDate || null,
      source: source || "MANUAL",
    });

    console.log(`[Discount] Created discount ${discount._id} for batch ${batchId} – ${pct}% off`);
    return res.status(201).json(discount);
  } catch (err) {
    console.error("[Discount] createDiscount error:", err);
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join("; ") });
    }
    return res.status(500).json({ message: "Failed to create discount" });
  }
};

// ─── PUT /api/discounts/:id ───────────────────────────────────────────────────
exports.updateDiscount = async (req, res) => {
  try {
    const { discountPercent, note, active, productName, batchNumber, expiryDate } = req.body;

    const discount = await Discount.findById(req.params.id);
    if (!discount) return res.status(404).json({ message: "Discount not found" });

    // Validate discount percent if provided
    if (discountPercent !== undefined) {
      const pct = Number(discountPercent);
      if (isNaN(pct) || !Number.isInteger(pct) || pct < 1 || pct > 90) {
        return res.status(400).json({
          message: "discountPercent must be a whole number between 1 and 90",
        });
      }
      discount.discountPercent = pct;
    }

    if (note !== undefined) discount.note = note?.trim() || null;
    if (active !== undefined) discount.active = Boolean(active);
    if (productName !== undefined) discount.productName = productName;
    if (batchNumber !== undefined) discount.batchNumber = batchNumber;
    if (expiryDate !== undefined) discount.expiryDate = expiryDate;

    await discount.save();

    console.log(`[Discount] Updated discount ${discount._id}`);
    return res.status(200).json(discount);
  } catch (err) {
    console.error("[Discount] updateDiscount error:", err);
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join("; ") });
    }
    return res.status(500).json({ message: "Failed to update discount" });
  }
};

// ─── PATCH /api/discounts/:id/active ─────────────────────────────────────────
exports.toggleActive = async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) return res.status(404).json({ message: "Discount not found" });

    // Support ?value=true/false query param OR just toggle
    const { value } = req.query;
    if (value !== undefined) {
      discount.active = value === "true";
    } else {
      discount.active = !discount.active;
    }

    await discount.save();

    console.log(`[Discount] Toggled discount ${discount._id} active → ${discount.active}`);
    return res.status(200).json(discount);
  } catch (err) {
    console.error("[Discount] toggleActive error:", err);
    return res.status(500).json({ message: "Failed to toggle discount status" });
  }
};

// ─── DELETE /api/discounts/:id ────────────────────────────────────────────────
exports.deleteDiscount = async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) return res.status(404).json({ message: "Discount not found" });

    console.log(`[Discount] Deleted discount ${req.params.id}`);
    return res.status(200).json({ message: "Discount deleted successfully" });
  } catch (err) {
    console.error("[Discount] deleteDiscount error:", err);
    return res.status(500).json({ message: "Failed to delete discount" });
  }
};

// ─── GET /api/discounts/stats ─────────────────────────────────────────────────
exports.getDiscountStats = async (req, res) => {
  try {
    const [total, active, aiSuggested] = await Promise.all([
      Discount.countDocuments(),
      Discount.countDocuments({ active: true }),
      Discount.countDocuments({ source: "AI" }),
    ]);

    return res.status(200).json({
      total,
      active,
      inactive: total - active,
      aiSuggested,
    });
  } catch (err) {
    console.error("[Discount] getDiscountStats error:", err);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
};
