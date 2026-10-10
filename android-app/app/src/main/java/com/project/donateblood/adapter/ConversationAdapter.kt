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
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class ConversationAdapter(
    private val currentUserId: String,
    private val onConversationClick: (ChatConversation) -> Unit
) : ListAdapter<ChatConversation, ConversationAdapter.ConversationViewHolder>(DiffCallback) {

    inner class ConversationViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val ivAvatar: ImageView = itemView.findViewById(R.id.ivAvatar)
        private val tvBloodBadge: TextView = itemView.findViewById(R.id.tvBloodBadge)
        private val tvParticipantName: TextView = itemView.findViewById(R.id.tvParticipantName)
        private val tvLastMessage: TextView = itemView.findViewById(R.id.tvLastMessage)
        private val ivLastMsgStatus: ImageView? = itemView.findViewById(R.id.ivLastMsgStatus)
        private val tvTimestamp: TextView = itemView.findViewById(R.id.tvTimestamp)
        private val tvUnreadBadge: TextView = itemView.findViewById(R.id.tvUnreadBadge)

        fun bind(conversation: ChatConversation) {
            val otherName = conversation.getOtherParticipantName(currentUserId)
            val otherBlood = conversation.getOtherParticipantBloodGroup(currentUserId)
            val otherImage = conversation.getOtherParticipantImage(currentUserId)
            val unreadCount = conversation.getUnreadCountFor(currentUserId)

            tvParticipantName.text = otherName
            tvLastMessage.text = conversation.lastMessage.ifBlank { "No messages yet" }

            // Last message status indicator (if sent by current user)
            if (conversation.lastSenderId == currentUserId && conversation.lastMessage.isNotBlank()) {
                ivLastMsgStatus?.visibility = View.VISIBLE
                when {
                    conversation.isRead || conversation.lastMessageStatus == ChatMessage.STATUS_READ -> {
                        ivLastMsgStatus?.setImageResource(R.drawable.ic_msg_double_check)
                        ivLastMsgStatus?.imageTintList = ColorStateList.valueOf(
                            ContextCompat.getColor(itemView.context, R.color.chat_status_blue)
                        )
                    }
                    conversation.lastMessageStatus == ChatMessage.STATUS_DELIVERED -> {
                        ivLastMsgStatus?.setImageResource(R.drawable.ic_msg_double_check)
                        ivLastMsgStatus?.imageTintList = ColorStateList.valueOf(
                            ContextCompat.getColor(itemView.context, R.color.chat_status_grey)
                        )
                    }
                    else -> {
                        ivLastMsgStatus?.setImageResource(R.drawable.ic_msg_sent)
                        ivLastMsgStatus?.imageTintList = ColorStateList.valueOf(
                            ContextCompat.getColor(itemView.context, R.color.chat_status_grey)
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
            if (otherImage.isNotBlank()) {
                ivAvatar.load(otherImage) {
                    placeholder(R.drawable.ic_user_placeholder)
                    error(R.drawable.ic_user_placeholder)
                }
            } else {
                ivAvatar.setImageResource(R.drawable.ic_user_placeholder)
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
