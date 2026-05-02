# Invigo Expo Mobile UI

This is the Expo Go mobile version of the Invigo web app UI from the provided ZIP.

Included mobile screens:

- Landing screen
- Login screen
- Forgot password flow with email, OTP, new password, success
- Admin user management screen
  - Staff Governance
  - Security & Activity
  - Role Permissions preview
  - Create staff modal
  - Edit staff modal
  - Revoke access
  - Unlock account

## 1. Install dependencies

Open this folder in VS Code / terminal:

```bash
cd invigo-expo-mobile
npm install
```

If Expo shows dependency warnings, run:

```bash
npx expo install --fix
```

## 2. Configure backend URL

Create a file named `.env` in the project root:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-backend-url/api
```

Important for Expo Go on your phone:

- Do not use `localhost` if testing on a real phone.
- Use your deployed Railway/Render backend URL, or your laptop IP address.
- Example local Wi-Fi URL:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8080/api
```

Your web app uses these backend routes, and the mobile app uses the same routes:

- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/verify-otp`
- `POST /auth/reset-password`
- `GET /admin/users`
- `POST /admin/users`
- `PUT /admin/users/:id`
- `DELETE /admin/users/:id`
- `PUT /admin/users/:id/unlock`
- `GET /admin/roles`
- `GET /logins`

## 3. Run in Expo Go

```bash
npx expo start
```

Then scan the QR code using Expo Go.

## Notes

If the backend is offline, the Admin User Management screen shows demo data so you can still check the UI on Expo Go.
Login and Forgot Password need the backend to work fully.

## Supplier Management Added

This version includes a mobile Supplier Management screen using the same Invigo admin UI style. It supports:

- Add new supplier
- Edit supplier details
- Search suppliers
- Filter by status and category
- Delete supplier from mobile
- Demo supplier data when backend endpoints are not available

Assumed backend endpoints:

```txt
GET    /admin/suppliers
POST   /admin/suppliers
PUT    /admin/suppliers/:id
DELETE /admin/suppliers/:id
```

If your backend uses different endpoint names, update `src/api.js`.
