package com.project.donateblood.models

import java.io.Serializable
import java.text.SimpleDateFormat
import java.util.*

data class NotificationItem(
    // ✅ Core identification
    val id: String = "",
    val requestId: String = "",
    val notificationId: String = "", // ✅ ADD THIS FIELD

    // ✅ Display fields (for adapter)
    val title: String = "",
    val message: String = "",
    val time: String = "",                    // Formatted time string for display
    val timestamp: Long = 0,                  // Raw timestamp for sorting
    val type: String = "",

    // ✅ Blood request details (for repository)
    val urgency: String = "normal",
    val bloodGroup: String = "",
    val hospital: String = "",
    val district: String = "",
    val patientName: String = "",
    val contactPhone: String = "",
    val units: Int = 1,

    // ✅ Status fields
    var isRead: Boolean = false,
    val createdAt: Long = 0,                  // Original creation timestamp
    val readAt: Long? = null
) : Serializable {

    // ✅ Helper properties
    val isHighUrgency: Boolean
        get() = urgency == "high" || urgency == "critical"

    val isBloodRequest: Boolean
        get() = type == "blood_request"

    // ✅ Helper to format time for display
    fun formatDisplayTime(): String {
        return if (time.isNotEmpty()) {
            time
        } else if (timestamp > 0) {
            val date = Date(timestamp)
            val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
            val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
            "${timeFormat.format(date)} · ${dateFormat.format(date)}"
        } else if (createdAt > 0) {
            val date = Date(createdAt)
            val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
            val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
            "${timeFormat.format(date)} · ${dateFormat.format(date)}"
        } else {
            ""
        }
    }

    val displayTime: String
        get() = formatDisplayTime()
}