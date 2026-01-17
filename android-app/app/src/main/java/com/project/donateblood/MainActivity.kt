package com.project.donateblood

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.navigation.findNavController
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessaging
import com.project.donateblood.databinding.ActivityMainBinding
import com.project.donateblood.network.FcmTokenSyncManager
import timber.log.Timber
import androidx.core.content.edit

@Suppress("DEPRECATION")
class MainActivity : BaseActivity() {

    private lateinit var binding: ActivityMainBinding
    private val auth by lazy { FirebaseAuth.getInstance() }
    private val db by lazy { FirebaseFirestore.getInstance() }

    private var notificationHandled = false
    private var currentNotificationId = -1

    private val notificationPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            Timber.d("🔔 Notification permission granted: $granted")
            if (granted) {
                ensureFCMTokenForCurrentUser()
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        requestNotificationPermission()
        initializeFcmTokenSync()
        handleUserLoginStatus()

        // Handle initial intent with delay
        binding.root.postDelayed({
            handleNotificationIntent(intent)
        }, 1000)

        // Now you can use userViewModel here if needed
        setupUserObservers()
    }

    private fun setupUserObservers() {
        userViewModel.userName.observe(this) { name ->
            Timber.d("👤 User name updated: $name")
        }

        userViewModel.userEmail.observe(this) { email ->
            Timber.d("📧 User email updated: $email")
        }

        userViewModel.currentUser.observe(this) { user ->
            if (user != null) {
                Timber.d("🔐 User authenticated: ${user.uid}")
                onUserLoggedIn()
            } else {
                Timber.d("👤 No user authenticated")
                onUserLoggedOut()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        notificationHandled = false
        handleNotificationIntent(intent)
    }

    private fun handleNotificationIntent(intent: Intent?) {
        try {
            if (notificationHandled) return

            val fromNotification = intent?.getBooleanExtra("from_notification", false) ?: false
            val notificationId = intent?.getIntExtra("notification_id", -1) ?: -1

            if (fromNotification && notificationId != -1) {
                if (currentNotificationId == notificationId && notificationHandled) {
                    return
                }

                currentNotificationId = notificationId
                notificationHandled = true
                Timber.d("📱 App opened from notification (ID: $notificationId)")

                binding.root.postDelayed({
                    if (isFinishing || isDestroyed) return@postDelayed
                    navigateToNotifications()
                }, 1500)
            }
        } catch (e: Exception) {
            Timber.e("❌ Error handling notification intent: ${e.message}")
        }
    }

    private fun navigateToNotifications() {
        try {
            val navController = findNavController(R.id.nav_host_fragment)

            if (navController.currentDestination?.id == R.id.notificationFragment) {
                Timber.d("✅ Already on notification fragment")
                return
            }

            try {
                navController.popBackStack(R.id.notificationFragment, true)
            } catch (_: Exception) {
            }

            navController.navigate(R.id.notificationFragment)
            Timber.d("✅ Navigated to notification fragment")

        } catch (e: Exception) {
            Timber.e("❌ Navigation error: ${e.message}")
        }
    }

    override fun onResume() {
        super.onResume()
        notificationHandled = false
    }

    private fun requestNotificationPermission() {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermissionLauncher.launch(
                Manifest.permission.POST_NOTIFICATIONS
            )
        } else {
            ensureFCMTokenForCurrentUser()
        }
    }

    private fun initializeFcmTokenSync() {
        FcmTokenSyncManager.initializeTokenSync(this)
    }

    private fun handleUserLoginStatus() {
        val user = auth.currentUser
        if (user != null) {
            Timber.d("🔓 User is logged in: ${user.uid}")
            onUserLoggedIn()
        } else {
            Timber.d("🚪 User is logged out")
            onUserLoggedOut()
        }
    }

    private fun ensureFCMTokenForCurrentUser() {
        val user = auth.currentUser

        FirebaseMessaging.getInstance().token
            .addOnSuccessListener { token ->
                Timber.d("🔥 FCM Token obtained: ${token.take(20)}...")

                // Save token locally first
                getSharedPreferences("app_prefs", MODE_PRIVATE)
                    .edit {
                        putString("fcm_token", token)
                    }

                val deviceId = getUniqueDeviceId()

                if (user != null) {
                    // User is logged in
                    val compoundTokenId = "${user.uid}_$deviceId"

                    // Save to user's devices collection
                    db.collection("users")
                        .document(user.uid)
                        .collection("devices")
                        .document(deviceId)
                        .set(
                            mapOf(
                                "userId" to user.uid,
                                "fcmToken" to token,
                                "deviceId" to deviceId,
                                "compoundTokenId" to compoundTokenId,
                                "lastActive" to System.currentTimeMillis(),
                                "userType" to "donor",
                                "isAvailable" to true,
                                "notificationEnabled" to true,
                                "hasFcmToken" to true,
                                "isLoggedIn" to true
                            ),
                            com.google.firebase.firestore.SetOptions.merge()
                        )
                        .addOnSuccessListener {
                            Timber.d("✅ FCM token saved to users/devices")

                            // ✅ Sync with backend as logged in
                            FcmTokenSyncManager.syncTokenWithBackend(
                                token = token,
                                context = this,
                                targetUserId = user.uid,
                                isLoggedIn = true
                            )

                            // Update donor document
                            updateDonorDocument(user.uid, token, deviceId, compoundTokenId, true)

                            // Notify ViewModel
                            userViewModel.updateUserName(user.displayName ?: "User")
                            userViewModel.updateUserEmail(user.email ?: "No email")
                        }
                        .addOnFailureListener { e ->
                            Timber.e("❌ Failed to save to users/devices: ${e.message}")
                        }

                } else {
                    // User is logged out - try to sync with last known user
                    Timber.d("⚠ User is logged out, trying to sync token")

                    val prefs = getSharedPreferences("user_prefs", MODE_PRIVATE)
                    val lastUserId = prefs.getString("last_user_id", null)

                    if (lastUserId != null) {
                        // Sync token as logged out
                        Timber.d("🔄 Syncing token for last known user (logged out): $lastUserId")
                        FcmTokenSyncManager.syncTokenWithBackend(
                            token = token,
                            context = this,
                            targetUserId = lastUserId,
                            isLoggedIn = false
                        )
                    } else {
                        Timber.w("⚠ No previous user ID found, token saved locally only")
                    }
                }
            }
            .addOnFailureListener {
                Timber.e("❌ Failed to fetch FCM token: ${it.message}")
            }
    }

    private fun updateDonorDocument(
        userId: String,
        token: String,
        deviceId: String,
        compoundTokenId: String,
        isLoggedIn: Boolean
    ) {
        db.collection("donors")
            .document(userId)
            .set(
                mapOf(
                    "userId" to userId,
                    "fcmToken" to token,
                    "deviceId" to deviceId,
                    "compoundTokenId" to compoundTokenId,
                    "isAvailable" to true,
                    "notificationEnabled" to true,
                    "hasFcmToken" to true,
                    "isLoggedIn" to isLoggedIn,
                    "lastActive" to System.currentTimeMillis(),
                    "updatedAt" to System.currentTimeMillis()
                ),
                com.google.firebase.firestore.SetOptions.merge()
            )
            .addOnSuccessListener {
                Timber.d("✅ Donor document updated (loggedIn: $isLoggedIn)")
            }
            .addOnFailureListener { e ->
                Timber.e("❌ Failed to update donor document: ${e.message}")
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

    // ✅ Function to handle user login
    private fun onUserLoggedIn() {
        val user = auth.currentUser ?: return
        val deviceId = getUniqueDeviceId()

        Timber.d("🔓 User logged in: ${user.uid}, device: $deviceId")

        // Save last user ID
        getSharedPreferences("user_prefs", MODE_PRIVATE)
            .edit {
                putString("last_user_id", user.uid)
                    .putBoolean("is_logged_in", true)
            }

        // Send login status to backend
        FcmTokenSyncManager.markUserAsLoggedIn(this, user.uid)

        // Update ViewModel
        userViewModel.updateUserName(user.displayName ?: user.email?.substringBefore("@") ?: "User")
        userViewModel.updateUserEmail(user.email ?: "No email")

        // Get FCM token and sync with backend as logged in
        val token = getSharedPreferences("app_prefs", MODE_PRIVATE)
            .getString("fcm_token", null)

        if (token != null) {
            Timber.d("🔥 Syncing existing FCM token for logged in user")
            FcmTokenSyncManager.syncTokenWithBackend(token, this, isLoggedIn = true)
        } else {
            FirebaseMessaging.getInstance().token
                .addOnSuccessListener { newToken ->
                    FcmTokenSyncManager.syncTokenWithBackend(newToken, this, isLoggedIn = true)
                }
        }
    }

    // ✅ Function to handle user logout
    private fun onUserLoggedOut() {
        val prefs = getSharedPreferences("user_prefs", MODE_PRIVATE)
        val lastUserId = prefs.getString("last_user_id", null)

        if (lastUserId != null) {
            Timber.d("🚪 User logged out: $lastUserId")
            FcmTokenSyncManager.markUserAsLoggedOut(this, lastUserId)
        }
    }

    // ✅ Function to logout user (KEEP FCM TOKEN)
    fun logoutCurrentUser() {
        val user = auth.currentUser ?: return
        val deviceId = getUniqueDeviceId()

        Timber.d("🚪 Logging out user: ${user.uid}, device: $deviceId")

        // ✅ Send logout status to backend (KEEP FCM token but mark as logged out)
        FcmTokenSyncManager.markUserAsLoggedOut(this, user.uid)

        // Update donor document as logged out
        updateDonorDocument(
            userId = user.uid,
            token = getSharedPreferences("app_prefs", MODE_PRIVATE)
                .getString("fcm_token", "") ?: "",
            deviceId = deviceId,
            compoundTokenId = "${user.uid}_$deviceId",
            isLoggedIn = false
        )

        // Clear ViewModel user data
        userViewModel.logout()

        // Save last user ID before logout
        getSharedPreferences("user_prefs", MODE_PRIVATE)
            .edit {
                putString("last_user_id", user.uid)
                    .putBoolean("is_logged_in", false)
            }

        // Sign out from Firebase Auth
        auth.signOut()

        // Restart the app
        val intent = Intent(this, MainActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()

        Toast.makeText(this, "Logged out successfully", Toast.LENGTH_SHORT).show()
    }

    // ✅ Function to get current device ID
    fun getCurrentDeviceIdentifier(): String {
        return getUniqueDeviceId()
    }

    // ✅ Function to check if current user has valid FCM token
    fun checkFCMTokenStatus(callback: (hasToken: Boolean, deviceId: String, isLoggedIn: Boolean) -> Unit) {
        val user = auth.currentUser
        val deviceId = getUniqueDeviceId()

        if (user == null) {
            callback(false, deviceId, false)
            return
        }

        db.collection("users")
            .document(user.uid)
            .collection("devices")
            .document(deviceId)
            .get()
            .addOnSuccessListener { doc ->
                val hasToken = doc.exists() && doc.getString("fcmToken")?.isNotEmpty() == true
                val isLoggedIn = doc.getBoolean("isLoggedIn") ?: true
                callback(hasToken, deviceId, isLoggedIn)
            }
            .addOnFailureListener {
                callback(false, deviceId, false)
            }
    }
}