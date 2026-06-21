# BloodLink

![Android](https://img.shields.io/badge/Android-Kotlin-green?logo=android)
![Backend](https://img.shields.io/badge/Backend-NestJS-red?logo=nestjs)
![Firebase](https://img.shields.io/badge/Firebase-FCM-orange?logo=firebase)
![Architecture](https://img.shields.io/badge/Architecture-MVVM-blue)
![License](https://img.shields.io/badge/License-MIT-lightgrey)
![Status](https://img.shields.io/badge/Status-Active-success)

> A full-stack blood donation platform connecting donors and recipients through real-time notifications and intelligent donor matching.



## Overview

BloodLink bridges the gap between blood donors and recipients by enabling real-time matching and push notifications. The platform consists of:

- **Android Mobile Application** — Donor and recipient interface built with Kotlin and MVVM
- **NestJS Notification Backend** — REST API for donor matching and FCM push notifications
- **Firebase Services** — Authentication, Firestore database, and Cloud Messaging



## System Architecture

```
┌─────────────────────────────┐
│     Android Application     │
│  (Kotlin · MVVM · Retrofit) │
└────────────┬────────────────┘
             │ REST / HTTPS
             ▼
┌─────────────────────────────┐
│     NestJS Backend API      │
│  (TypeScript · Node.js)     │
└────────────┬────────────────┘
             │ Firebase Admin SDK
             ▼
┌─────────────────────────────┐
│      Firebase Services      │
│  ├── Authentication         │
│  ├── Firestore Database     │
│  └── Cloud Messaging (FCM)  │
└────────────┬────────────────┘
             │ Push Notifications
             ▼
┌─────────────────────────────┐
│      Android Devices        │
└─────────────────────────────┘
```

---

## Key Features

### User Management
- Email/password registration and login via Firebase Auth
- Email verification flow
- Blood group registration and profile management
- Donor availability toggle (active / inactive)

### Blood Donation
- Create and manage blood requests
- Intelligent donor matching by blood group and location
- Donation history tracking with cooldown validation
- Request status lifecycle (open → matched → fulfilled)

### Real-Time Notifications
- Firebase Cloud Messaging (FCM) push notifications
- Instant alerts when a matching blood request is posted
- Notification persistence with read/unread tracking
- Offline notification queuing and delivery on reconnect

### Support
- In-app feedback submission
- FAQ section
- Privacy policy and About Us pages

---

## Technology Stack

### Android Application
| Library / Tool | Purpose |
|----------------|---------|
| Kotlin | Primary language |
| MVVM Architecture | Separation of concerns |
| Android Navigation Component | In-app navigation |
| View Binding | Type-safe view access |
| Firebase Auth | User authentication |
| Firebase Firestore | Real-time database |
| Firebase Cloud Messaging | Push notifications |
| Retrofit + OkHttp | REST API client |
| Timber | Logging |

### Backend Service
| Library / Tool | Purpose |
|----------------|---------|
| NestJS (TypeScript) | REST API framework |
| Firebase Admin SDK | Server-side Firebase access |
| Node.js | Runtime |

### Cloud Infrastructure
| Service | Role |
|---------|------|
| Firebase Authentication | Identity management |
| Firestore | NoSQL real-time database |
| Firebase Cloud Messaging | Push notification delivery |
| Render | Backend hosting |

---

## Project Structure

```
BloodLink/
│
├── README.md
│
├── bloodlink-android/               # Kotlin Android App
│   ├── app/
│   │   ├── src/main/java/
│   │   │   ├── ui/                  # Fragments and Activities
│   │   │   ├── viewmodels/          # MVVM ViewModels
│   │   │   ├── repository/          # Data layer
│   │   │   ├── model/               # Data models
│   │   │   └── utils/               # Helpers and extensions
│   │   └── res/                     # Layouts, drawables, strings
│   └── google-services.json         # Firebase config (not committed)
│
└── bloodlink-backend/               # NestJS Backend
    ├── src/
    │   ├── notifications/           # FCM notification module
    │   ├── matching/                # Donor matching logic
    │   ├── firebase/                # Firebase Admin SDK setup
    │   └── main.ts                  # App entry point
    ├── .env.example                 # Environment variable template
    └── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Android Studio Hedgehog or later
- Firebase project with Auth, Firestore, and FCM enabled
- A `google-services.json` from your Firebase console

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/your-username/bloodlink.git
cd bloodlink/bloodlink-backend

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env
# Fill in your Firebase credentials and FCM config

# Run in development mode
npm run start:dev
```

### Android Setup

1. Open `bloodlink-android/` in Android Studio.
2. Place your `google-services.json` inside `app/`.
3. Update `BASE_URL` in `utils/Constants.kt` to point to your backend (local or deployed).
4. Build and run on an emulator or physical device (API 26+).

### Download APK

> A pre-built debug APK will be available in [Releases](https://github.com/your-username/bloodlink/releases).

---

## API Reference

Base URL: `https://bloodlink-api.onrender.com` (or your local `http://localhost:3000`)

All endpoints expect and return `application/json`. Authentication is handled via Firebase ID tokens passed in the `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/notifications/send` | Send FCM push notification to matching donors |
| `POST` | `/notifications/register` | Register or update a device FCM token |
| `GET` | `/notifications/:userId` | Fetch notification history for a user |
| `PATCH` | `/notifications/:id/read` | Mark a notification as read |
| `POST` | `/matching/donors` | Find eligible donors for a blood request |
| `GET` | `/matching/eligibility/:userId` | Check donor cooldown and eligibility status |

---

## Environment Variables

Create a `.env` file in `bloodlink-backend/` based on `.env.example`:

```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Server
PORT=3000
NODE_ENV=development
```

> Never commit `.env` or `google-services.json` to version control. Both are listed in `.gitignore`.

---

## Deployment

The NestJS backend is deployed on [Render](https://render.com).

To deploy your own instance:

1. Push the `bloodlink-backend/` directory to a GitHub repository.
2. Create a new **Web Service** on Render, connected to that repo.
3. Set the build command to `npm install && npm run build` and start command to `npm run start:prod`.
4. Add all environment variables from `.env.example` under the Render service's **Environment** tab.

---

## Roadmap

| Priority | Feature |
|----------|---------|
| 🔴 High | Hospital dashboard for institutional blood requests |
| 🔴 High | Multi-language support (Bangla, Arabic) |
| 🟡 Medium | Web application (React or Next.js) |
| 🟡 Medium | Blood bank integration and inventory tracking |
| 🟢 Planned | AI-based donor ranking and smart matching |
| 🟢 Planned | Advanced analytics for donation trends |

---

## License

This project is licensed under the [MIT License](LICENSE).

Developed for educational, portfolio, and open-source learning purposes.
