# Water Monitor IoT Thesis Project

[![Platform](https://img.shields.io/badge/platform-ESP32%20%7C%20Android%20%7C%20Web-0a7ea4)](./)
[![Stack](https://img.shields.io/badge/stack-Node.js%20%7C%20Express%20%7C%20React%20Native-1f6feb)](./)
[![Status](https://img.shields.io/badge/status-demo%20ready-success)](./)

An end-to-end IoT water monitoring system for thesis/demo use.

It connects an ESP32 flow meter device to a backend API and mobile app, supports BLE provisioning, and provides a structured dashboard with usage history and charts.

## Highlights

- Real device flow: BLE provision -> WiFi connect -> telemetry send (`W:OK S:OK`).
- Mobile UX improvements: start gate animation, accordions, clearer charts, calendar range picker.
- Demo + future deploy approach: environment-based config via `.env` and `.env.example`.
- Offline-safe behavior: dashboard shows offline state and zero current flow when device is unavailable.

## Repository Structure

```text
Projek Skripsi/
|- backend/   # Node.js + Express API, auth, telemetry endpoints, DB
|- mobile/    # Expo React Native app (Android/Web)
|- iot/       # ESP32 firmware and IoT setup docs
`- README.md
```

## Quick Start

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### 2) Mobile App

```bash
cd mobile
npm install
cp .env.example .env
npx expo start --clear
```

Open on:
- Web: press `w` in Expo terminal
- Android phone: use `npx expo run:android` (for native BLE)

## Demo Modes

- UI-only demo (without IoT): run backend + mobile and use existing app flows.
- Real IoT demo: flash `iot/firmware_v3`, BLE provision WiFi, monitor live telemetry.

## Tech Stack

- Firmware: ESP32 (Arduino), BLE provisioning, WiFi telemetry
- Backend: Node.js, Express, MySQL-compatible SQL schema
- Mobile: React Native (Expo), React Navigation, charts, calendar component

## Environment Files

- Keep secrets local in `.env`
- Commit templates only: `.env.example`

## Current Focus

- Stabilize live demo reliability
- Prepare deployment hardening (security and ops)
- Keep demo flow simple for thesis presentation

## Notes

If you are cloning this project for local testing, read and update env values first, then run backend before mobile.
