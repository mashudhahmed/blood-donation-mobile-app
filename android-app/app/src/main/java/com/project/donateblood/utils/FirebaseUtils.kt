package com.project.donateblood.utils

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase

object FirebaseUtils {
    val firestore: FirebaseFirestore = Firebase.firestore

    object Collections {
        const val DONORS = "donors"
        const val USERS = "users"
        const val REQUESTS = "blood_requests"
        const val NOTIFICATIONS = "notifications" // Optional: add if you use notifications
    }

    object UserFields {
        const val UID = "uid"
        const val NAME = "name"
        const val EMAIL = "email"
        const val PHONE = "phone"
        const val BLOOD_GROUP = "bloodGroup"
        const val DISTRICT = "district"
        const val LOCATION = "location" // Add this for consistency
        const val IS_DONOR = "isDonor"
        const val PROFILE_IMAGE = "profileImage"
        const val CREATED_AT = "createdAt"
        const val UPDATED_AT = "updatedAt"
        const val IS_AVAILABLE = "isAvailable" // ADDED: Missing field
        const val DATE_OF_BIRTH = "dateOfBirth" // Added for completeness
        const val POST_OFFICE = "postOffice" // Added for completeness
        const val POLICE_STATION = "policeStation" // Added for completeness
        const val VILLAGE = "village" // Added for completeness
        const val ROAD = "road" // Added for completeness
        const val USER_TYPE = "userType" // Added for completeness
        const val TOTAL_DONATIONS = "totalDonations" // Added for completeness
        const val LAST_DONATION_DATE = "lastDonationDate" // Added for completeness
    }

    object DonorFields {
        const val ID = "id"
        const val USER_ID = "userId"
        const val NAME = "name"
        const val BLOOD_GROUP = "bloodGroup"
        const val LOCATION = "location"
        const val DISTRICT = "district"
        const val PHONE = "phone"
        const val LAST_ACTIVE = "lastActive"
        const val IS_AVAILABLE = "isAvailable"
        const val IMAGE_URL = "imageUrl"
        const val FCM_TOKEN = "fcmToken"
        const val LAST_DONATION_DATE = "lastDonationDate"
        const val IS_NOTIFICATION_ENABLED = "isNotificationEnabled"
        const val DEVICE_ID = "deviceId"
        const val LAST_DONATION = "lastDonation"
        const val CREATED_AT = "createdAt"
        const val UPDATED_AT = "updatedAt"
        const val TOTAL_DONATIONS = "totalDonations" // Optional: add if you track donations
    }
}