<p align="center">
  <img src="../assets/logo.png" width="100" height="100" alt="BloodLink Logo" />
</p>

<h1 align="center">BloodLink Android</h1>

<p align="center">
  <strong>Native Android Client for Real-Time Blood Donation, Matching, and Emergency Messaging</strong><br>
  Built with Kotlin, Android Jetpack, MVVM Architecture, Material Design 3, and Firebase.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android-green?logo=android" alt="Platform" />
  <img src="https://img.shields.io/badge/Language-Kotlin%201.9-purple?logo=kotlin" alt="Language" />
  <img src="https://img.shields.io/badge/Architecture-MVVM-blue" alt="Architecture" />
  <img src="https://img.shields.io/badge/Min%20SDK-26%20(Android%208.0)-lightgrey" alt="Min SDK" />
  <img src="https://img.shields.io/badge/Target%20SDK-34%20(Android%2014)-darkblue" alt="Target SDK" />
  <img src="https://img.shields.io/badge/UI-Material%203-maroon" alt="Material 3" />
  <img src="https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore%20%7C%20FCM-orange?logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## Overview

**BloodLink Android** is the mobile client for the BloodLink healthcare ecosystem. Engineered specifically for donors, recipients, and field volunteers, it delivers rapid response capabilities during critical medical emergencies.

The application incorporates a robust MVVM pattern, asynchronous coroutine flows, and direct real-time communication via Cloud Firestore and Firebase Cloud Messaging (FCM).

---

## Core Capabilities

### Authentication and Donor Profile
- Secure email and password authentication powered by Firebase Authentication.
- Mandatory email verification workflow to validate donor legitimacy.
- Comprehensive donor profile configuration, including ABO/Rh blood group verification and contact information.
- Donor availability toggle enabling donors to temporarily mark themselves as unavailable.
- Automated 56-day donation cooldown tracker enforcing medical safety intervals between donations.

### Emergency Blood Requisitions
- Intuitive request generation form capturing patient name, target medical facility, required blood group, units, and schedule.
- Multi-district geographical coverage across Bangladesh with structured selectors.
- Intelligent proximity and blood compatibility matching against the registered donor pool.
- Real-time status lifecycle management (`open`, `matched`, `fulfilled`).

### Real-Time In-App Messaging
- Private 1-on-1 real-time messaging between blood requesters and prospective donors.
- Visual message delivery indicators:
  - Single checkmark: Message sent to server
  - Double checkmark: Message delivered to recipient device
  - Double blue checkmark: Message read by recipient
  - Clock icon: Message pending transmission
- Direct phone call integration allowing users to trigger standard phone dialer during urgent scenarios.

### Push Notification Handling
- Background and foreground push notification processing via Firebase Cloud Messaging (FCM).
- Compound device token indexing to support multi-device accounts and login/logout state tracking.
- Dedicated in-app notification inbox with read/unread tracking and deep navigation into associated requests.
- Automatic offline caching and synchronization upon network restoration.

### Material Design 3 Interface
- Custom healthcare-focused theme adhering to Material 3 design specifications.
- Primary Deep Crimson palette (`#C62828`) paired with neutral surfaces.
- Modern bottom navigation bar with active state animations.
- Card-based layouts optimized for readability and quick action during emergency situations.

---

## Technical Architecture

```text
  ┌─────────────────────────────────────────────────────────┐
  │                 UI Presentation Layer                   │
  │     (Activities · Fragments · ViewBinding · Adapters)   │
  └────────────────────────────┬────────────────────────────┘
                               │ Observes LiveData / StateFlow
                               ▼
  ┌─────────────────────────────────────────────────────────┐
  │                    ViewModel Layer                      │
  │           (Coroutines · LifecycleScope · State)         │
  └─────────────┬─────────────────────────────┬─────────────┘
                │                             │
                ▼                             ▼
  ┌───────────────────────────┐ ┌───────────────────────────┐
  │   Firestore Repository    │ │    Retrofit API Client    │
  │ (Real-Time Chat & Requests│ │ (NestJS Notification & BB)│
  └─────────────┬─────────────┘ └─────────────┬─────────────┘
                │                             │
                ▼                             ▼
  ┌───────────────────────────┐ ┌───────────────────────────┐
  │    Cloud Firestore DB     │ │    NestJS REST Backend    │
  └───────────────────────────┘ └───────────────────────────┘
```

