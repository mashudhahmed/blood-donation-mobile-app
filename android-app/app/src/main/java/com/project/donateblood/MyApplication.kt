package com.project.donateblood

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.appcompat.app.AppCompatDelegate
import com.google.firebase.FirebaseApp
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.messaging.FirebaseMessaging
import com.project.donateblood.firebase.MyFirebaseMessagingService
import com.project.donateblood.network.FcmTokenSyncManager
import com.project.donateblood.utils.TimberDebugTree
import timber.log.Timber
import androidx.core.content.edit

@Suppress("DEPRECATION")
class MyApplication : Application() {

    companion object {
        private var _instance: MyApplication? = null
        val instance: MyApplication
            get() = _instance!!

        fun getStoredFCMToken(context: Context): String? {
            val prefs = context.getSharedPreferences("app_prefs", MODE_PRIVATE)
            return prefs.getString("fcm_token", null)
        }
    }

    override fun onCreate() {
        super.onCreate()

        // ✅ Initialize instance
        _instance = this

        // Initialize Timber for logging
        if (BuildConfig.DEBUG) {
            Timber.plant(TimberDebugTree())
        }

        Timber.d("🚀 Application starting...")
        Timber.d("📱 App Version: ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})")

        // Initialize Firebase
        initializeFirebase()

        // 🔔 Create notification channel ONCE (Android 8+)
        createNotificationChannel()

        // Force light mode (optional)
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
    }

    private fun initializeFirebase() {
        try {
            FirebaseApp.initializeApp(this)

            val db = FirebaseFirestore.getInstance()

            val settings = FirebaseFirestoreSettings.Builder()
                .setPersistenceEnabled(true)
                .build()
            db.firestoreSettings = settings

            Timber.d("✅ Firebase initialized successfully")

            // Get and log FCM token
            getFCMToken()

        } catch (e: Exception) {
            Timber.e("❌ Firebase initialization failed: ${e.message}")
        }
    }

    private fun getFCMToken() {
        FirebaseMessaging.getInstance().token
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val token = task.result
                    Timber.d("🔥 FCM Token obtained: ${token.take(20)}...")

                    if (token.isNullOrEmpty()) {
                        Timber.e("❌ FCM token is null or empty!")
                        return@addOnCompleteListener
                    }

                    val prefs = getSharedPreferences("app_prefs", MODE_PRIVATE)
                    prefs.edit { putString("fcm_token", token) }

                    // ✅ Auto-sync token with backend
                    FcmTokenSyncManager.syncTokenWithCurrentStatus(this)

                } else {
                    Timber.e("❌ Failed to get FCM token: ${task.exception}")
                }
            }
    }

    // ✅ REQUIRED for Android 8+ notifications
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                MyFirebaseMessagingService.CHANNEL_ID,
                MyFirebaseMessagingService.CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = MyFirebaseMessagingService.CHANNEL_DESCRIPTION
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000)
                setShowBadge(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }

            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)

            Timber.d("🔔 Notification channel created: ${MyFirebaseMessagingService.CHANNEL_ID}")
        }
    }
}