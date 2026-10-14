<p align="center">
  <img src="../assets/logo.png" width="100" height="100" alt="BloodLink Logo" />
</p>

<h1 align="center">BloodLink Web Portal</h1>

<p align="center">
  <strong>Institutional Healthcare Dashboard for Hospitals, Blood Banks, and Administrators</strong><br>
  Built with Next.js 15, React 19, TypeScript, Tailwind CSS, and Cloud Firestore.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase" alt="Firestore" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## Overview

The **BloodLink Web Portal** is the centralized web operations platform of the BloodLink ecosystem. It equips healthcare facilities, blood banks, and platform administrators with tools for blood inventory management, emergency requisition routing, donor-matching visibility, and institutional governance.

Designed following enterprise healthcare standards, the application features an institutional design palette (Deep Crimson `#C62828`, Midnight Slate `#0B1528`), role-based routing guards, live Firestore synchronization without mock data dependencies, and accessible confirmation workflows.

---

## Architecture and Key Portals

The web portal is architected using the Next.js 15 App Router and segregated into role-specific sub-systems:

### 1. Hospital Operations Portal (`/hospital`)
- **Emergency Blood Requisitions**: Create and dispatch urgent blood requisitions with required blood groups, units, hospital department details, and target delivery windows.
- **Inventory Visibility**: Real-time cross-facility visibility into regional blood bank availability.
- **Request Lifecycle Tracking**: Track requisition status through active stages (`pending`, `matched`, `dispatched`, `fulfilled`).
- **Staff Delegation**: Manage hospital staff members with role assignments and activity auditing.

### 2. Blood Bank Management Portal (`/bloodbank`)
- **Real-Time Blood Matrix**: Live monitoring of all eight ABO/Rh blood groups (A+, A-, B+, B-, AB+, AB-, O+, O-) via the `BloodMatrixCard` component.
- **Inventory Adjustments**: Instant stock increments, decrements, and unit count modifications backed by audit logs.
- **Critical Stock Thresholds**: Visual warnings when specific blood group reserves fall below safe medical minimums.
- **Incoming Requisition Fulfillment**: Accept, hold, or dispatch blood units against pending hospital requests.
- **Staff Management**: Assign internal blood bank coordinators, technicians, and laboratory personnel.

### 3. Administrator Governance Console (`/admin`)
- **Institutional Verification**: Review and approve or reject hospital and blood bank registration credentials and legal licenses.
- **User Directory**: Global user management across donors, hospital staff, blood bank coordinators, and platform operators.
- **Platform Telemetry**: Aggregate metrics covering total blood donations, active emergency requests, regional stock levels, and match success rates.
- **Security Audit Logs**: Comprehensive logging of administrative actions, credential reviews, and permission changes.

### 4. Unified Authentication (`/login`)
- Role-based login supporting Hospital, Blood Bank, and Administrator credentials.
- Protected client-side routing via `RoleGuard` preventing unauthorized path traversal.
- Zero-flash authentication state resolution during page refreshes and route transitions.

---

## Reusable UI Component System

| Component | File Path | Function |
|---|---|---|
| `BloodMatrixCard` | `components/BloodMatrixCard.tsx` | Interactive 8-group blood stock grid with direct unit adjustment modals and critical reserve warnings |
| `ConfirmModal` | `components/ConfirmModal.tsx` | Standardized, accessible confirmation dialog for destructive and high-impact actions |
| `RoleGuard` | `components/RoleGuard.tsx` | Higher-order role authorization wrapper with smooth loading states |
| `DirectChatModal` | `components/DirectChatModal.tsx` | Direct real-time messaging interface between coordinators, staff, and donors |
| `DashboardSidebar` | `components/DashboardSidebar.tsx` | Collapsible role-tailored navigation sidebar with session indicators |
| `TopHeader` | `components/TopHeader.tsx` | Global top navigation bar with user profile, institution badges, and logout controls |
| `StatsCard` | `components/StatsCard.tsx` | Data display card presenting metrics, trends, and comparison indicators |
| `StatusPill` | `components/StatusPill.tsx` | Standardized status pill for requisition and verification states |
| `BloodGroupBadge` | `components/BloodGroupBadge.tsx` | Visual ABO/Rh blood group badge with compatibility styling |

