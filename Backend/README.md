# Invigo MERN Backend

This backend works with the Expo/mobile UI and the React web UI style you already have.

It includes:

- Login API
- Forgot password OTP API
- Admin user management API
- Role management API
- Login history API
- Supplier management API

## 1. Install

```bash
cd invigo-mern-backend
npm install
```

## 2. Create `.env`

Copy `.env.example` into `.env`:

```bash
copy .env.example .env
```

Then update this line with your MongoDB Atlas URL:

```env
MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/invigo?retryWrites=true&w=majority
```

Also keep this:

```env
PORT=8080
JWT_SECRET=change_this_to_a_long_random_secret
```

## 3. Create first admin and sample supplier data

```bash
npm run seed
```

Default admin login:

```text
username: admin
email: admin@invigo.lk
password: Admin12345
role: ADMIN
```

You can change those in `.env` before running seed.

## 4. Run backend

```bash
npm run dev
```

Backend URL:

```text
http://localhost:8080/api
```

For Expo Go on your phone, do not use localhost. Use your laptop Wi-Fi IP:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR-LAPTOP-IP:8080/api
```

Example:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.12:8080/api
```

Then restart Expo:

```bash
npx expo start -c
```

## Main endpoints

### Auth

```text
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/verify-otp
POST /api/auth/reset-password
```

### Admin users

```text
GET    /api/admin/users
POST   /api/admin/users
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id
PUT    /api/admin/users/:id/unlock
```

### Suppliers

```text
GET    /api/admin/suppliers
POST   /api/admin/suppliers
GET    /api/admin/suppliers/:id
PUT    /api/admin/suppliers/:id
DELETE /api/admin/suppliers/:id
```

`DELETE /api/admin/suppliers/:id` permanently deletes the supplier record.

## Test login with Postman

URL:

```text
POST http://localhost:8080/api/auth/login
```

Body > raw > JSON:

```json
{
  "username": "admin",
  "password": "Admin12345",
  "role": "ADMIN"
}
```

Copy the returned token.

For supplier APIs, add header:

```text
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

## Create supplier body

```json
{
  "supplierName": "Fresh Valley Farms",
  "contactPerson": "Nimal Fernando",
  "email": "orders@freshvalley.lk",
  "phone": "+94 77 123 4567",
  "category": "Produce",
  "status": "Active",
  "deliveryDays": 2,
  "rating": 4.7,
  "address": "Dambulla, Sri Lanka",
  "notes": "Reliable supplier"
}
```
