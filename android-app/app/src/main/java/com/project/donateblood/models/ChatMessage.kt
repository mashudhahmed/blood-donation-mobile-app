package com.project.donateblood.models

import android.os.Parcelable
import com.google.firebase.firestore.IgnoreExtraProperties
import kotlinx.parcelize.Parcelize
import java.io.Serializable

@IgnoreExtraProperties
@Parcelize
data class ChatMessage(
    var id: String = "",
    var senderId: String = "",
    var senderName: String = "",
    var receiverId: String = "",
    var receiverName: String = "",
    var message: String = "",
    var timestamp: Long = System.currentTimeMillis(),
    var isRead: Boolean = false,
    var status: String = STATUS_SENT
) : Parcelable, Serializable {

    companion object {
        const val STATUS_PENDING = "pending"
        const val STATUS_SENT = "sent"
        const val STATUS_DELIVERED = "delivered"
        const val STATUS_READ = "read"
    }

    fun isMessageRead(): Boolean = isRead || status == STATUS_READ
    fun isMessageDelivered(): Boolean = status == STATUS_DELIVERED || isMessageRead()
    fun isMessageSent(): Boolean = status == STATUS_SENT || isMessageDelivered()
}