---

## Design System

The application implements a custom color palette configured in Tailwind CSS:

- **Primary Crimson**: `#C62828` - Primary actions, emergency alerts, active indicators
- **Primary Hover**: `#B71C1C` - Hover states and emphasis
- **Midnight Slate**: `#0B1528` - Header, navigation backgrounds, dark mode surfaces
- **Surface Dark**: `#131F37` - Card and modal backgrounds in dark theme
- **Border Subtle**: `#E2E8F0` (light) / `#1E293B` (dark) - Structural dividing lines
- **Success Emerald**: `#059669` - Approved, fulfilled, and in-stock indicators
- **Warning Amber**: `#D97706` - Low stock and pending review indicators
- **Danger Rose**: `#DC2626` - Critical stock depletion and emergency requisitions

---

## Project Structure

```text
frontend/
├── app/
│   ├── admin/                       # Administrator governance console
│   │   └── page.tsx
│   ├── bloodbank/                   # Blood bank inventory and fulfillment portal
│   │   └── page.tsx
│   ├── hospital/                    # Hospital requisition and tracking portal
│   │   └── page.tsx
│   ├── login/                       # Role-based authentication entrypoint
│   │   └── page.tsx
│   ├── error.tsx                    # Error boundary
│   ├── global-error.tsx             # Root error handler
│   ├── globals.css                  # Global Tailwind CSS directives & variables
│   ├── layout.tsx                   # Root HTML layout with AuthProvider
│   ├── loading.tsx                  # Global route transition loader
│   ├── not-found.tsx                # Custom 404 page
│   └── page.tsx                     # Landing and portal router
│
├── components/                      # Reusable UI component library
│   ├── BloodGroupBadge.tsx          # ABO/Rh group badge
│   ├── BloodMatrixCard.tsx          # 8-group stock matrix with adjustments
│   ├── ConfirmModal.tsx             # Accessible confirmation dialog
│   ├── DashboardSidebar.tsx         # Role-based collapsible navigation
│   ├── DirectChatModal.tsx          # Real-time coordinator messaging
│   ├── Navbar.tsx                   # Public and landing navigation
│   ├── RoleGuard.tsx                # Route authorization guard
│   ├── StatsCard.tsx                # Metric display card
│   ├── StatusPill.tsx               # Requisition/verification status pill
│   └── TopHeader.tsx                # Dashboard top header
│
├── lib/
│   ├── auth-context.tsx             # React Authentication Context & Session Guard
│   ├── firebase.ts                  # Client-side Firebase SDK initialization
│   └── types.ts                     # TypeScript interfaces and type definitions
│
├── public/                          # Static assets and brand imagery
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 18.18+ or 20.9+
- **npm** 9+ (or `pnpm` / `yarn`)
- A configured **Firebase** project with Authentication and Cloud Firestore

### Environment Configuration

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Installation and Execution

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. Build for production deployment:
   ```bash
   npm run build
   ```

5. Run the production build locally:
   ```bash
   npm run start
   ```

---

## Security and Compliance

- **Role Authorization**: All institutional views (`/admin`, `/hospital`, `/bloodbank`) enforce role checks via `RoleGuard`.
- **Client Security**: Firebase API keys are restricted to domain-specific origins in the Firebase console.
- **Confirmation Guards**: High-impact operations (status revocations, inventory deductions, staff removals) require explicit user confirmation via `ConfirmModal`.
- **Zero Mock Fallbacks**: The system operates against live Firestore data and validated APIs, ensuring operational integrity.

---

## License

This project is licensed under the [MIT License](../LICENSE).
