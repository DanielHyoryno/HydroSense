# Mobile App (Expo)

## Run

```bash
npm install
npm start
```

Open with Expo Go on Android/iOS or run emulator.

## Backend URL

Edit `src/config/api.js` and set your backend host:

```js
export const API_BASE_URL = "http://<YOUR_LOCAL_IP>:8080/api/v1";
```

Use your computer LAN IP (not localhost) when testing from physical phone.

## Implemented Screens

- Login
- Register
- Devices list
- Add device

The app uses backend routes from `backend/API_CONTRACT.md`.
