<p align="center">
  <img src="../assets/logo.png" width="100" height="100" alt="BloodLink Logo" />
</p>

<h1 align="center">BloodLink Backend API</h1>

<p align="center">
  <strong>High-Performance Healthcare API, Donor Matching Engine, and Push Notification Gateway</strong><br>
  Built with NestJS 10, TypeScript 5, Firebase Admin SDK, and Swagger OpenApi.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Firebase-Admin%20SDK-FFCA28?logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/Node.js-20-339933?logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/OpenAPI-Swagger-85EA2D?logo=swagger" alt="Swagger" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## Overview

The **BloodLink Backend** is the core integration and orchestration engine powering the BloodLink platform. It coordinates clinical workflows across the native Android mobile application and the Next.js institutional web portal.

The backend exposes a secure REST API with global route prefix `/api`, OpenAPI Swagger interactive documentation at `/api/docs`, role-based access control (RBAC), intelligent ABO/Rh blood compatibility matching, and low-latency push notification dispatching via Firebase Cloud Messaging (FCM).

---

## Architectural Modules

The backend is organized into decoupled domain modules:

- **Notifications Module (`src/notifications/`)**: Manages device token registration, multi-device tracking, compound token indexing, and targeted FCM notification dispatching with automatic requester exclusion.
- **Matching Module (`src/matching/`)**: Calculates ABO/Rh blood compatibility and geographical proximity (district-level filtering) to identify eligible donors for critical requisitions.
- **Blood Bank Module (`src/bloodbank/`)**: Maintains live 8-group blood stock levels, logs inventory intake/dispatch transactions, handles walk-in donation records, and manages internal staff positions.
- **Hospital Module (`src/hospital/`)**: Processes emergency blood requisitions, queries compatible nearby donors, updates fulfillment lifecycles, and maintains clinical staff records.
- **Admin Module (`src/admin/`)**: Aggregates platform-wide telemetry, facilitates legal verification workflows for hospitals and blood banks, and queries system audit trails.
- **Auth Module (`src/auth/`)**: Provides enterprise authentication, Firebase token validation, role guards (`ADMIN`, `HOSPITAL`, `BLOOD_BANK`), and user credential management.
- **Chat Module (`src/chat/`)**: Bridges web portal institutional staff with mobile donors through synchronized Firestore conversation queries.
- **Firebase Module (`src/firebase/`)**: Initializes and encapsulates Firebase Admin SDK credentials and exposes Firestore and Messaging singletons.

---

## Architecture Diagram

