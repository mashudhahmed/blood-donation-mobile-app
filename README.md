<p align="center">
  <img src="assets/logo.png" width="128" height="128" alt="BloodLink Logo" />
</p>

<h1 align="center">BloodLink</h1>

<p align="center">
  <strong>Connecting Donors · Saving Lives in Real Time</strong><br>
  An enterprise-grade, full-stack healthcare ecosystem connecting blood donors, recipients, hospitals, and blood banks through real-time communication, intelligent donor matching, and cloud-synchronized operations.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Android-Kotlin-green?logo=android" alt="Android" />
  <img src="https://img.shields.io/badge/Web%20Portal-Next.js%2015-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Backend-NestJS%2010-red?logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/Database-Cloud%20Firestore-orange?logo=firebase" alt="Firestore" />
  <img src="https://img.shields.io/badge/Notifications-FCM-yellow?logo=firebase" alt="FCM" />
  <img src="https://img.shields.io/badge/Design-Material%203%20%7C%20Tailwind-maroon" alt="Design" />
  <img src="https://img.shields.io/badge/License-MIT-lightgrey" alt="License" />
  <img src="https://img.shields.io/badge/Status-Active-success" alt="Status" />
</p>

---

## Overview

**BloodLink** is an end-to-end digital blood donation and management ecosystem engineered to accelerate response times during critical medical emergencies. In critical healthcare scenarios, minutes dictate clinical outcomes. BloodLink replaces manual communication chains and unverified social media solicitations with automated donor proximity matching, institutional inventory tracking, and low-latency notification dispatching.

The platform unites three core subsystems:

1. **Android Native Client (`android-app/`)**: High-performance mobile application built with Kotlin, Jetpack Navigation, MVVM architecture, Material Design 3 crimson styling, and real-time messaging with delivery confirmation.
2. **Next.js Web Operations Portal (`frontend/`)**: Institutional web portal built with Next.js 15, React 19, TypeScript, and Tailwind CSS. Provides dedicated workflows for Hospital emergency requisitions, Blood Bank 8-group stock matrix management, and Platform Administrator governance.
3. **NestJS Enterprise Backend API (`backend/`)**: High-throughput REST API and notification gateway built with NestJS 10 and TypeScript. Features Firebase Admin SDK integration, multi-device FCM push dispatching, ABO/Rh compatibility algorithms, and OpenAPI Swagger documentation.

---

## System Architecture

```text
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│        Android Mobile Client         │     │         Next.js Web Portal           │
│  (Donors · Requesters · Volunteers)  │     │(Hospitals · Blood Banks · Admins)    │
└──────────────────┬───────────────────┘     └──────────────────┬───────────────────┘
                   │                                            │
          REST API │ Real-Time Sync                    REST API │ Real-Time Sync
          & FCM    │ & Authentication                  Requests │ & Authentication
                   │                                            │
                   ▼                                            ▼
┌──────────────────────────────────────┐     ┌──────────────────────────────────────┐
│       NestJS Backend API Gateway     │     │      Google Cloud & Firebase         │
│     (Global Prefix: /api · CORS)     │◄───►│  ├── Firebase Authentication         │
│  ├── Notifications & FCM Dispatcher  │     │  ├── Cloud Firestore (Sync DB)       │
│  ├── Donor Proximity Matching Engine │     │  └── Firebase Cloud Messaging (FCM)  │
│  ├── Hospital & Blood Bank Services  │     └──────────────────────────────────────┘
│  └── Role-Based Access Control (RBAC)│
└──────────────────────────────────────┘
```

---

## Key Subsystems and Features

### 1. Android Mobile Application (`android-app/`)
- **Emergency Requests**: Rapid submission of urgent blood requisitions with patient details, facility location, units required, and scheduled date/time.
- **Intelligent Donor Matching**: Automatic filtering of donors based on geographical district proximity and ABO/Rh compatibility.
- **Real-Time 1-on-1 Messaging**: Low-latency communication between donors and requesters featuring delivery indicators:
  - Single checkmark: Sent to server
  - Double checkmark: Delivered to recipient device
  - Double blue checkmark: Read by recipient
- **Direct Phone Dialer**: Integrated phone call trigger for rapid coordination during critical moments.
- **Donor Safety Engine**: Mandatory 56-day cooldown interval enforcement between blood donations.
- **Availability Controls**: Donor toggle to switch between active and temporarily unavailable states.
- **Push Notification Inbox**: Dedicated notification center with unread badges, deep navigation, and offline synchronization.

### 2. Institutional Web Portal (`frontend/`)
- **Hospital Operations Portal (`/hospital`)**:
  - Emergency blood requisitions management.
  - Multi-facility blood inventory visibility across regional blood banks.
  - Requisition lifecycle tracking (`pending`, `matched`, `dispatched`, `fulfilled`).
  - Clinical department staff accounts and role delegation.
