require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/authRoutes');
const adminUserRoutes = require('./src/routes/adminUserRoutes');
const loginRoutes = require('./src/routes/loginRoutes');
const supplierRoutes = require('./src/routes/supplierRoutes');
const productRoutes = require('./src/routes/productRoutes');
const batchRoutes = require('./src/routes/batchRoutes');
const salesDashboardRoutes = require('./src/routes/salesDashboardRoutes');
const saleRoutes = require('./src/routes/saleRoutes');

const app = express();
const PORT = process.env.PORT || 8080;

connectDB();

app.use(cors({
  origin: process.env.CORS_ORIGIN === '*' ? true : process.env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ message: 'Invigo MERN backend is running', api: '/api' });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'invigo-backend', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/dashboard', salesDashboardRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/logins', loginRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Invigo backend running on http://localhost:${PORT}`);
});