```text
  ┌───────────────────────────┐         ┌───────────────────────────┐
  │     Android Mobile App    │         │    Next.js Web Portal     │
  │    (Donors & Requesters)  │         │(Admin, Hospital, BloodBank│
  └─────────────┬─────────────┘         └─────────────┬─────────────┘
                │                                     │
                │ HTTPS REST API requests             │ HTTPS REST API requests
                ▼                                     ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │                   BloodLink NestJS Gateway                      │
  │                 (Global Prefix: /api, CORS)                     │
  │  ┌────────────────────┐ ┌────────────────────┐ ┌─────────────┐  │
  │  │ FirebaseAuthGuard  │ │    RolesGuard      │ │ Validation  │  │
  │  └────────────────────┘ └────────────────────┘ └─────────────┘  │
  └─────────────┬─────────────────────────────────────┬─────────────┘
                │                                     │
                │ Internal Modules & Services         │
                ▼                                     ▼
  ┌───────────────────────────┐         ┌───────────────────────────┐
  │ Matching & Notifications  │         │ Clinical Operations       │
  │  - DonorMatchingService   │         │  - HospitalService        │
  │  - BloodCompatibility     │         │  - BloodBankService       │
  │  - FCM Notification Engine│         │  - AdminService           │
  └─────────────┬─────────────┘         └─────────────┬─────────────┘
                │                                     │
                ▼                                     ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │                    Firebase Admin SDK Tier                      │
  │     - Cloud Firestore (Real-time storage & audit trails)        │
  │     - Firebase Cloud Messaging (High-priority push delivery)    │
  └─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Component | Specification |
|---|---|
| Runtime | Node.js 18.x / 20.x (LTS) |
| Framework | NestJS 10.x |
| Language | TypeScript 5.x |
| Cloud Services | Firebase Admin SDK (Firestore, FCM, Auth) |
| API Specification | OpenAPI 3.0 via `@nestjs/swagger` |
| Security | Helmet, CORS, Class-Validator, Custom Role Guards |
| Configuration | `@nestjs/config` with strict environment variable validation |

---

## Project Structure

```text
backend/
├── src/
│   ├── admin/                       # Platform analytics, verification, audit logs
│   │   ├── admin.controller.ts
│   │   ├── admin.module.ts
│   │   └── admin.service.ts
│   │
│   ├── auth/                        # Enterprise authentication & RBAC guards
│   │   ├── dto/
│   │   │   └── auth.dto.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── roles.decorator.ts
│   │   └── roles.guard.ts
│   │
│   ├── blood/                       # ABO/Rh compatibility rules & matrices
│   │   ├── blood-compatibility.service.ts
│   │   └── blood.module.ts
│   │
│   ├── bloodbank/                   # 8-group inventory matrix, adjustments, staff
│   │   ├── dto/
│   │   ├── bloodbank.controller.ts
│   │   ├── bloodbank.module.ts
│   │   └── bloodbank.service.ts
│   │
│   ├── chat/                        # Messaging bridges between portal & app
│   │   ├── chat.controller.ts
│   │   ├── chat.module.ts
│   │   └── chat.service.ts
│   │
│   ├── firebase/                    # Firebase Admin SDK initialization & guards
│   │   ├── firebase-auth.guard.ts
│   │   ├── firebase.module.ts
│   │   └── firebase.service.ts
│   │
│   ├── hospital/                    # Clinical requisitions, matching, staff
│   │   ├── dto/
│   │   ├── hospital.controller.ts
│   │   ├── hospital.module.ts
│   │   └── hospital.service.ts
│   │
│   ├── matching/                    # Geographical & blood-type matching engine
│   │   ├── donor-matching.service.ts
│   │   └── matching.module.ts
│   │
│   ├── notifications/               # FCM push dispatcher & token indexing
│   │   ├── notifications.controller.ts
│   │   ├── notifications.module.ts
│   │   └── notifications.service.ts
│   │
│   ├── types/                       # Shared domain models & interfaces
│   │   └── donor.interface.ts
│   │
│   ├── app.module.ts                # Root application module
│   └── main.ts                      # Application bootstrap & Swagger config
│
├── test/                            # End-to-end integration test suites
├── tsconfig.json
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** 18 or 20 LTS
- **npm** 9 or later
- A Google Cloud / Firebase service account with permissions for **Firebase Authentication**, **Cloud Firestore**, and **Firebase Cloud Messaging**.

### Environment Setup

Create a `.env` file in the `backend/` directory:

```env
PORT=3000
NODE_ENV=development

# Firebase Admin Service Account Credentials
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional JSON-formatted Service Account Alternative
# FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

### Installation and Execution

```bash
# Install dependencies
npm install

# Run in development mode with hot-reload
npm run start:dev

# Compile TypeScript to production output
npm run build

# Start production server
npm run start:prod
```

Once running:
- **API Base URL**: `http://localhost:3000/api`
- **Swagger Interactive Documentation**: `http://localhost:3000/api/docs`
- **Health Check Endpoint**: `http://localhost:3000/api/notifications/health`

---

## API Reference

All routes are mounted under the `/api` global prefix.

### Authentication (`/api/auth`)

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register an enterprise account (Hospital, Blood Bank, Admin) | No |
| `POST` | `/api/auth/login` | Authenticate credentials and receive JWT session token | No |
| `GET` | `/api/auth/me` | Fetch authenticated caller claims and profile | Bearer Token |

