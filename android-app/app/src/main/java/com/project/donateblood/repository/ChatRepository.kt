package com.project.donateblood.repository

import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import com.project.donateblood.models.ChatConversation
import com.project.donateblood.models.ChatMessage
import com.project.donateblood.utils.FirebaseUtils
import timber.log.Timber

class ChatRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {

    fun getConversationId(userId1: String, userId2: String): String {
        return if (userId1 < userId2) "${userId1}_${userId2}" else "${userId2}_${userId1}"
    }

    /**
     * Listens for all conversations involving the current user in real-time.
     */
    fun listenToConversations(
        currentUserId: String,
        onSuccess: (List<ChatConversation>) -> Unit,
        onError: (Exception) -> Unit
    ): ListenerRegistration {
        return firestore.collection(FirebaseUtils.Collections.CHATS)
            .whereArrayContains("participantIds", currentUserId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Timber.e(error, "Failed to listen to conversations for user: $currentUserId")
                    onError(error)
                    return@addSnapshotListener
                }

                val conversations = snapshot?.documents?.mapNotNull { doc ->
                    try {
                        doc.toObject(ChatConversation::class.java)?.apply {
                            if (id.isEmpty()) id = doc.id
                        } ?: parseConversationManually(doc)
                    } catch (e: Exception) {
                        Timber.w(e, "Fallback parsing conversation: ${doc.id}")
                        parseConversationManually(doc)
                    }
                }?.sortedByDescending { it.lastMessageTimestamp } ?: emptyList()

                onSuccess(conversations)
            }
    }

    /**
     * Listens for all messages within a specific conversation ordered chronologically.
     */
    fun listenToMessages(
        chatId: String,
        onSuccess: (List<ChatMessage>) -> Unit,
        onError: (Exception) -> Unit
    ): ListenerRegistration {
        return firestore.collection(FirebaseUtils.Collections.CHATS)
            .document(chatId)
            .collection(FirebaseUtils.Collections.MESSAGES)
            .orderBy("timestamp", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Timber.e(error, "Failed to listen to messages for chat: $chatId")
                    onError(error)
                    return@addSnapshotListener
                }

                val messages = snapshot?.documents?.mapNotNull { doc ->
                    try {
                        doc.toObject(ChatMessage::class.java)?.apply {
                            if (id.isEmpty()) id = doc.id
                        } ?: parseMessageManually(doc)
                    } catch (e: Exception) {
                        Timber.w(e, "Fallback parsing message: ${doc.id}")
                        parseMessageManually(doc)
                    }
                }?.sortedBy { it.timestamp } ?: emptyList()

                onSuccess(messages)
            }
    }

    fun generateMessageId(chatId: String): String {
        return firestore.collection(FirebaseUtils.Collections.CHATS)
            .document(chatId)
            .collection(FirebaseUtils.Collections.MESSAGES)
            .document().id
    }

    /**
     * Sends a new message and atomically updates the parent conversation metadata.
     */
    fun sendMessage(
        senderId: String,
        senderName: String,
        senderBloodGroup: String,
        senderImage: String = "",
        receiverId: String,
        receiverName: String,
        receiverBloodGroup: String,
        receiverPhone: String,
        receiverImage: String = "",
        messageText: String,
        messageId: String? = null,
        onComplete: (Boolean, Exception?) -> Unit
    ) {
        val chatId = getConversationId(senderId, receiverId)
        val timestamp = System.currentTimeMillis()
        val chatDocRef = firestore.collection(FirebaseUtils.Collections.CHATS).document(chatId)
        val messagesColRef = chatDocRef.collection(FirebaseUtils.Collections.MESSAGES)
        val newMessageRef = if (!messageId.isNullOrBlank()) messagesColRef.document(messageId) else messagesColRef.document()

        val messageData = hashMapOf(
            "id" to newMessageRef.id,
            "senderId" to senderId,
            "senderName" to senderName,
            "receiverId" to receiverId,
            "receiverName" to receiverName,
            "message" to messageText,
            "timestamp" to timestamp,
            "isRead" to false,
            "status" to ChatMessage.STATUS_SENT
        )

        val conversationData = hashMapOf<String, Any>(
            "id" to chatId,
            "participantIds" to listOf(senderId, receiverId),
            "participantNames" to mapOf(senderId to senderName, receiverId to receiverName),
            "participantBloodGroups" to mapOf(
                senderId to senderBloodGroup,
                receiverId to receiverBloodGroup
            ),
            "participantPhones" to mapOf(
                receiverId to receiverPhone
            ),
            "lastMessage" to messageText,
            "lastMessageTimestamp" to timestamp,
            "lastSenderId" to senderId,
            "isRead" to false,
            "lastMessageStatus" to ChatMessage.STATUS_SENT,
            "unreadCounts.$receiverId" to FieldValue.increment(1),
            "unreadCounts.$senderId" to 0L
        )

        val imagesMap = hashMapOf<String, String>()
        if (senderImage.isNotBlank()) imagesMap[senderId] = senderImage
        if (receiverImage.isNotBlank()) imagesMap[receiverId] = receiverImage
        if (imagesMap.isNotEmpty()) {
            conversationData["participantImages"] = imagesMap
        }

        firestore.runBatch { batch ->
            batch.set(newMessageRef, messageData)
            batch.set(chatDocRef, conversationData, SetOptions.merge())
        }.addOnSuccessListener {
            Timber.d("Message sent successfully: ${newMessageRef.id}")
            onComplete(true, null)
        }.addOnFailureListener { e ->
            Timber.e(e, "Failed to send message: ${e.message}")
            onComplete(false, e)
        }
    }

    /**
     * Marks received unread messages as READ for currentUserId.
     * Note: Only updates conversation document's lastMessageStatus to READ if the other user sent the last message!
     */
    fun markConversationAsRead(chatId: String, currentUserId: String) {
        val chatDocRef = firestore.collection(FirebaseUtils.Collections.CHATS).document(chatId)
        val messagesColRef = chatDocRef.collection(FirebaseUtils.Collections.MESSAGES)

        // 1. Batch update received unread messages
        messagesColRef
            .whereEqualTo("receiverId", currentUserId)
            .whereEqualTo("isRead", false)
            .get()
            .addOnSuccessListener { snapshot ->
                if (!snapshot.isEmpty) {
                    val batch = firestore.batch()
                    for (doc in snapshot.documents) {
                        batch.update(
                            doc.reference,
                            mapOf(
                                "isRead" to true,
                                "status" to ChatMessage.STATUS_READ
                            )
                        )
                    }
                    batch.commit().addOnFailureListener { e ->
                        Timber.w(e, "Failed to batch mark messages as read: ${e.message}")
                    }
                }
            }
            .addOnFailureListener { e ->
                Timber.w(e, "Failed to query unread messages: ${e.message}")
            }

        // 2. Update conversation read status and lastMessageStatus ONLY if currentUserId is NOT the sender of the last message
        chatDocRef.get().addOnSuccessListener { doc ->
            if (doc != null && doc.exists()) {
                val lastSenderId = doc.getString("lastSenderId") ?: ""
                val updates = mutableMapOf<String, Any>(
                    "unreadCounts.$currentUserId" to 0L
                )

                // If the other participant was the last sender, currentUserId has now read the last message!
                if (lastSenderId.isNotBlank() && lastSenderId != currentUserId) {
                    updates["isRead"] = true
                    updates["lastMessageStatus"] = ChatMessage.STATUS_READ
                }

                chatDocRef.update(updates).addOnFailureListener { e ->
                    Timber.w(e, "Failed to mark chat as read for $chatId: ${e.message}")
                }
            }
        }.addOnFailureListener { e ->
            Timber.w(e, "Failed to get chatDoc before marking as read: ${e.message}")
        }
    }

    /**
     * Marks incoming messages as DELIVERED when the recipient is listening or enters the app.
     */
    fun markMessagesAsDelivered(chatId: String, currentUserId: String) {
        val chatDocRef = firestore.collection(FirebaseUtils.Collections.CHATS).document(chatId)
        val messagesColRef = chatDocRef.collection(FirebaseUtils.Collections.MESSAGES)

        messagesColRef
            .whereEqualTo("receiverId", currentUserId)
            .whereEqualTo("status", ChatMessage.STATUS_SENT)
            .get()
            .addOnSuccessListener { snapshot ->
                if (!snapshot.isEmpty) {
                    val batch = firestore.batch()
                    for (doc in snapshot.documents) {
                        batch.update(doc.reference, "status", ChatMessage.STATUS_DELIVERED)
                    }
                    batch.commit().addOnFailureListener { e ->
                        Timber.w(e, "Failed to mark messages as delivered: ${e.message}")
                    }
                }
            }

        // Also update lastMessageStatus to DELIVERED on conversation doc if the other participant was sender
        chatDocRef.get().addOnSuccessListener { doc ->
            if (doc != null && doc.exists()) {
                val lastSenderId = doc.getString("lastSenderId") ?: ""
                val currentStatus = doc.getString("lastMessageStatus") ?: ""
                if (lastSenderId.isNotBlank() && lastSenderId != currentUserId && currentStatus == ChatMessage.STATUS_SENT) {
                    chatDocRef.update("lastMessageStatus", ChatMessage.STATUS_DELIVERED).addOnFailureListener { e ->
                        Timber.w(e, "Failed to update lastMessageStatus to delivered: ${e.message}")
                    }
                }
            }
        }
    }

    /**
     * Reconciles lastMessageStatus on the parent conversation document with the real status of the latest message.
     * Heals any legacy/corrupted conversations where sender marked own message as read.
     */
    fun reconcileLastMessageStatus(chatId: String, currentUserId: String) {
        val chatDocRef = firestore.collection(FirebaseUtils.Collections.CHATS).document(chatId)
        chatDocRef.collection(FirebaseUtils.Collections.MESSAGES)
            .orderBy("timestamp", Query.Direction.DESCENDING)
            .limit(1)
            .get()
            .addOnSuccessListener { snapshot ->
                val lastDoc = snapshot.documents.firstOrNull() ?: return@addOnSuccessListener
                val senderId = lastDoc.getString("senderId") ?: ""
                if (senderId == currentUserId) {
                    val actualStatus = lastDoc.getString("status") ?: ""
                    val isRead = lastDoc.getBoolean("isRead") ?: false
                    val resolvedStatus = when {
                        isRead || actualStatus == ChatMessage.STATUS_READ -> ChatMessage.STATUS_READ
                        actualStatus.isNotBlank() -> actualStatus
                        else -> ChatMessage.STATUS_SENT
                    }

                    if (resolvedStatus != ChatMessage.STATUS_READ) {
                        chatDocRef.update(
                            mapOf(
                                "lastMessageStatus" to resolvedStatus,
                                "isRead" to false
                            )
                        ).addOnFailureListener { e ->
                            Timber.w(e, "Failed to reconcile status on chat $chatId: ${e.message}")
                        }
                    }
                }
            }
    }

    private fun parseMessageManually(doc: DocumentSnapshot): ChatMessage {
        val isRead = doc.getBoolean("isRead") ?: false
        val status = doc.getString("status") ?: if (isRead) ChatMessage.STATUS_READ else ChatMessage.STATUS_SENT
        return ChatMessage(
            id = doc.getString("id") ?: doc.id,
            senderId = doc.getString("senderId") ?: "",
            senderName = doc.getString("senderName") ?: "",
            receiverId = doc.getString("receiverId") ?: "",
            receiverName = doc.getString("receiverName") ?: "",
            message = doc.getString("message") ?: "",
            timestamp = doc.getLong("timestamp") ?: 0L,
            isRead = isRead,
            status = status
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseConversationManually(doc: DocumentSnapshot): ChatConversation {
        val participantIds = (doc.get("participantIds") as? List<*>)?.mapNotNull { it?.toString() } ?: emptyList()
        val participantNames = (doc.get("participantNames") as? Map<*, *>)?.entries
            ?.associate { it.key.toString() to it.value.toString() } ?: emptyMap()
        val participantBloodGroups = (doc.get("participantBloodGroups") as? Map<*, *>)?.entries
            ?.associate { it.key.toString() to it.value.toString() } ?: emptyMap()
        val participantPhones = (doc.get("participantPhones") as? Map<*, *>)?.entries
            ?.associate { it.key.toString() to it.value.toString() } ?: emptyMap()
        val participantImages = (doc.get("participantImages") as? Map<*, *>)?.entries
            ?.associate { it.key.toString() to it.value.toString() } ?: emptyMap()
        val isRead = doc.getBoolean("isRead") ?: false
        val lastMessageStatus = doc.getString("lastMessageStatus") ?: ChatMessage.STATUS_SENT
        val unreadCounts = (doc.get("unreadCounts") as? Map<*, *>)?.entries
            ?.associate { it.key.toString() to ((it.value as? Number)?.toLong() ?: 0L) } ?: emptyMap()

        return ChatConversation(
            id = doc.getString("id") ?: doc.id,
            participantIds = participantIds,
            participantNames = participantNames,
            participantBloodGroups = participantBloodGroups,
            participantPhones = participantPhones,
            participantImages = participantImages,
            lastMessage = doc.getString("lastMessage") ?: "",
            lastMessageTimestamp = doc.getLong("lastMessageTimestamp") ?: 0L,
            lastSenderId = doc.getString("lastSenderId") ?: "",
            isRead = isRead,
            unreadCounts = unreadCounts,
            lastMessageStatus = lastMessageStatus
        )
    }
}
