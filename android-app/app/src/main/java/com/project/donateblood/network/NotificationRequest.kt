package com.project.donateblood.network

data class NotificationRequest(
    // Send tokens (Android format)
    val tokens: List<String>,
    // Also include donors for backward compatibility
    val donors: List<DonorRequest>? = null,
    val title: String,
    val body: String,
    val data: Map<String, String>,
    val userIds: List<String>
)

// For backward compatibility with backend
data class DonorRequest(
    val uid: String,
    val fcmToken: String
)