- **Blood Bank Management Portal (`/bloodbank`)**:
  - Live 8-group ABO/Rh stock matrix card (`BloodMatrixCard`) for A+, A-, B+, B-, AB+, AB-, O+, O-.
  - Direct unit adjustment modal workflows with audit logging.
  - Critical reserve threshold alerts to prevent inventory depletion.
  - Requisition fulfillment and donation drive scheduling.
  - Blood bank technician and staff management.
- **Administrator Governance Console (`/admin`)**:
  - Verification workflow for approving or rejecting hospital and blood bank credentials.
  - Donor directory with district and blood group filters.
  - Platform telemetry (total donors, donation counts, fulfillment velocity).
  - Centralized administrative and system audit logs.
- **Design and Reliability**:
  - Standardized confirmation dialog system (`ConfirmModal`) for destructive and clinical actions.
  - Client-side role authorization guards (`RoleGuard`) with zero-flash loading states.
  - Enterprise healthcare color tokens: Deep Crimson (`#C62828`), Midnight Slate (`#0B1528`).

### 3. Backend Integration Engine (`backend/`)
- **Push Notification Gateway**: Account-specific FCM dispatching, multi-device token indexing, and requester notification suppression.
- **Matching Engine**: Clinical blood group compatibility matrices combined with district proximity filtering.
- **OpenAPI Swagger Documentation**: Interactive API testing available at `/api/docs`.
- **Enterprise Security**: Firebase Bearer token validation, role-based guards, and parameter whitelisting via validation pipes.

---

## Technology Stack

| Domain | Layer / Tool | Technology |
|---|---|---|
| **Android Client** | Language | Kotlin 1.9+ |
| | Architecture | Model-View-ViewModel (MVVM) |
| | UI & Components | Material Design 3, View Binding, Jetpack Navigation |
| | Asynchronous | Kotlin Coroutines, StateFlow |
| | Network & Cloud | Retrofit 2, OkHttp 3, Firebase SDK (Auth, Firestore, FCM) |
| **Web Portal** | Framework | Next.js 15 (App Router), React 19 |
| | Language | TypeScript 5 |
| | Styling | Tailwind CSS 3.4 |
| | Cloud & State | Firebase Client SDK (Firestore, Auth), React Context |
| | UI Components | Lucide Icons, Custom Reusable Component System |
| **Backend API** | Framework | NestJS 10 |
| | Language | TypeScript 5 |
| | Runtime | Node.js 18.x / 20.x (LTS) |
| | Cloud SDK | Firebase Admin SDK |
| | Documentation | OpenAPI 3.0 / Swagger |

---

## Repository Structure

```text
blood-donation-mobile-app/
│
├── assets/                          # Brand logos and visual identity assets
│   ├── logo.png                     # Standard emblem
│   └── logo_transparent.png         # Vector transparent emblem
│
├── android-app/                     # Native Android client
│   ├── app/
│   │   ├── src/main/java/           # Kotlin source code
│   │   │   └── com/project/donateblood/
│   │   │       ├── activities/      # Activity entrypoints
│   │   │       ├── adapters/        # UI adapters for lists and chats
│   │   │       ├── fragments/       # Presentation fragments
│   │   │       ├── model/           # Data models and DTOs
│   │   │       ├── network/         # Retrofit interfaces
│   │   │       ├── repository/      # Firestore & API repositories
│   │   │       ├── utils/           # Helpers and constants
│   │   │       └── viewmodel/       # MVVM state holders
│   │   ├── src/main/res/            # Layouts, themes, drawables, fonts
│   │   └── google-services.json     # Firebase client configuration
│   └── build.gradle.kts
│
├── backend/                         # NestJS REST API and notification service
│   ├── src/
│   │   ├── admin/                   # Platform analytics and verification
│   │   ├── auth/                    # RBAC guards and authentication
│   │   ├── blood/                   # ABO/Rh compatibility rules
│   │   ├── bloodbank/               # Blood bank inventory and adjustments
│   │   ├── chat/                    # Web-to-mobile messaging bridge
│   │   ├── firebase/                # Firebase Admin SDK configuration
│   │   ├── hospital/                # Clinical requisitions and staff
│   │   ├── matching/                # Proximity and donor matching
│   │   ├── notifications/           # FCM notification dispatcher
│   │   ├── app.module.ts            # Root NestJS module
│   │   └── main.ts                  # Bootstrap entrypoint & Swagger setup
│   ├── tsconfig.json
│   └── package.json
│
└── frontend/                        # Next.js 15 Institutional Web Portal
    ├── app/
    │   ├── admin/                   # Governance console
    │   ├── bloodbank/               # Blood stock matrix and adjustments
    │   ├── hospital/                # Requisition workflows
    │   ├── login/                   # Unified role-based sign-in
    │   ├── globals.css              # Global Tailwind styles
    │   └── layout.tsx               # Root layout and auth provider
    ├── components/                  # Reusable UI component library
    │   ├── BloodMatrixCard.tsx      # 8-group stock matrix
    │   ├── ConfirmModal.tsx         # Accessible modal dialog
    │   ├── DashboardSidebar.tsx     # Collapsible navigation
    │   ├── DirectChatModal.tsx      # Coordinator messaging
    │   └── RoleGuard.tsx            # Route authorization wrapper
    ├── lib/                         # Firebase client initialization and types
    ├── tailwind.config.ts
    └── package.json
```

