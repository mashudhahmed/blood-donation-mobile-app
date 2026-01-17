package com.project.donateblood.firebase

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.core.content.edit

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.BuildConfig
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.project.donateblood.R
import com.project.donateblood.MainActivity
import com.project.donateblood.network.FcmTokenSyncManager
import timber.log.Timber
import java.util.Date
import java.util.UUID

@Suppress("DEPRECATION")
class MyFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        const val CHANNEL_ID = "blood_requests"
        const val CHANNEL_NAME = "Blood Requests"
        const val CHANNEL_DESCRIPTION = "Blood donation requests and alerts"
        private const val PREFS_NAME = "app_prefs"
        private const val PREF_FCM_TOKEN = "fcm_token"
        private const val PREF_LAST_USER_ID = "last_user_id"
        private const val PREF_DEVICE_ID = "device_id"
        private const val PREF_IS_LOGGED_IN = "is_logged_in"

        fun createNotificationChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val importance = NotificationManager.IMPORTANCE_HIGH
                val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                    description = CHANNEL_DESCRIPTION
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 1000, 500, 1000)
                    enableLights(true)
                    lightColor = ContextCompat.getColor(context, R.color.primary_red)
                    setShowBadge(true)
                }
                val notificationManager = context.getSystemService(NotificationManager::class.java)
                notificationManager.createNotificationChannel(channel)
                Timber.d("✅ Notification channel created: $CHANNEL_ID")
            }
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Timber.d("=== 📱 INCOMING NOTIFICATION ===")

        val data = remoteMessage.data
        Timber.d("📱 Notification Data Fields:")
        data.forEach { (key, value) ->
            Timber.d("   $key: $value")
        }
        Timber.d("=== END NOTIFICATION DATA ===")

        val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        val isUserLoggedIn = prefs.getBoolean(PREF_IS_LOGGED_IN, false)
        val currentUser = FirebaseAuth.getInstance().currentUser
        val currentUserId = currentUser?.uid
        val lastUserId = prefs.getString(PREF_LAST_USER_ID, null)

        val recipientUserId = data["recipientUserId"]
        val notificationId = data["notificationId"] ?: UUID.randomUUID().toString()
        val requestId = data["requestId"] ?: System.currentTimeMillis().toString()

        Timber.d("📱 Notification Delivery Analysis:")
        Timber.d("   - Notification ID: $notificationId")
        Timber.d("   - Request ID: $requestId")
        Timber.d("   - For user: $recipientUserId")
        Timber.d("   - Current Firebase user: $currentUserId")
        Timber.d("   - Last known user ID: $lastUserId")
        Timber.d("   - App login status (from prefs): $isUserLoggedIn")

        val targetUserId = recipientUserId ?: currentUserId ?: lastUserId
        if (targetUserId != null) {
            saveNotificationToFirestore(
                title = data["title"] ?: remoteMessage.notification?.title ?: buildTitle(data),
                body = data["body"] ?: remoteMessage.notification?.body ?: buildDefaultMessage(data),
                hospital = data["hospital"] ?: data["medicalName"] ?: "",
                district = data["district"] ?: "",
                bloodGroup = data["bloodGroup"] ?: "",
                urgency = data["urgency"] ?: "normal",
                requestId = requestId,
                notificationId = notificationId,
                specificUserId = targetUserId
            )
        } else {
            Timber.w("⚠ No user ID available to save notification")
        }

        val isRecipientLoggedIn = data["isLoggedIn"]?.toBoolean() ?: true

        Timber.d("📱 Recipient login status from notification: $isRecipientLoggedIn")

        val shouldShowNotification = if (recipientUserId != null) {
            val isForCurrentUser = recipientUserId == currentUserId ||
                    (currentUserId == null && recipientUserId == lastUserId)

            if (isForCurrentUser) {
                isRecipientLoggedIn
            } else {
                false
            }
        } else {
            true
        }

        if (shouldShowNotification) {
            Timber.d("📱 Showing notification to user (condition met)")
            showNotification(
                title = data["title"] ?: remoteMessage.notification?.title ?: buildTitle(data),
                body = data["body"] ?: remoteMessage.notification?.body ?: buildDefaultMessage(data),
                data = data,
                requestId = requestId,
                notificationId = notificationId
            )
        } else {
            Timber.d("📱 NOT showing real-time notification (user is logged out or notification not for this user)")
        }
    }

    override fun onNewToken(token: String) {
        Timber.d("🔥 New FCM token generated!")
        Timber.d("🔥 Token (first 30 chars): ${token.take(30)}...")
        Timber.d("🔥 Full token length: ${token.length} characters")

        val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        prefs.edit {
            putString(PREF_FCM_TOKEN, token)
        }

        val currentUser = FirebaseAuth.getInstance().currentUser
        val deviceId = getUniqueDeviceId()

        prefs.edit {
            putString(PREF_DEVICE_ID, deviceId)
        }

        Timber.d("📱 Device Info:")
        Timber.d("   - Device ID: $deviceId")
        Timber.d("   - Current user: ${currentUser?.uid ?: "logged out"}")
        Timber.d("   - Android Version: ${Build.VERSION.SDK_INT}")
        Timber.d("   - Device Model: ${Build.MANUFACTURER} ${Build.MODEL}")

        val isLoggedIn = currentUser != null

        prefs.edit {
            putBoolean(PREF_IS_LOGGED_IN, isLoggedIn)
        }

        if (isLoggedIn) {
            val userId = currentUser.uid
            Timber.d("✅ User is LOGGED IN, saving token as logged in")

            prefs.edit {
                putString(PREF_LAST_USER_ID, userId)
            }
            Timber.d("💾 Saved current user ID: $userId")

            saveTokenToFirestore(userId, token, deviceId, isLoggedIn = true)

            FcmTokenSyncManager.syncTokenWithBackend(
                token = token,
                context = this,
                targetUserId = userId,
                isLoggedIn = true
            )

        } else {
            val lastUserId = prefs.getString(PREF_LAST_USER_ID, null)

            if (lastUserId != null) {
                Timber.d("⚠ User is LOGGED OUT, but we have last known user ID: $lastUserId")
                Timber.d("⚠ Token will be synced with isLoggedIn = false")

                saveTokenToFirestore(lastUserId, token, deviceId, isLoggedIn = false)

                FcmTokenSyncManager.syncTokenWithBackend(
                    token = token,
                    context = this,
                    targetUserId = lastUserId,
                    isLoggedIn = false
                )
            } else {
                Timber.w("⚠ No previous user ID found, saving as anonymous device")
                saveDeviceOnlyToken(token, deviceId)
            }
        }
    }

    private fun saveDeviceOnlyToken(token: String, deviceId: String) {
        try {
            val db = FirebaseFirestore.getInstance()
            val updates = hashMapOf(
                "fcmToken" to token,
                "deviceId" to deviceId,
                "hasFcmToken" to true,
                "updatedAt" to FieldValue.serverTimestamp(),
                "lastTokenUpdate" to System.currentTimeMillis(),
                "deviceType" to "android",
                "appVersion" to BuildConfig.VERSION_NAME
            )

            db.collection("anonymous_devices")
                .document(deviceId)
                .set(updates, com.google.firebase.firestore.SetOptions.merge())
                .addOnSuccessListener {
                    Timber.d("✅ Token saved for anonymous device: $deviceId")
                }
                .addOnFailureListener { e ->
                    Timber.e("❌ Failed to save anonymous device token: ${e.message}")
                }
        } catch (e: Exception) {
            Timber.e("❌ Error saving anonymous device token: ${e.message}")
        }
    }

    private fun saveTokenToFirestore(
        userId: String,
        token: String,
        deviceId: String,
        isLoggedIn: Boolean
    ) {
        val db = FirebaseFirestore.getInstance()
        val compoundTokenId = "${userId}_$deviceId"

        val updates = hashMapOf(
            "userId" to userId,
            "fcmToken" to token,
            "deviceId" to deviceId,
            "compoundTokenId" to compoundTokenId,
            "isAvailable" to true,
            "notificationEnabled" to true,
            "isActive" to true,
            "canDonate" to true,
            "hasFcmToken" to true,
            "isLoggedIn" to isLoggedIn,
            "updatedAt" to FieldValue.serverTimestamp(),
            "lastActive" to FieldValue.serverTimestamp(),
            "deviceType" to "android",
            "appVersion" to BuildConfig.VERSION_NAME
        )

        Timber.d("💾 Saving token to Firestore:")
        Timber.d("   - User ID: $userId")
        Timber.d("   - Device ID: $deviceId")
        Timber.d("   - Compound Token ID: $compoundTokenId")
        Timber.d("   - isLoggedIn: $isLoggedIn")
        Timber.d("   - Token length: ${token.length}")

        db.collection("donors")
            .document(userId)
            .set(updates, com.google.firebase.firestore.SetOptions.merge())
            .addOnSuccessListener {
                Timber.d("✅ Token saved to donors (isLoggedIn: $isLoggedIn)")
            }
            .addOnFailureListener { e ->
                Timber.e("❌ Failed to save to donors: ${e.message}")
            }

        db.collection("users")
            .document(userId)
            .collection("devices")
            .document(deviceId)
            .set(updates, com.google.firebase.firestore.SetOptions.merge())
            .addOnSuccessListener {
                Timber.d("✅ Token saved to users/devices collection")
            }
    }

    @SuppressLint("HardwareIds")
    private fun getUniqueDeviceId(): String {
        return try {
            Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
                ?: (Build.DEVICE + "_" + Build.SERIAL)
        } catch (_: Exception) {
            Build.DEVICE + "_" + Build.SERIAL
        }
    }

    private fun saveNotificationToFirestore(
        title: String,
        body: String,
        hospital: String,
        district: String,
        bloodGroup: String,
        urgency: String,
        requestId: String,
        notificationId: String = "",
        specificUserId: String
    ) {
        val db = FirebaseFirestore.getInstance()

        val notificationData = hashMapOf(
            "id" to notificationId.ifEmpty { "notif_${requestId}_${specificUserId}" },
            "title" to title,
            "message" to body,
            "body" to body,
            "type" to "blood_request",
            "bloodGroup" to bloodGroup,
            "hospital" to hospital,
            "district" to district,
            "urgency" to urgency,
            "requestId" to requestId,
            "notificationId" to notificationId,
            "isRead" to false,
            "timestamp" to FieldValue.serverTimestamp(),
            "createdAt" to FieldValue.serverTimestamp(),
            "expiresAt" to Date(System.currentTimeMillis() + 30L * 24 * 60 * 60 * 1000)
        )

        val docId = notificationId.ifEmpty { "notif_${requestId}_${specificUserId}_${System.currentTimeMillis()}" }

        db.collection("notifications")
            .document(specificUserId)
            .collection("items")
            .document(docId)
            .set(notificationData)
            .addOnSuccessListener {
                Timber.d("✅ Notification saved to Firestore: $requestId for user $specificUserId")

                updateNotificationCount(specificUserId)
            }
            .addOnFailureListener { e ->
                Timber.e("❌ Failed to save notification to Firestore: ${e.message}")
            }
    }

    private fun updateNotificationCount(userId: String) {
        val db = FirebaseFirestore.getInstance()

        db.collection("notifications")
            .document(userId)
            .collection("items")
            .whereEqualTo("isRead", false)
            .get()
            .addOnSuccessListener { snapshot ->
                val unreadCount = snapshot.size()

                val updates = mapOf(
                    "unreadNotificationCount" to unreadCount,
                    "lastNotificationCheck" to FieldValue.serverTimestamp()
                )

                db.collection("users")
                    .document(userId)
                    .update(updates)
                    .addOnSuccessListener {
                        Timber.d("✅ Updated unread count: $unreadCount for user $userId")
                    }
                    .addOnFailureListener { e ->
                        Timber.e("❌ Failed to update unread count: ${e.message}")
                    }
            }
            .addOnFailureListener { e ->
                Timber.e("❌ Failed to get unread notifications count: ${e.message}")
            }
    }

    private fun showNotification(
        title: String,
        body: String,
        data: Map<String, String>,
        requestId: String,
        notificationId: String = ""
    ) {
        createNotificationChannel(this)
        val manager = getSystemService(NotificationManager::class.java)
        val notificationIdInt = System.currentTimeMillis().toInt()
        val uniqueRequestCode = UUID.randomUUID().hashCode() and 0xfffffff

        Timber.d("📱 Creating notification:")
        Timber.d("   - Android Notification ID: $notificationIdInt")
        Timber.d("   - Request ID: $requestId")
        Timber.d("   - Backend Notification ID: $notificationId")
        Timber.d("   - Title: $title")
        Timber.d("   - Body: ${body.take(50)}...")

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            data.forEach { (key, value) -> putExtra(key, value) }
            putExtra("from_notification", true)
            putExtra("notification_id", notificationIdInt)
            putExtra("requestId", requestId)
            putExtra("notification_backend_id", notificationId)
            action = "com.project.donateblood.NOTIFICATION_${System.currentTimeMillis()}"
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            uniqueRequestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val iconRes = when {
            data["urgency"] == "high" -> R.drawable.ic_urgent
            else -> R.drawable.ic_notification
        }

        val notificationBuilder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(iconRes)
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(pendingIntent)
            .setPriority(
                if (data["urgency"] == "high") NotificationCompat.PRIORITY_HIGH
                else NotificationCompat.PRIORITY_DEFAULT
            )
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setVibrate(longArrayOf(0, 1000, 500, 1000))
            .setLights(ContextCompat.getColor(this, R.color.primary_red), 1000, 1000)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))

        if (data["urgency"] == "high") {
            notificationBuilder
                .setColor(ContextCompat.getColor(this, R.color.primary_red))
                .setPriority(NotificationCompat.PRIORITY_MAX)
        }

        manager.notify(notificationIdInt, notificationBuilder.build())

        Timber.d("📱 Notification displayed successfully!")
        Timber.d("   Android Notification ID: $notificationIdInt")
    }

    private fun buildTitle(data: Map<String, String>): String {
        return if (data["urgency"] == "high") {
            "URGENT: Blood Needed"
        } else {
            "Blood Donation Request"
        }
    }

    private fun buildDefaultMessage(data: Map<String, String>): String {
        val bloodGroup = data["bloodGroup"] ?: ""
        val hospital = data["hospital"] ?: data["medicalName"] ?: "hospital"
        val district = data["district"] ?: ""
        val patientName = data["patientName"] ?: ""

        return if (patientName.isNotEmpty()) {
            "$patientName needs $bloodGroup blood at $hospital ($district)"
        } else {
            "$bloodGroup blood needed at $hospital in $district"
        }
    }
}