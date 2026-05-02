const Product = require('../models/Product');

async function getProducts(req, res, next) {
  try {
    const products = await Product.find().sort({ productName: 1 });
    res.json(products);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
};
