package com.project.donateblood.network

data class NotificationResponse(
    val success: Boolean = false,
    val sent: Int = 0,
    val failed: Int = 0,
    val total: Int = 0,  // Changed from totalTokens to total
    val message: String? = null,
    val error: String? = null,
    val code: String? = null
)

// ✅ UPDATED: Add timestamp and version fields to match backend response
data class HealthResponse(
    val status: String,
    val service: String,
    val timestamp: String,    // ✅ ADD THIS
    val version: String       // ✅ ADD THIS
)