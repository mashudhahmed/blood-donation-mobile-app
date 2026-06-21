# BloodLink Android

![Platform](https://img.shields.io/badge/Platform-Android-green?logo=android)
![Language](https://img.shields.io/badge/Language-Kotlin-purple?logo=kotlin)
![Architecture](https://img.shields.io/badge/Architecture-MVVM-blue)
![Firebase](https://img.shields.io/badge/Firebase-Enabled-orange?logo=firebase)
![Min SDK](https://img.shields.io/badge/Min%20SDK-26-lightgrey)
![Status](https://img.shields.io/badge/Status-Active-success)

> The Android client for BloodLink — a blood donation platform that connects donors and recipients through real-time push notifications and intelligent blood group matching.



## Overview

BloodLink Android is the mobile front-end of the BloodLink platform. It allows users to register as blood donors, post urgent blood requests, receive instant push notifications when a match is found, and track their donation history — all in a clean, fast native Android experience.

The app communicates with a [NestJS backend](../bloodlink-backend/) for donor matching and push notifications, and uses Firebase directly for authentication, real-time data sync, and FCM delivery.

---

## Screenshots

| Home | Blood Request | Notifications | Profile |
|------|--------------|---------------|---------|
| ![Home](screenshots/home.png) | ![Request](screenshots/request.png) | ![Notifications](screenshots/notifications.png) | ![Profile](screenshots/profile.png) |

> Screenshots coming soon. Download the APK from [Releases](https://github.com/your-username/bloodlink-android/releases) to try it now.

---

## Features

### Authentication
- Email and password registration via Firebase Auth
- Email verification before account activation
- Persistent login session management

### Donor Profile
- Blood group selection and registration
- Availability toggle (active / unavailable)
- Donation history with timestamps
- Cooldown enforcement (56-day eligibility window)

### Blood Requests
- Create requests specifying blood group, quantity, and urgency
- Browse and filter open requests by blood group
- Request status tracking (open → matched → fulfilled)

### Notifications
- Real-time FCM push notifications for matching blood requests
- In-app notification center with read/unread state
- Offline support — notifications queued and delivered on reconnect

### Support
- In-app feedback submission
- FAQ section
- Privacy policy and About Us

---

## Tech Stack

| Library / Tool | Version | Purpose |
|----------------|---------|---------|
| Kotlin | 1.9+ | Primary language |
| Android Navigation Component | 2.7+ | Fragment navigation and back stack |
| View Binding | — | Type-safe view access |
| ViewModel + LiveData | — | MVVM state management |
| Firebase Authentication | — | User login and registration |
| Firebase Firestore | — | Real-time NoSQL database |
| Firebase Cloud Messaging | — | Push notification delivery |
| Retrofit | 2.9+ | HTTP client for backend API |
| OkHttp | 4.x | HTTP interceptor and logging |
| Timber | 5.x | Debug logging |

---

## Project Structure

```
bloodlink-android/
│
├── app/
│   ├── src/main/
│   │   ├── java/com/bloodlink/
│   │   │   ├── ui/
│   │   │   │   ├── auth/            # Login, Register, Verify screens
│   │   │   │   ├── home/            # Home dashboard fragment
│   │   │   │   ├── request/         # Create and view blood requests
│   │   │   │   ├── notifications/   # Notification center
│   │   │   │   └── profile/         # User profile and settings
│   │   │   │
│   │   │   ├── viewmodels/
│   │   │   │   ├── AuthViewModel.kt
│   │   │   │   ├── RequestViewModel.kt
│   │   │   │   ├── NotificationViewModel.kt
│   │   │   │   └── ProfileViewModel.kt
│   │   │   │
│   │   │   ├── repository/
│   │   │   │   ├── AuthRepository.kt
│   │   │   │   ├── RequestRepository.kt
│   │   │   │   └── NotificationRepository.kt
│   │   │   │
│   │   │   ├── firebase/
│   │   │   │   ├── FirestoreService.kt
│   │   │   │   └── FCMService.kt    # FirebaseMessagingService impl
│   │   │   │
│   │   │   ├── model/               # Data classes (User, Request, Notification)
│   │   │   ├── network/             # Retrofit API interface and client
│   │   │   └── utils/               # Constants, extensions, helpers
│   │   │
│   │   └── res/
│   │       ├── layout/              # XML layouts
│   │       ├── navigation/          # Nav graph
│   │       ├── drawable/            # Icons and shapes
│   │       └── values/              # Colors, strings, themes
│   │
│   ├── google-services.json         # Firebase config (not committed — see setup)
│   └── build.gradle
│
└── build.gradle
```

---

## Getting Started

### Prerequisites

- Android Studio **Hedgehog (2023.1.1)** or later
- JDK 17
- Android device or emulator running **API 26 (Android 8.0)** or higher
- A Firebase project — see [Firebase Setup](#firebase-setup)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/bloodlink.git
cd bloodlink/bloodlink-android
```

1. Open the `bloodlink-android/` folder in Android Studio.
2. Add your `google-services.json` to `app/` (see [Firebase Setup](#firebase-setup)).
3. Set the backend base URL in `app/src/main/java/com/bloodlink/utils/Constants.kt`:

```kotlin
object Constants {
    const val BASE_URL = "https://bloodlink-api.onrender.com/" // or http://10.0.2.2:3000/ for local
}
```

4. Click **Run ▶** or build an APK via **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

### Download APK

Pre-built debug APKs are available in [Releases](https://github.com/your-username/bloodlink/releases). No build step required — just install and run.

> Enable **Install unknown apps** on your device if prompted.

---

## Firebase Setup

1. Go to the [Firebase Console](https://console.firebase.google.com) and create a project.
2. Register an Android app with your package name (e.g. `com.bloodlink`).
3. Download `google-services.json` and place it in `bloodlink-android/app/`.
4. Enable the following Firebase services:
   - **Authentication** → Email/Password provider
   - **Firestore Database** → Start in test mode, then apply security rules
   - **Cloud Messaging** → No extra config needed

### Firestore Security Rules (recommended)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /requests/{requestId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /notifications/{notifId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Build Variants

| Variant | BASE_URL | Logging | Description |
|---------|----------|---------|-------------|
| `debug` | `http://10.0.2.2:3000/` | Enabled (Timber) | Local development |
| `release` | `https://bloodlink-api.onrender.com/` | Disabled | Production build |

Build variants are configured in `app/build.gradle` under `buildTypes`.

---

## Architecture

The app follows **MVVM (Model-View-ViewModel)** with a Repository pattern:

```
UI Layer (Fragments / Activities)
        │  observes LiveData
        ▼
ViewModel Layer
        │  calls
        ▼
Repository Layer
        │              │
        ▼              ▼
  Firebase SDK     Retrofit API
  (Auth, Firestore, FCM)   (NestJS Backend)
```

- **UI** observes `LiveData` from ViewModels — no direct data access
- **ViewModels** hold UI state and survive configuration changes
- **Repositories** abstract data sources (Firebase vs REST API)
- **FCMService** extends `FirebaseMessagingService` to handle incoming push notifications and update Firestore

---

## License

This project is licensed under the [MIT License](../LICENSE).

Developed for educational, portfolio, and open-source learning purposes.
