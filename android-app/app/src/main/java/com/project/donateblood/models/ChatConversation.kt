package com.project.donateblood.models

import android.os.Parcelable
import com.google.firebase.firestore.IgnoreExtraProperties
import kotlinx.parcelize.Parcelize
import java.io.Serializable

@IgnoreExtraProperties
@Parcelize
data class ChatConversation(
    var id: String = "",
    var participantIds: List<String> = emptyList(),
    var participantNames: Map<String, String> = emptyMap(),
    var participantBloodGroups: Map<String, String> = emptyMap(),
    var participantPhones: Map<String, String> = emptyMap(),
    var participantImages: Map<String, String> = emptyMap(),
    var lastMessage: String = "",
    var lastMessageTimestamp: Long = 0L,
    var lastSenderId: String = "",
    var isRead: Boolean = false,
    var unreadCounts: Map<String, Long> = emptyMap(),
    var lastMessageStatus: String = "sent"
) : Parcelable, Serializable {

    fun getOtherParticipantId(currentUserId: String): String {
        return participantIds.firstOrNull { it != currentUserId } ?: ""
    }

    fun getOtherParticipantName(currentUserId: String): String {
        val otherId = getOtherParticipantId(currentUserId)
        return participantNames[otherId]?.takeIf { it.isNotBlank() } ?: "User"
    }

    fun getOtherParticipantBloodGroup(currentUserId: String): String {
        val otherId = getOtherParticipantId(currentUserId)
        return participantBloodGroups[otherId]?.takeIf { it.isNotBlank() } ?: ""
    }

    fun getOtherParticipantPhone(currentUserId: String): String {
        val otherId = getOtherParticipantId(currentUserId)
        return participantPhones[otherId]?.takeIf { it.isNotBlank() } ?: ""
    }

    fun getOtherParticipantImage(currentUserId: String): String {
        val otherId = getOtherParticipantId(currentUserId)
        return participantImages[otherId] ?: ""
    }

    fun getUnreadCountFor(currentUserId: String): Int {
        if (lastSenderId.isNotEmpty() && lastSenderId != currentUserId && !isRead) {
            val count = (unreadCounts[currentUserId] ?: 1L).toInt()
            return if (count > 0) count else 1
        }
        return 0
    }
}
