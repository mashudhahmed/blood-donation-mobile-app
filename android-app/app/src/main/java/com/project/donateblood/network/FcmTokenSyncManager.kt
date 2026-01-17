@file:Suppress("DEPRECATION")

package com.project.donateblood.network

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.provider.Settings
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.BuildConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import timber.log.Timber

object FcmTokenSyncManager {

    @SuppressLint("HardwareIds", "UseKtx")
    fun syncTokenWithBackend(
        token: String,
        context: Context? = null,
        targetUserId: String? = null,
        isLoggedIn: Boolean = true
    ) {
        if (!isValidFcmToken(token)) {
            Timber.e("❌ Invalid FCM token format: ${token.take(20)}...")
            return
        }

        val currentUser = FirebaseAuth.getInstance().currentUser

        val userId = targetUserId
            ?: if (currentUser != null) {
                currentUser.uid
            } else {
                val prefs = context?.getSharedPreferences("user_prefs", Context.MODE_PRIVATE)
                prefs?.getString("last_user_id", null)
            }

        if (userId == null) {
            Timber.w("⚠ No user ID available for token sync")
            return
        }

        val deviceId = getDeviceId(context)
        val compoundTokenId = "${userId}_$deviceId"

        CoroutineScope(Dispatchers.IO).launch {
            try {
                Timber.d("🚀 Saving FCM token to backend for user: $userId")
                Timber.d("   Device: $deviceId, LoggedIn: $isLoggedIn")

                val saveResponse = RetrofitClient.notificationApi.saveFcmToken(
                    SaveTokenRequest(
                        userId = userId,
                        fcmToken = token,
                        userType = "donor",
                        deviceId = deviceId,
                        deviceType = "android",
                        appVersion = BuildConfig.VERSION_NAME,
                        isLoggedIn = isLoggedIn
                    )
                )

                Timber.d("🔍 API Response:")
                Timber.d("   - Code: ${saveResponse.code()}")
                Timber.d("   - Success: ${saveResponse.isSuccessful}")

                if (saveResponse.isSuccessful) {
                    val responseBody = saveResponse.body()
                    if (responseBody?.success == true) {
                        Timber.d("✅ FCM token saved to backend successfully!")

                        context?.getSharedPreferences("user_prefs", Context.MODE_PRIVATE)
                            ?.edit()
                            ?.putString("last_user_id", userId)
                            ?.putBoolean("is_logged_in", isLoggedIn)
                            ?.apply()

                        context?.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
                            ?.edit()
                            ?.putString("fcm_token", token)
                            ?.apply()
                    } else {
                        Timber.e("❌ Backend save failed: ${responseBody?.message}")
                        retryTokenSave(userId, token, deviceId, isLoggedIn, 1)
                    }
                } else {
                    Timber.e("❌ HTTP error saving token: ${saveResponse.code()}")
                    retryTokenSave(userId, token, deviceId, isLoggedIn, 1)
                }
            } catch (e: Exception) {
                Timber.e("❌ Error saving token to backend: ${e.message}")
                retryTokenSave(userId, token, deviceId, isLoggedIn, 1)
            }
        }
    }

    private fun isValidFcmToken(token: String): Boolean {
        return token.length >= 10 && token.contains(":")
    }

