package com.project.donateblood.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.project.donateblood.models.NotificationItem
import kotlinx.coroutines.tasks.await
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NotificationRepository @Inject constructor(
    private val firestore: FirebaseFirestore
) {

    private val dateFormat = SimpleDateFormat("hh:mm a, dd/MM/yyyy", Locale.getDefault())

    suspend fun getUserNotifications(userId: String, limit: Int = 50): List<NotificationItem> {
        return try {
            val snapshot = firestore.collection("notifications")
                .document(userId)
                .collection("items")
                .orderBy("createdAt", Query.Direction.DESCENDING)
                .limit(limit.toLong())
                .get()
                .await()

            snapshot.documents.mapNotNull { doc ->
                try {
                    val data = doc.data ?: return@mapNotNull null

                    // Parse createdAt timestamp
                    val createdAt = (data["createdAt"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: 0L

                    // Format time for display
                    val displayTime = if (createdAt > 0) {
                        dateFormat.format(Date(createdAt))
                    } else {
                        ""
                    }

                    // Parse readAt timestamp if exists
                    val readAtTimestamp = (data["readAt"] as? com.google.firebase.Timestamp)?.toDate()?.time

                    NotificationItem(
                        id = doc.id,
                        requestId = data["requestId"] as? String ?: "",
                        title = data["title"] as? String ?: "",
                        message = data["message"] as? String ?: "",
                        time = displayTime,
                        timestamp = createdAt, // Use createdAt as timestamp for sorting
                        type = data["type"] as? String ?: "blood_request",
                        urgency = data["urgency"] as? String ?: "normal",
                        bloodGroup = data["bloodGroup"] as? String ?: "",
                        hospital = data["hospital"] as? String ?: "",
                        district = data["district"] as? String ?: "",
                        patientName = data["patientName"] as? String ?: "",
                        contactPhone = data["contactPhone"] as? String ?: "",
                        units = (data["units"] as? Long)?.toInt() ?: 1,
                        isRead = data["isRead"] as? Boolean ?: false,
                        createdAt = createdAt,
                        readAt = readAtTimestamp
                    )
                } catch (e: Exception) {
                    Timber.e("Error parsing notification ${doc.id}: ${e.message}")
                    null
                }
            }
        } catch (e: Exception) {
            Timber.e("Error fetching notifications: ${e.message}")
            emptyList()
        }
    }

    suspend fun markAsRead(userId: String, notificationId: String): Boolean {
        return try {
            firestore.collection("notifications")
                .document(userId)
                .collection("items")
                .document(notificationId)
                .update(
                    "isRead", true,
                    "readAt", com.google.firebase.firestore.FieldValue.serverTimestamp()
                )
                .await()
            true
        } catch (e: Exception) {
            Timber.e("Error marking as read: ${e.message}")
            false
        }
    }

    suspend fun markAllAsRead(userId: String): Boolean {
        return try {
            val snapshot = firestore.collection("notifications")
                .document(userId)
                .collection("items")
                .whereEqualTo("isRead", false)
                .get()
                .await()

            val batch = firestore.batch()
            snapshot.documents.forEach { doc ->
                batch.update(
                    doc.reference,
                    "isRead", true,
                    "readAt", com.google.firebase.firestore.FieldValue.serverTimestamp()
                )
            }

            batch.commit().await()
            true
        } catch (e: Exception) {
            Timber.e("Error marking all as read: ${e.message}")
            false
        }
    }

    suspend fun getUnreadCount(userId: String): Int {
        return try {
            val snapshot = firestore.collection("notifications")
                .document(userId)
                .collection("items")
                .whereEqualTo("isRead", false)
                .get()
                .await()
            snapshot.size()
        } catch (e: Exception) {
            Timber.e("Error getting unread count: ${e.message}")
            0
        }
    }

    suspend fun deleteNotification(userId: String, notificationId: String): Boolean {
        return try {
            firestore.collection("notifications")
                .document(userId)
                .collection("items")
                .document(notificationId)
                .delete()
                .await()
            true
        } catch (e: Exception) {
            Timber.e("Error deleting notification: ${e.message}")
            false
        }
    }

    fun getNotificationsLiveData(userId: String): Query {
        return firestore.collection("notifications")
            .document(userId)
            .collection("items")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(50)
    }

    // ✅ NEW: Get a single notification by ID
    suspend fun getNotificationById(userId: String, notificationId: String): NotificationItem? {
        return try {
            val doc = firestore.collection("notifications")
                .document(userId)
                .collection("items")
                .document(notificationId)
                .get()
                .await()

            if (doc.exists()) {
                val data = doc.data ?: return null
                val createdAt = (data["createdAt"] as? com.google.firebase.Timestamp)?.toDate()?.time ?: 0L
                val displayTime = if (createdAt > 0) dateFormat.format(Date(createdAt)) else ""
                val readAtTimestamp = (data["readAt"] as? com.google.firebase.Timestamp)?.toDate()?.time

                NotificationItem(
                    id = doc.id,
                    requestId = data["requestId"] as? String ?: "",
                    title = data["title"] as? String ?: "",
                    message = data["message"] as? String ?: "",
                    time = displayTime,
                    timestamp = createdAt,
                    type = data["type"] as? String ?: "blood_request",
                    urgency = data["urgency"] as? String ?: "normal",
                    bloodGroup = data["bloodGroup"] as? String ?: "",
                    hospital = data["hospital"] as? String ?: "",
                    district = data["district"] as? String ?: "",
                    patientName = data["patientName"] as? String ?: "",
                    contactPhone = data["contactPhone"] as? String ?: "",
                    units = (data["units"] as? Long)?.toInt() ?: 1,
                    isRead = data["isRead"] as? Boolean ?: false,
                    createdAt = createdAt,
                    readAt = readAtTimestamp
                )
            } else {
                null
            }
        } catch (e: Exception) {
            Timber.e("Error getting notification by ID: ${e.message}")
            null
        }
    }
}