package com.project.donateblood.adapter

import android.content.res.ColorStateList
import android.graphics.Typeface
import android.text.format.DateUtils
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.project.donateblood.R
import com.project.donateblood.models.ChatConversation
import com.project.donateblood.models.ChatMessage
import com.project.donateblood.utils.ProfileImageManager
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class ConversationAdapter(
    private val currentUserId: String,
    private val onConversationClick: (ChatConversation) -> Unit
) : ListAdapter<ChatConversation, ConversationAdapter.ConversationViewHolder>(DiffCallback) {

    data class CachedUserProfile(
        val name: String = "",
        val bloodGroup: String = "",
        val profileImage: String = ""
    )

    private val userProfileCache = HashMap<String, CachedUserProfile>()

    fun getCachedProfile(userId: String): CachedUserProfile? = userProfileCache[userId]

    inner class ConversationViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val ivAvatar: ImageView = itemView.findViewById(R.id.ivAvatar)
        private val tvBloodBadge: TextView = itemView.findViewById(R.id.tvBloodBadge)
        private val tvParticipantName: TextView = itemView.findViewById(R.id.tvParticipantName)
        private val tvLastMessage: TextView = itemView.findViewById(R.id.tvLastMessage)
        private val ivLastMsgStatus: ImageView? = itemView.findViewById(R.id.ivLastMsgStatus)
        private val tvTimestamp: TextView = itemView.findViewById(R.id.tvTimestamp)
        private val tvUnreadBadge: TextView = itemView.findViewById(R.id.tvUnreadBadge)

        fun bind(conversation: ChatConversation) {
            val otherId = conversation.getOtherParticipantId(currentUserId)
            var otherName = conversation.getOtherParticipantName(currentUserId)
            var otherBlood = conversation.getOtherParticipantBloodGroup(currentUserId)
            var otherImage = conversation.getOtherParticipantImage(currentUserId)
            val unreadCount = conversation.getUnreadCountFor(currentUserId)

            val cached = userProfileCache[otherId]
            if (cached != null) {
                if (cached.profileImage.isNotBlank()) otherImage = cached.profileImage
                if (cached.name.isNotBlank() && (otherName == "User" || otherName.isBlank())) otherName = cached.name
                if (cached.bloodGroup.isNotBlank() && otherBlood.isBlank()) otherBlood = cached.bloodGroup
            }

            tvParticipantName.text = otherName
            tvLastMessage.text = conversation.lastMessage.ifBlank { "No messages yet" }

            // Last message status indicator (strictly when sent by current user)
            if (conversation.lastSenderId == currentUserId && conversation.lastMessage.isNotBlank()) {
                ivLastMsgStatus?.visibility = View.VISIBLE
                when (conversation.lastMessageStatus) {
                    ChatMessage.STATUS_READ -> {
                        ivLastMsgStatus?.setImageResource(R.drawable.ic_msg_double_check)
                        ivLastMsgStatus?.imageTintList = ColorStateList.valueOf(
                            ContextCompat.getColor(itemView.context, R.color.chat_status_blue)
                        )
                    }
                    ChatMessage.STATUS_DELIVERED -> {
                        ivLastMsgStatus?.setImageResource(R.drawable.ic_msg_double_check)
                        ivLastMsgStatus?.imageTintList = ColorStateList.valueOf(
                            ContextCompat.getColor(itemView.context, R.color.text_secondary)
                        )
                    }
                    ChatMessage.STATUS_PENDING -> {
                        ivLastMsgStatus?.setImageResource(R.drawable.ic_msg_pending)
                        ivLastMsgStatus?.imageTintList = ColorStateList.valueOf(
                            ContextCompat.getColor(itemView.context, R.color.chat_status_pending)
                        )
                    }
                    else -> {
                        // STATUS_SENT or default
                        ivLastMsgStatus?.setImageResource(R.drawable.ic_msg_sent)
                        ivLastMsgStatus?.imageTintList = ColorStateList.valueOf(
                            ContextCompat.getColor(itemView.context, R.color.text_secondary)
                        )
                    }
                }
            } else {
                ivLastMsgStatus?.visibility = View.GONE
            }

            // Blood group badge
            if (otherBlood.isNotBlank()) {
                tvBloodBadge.visibility = View.VISIBLE
                tvBloodBadge.text = otherBlood
            } else {
                tvBloodBadge.visibility = View.GONE
            }

            // Avatar loading
            ProfileImageManager.loadAvatar(ivAvatar, otherImage)

            // Async background sync with live users collection to ensure DP sync
            if (otherId.isNotBlank() && (cached == null || otherImage.isBlank())) {
                val firestore = com.google.firebase.firestore.FirebaseFirestore.getInstance()
                firestore.collection(com.project.donateblood.utils.FirebaseUtils.Collections.USERS)
                    .document(otherId)
                    .get()
                    .addOnSuccessListener { userDoc ->
                        if (userDoc != null && userDoc.exists()) {
                            val liveImage = userDoc.getString("profileImage") ?: ""
                            val liveName = userDoc.getString("name") ?: ""
                            val liveBlood = userDoc.getString("bloodGroup") ?: ""

                            userProfileCache[otherId] = CachedUserProfile(liveName, liveBlood, liveImage)

                            val imageChanged = liveImage.isNotBlank() && liveImage != conversation.getOtherParticipantImage(currentUserId)
                            val nameChanged = liveName.isNotBlank() && otherName != liveName
                            val bloodChanged = liveBlood.isNotBlank() && otherBlood != liveBlood

                            if (imageChanged || nameChanged || bloodChanged) {
                                if (adapterPosition != RecyclerView.NO_POSITION) {
                                    if (liveImage.isNotBlank()) ProfileImageManager.loadAvatar(ivAvatar, liveImage)
                                    if (liveName.isNotBlank()) tvParticipantName.text = liveName
                                    if (liveBlood.isNotBlank()) {
                                        tvBloodBadge.visibility = View.VISIBLE
                                        tvBloodBadge.text = liveBlood
                                    }
                                }

                                val updates = mutableMapOf<String, Any>()
                                if (liveImage.isNotBlank()) updates["participantImages.$otherId"] = liveImage
                                if (liveName.isNotBlank()) updates["participantNames.$otherId"] = liveName
                                if (liveBlood.isNotBlank()) updates["participantBloodGroups.$otherId"] = liveBlood
                                if (updates.isNotEmpty()) {
                                    firestore.collection(com.project.donateblood.utils.FirebaseUtils.Collections.CHATS)
                                        .document(conversation.id)
                                        .update(updates)
                                }
                            }
                        }
                    }
            }

            // Timestamp
            tvTimestamp.text = formatTimestamp(conversation.lastMessageTimestamp)

            // Unread styling
            if (unreadCount > 0) {
                tvUnreadBadge.visibility = View.VISIBLE
                tvUnreadBadge.text = if (unreadCount > 99) "99+" else unreadCount.toString()
                tvLastMessage.setTypeface(null, Typeface.BOLD)
                tvLastMessage.setTextColor(ContextCompat.getColor(itemView.context, R.color.text_primary))
            } else {
                tvUnreadBadge.visibility = View.GONE
                tvLastMessage.setTypeface(null, Typeface.NORMAL)
                tvLastMessage.setTextColor(ContextCompat.getColor(itemView.context, R.color.text_secondary))
            }

            itemView.setOnClickListener {
                onConversationClick(conversation)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ConversationViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_conversation, parent, false)
        return ConversationViewHolder(view)
    }

    override fun onBindViewHolder(holder: ConversationViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    private fun formatTimestamp(timestamp: Long): String {
        if (timestamp <= 0L) return ""

        val now = Calendar.getInstance()
        val time = Calendar.getInstance().apply { timeInMillis = timestamp }

        return when {
            DateUtils.isToday(timestamp) -> {
                SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date(timestamp))
            }
            now.get(Calendar.YEAR) == time.get(Calendar.YEAR) &&
                    now.get(Calendar.DAY_OF_YEAR) - time.get(Calendar.DAY_OF_YEAR) == 1 -> {
                "Yesterday"
            }
            else -> {
                SimpleDateFormat("dd MMM", Locale.getDefault()).format(Date(timestamp))
            }
        }
    }

    companion object DiffCallback : DiffUtil.ItemCallback<ChatConversation>() {
        override fun areItemsTheSame(oldItem: ChatConversation, newItem: ChatConversation): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: ChatConversation, newItem: ChatConversation): Boolean {
            return oldItem == newItem
        }
    }
}
