package com.project.donateblood.models

import android.os.Parcelable
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.Exclude
import com.google.firebase.firestore.IgnoreExtraProperties
import kotlinx.parcelize.Parcelize
import java.io.Serializable

@IgnoreExtraProperties
@Parcelize
data class Donor(
    @DocumentId
    var id: String = "",
    var userId: String = "",
    var name: String = "",
    var phone: String = "",
    var bloodGroup: String = "",
    var district: String = "",
    var location: String = "",
    var email: String = "",
    var lastDonation: String = "",
    var imageUrl: String = "",

    // ✅ CORRECTED: All timestamps as Long to match backend TypeScript interface
    var updatedAt: Long = 0L,      // Changed from Timestamp? to Long
    var createdAt: Long = 0L,
    var lastActive: Long = 0L,
    var lastDonationDate: Long = 0L,  // This is number in your backend

    var isAvailable: Boolean = true,
    var isActive: Boolean = true,
    var canDonate: Boolean = true,
    var hasFcmToken: Boolean = true,
    var notificationEnabled: Boolean = true,
    var isLoggedIn: Boolean = true,  // ✅ CRITICAL: Must match backend isLoggedIn field

    // FCM Token and Device Management
    var fcmToken: String = "",
    var deviceId: String? = null,
    var compoundTokenId: String? = null,
    var deviceType: String? = "android",
    var appVersion: String? = null,
    var userType: String = "donor",

    // Computed Properties
    var daysSinceLastDonation: Int = 0,

    // Additional Optional Fields
    var age: Int? = null,
    var weight: Int? = null,
    var gender: String? = null,
    var emergencyContact: String? = null,
    var medicalConditions: List<String>? = null,
    var donationCount: Int? = null
) : Parcelable, Serializable {

    @Exclude
    fun isEligibleToDonate(): Boolean {
        if (lastDonationDate == 0L) return true // never donated
        val ninetyDaysInMillis = 90L * 24 * 60 * 60 * 1000
        return System.currentTimeMillis() - lastDonationDate >= ninetyDaysInMillis
    }

    @Exclude
    fun hasValidFCMToken(): Boolean {
        return fcmToken.isNotBlank() &&
                fcmToken.length > 20 &&
                fcmToken.contains(":")
    }

    @Exclude
    fun toBackendFormat(): Map<String, Any> {
        return mapOf(
            "id" to id,
            "userId" to userId,
            "name" to name,
            "phone" to phone,
            "bloodGroup" to bloodGroup,
            "district" to district,
            "location" to location,
            "isAvailable" to isAvailable,
            "fcmToken" to fcmToken,
            "lastDonationDate" to lastDonationDate,
            "notificationEnabled" to notificationEnabled,
            "isLoggedIn" to isLoggedIn,  // ✅ Include login status
            "isActive" to isActive,
            "canDonate" to canDonate,
            "hasFcmToken" to hasFcmToken,
            "deviceId" to (deviceId ?: ""),
            "compoundTokenId" to (compoundTokenId ?: ""),
            "deviceType" to (deviceType ?: "android"),
            "appVersion" to (appVersion ?: ""),
            "userType" to userType,
            "email" to email,
            "lastDonation" to lastDonation,
            "imageUrl" to imageUrl,
            "createdAt" to createdAt,
            "updatedAt" to updatedAt,  // ✅ Now Long
            "lastActive" to lastActive,
            "daysSinceLastDonation" to daysSinceLastDonation
        )
    }

    @Exclude
    fun getStatusDescription(): String {
        return when {
            !isAvailable -> "Unavailable"
            !isLoggedIn -> "Logged Out"
            !notificationEnabled -> "Notifications Off"
            !hasValidFCMToken() -> "No Token"
            else -> "Available"
        }
    }
}