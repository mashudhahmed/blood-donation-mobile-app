<p align="center">
  <img src="assets/logo.png" width="128" height="128" alt="BloodLink Logo" />
</p>

<h1 align="center">BloodLink</h1>

<p align="center">
  <strong>Connecting Donors · Saving Lives in Real Time</strong><br>
  A production-ready full-stack mobile platform bridging the gap between blood donors and recipients through instant push notifications, intelligent donor matching, and real-time chat.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Android-Kotlin-green?logo=android" alt="Android" />
  <img src="https://img.shields.io/badge/Backend-NestJS-red?logo=nestjs" alt="Backend" />
  <img src="https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore%20%7C%20FCM-orange?logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/Chat-Real--Time-blue?logo=webrtc" alt="Chat" />
  <img src="https://img.shields.io/badge/UI-Material%203-maroon" alt="Material 3" />
  <img src="https://img.shields.io/badge/License-MIT-lightgrey" alt="License" />
  <img src="https://img.shields.io/badge/Status-Active-success" alt="Status" />
</p>

---

## Overview

**BloodLink** is an end-to-end blood donation ecosystem engineered to make urgent blood requests fast, reliable, and accessible. In medical emergencies, every minute matters. BloodLink replaces manual calls and disorganized social media posts with targeted notifications to eligible donors nearby, integrated direct messaging, and verifiable donation history.

The platform consists of:
- **Android Native Mobile Application** (`android-app/`): Modern Kotlin application with MVVM architecture, Material 3 theming, real-time messaging, and interactive request flows.
- **NestJS Notification & Matching Backend** (`backend/`): Scalable TypeScript REST API managing Firebase Admin SDK operations, donor proximity matching, and high-priority FCM notifications.
- **Firebase Cloud Infrastructure**: Firebase Authentication, Cloud Firestore real-time database, and Firebase Cloud Messaging (FCM).

---

## System Architecture

```
┌────────────────────────────────────────────────────────┐
│               Android Application                      │
│        (Kotlin · MVVM · Coroutines · Retrofit)         │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       REST API │                        │ Real-Time Sync & Auth
                ▼                        ▼
┌───────────────────────────────┐ ┌───────────────────────────────┐
│      NestJS Backend API       │ │       Firebase Services       │
│    (TypeScript · Node.js)     │ │  ├── Firebase Authentication  │
└───────────────┬───────────────┘ │  ├── Cloud Firestore Database │
                │                 │  └── Cloud Messaging (FCM)    │
                │ Firebase Admin  └───────────────┬───────────────┘
                │ SDK                             │
                ▼                                 │ Push Notifications
┌─────────────────────────────────────────────────┴───────────────┐
│                    Recipient & Donor Devices                    │
│            (Instant Alerts · WhatsApp-Style Chat)               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 🩸 Urgent Blood Requests & Matching
- Create urgent blood requests with patient details, hospital location, units needed, and precise schedule.
- Multi-district Bangladesh location coverage with structured drop-downs.
- Intelligent donor matching filtered by compatible blood groups and geographical districts.
- Full request lifecycle tracking: `open` ➔ `matched` ➔ `fulfilled`.

### 💬 Real-Time In-App Chat
- Direct 1-on-1 messaging between blood requesters and potential donors.
- **WhatsApp-style message status indicators**:
  - Single tick: Sent
  - Double tick: Delivered
  - Double blue tick: Read / Seen
- In-chat call action to instantly reach donors by phone in critical moments.

### 🔔 Smart Push Notifications (FCM)
- High-priority background alerts delivered through Firebase Cloud Messaging.
- Target notifications dispatched exclusively to matching, eligible donors.
- In-app notification center with read/unread persistence and deep navigation.

### 👤 Donor Profile & Safety Management
- Profile management with blood group verification and contact details.
- Availability toggle (Active Donor / Temporarily Unavailable).
- Donation cooldown tracker (standard 56-day safety window before next donation).

### 🎨 Modern 2026 Material 3 UI/UX
- Cohesive deep-crimson design system (`#C62828`).
- Smooth modern bottom navigation bar.
- Card-based sectioning with clean typography, iconography, and subtle elevation.

---

## Technology Stack