---

## Getting Started

### Prerequisites

- **Java Development Kit (JDK)**: JDK 17 or JDK 21
- **Android Studio**: Ladybug (2024.2+) or newer
- **Node.js**: Node.js 18.x or 20.x (LTS)
- **Firebase Project**: Configured with Authentication, Cloud Firestore, and Cloud Messaging (FCM)

---

### 1. Backend Setup (`backend/`)

```bash
cd backend
npm install
```

Configure your environment file `backend/.env`:
```env
PORT=3000
NODE_ENV=development
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Start the service:
```bash
npm run start:dev
```
- API Base URL: `http://localhost:3000/api`
- Swagger Documentation: `http://localhost:3000/api/docs`

---

### 2. Web Portal Setup (`frontend/`)

```bash
cd frontend
npm install
```

Configure environment file `frontend/.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

Start the development server:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

### 3. Android Application Setup (`android-app/`)

1. Open Android Studio and select the `android-app/` directory.
2. Place the `google-services.json` file inside `android-app/app/`.
3. Verify the API target URL in `app/src/main/java/com/project/donateblood/utils/Constants.kt`:
   ```kotlin
   object Constants {
       const val BASE_URL = "http://10.0.2.2:3000/api/" // Android Emulator
   }
   ```
4. Build the application:
   ```bash
   ./gradlew assembleDebug
   ```

---

## API Overview

All routes use the `/api` prefix and are documented via OpenAPI at `/api/docs`.

| Subsystem | Method | Route | Description |
|---|---|---|---|
| **Auth** | `POST` | `/api/auth/register` | Register enterprise account |
| | `POST` | `/api/auth/login` | Authenticate and obtain JWT token |
| | `GET` | `/api/auth/me` | Fetch authenticated profile claims |
| **Notifications** | `POST` | `/api/notifications/blood-request` | Match donors and dispatch high-priority alerts |
| | `POST` | `/api/notifications/save-token` | Register or update FCM device token |
| | `GET` | `/api/notifications/health` | Service health status |
| **Hospitals** | `POST` | `/api/hospitals/requisitions` | Create emergency blood requisition |
| | `GET` | `/api/hospitals/requisitions` | List facility requisitions |
| | `PATCH` | `/api/hospitals/requisitions/:id/status` | Update requisition lifecycle state |
| | `GET` | `/api/hospitals/compatible-donors` | Find compatible nearby donors |
| **Blood Banks** | `GET` | `/api/bloodbanks/inventory` | Retrieve current 8-group stock levels |
| | `POST` | `/api/bloodbanks/inventory/adjust` | Record stock intake, dispatch, or expiration |
| | `GET` | `/api/bloodbanks/transactions` | Query stock movement audit trail |
| | `POST` | `/api/bloodbanks/drives` | Schedule public blood donation drive |
| **Admin** | `GET` | `/api/admin/metrics` | Retrieve platform-wide operational telemetry |
| | `GET` | `/api/admin/organizations` | List institutions with verification state |
| | `PATCH` | `/api/admin/organizations/:id/verify` | Approve or reject institutional credentials |
| | `GET` | `/api/admin/donors` | Filter registered donor accounts |

---

## Development Roadmap

- [x] Android Client Material Design 3 crimson theme and navigation
- [x] Real-time 1-on-1 chat with delivery and read indicators
- [x] Proximity and blood group donor matching engine
- [x] Account-specific FCM push notification dispatching
- [x] Next.js 15 institutional portal for Hospitals, Blood Banks, and Admins
- [x] Real-time 8-group ABO/Rh stock matrix with instant adjustment modals
- [x] Standardized confirmation modals for critical clinical actions
- [x] Institutional legal verification and administrative audit logging
- [ ] Emergency SOS one-tap broadcast widget for mobile client
- [ ] Multi-language support (Bangla and English localization)

---

## License

This project is licensed under the [MIT License](LICENSE).  
Developed for healthcare impact, educational research, and open-source contributions.
