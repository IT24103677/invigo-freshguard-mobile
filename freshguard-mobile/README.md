# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## API configuration

The mobile app reads its backend URLs from `app.json`:

```json
"extra": {
  "apiBaseUrlWeb": "http://localhost:5000",
  "apiBaseUrlNative": "http://10.164.210.177:5000"
}
```

- `apiBaseUrlWeb` is used for Expo web in the browser.
- `apiBaseUrlNative` is used for Expo Go / phone testing.

If your laptop IP changes on Wi-Fi, update `apiBaseUrlNative`, then restart Expo:

```bash
npx expo start --clear
```

## Final demo checklist

Before the final hosted demo:

1. Replace the local URLs in `app.json` with your hosted backend URL.
2. Restart Expo after changing `app.json`:

   ```bash
   npx expo start --clear
   ```

3. Verify these flows against the hosted API:
   - login
   - POS product loading
   - checkout and sale recording
   - receipt upload
   - sales history and sale details
   - dashboard summary

If a hosted build is being demonstrated on a phone, make sure `apiBaseUrlNative` also points to the hosted backend instead of a LAN IP.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