---

## Technology Stack

| Layer | Library / Technology |
|---|---|
| Language | Kotlin 1.9+ |
| Architecture | Model-View-ViewModel (MVVM) |
| UI & Theming | Material Design 3, View Binding, ConstraintLayout |
| Navigation | Jetpack Navigation Component |
| Asynchronous Execution | Kotlin Coroutines and StateFlow |
| Network Communication | Retrofit 2, OkHttp 3, Gson Converter |
| Cloud Services | Firebase Authentication, Cloud Firestore, Firebase Cloud Messaging |
| Image Handling | Glide |
| Logging | Timber |

---

## Project Structure

```text
android-app/
├── app/
│   ├── src/main/
│   │   ├── java/com/project/donateblood/
│   │   │   ├── activities/          # Activity entry points (MainActivity)
│   │   │   ├── adapters/            # RecyclerView & ViewPager adapters
│   │   │   ├── fragments/           # Feature screens (Home, Chat, Request, Profile)
│   │   │   ├── model/               # Domain models (User, BloodRequest, ChatMessage)
│   │   │   ├── network/             # Retrofit interfaces and API clients
│   │   │   ├── repository/          # Remote and Firestore repositories
│   │   │   ├── viewmodel/           # Architecture ViewModels
│   │   │   └── utils/               # Constants, formatters, and helpers
│   │   │
│   │   ├── res/
│   │   │   ├── layout/              # XML UI layouts
│   │   │   ├── navigation/          # Jetpack Navigation graphs
│   │   │   ├── drawable/            # Vector graphics and brand assets
│   │   │   └── values/              # Color schemes, styles, strings, themes
│   │   │
│   │   ├── AndroidManifest.xml      # Permissions and component declarations
│   │   └── google-services.json     # Firebase client configuration (gitignored)
│   │
│   └── build.gradle.kts             # App-level build configurations and dependencies
│
├── gradle/                          # Gradle wrapper files
├── build.gradle.kts                 # Root project build configuration
└── settings.gradle.kts              # Module definitions
```

---

## Getting Started

### Prerequisites

- **Android Studio** Ladybug (2024.2+) or newer
- **Java Development Kit (JDK)**: JDK 17 or JDK 21
- **Physical Device or Emulator**: Android 8.0 (API Level 26) or higher with Google Play Services

### Configuration and Build Steps

1. Open Android Studio and select **Open**, navigating to the `android-app/` directory.
2. Download the `google-services.json` file from your Firebase project console and place it into `android-app/app/`.
3. Configure the backend API connection in `app/src/main/java/com/project/donateblood/utils/Constants.kt`:
   ```kotlin
   object Constants {
       // Android Emulator local loopback
       const val BASE_URL = "http://10.0.2.2:3000/api/"
       
       // Production API deployment URL
       // const val BASE_URL = "https://your-api-domain.com/api/"
   }
   ```
4. Build and assemble the application using Gradle:
   ```bash
   ./gradlew assembleDebug
   ```
5. Deploy to a connected device or running emulator from Android Studio or via ADB:
   ```bash
   ./gradlew installDebug
   ```

---

## Security and Privacy Guidelines

- **Credential Isolation**: No service account keys or administrative secrets are embedded within the client application.
- **Data Protection**: Direct Firestore access is constrained through Firebase Security Rules, enforcing user ownership and authentication checks.
- **Phone Number Privacy**: Phone dialer integration uses standard Android `Intent.ACTION_DIAL`, ensuring caller numbers are never transmitted without explicit user consent.

---

## License

This project is licensed under the [MIT License](../LICENSE).
