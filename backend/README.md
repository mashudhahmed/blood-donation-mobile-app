# 🔔 Android Notification Backend (NestJS + Firebase)

## 📌 Project Overview

This backend is responsible for handling **push notifications** for an Android application using **Firebase Cloud Messaging (FCM)**.  
It provides secure, scalable, and production-ready APIs to send **real-time notifications** to Android devices.

The system is designed to work seamlessly with an Android app, managing FCM tokens and delivering notifications reliably from the server side.

---

## 🚀 Tech Stack

- **NestJS** – Backend framework
- **TypeScript** – Strongly typed JavaScript
- **Firebase Admin SDK** – Push notification service (FCM)
- **REST API** – Communication layer
- **dotenv** – Environment variable management
- **Node.js** – Runtime environment

---

## ✨ Core Features

### 🔔 Push Notifications
- Send notification to a single Android device
- Send notifications using FCM device tokens
- Support for:
  - Foreground notifications
  - Background notifications
  - Data-only notifications

### 📱 Android Integration
- Works with Android Firebase SDK
- Accepts FCM token from Android app
- Compatible with modern Android notification handling

### 🛡 Security
- Firebase Admin SDK runs only on backend
- No Firebase private keys exposed to Android
- Environment-based configuration

---

## 📁 Folder Structure

```
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

## 🔐 Environment Variables

Create a `.env` file in the project root:
---

```env
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```
---
## 🔧 Installation & Setup

1️⃣ Clone the Repositor
```
git clone <repository-url>
cd backend
```
2️⃣ Install Dependencies
```
npm install
```
3️⃣ Run in Development Mode
```
npm run start:dev
```

4️⃣ Build & Run in Production
```
npm run build
npm run start:prod
```
---
## 📡 API Endpoints
### 🔔 Send Notification (Single Device)

### Endpoint
```
POST /notifications/send
```

### Request Body
```
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

### Response
```
{
  "success": true,
  "message": "Notification sent successfully"
}
```

### 📢 Broadcast Notification (Optional)
```
POST /notifications/broadcast
```
---
## 📱 Android App Flow

- Android app retrieves FCM token

- Token is sent to backend API

- Backend uses Firebase Admin SDK

- Notification is delivered to the device

- Android app handles notification display


## 🛡 Security Best Practices

- Firebase Admin SDK configured server-side only

- Sensitive keys stored in environment variables

- No direct Firebase access from Android app

- Input validation at controller level
---

## 🚀 Deployment

### Recommended platforms:

- Render (Used for notification backend)

- Railway

- DigitalOcean

- AWS EC2 / ECS

- Vercel (Server mode)

## Production Tips

- Enable HTTPS

- Use PM2 or Docker

- Set NODE_ENV=production

- Rotate Firebase keys periodically
---

## 📦 Available Scripts

| Command               | Description        |
|----------------------|--------------------|
| `npm run start`       | Start server       |
| `npm run start:dev`   | Development mode   |
| `npm run build`       | Build project      |
| `npm run start:prod`  | Production mode    |

---

## 📈 Future Enhancements

- Notification history storage

- Topic-based notifications

- Scheduled notifications 
---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

- **Mashudh Ahmed** | [LinkedIn](https://www.linkedin.com/in/mashudhahmed)
- **Mail:** mashudh.ahmed@outlook.com
---
##  Support

If this backend helped your project, please consider giving it a ⭐ on GitHub!
