package com.project.donateblood.network

import com.project.donateblood.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import timber.log.Timber
import java.util.concurrent.TimeUnit

object RetrofitClient {

    // ✅ IMPORTANT: Update this to your actual Render backend URL
    private val BASE_URL = BuildConfig.BASE_URL

    private const val TIMEOUT_SECONDS = 60L  // Increased timeout for Render.com

    // ✅ Interceptors
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BODY
        } else {
            HttpLoggingInterceptor.Level.NONE
        }
    }

    // ✅ Client for notification server
    private val notificationClient = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor())
        .addInterceptor(loggingInterceptor)
        .addInterceptor { chain ->
            val request = chain.request()
            Timber.d("🌐 API Request: ${request.method} ${request.url}")

            // Log request body if it exists
            val requestBody = request.body
            if (requestBody != null && requestBody.contentLength() > 0) {
                Timber.d("📤 Request Body (partial): ${requestBody.toString().take(200)}...")
            }

            // Add common headers
            val requestBuilder = request.newBuilder()
                .addHeader("Content-Type", "application/json")
                .addHeader("Accept", "application/json")
                .addHeader("User-Agent", "DonateBlood-Android/${BuildConfig.VERSION_NAME}")
                .addHeader("X-Platform", "android")
                .addHeader("X-App-Version", BuildConfig.VERSION_NAME)
                .addHeader("X-Requester-Info", "Android-App/${BuildConfig.VERSION_CODE}")
                .addHeader("Connection", "keep-alive")

            chain.proceed(requestBuilder.build())
        }
        .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    // ✅ Notification API
    val notificationApi: NotificationApi by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(notificationClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(NotificationApi::class.java)
    }

    // ✅ Your existing main API (preserved for other endpoints)
    private val mainClient = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor())
        .addInterceptor(loggingInterceptor)
        .addInterceptor { chain ->
            val request = chain.request()
            Timber.d("🔐 Authenticated API Request: ${request.method} ${request.url}")
            chain.proceed(request)
        }
        .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .build()

    val api: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(mainClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)
    }

    // ✅ Helper method to test connection
    suspend fun testConnection(): Boolean {
        Timber.d("🔄 Testing connection to: $BASE_URL")
        return try {
            val response = notificationApi.healthCheck()
            Timber.d("✅ Backend connection test: ${response.isSuccessful}")
            if (response.isSuccessful) {
                val health = response.body()
                Timber.d("📊 Backend Status: ${health?.status ?: "unknown"}")
                Timber.d("📊 Service: ${health?.service ?: "unknown"}")
                Timber.d("📊 Version: ${health?.version ?: "unknown"}")
            } else {
                Timber.e("❌ Backend health check failed: ${response.code()}")
            }
            response.isSuccessful
        } catch (e: Exception) {
            Timber.e("❌ Connection test failed: ${e.message}")
            false
        }
    }

    // ✅ Get backend URL for debugging
    fun getBaseUrl(): String = BASE_URL

    // ✅ NEW: Test backend notification system
    suspend fun testNotificationSystem(): Boolean {
        return try {
            Timber.d("🧪 Testing notification system...")

            // 1. Test health check
            val healthResponse = notificationApi.healthCheck()
            if (!healthResponse.isSuccessful) {
                Timber.e("❌ Health check failed: ${healthResponse.code()}")
                return false
            }

            // 2. Test debug info
            val debugResponse = notificationApi.debugInfo()
            if (!debugResponse.isSuccessful) {
                Timber.e("❌ Debug info failed: ${debugResponse.code()}")
                return false
            }

            Timber.d("✅ Notification system tests passed")
            true
        } catch (e: Exception) {
            Timber.e("❌ Notification system test failed: ${e.message}")
            false
        }
    }

    // ✅ Validate FCM token with backend
    suspend fun validateFcmToken(userId: String, deviceId: String? = null): ValidateTokenResponse? {
        return try {
            Timber.d("🔍 Validating FCM token for user: $userId")
            val response = notificationApi.validateToken(
                ValidateTokenRequest(
                    userId = userId,
                    deviceId = deviceId
                )
            )

            if (response.isSuccessful) {
                response.body()
            } else {
                Timber.e("❌ Token validation failed: ${response.code()}")
                null
            }
        } catch (e: Exception) {
            Timber.e("❌ Token validation error: ${e.message}")
            null
        }
    }
}