    private fun retryTokenSave(
        userId: String,
        token: String,
        deviceId: String,
        isLoggedIn: Boolean,
        attempt: Int
    ) {
        if (attempt > 3) {
            Timber.e("❌ Failed to save token after 3 attempts")
            return
        }

        Timber.d("🔄 Retry attempt $attempt for token save...")

        CoroutineScope(Dispatchers.IO).launch {
            try {
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    CoroutineScope(Dispatchers.IO).launch {
                        val retryResponse = RetrofitClient.notificationApi.saveFcmToken(
                            SaveTokenRequest(
                                userId = userId,
                                fcmToken = token,
                                userType = "donor",
                                deviceId = deviceId,
                                deviceType = "android",
                                appVersion = BuildConfig.VERSION_NAME,
                                isLoggedIn = isLoggedIn
                            )
                        )

                        if (retryResponse.isSuccessful) {
                            val responseBody = retryResponse.body()
                            if (responseBody?.success == true) {
                                Timber.d("✅ Token save successful on retry $attempt")
                            } else {
                                Timber.e("❌ Retry $attempt failed: ${responseBody?.message}")
                                retryTokenSave(userId, token, deviceId, isLoggedIn, attempt + 1)
                            }
                        } else {
                            Timber.e("❌ Retry $attempt HTTP error: ${retryResponse.code()}")
                            retryTokenSave(userId, token, deviceId, isLoggedIn, attempt + 1)
                        }
                    }
                }, (attempt * 5000).toLong())
            } catch (e: Exception) {
                Timber.e("❌ Retry $attempt exception: ${e.message}")
                retryTokenSave(userId, token, deviceId, isLoggedIn, attempt + 1)
            }
        }
    }

    @SuppressLint("HardwareIds")
    fun markUserAsLoggedOut(context: Context?, userId: String? = null) {
        val currentUser = FirebaseAuth.getInstance().currentUser
        val targetUserId = userId ?: currentUser?.uid

        if (targetUserId == null) {
            Timber.w("⚠ No user ID available for logout")
            return
        }

        val deviceId = getDeviceId(context)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                Timber.d("🚪 Marking user as logged out in backend: $targetUserId")

                val response = RetrofitClient.notificationApi.markUserAsLoggedOut(
                    LoginLogoutRequest(
                        userId = targetUserId,
                        deviceId = deviceId
                    )
                )

                if (response.isSuccessful && response.body()?.success == true) {
                    Timber.d("✅ User marked as logged out in backend")

                    context?.getSharedPreferences("user_prefs", Context.MODE_PRIVATE)
                        ?.edit()
                        ?.putBoolean("is_logged_in", false)
                        ?.apply()
                } else {
                    Timber.e("❌ Failed to mark user as logged out")
                }
            } catch (e: Exception) {
                Timber.e("❌ Error marking user as logged out: ${e.message}")
            }
        }
    }

    @SuppressLint("HardwareIds")
    fun markUserAsLoggedIn(context: Context?, userId: String? = null) {
        val currentUser = FirebaseAuth.getInstance().currentUser
        val targetUserId = userId ?: currentUser?.uid

        if (targetUserId == null) {
            Timber.w("⚠ No user ID available for login")
            return
        }

        val deviceId = getDeviceId(context)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                Timber.d("🔓 Marking user as logged in in backend: $targetUserId")

                val response = RetrofitClient.notificationApi.markUserAsLoggedIn(
                    LoginLogoutRequest(
                        userId = targetUserId,
                        deviceId = deviceId
                    )
                )

                if (response.isSuccessful && response.body()?.success == true) {
                    Timber.d("✅ User marked as logged in in backend")

                    context?.getSharedPreferences("user_prefs", Context.MODE_PRIVATE)
                        ?.edit()
                        ?.putBoolean("is_logged_in", true)
                        ?.apply()
                } else {
                    Timber.e("❌ Failed to mark user as logged in")
                }
            } catch (e: Exception) {
                Timber.e("❌ Error marking user as logged in: ${e.message}")
            }
        }
    }

    fun syncTokenWithCurrentStatus(context: Context) {
        val auth = FirebaseAuth.getInstance()
        val currentUser = auth.currentUser
        val isLoggedIn = currentUser != null

        val prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
        val savedToken = prefs.getString("fcm_token", null)

        if (savedToken == null) {
            Timber.d("⚠ No saved token found")
            return
        }

        val userId = if (isLoggedIn) {
            currentUser.uid
        } else {
            context.getSharedPreferences("user_prefs", Context.MODE_PRIVATE)
                .getString("last_user_id", null)
        }

        if (userId != null) {
            Timber.d("🔄 Syncing token with current login status: $isLoggedIn")
            syncTokenWithBackend(
                token = savedToken,
                context = context,
                targetUserId = userId,
                isLoggedIn = isLoggedIn
            )
        } else {
            Timber.w("⚠ No user ID available for token sync")
        }
    }

    fun getCurrentLoginStatus(context: Context): Boolean {
        val auth = FirebaseAuth.getInstance()
        val currentUser = auth.currentUser
        return currentUser != null
    }

    fun initializeTokenSync(context: Context) {
        Timber.d("🔄 Initializing token sync...")

        val prefs = context.getSharedPreferences("app_prefs", Context.MODE_PRIVATE)
        val savedToken = prefs.getString("fcm_token", null)

        if (savedToken != null) {
            syncTokenWithCurrentStatus(context)
        } else {
            Timber.d("⚠ No saved token, waiting for FCM to generate new token")
        }
    }

    @SuppressLint("HardwareIds")
    private fun getDeviceId(context: Context?): String {
        return try {
            context?.let {
                Settings.Secure.getString(it.contentResolver, Settings.Secure.ANDROID_ID)
            } ?: (Build.DEVICE + "_" + Build.SERIAL)
        } catch (_: Exception) {
            Build.DEVICE + "_" + Build.SERIAL
        }
    }
}