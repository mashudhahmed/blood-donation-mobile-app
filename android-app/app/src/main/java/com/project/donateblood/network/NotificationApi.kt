package com.project.donateblood.network

import com.google.gson.annotations.SerializedName
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface NotificationApi {

    // ✅ Blood request endpoint - accepts medicalName
    @POST("notifications/blood-request")
    suspend fun submitBloodRequest(
        @Body request: BackendBloodRequest
    ): Response<BloodRequestBackendResponse>

    // ✅ Health check
    @GET("notifications/health")
    suspend fun healthCheck(): Response<HealthResponse>

    // ✅ Save FCM token - Updated with device tracking AND login status
    @POST("notifications/save-token")
    suspend fun saveFcmToken(
        @Body body: SaveTokenRequest
    ): Response<ApiResponse>  // Changed to ApiResponse

    // ✅ Debug endpoint
    @GET("notifications/debug")
    suspend fun debugInfo(): Response<DebugResponse>

    // ✅ Get matching stats
    @POST("notifications/matching-stats")
    suspend fun getMatchingStats(
        @Body body: MatchingStatsRequest
    ): Response<MatchingStatsResponse>

    // ✅ Token validation endpoint
    @POST("notifications/validate-token")
    suspend fun validateToken(
        @Body body: ValidateTokenRequest
    ): Response<ValidateTokenResponse>

    // ✅ NEW: Logout endpoint
    @POST("notifications/logout")
    suspend fun markUserAsLoggedOut(
        @Body body: LoginLogoutRequest
    ): Response<ApiResponse>

    // ✅ NEW: Login endpoint
    @POST("notifications/login")
    suspend fun markUserAsLoggedIn(
        @Body body: LoginLogoutRequest
    ): Response<ApiResponse>

    // ✅ Test notification endpoint
    @POST("notifications/test-notification")
    suspend fun sendTestNotification(@Body body: TestNotificationRequest): Response<ApiResponse>
}

// ✅ FIXED: Backend blood request with SerializedName annotations
data class BackendBloodRequest(
    @SerializedName("requestId")
    val requestId: String? = null,

    @SerializedName("bloodGroup")
    val bloodGroup: String,

    @SerializedName("district")
    val district: String,

    @SerializedName("medicalName")  // Backend accepts: hospitalName || hospital || medicalName
    val medicalName: String,

    @SerializedName("urgency")
    val urgency: String = "normal",

    @SerializedName("patientName")
    val patientName: String? = null,

    @SerializedName("contactPhone")
    val contactPhone: String? = null,

    @SerializedName("units")
    val units: Int = 1,

    @SerializedName("requesterId")  // ✅ Backend requires this to exclude self
    val requesterId: String? = null  // ✅ Made optional with default
)

data class BloodRequestBackendResponse(
    val success: Boolean,
    val message: String,
    val data: BloodRequestBackendData? = null
)

data class BloodRequestBackendData(
    val requestId: String?,
    val totalCompatibleDonors: Int,
    val eligibleDonors: Int,
    val notifiedDonors: Int,
    val failedNotifications: Int,
    val logId: String?,
    val timestamp: String?,
    val recipients: List<RecipientInfo>? = null,
    val requesterExcluded: Boolean? = null,
    val sameDeviceExcluded: Int? = null
)

data class RecipientInfo(
    val userId: String,
    val name: String? = null,
    val deviceId: String? = null
)

data class DebugResponse(
    val status: String,
    val timestamp: String,
    val firebase: String,
    val environment: String,
    val endpoints: Map<String, String>
)

data class MatchingStatsRequest(
    val bloodGroup: String,
    val district: String,
    val requesterId: String? = null
)

data class MatchingStatsResponse(
    val bloodGroup: String,
    val district: String,
    val totalCompatibleDonors: Int,
    val eligibleDonors: Int,
    val compatibleBloodTypes: List<String>,
    val requesterId: String?,
    val requesterDevices: List<String>,
    val timestamp: String,
    val error: String? = null
)

data class ValidateTokenRequest(
    val userId: String,
    val deviceId: String? = null
)

data class ValidateTokenResponse(
    val hasToken: Boolean,
    val userId: String,
    val deviceId: String?,
    val compoundTokenId: String?,
    val isAvailable: Boolean?,
    val isLoggedIn: Boolean?,  // ✅ Added login status
    val notificationEnabled: Boolean?,
    val lastActive: Any?,
    val message: String
)

data class TestNotificationRequest(
    val token: String,
    val userId: String? = null
)