### Android Application (`android-app/`)
| Component | Technology |
|---|---|
| Language | Kotlin (1.9+) |
| Architecture | MVVM (Model-View-ViewModel) + Android Architecture Components |
| UI Framework | Material Design 3, View Binding, Custom Drawables |
| Asynchronous | Kotlin Coroutines & Flow |
| Networking | Retrofit 2, OkHttp 3, Gson |
| Cloud Services | Firebase Auth, Cloud Firestore, Firebase Cloud Messaging |
| Logging | Timber |

### Backend Service (`backend/`)
| Component | Technology |
|---|---|
| Framework | NestJS 10 (TypeScript) |
| Runtime | Node.js 18+ / 20+ |
| Cloud Integration | Firebase Admin SDK |
| Deployment | Render |
| Configuration | `@nestjs/config` with environment validation |

---

## Project Structure

```
blood-donation-mobile-app/
│
├── assets/                          # Official logos and project media
│   ├── logo.png                     # BloodLink emblem with card background
│   └── logo_transparent.png         # BloodLink transparent vector logo
│
├── android-app/                     # Native Android application
│   ├── app/
│   │   ├── src/main/java/           # Kotlin source code
│   │   │   └── com/project/donateblood/
│   │   │       ├── activities/      # App activities (MainActivity)
│   │   │       ├── adapters/        # RecyclerView & ViewPager adapters
│   │   │       ├── fragments/       # Feature fragments (Home, Chat, Request, etc.)
│   │   │       ├── model/           # Data models & DTOs
│   │   │       ├── network/         # Retrofit API interfaces & clients
│   │   │       ├── repository/      # Firestore & API repositories
│   │   │       └── viewmodel/       # Architecture ViewModels
│   │   ├── src/main/res/            # Layouts, drawables, fonts, themes
│   │   └── google-services.json     # Firebase client configuration (gitignored)
│   └── build.gradle.kts
│
└── backend/                         # NestJS API backend
    ├── src/
    │   ├── firebase/                # Firebase Admin SDK module & provider
    │   ├── notifications/           # Push notification controller & service
    │   └── main.ts                  # Application bootstrap entrypoint
    ├── .env.example                 # Environment variables template
    └── package.json
```

---

## Getting Started

### Prerequisites
- **Android Studio** Ladybug (2024.2+) or later
- **JDK 17** or **JDK 21**
- **Node.js** 18+ and **npm**
- Firebase project with **Authentication**, **Cloud Firestore**, and **Cloud Messaging (FCM)** enabled

---

### Backend Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mashudhahmed/blood-donation-mobile-app.git
   cd blood-donation-mobile-app/backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Add your Firebase service account details in `.env`:
   ```env
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the backend**:
   ```bash
   # Development mode with hot-reload
   npm run start:dev
   ```

---

### Android Application Setup

1. Open Android Studio and choose **Open**, selecting the `android-app/` folder.
2. Download your `google-services.json` from the Firebase Console and place it in `android-app/app/`.
3. In `android-app/app/src/main/java/com/project/donateblood/utils/Constants.kt`, verify the API base URL:
   ```kotlin
   const val BASE_URL = "http://10.0.2.2:3000/" // Android Emulator
   // OR your deployed backend URL: "https://bloodlink-api.onrender.com/"
   ```
4. Build and run on an Android device or emulator (Android 8.0+, API 26+):
   ```bash
   ./gradlew assembleDebug
   ```

---

## API Endpoints

Base URL: `https://your-backend.onrender.com` (or `http://localhost:3000`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/notifications/send` | Dispatches push notifications to matching donors |
| `POST` | `/notifications/register` | Registers or updates a device FCM token |
| `GET` | `/notifications/:userId` | Retrieves persistent notification history |
| `PATCH` | `/notifications/:id/read` | Marks an in-app notification as read |
| `POST` | `/matching/donors` | Evaluates blood group and district compatibility |
| `GET` | `/matching/eligibility/:userId` | Verifies donor cooldown status |

---

## Roadmap

- [x] Official BloodLink visual branding & logo integration
- [x] Redesigned Material 3 Crimson theme & bottom navigation
- [x] Real-time 1-on-1 chat with WhatsApp-style delivery indicators
- [x] Card-based Request Blood submission flow
- [ ] Hospital & Blood Bank institutional verification dashboard
- [ ] Emergency SOS one-tap broadcast widget
- [ ] Multi-language support (Bangla & English localization)

---

## License

This project is licensed under the [MIT License](LICENSE).  
Developed for educational, open-source, and humanitarian impact purposes.
