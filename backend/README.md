# Android Notification Backend

A production-ready NestJS backend for delivering Firebase Cloud Messaging (FCM) push notifications to Android devices. The service is designed with scalability, security, and maintainability in mind, providing a centralized notification system that integrates seamlessly with Android applications.

![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-FCM-FFCA28?logo=firebase)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Features

### Push Notification Delivery

- Send notifications to individual Android devices
- Deliver notifications using FCM device tokens
- Support for foreground notifications
- Support for background notifications
- Support for data-only notifications
- Real-time notification delivery

### Android Integration

- Compatible with Firebase Android SDK
- Secure FCM token registration
- Modern Android notification support
- Easy integration with existing Android applications

### Security

- Firebase Admin SDK configured exclusively on the backend
- Service account credentials never exposed to clients
- Environment-based configuration management
- Secure notification dispatching

### Production Features

- Modular NestJS architecture
- Dependency Injection
- TypeScript type safety
- Environment configuration support
- Scalable service structure
- RESTful API design
- Firebase Admin SDK integration

---

## Architecture

```text
Android Client
      │
      ▼
FCM Device Token
      │
      ▼
NestJS Backend API
      │
      ▼
Firebase Admin SDK
      │
      ▼
Firebase Cloud Messaging
      │
      ▼
Android Device
```

---

## Technology Stack

| Technology | Purpose |
|------------|---------|
| NestJS | Backend framework |
| TypeScript | Application development |
| Firebase Admin SDK | Push notification delivery |
| REST API | Client communication |
| dotenv | Environment configuration |
| Node.js | Runtime environment |

---

## Project Structure

```text
app-backend/
├── src/
│   ├── matching/
│   │   ├── donor-matching.service.ts
│   │   └── matching.module.ts
│   │
│   ├── notifications/
│   │   ├── notifications.controller.ts
│   │   ├── notifications.module.ts
│   │   └── notifications.service.ts
│   │
│   ├── types/
│   │   └── donor.interface.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── tsconfig.json
├── tsconfig.build.json
├── package.json
├── package-lock.json
└── README.md
```

---

## Prerequisites

Before running the application, ensure you have:

- Node.js 18 or later
- npm 9 or later
- A Firebase project
- Firebase Service Account credentials
- Firebase Cloud Messaging enabled

---

## Environment Variables

Create a `.env` file in the project root.

### Required Variables

| Variable | Description |
|-----------|-------------|
| `FIREBASE_PROJECT_ID` | Firebase project identifier |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase private key |

### Example

```env
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

---

## Installation

### Clone the Repository

```bash
git clone <repository-url>
cd backend
```

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run start:dev
```

### Build for Production

```bash
npm run build
```

### Run Production Build

```bash
npm run start:prod
```

---

## API Endpoints

### Send Notification

#### Endpoint

```http
POST /notifications/send
```

#### Request Body

```json
{
  "token": "FCM_DEVICE_TOKEN",
  "title": "Blood Needed",
  "body": "Urgent blood donation request nearby",
  "data": {
    "type": "REQUEST",
    "requestId": "123"
  }
}
```

#### Success Response

```json
{
  "success": true,
  "message": "Notification sent successfully"
}
```

#### Error Response

```json
{
  "success": false,
  "message": "Invalid FCM token"
}
```

---

### Broadcast Notification

#### Endpoint

```http
POST /notifications/broadcast
```

Used for sending notifications to multiple recipients.

---

### Health Check

#### Endpoint

```http
GET /health
```

#### Response

```json
{
  "status": "ok"
}
```

---

## Android Notification Flow

1. Android application retrieves an FCM device token.
2. The token is securely sent to the backend.
3. The backend validates and processes the request.
4. Firebase Admin SDK sends the notification.
5. Firebase Cloud Messaging delivers the message.
6. Android application receives and displays the notification.

---

## Security Considerations

- Firebase credentials remain server-side only.
- Sensitive configuration is managed through environment variables.
- No Firebase private keys are exposed to Android clients.
- Request validation should be enforced at the controller level.
- HTTPS should be enabled in production.
- Access controls should be implemented for administrative endpoints.

---

## Deployment

### Recommended Platforms

- Render
- Railway
- DigitalOcean
- AWS EC2
- AWS ECS
- Vercel

### Production Recommendations

- Enable HTTPS
- Configure environment variables securely
- Use PM2 or Docker for process management
- Set `NODE_ENV=production`
- Monitor application logs
- Rotate Firebase credentials periodically
- Implement centralized logging and monitoring

---

## Available Scripts

| Command | Description |
|----------|-------------|
| `npm run start` | Start application |
| `npm run start:dev` | Run in development mode |
| `npm run build` | Build project |
| `npm run start:prod` | Run production build |

---

## Planned Improvements

- Notification history persistence
- Topic-based messaging
- Scheduled notifications
- Delivery analytics
- Notification templates
- Retry mechanisms for failed deliveries
- Multi-platform notification support

---

## License

This project is licensed under the MIT License.

