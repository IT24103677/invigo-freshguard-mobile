const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const saleRoutes = require("./routes/saleRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "FreshGuard API is running",
  });
});

app.use("/sales", saleRoutes);

module.exports = app;