### Notifications & Push Alerts (`/api/notifications`)

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/notifications/blood-request` | Match donors and dispatch high-priority FCM emergency alerts | Bearer Token |
| `POST` | `/api/notifications/save-token` | Register or update FCM device token with compound indexing | Bearer Token |
| `POST` | `/api/notifications/register-token` | Register donor FCM token and hardware metadata | Bearer Token |
| `POST` | `/api/notifications/matching-stats` | Preview matching counts and compatibility before dispatch | No |
| `POST` | `/api/notifications/validate-token` | Inspect registration and validity status of a user's FCM token | No |
| `POST` | `/api/notifications/logout` | Mark user logged out while preserving token for emergency reach | Bearer Token |
| `POST` | `/api/notifications/login` | Mark user active and update device connection state | Bearer Token |
| `GET` | `/api/notifications/health` | Service health telemetry and capability checklist | No |

### Blood Bank Management (`/api/bloodbanks`)

| Method | Route | Description | Role Required |
|---|---|---|---|
| `GET` | `/api/bloodbanks/inventory` | Retrieve current 8-group stock levels and threshold alerts | `BLOOD_BANK`, `ADMIN` |
| `POST` | `/api/bloodbanks/inventory/adjust` | Record blood intake, dispatch, or expiration movement | `BLOOD_BANK`, `ADMIN` |
| `GET` | `/api/bloodbanks/transactions` | Query audit trail of stock modifications | `BLOOD_BANK`, `ADMIN` |
| `POST` | `/api/bloodbanks/drives` | Schedule public blood donation drive campaign | `BLOOD_BANK`, `ADMIN` |
| `GET` | `/api/bloodbanks/drives` | List active and upcoming donation drives | `BLOOD_BANK`, `ADMIN` |
| `POST` | `/api/bloodbanks/donations/record` | Record walk-in donor collection and update eligibility interval | `BLOOD_BANK`, `ADMIN` |
| `GET` | `/api/bloodbanks/staff` | List position and operator accounts for this blood bank | `BLOOD_BANK`, `ADMIN` |
| `POST` | `/api/bloodbanks/staff` | Create new position account under facility | `BLOOD_BANK`, `ADMIN` |
| `PATCH` | `/api/bloodbanks/staff/:id/status` | Activate or deactivate staff member account | `BLOOD_BANK`, `ADMIN` |
| `DELETE` | `/api/bloodbanks/staff/:id` | Remove staff member account | `BLOOD_BANK`, `ADMIN` |

### Hospital Operations (`/api/hospitals`)

| Method | Route | Description | Role Required |
|---|---|---|---|
| `POST` | `/api/hospitals/requisitions` | Create urgent blood requisition and alert matching donors | `HOSPITAL`, `ADMIN` |
| `GET` | `/api/hospitals/requisitions` | List facility requisitions filtered by status | `HOSPITAL`, `ADMIN` |
| `PATCH` | `/api/hospitals/requisitions/:id/status` | Advance status (`pending`, `matched`, `dispatched`, `fulfilled`) | `HOSPITAL`, `ADMIN` |
| `GET` | `/api/hospitals/compatible-donors` | Query nearby compatible registered donors | `HOSPITAL`, `ADMIN` |
| `GET` | `/api/hospitals/profile` | Get current hospital profile and contact details | `HOSPITAL`, `ADMIN` |
| `GET` | `/api/hospitals/staff` | List staff accounts under this hospital | `HOSPITAL`, `ADMIN` |
| `POST` | `/api/hospitals/staff` | Create new clinical staff account | `HOSPITAL`, `ADMIN` |
| `PATCH` | `/api/hospitals/staff/:id/status` | Toggle clinical staff account status | `HOSPITAL`, `ADMIN` |
| `DELETE` | `/api/hospitals/staff/:id` | Remove clinical staff account | `HOSPITAL`, `ADMIN` |

### Administrator Governance (`/api/admin`)

| Method | Route | Description | Role Required |
|---|---|---|---|
| `GET` | `/api/admin/metrics` | Platform analytics (total donors, active requests, fulfillment) | `ADMIN` |
| `GET` | `/api/admin/organizations` | List registered hospitals and blood banks with verification state | `ADMIN` |
| `PATCH` | `/api/admin/organizations/:id/verify` | Approve or reject institutional verification credentials | `ADMIN` |
| `GET` | `/api/admin/donors` | Query and filter donor records by district or blood group | `ADMIN` |
| `PATCH` | `/api/admin/donors/:id/status` | Modify donor availability or administrative suspension | `ADMIN` |
| `GET` | `/api/admin/audit-logs` | Retrieve recent administrative and system audit logs | `ADMIN` |

### Messaging Bridge (`/api/messages`)

| Method | Route | Description | Role Required |
|---|---|---|---|
| `GET` | `/api/messages/conversations` | List active conversations involving the authenticated account | Authenticated |
| `GET` | `/api/messages/conversations/:id/messages` | Retrieve chronological message history for a conversation | Authenticated |
| `POST` | `/api/messages/conversations/:id/send` | Transmit message to mobile donor via Firestore sync | Authenticated |

---

## Security Model

1. **Server-Side Credentials**: Firebase service account keys reside exclusively in backend environment variables and are never transmitted to web or mobile clients.
2. **Role-Based Access Control**: Sensitive clinical and administrative endpoints are protected by `FirebaseAuthGuard` and `RolesGuard`.
3. **Payload Sanitization**: Incoming request bodies are filtered through NestJS `ValidationPipe` with automatic property whitelisting.
4. **Audit Logging**: Stock movements, credential approvals, and requisition lifecycle updates write unalterable timestamped audit records to Firestore.

---

## License

This project is licensed under the [MIT License](../LICENSE).
