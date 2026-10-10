package com.project.donateblood.adapter

import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.project.donateblood.R
import com.project.donateblood.models.ChatMessage
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MessageAdapter(
    private val currentUserId: String
) : ListAdapter<ChatMessage, RecyclerView.ViewHolder>(DiffCallback) {

    companion object {
        private const val VIEW_TYPE_SENT = 1
        private const val VIEW_TYPE_RECEIVED = 2

        private val DiffCallback = object : DiffUtil.ItemCallback<ChatMessage>() {
            override fun areItemsTheSame(oldItem: ChatMessage, newItem: ChatMessage): Boolean {
                return oldItem.id == newItem.id
            }

            override fun areContentsTheSame(oldItem: ChatMessage, newItem: ChatMessage): Boolean {
                return oldItem == newItem
            }
        }
    }

    override fun getItemViewType(position: Int): Int {
        val message = getItem(position)
        return if (message.senderId == currentUserId) {
            VIEW_TYPE_SENT
        } else {
            VIEW_TYPE_RECEIVED
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return if (viewType == VIEW_TYPE_SENT) {
            val view = inflater.inflate(R.layout.item_chat_message_sent, parent, false)
            SentMessageViewHolder(view)
        } else {
            val view = inflater.inflate(R.layout.item_chat_message_received, parent, false)
            ReceivedMessageViewHolder(view)
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val message = getItem(position)
        if (holder is SentMessageViewHolder) {
            holder.bind(message)
        } else if (holder is ReceivedMessageViewHolder) {
            holder.bind(message)
        }
    }

    inner class SentMessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvSentMessage: TextView = itemView.findViewById(R.id.tvSentMessage)
        private val tvSentTime: TextView = itemView.findViewById(R.id.tvSentTime)
        private val ivSentStatus: ImageView = itemView.findViewById(R.id.ivSentStatus)

        fun bind(message: ChatMessage) {
            tvSentMessage.text = message.message
            tvSentTime.text = formatTime(message.timestamp)

            when {
                message.isMessageRead() -> {
                    // Double checkmark, Cyan-Blue (Read / Seen)
                    ivSentStatus.setImageResource(R.drawable.ic_msg_double_check)
                    ivSentStatus.imageTintList = ColorStateList.valueOf(
                        ContextCompat.getColor(itemView.context, R.color.chat_status_blue)
                    )
                }
                message.isMessageDelivered() -> {
                    // Double checkmark, Grey (Delivered)
                    ivSentStatus.setImageResource(R.drawable.ic_msg_double_check)
                    ivSentStatus.imageTintList = ColorStateList.valueOf(
                        ContextCompat.getColor(itemView.context, R.color.chat_status_grey)
                    )
                }
                message.status == ChatMessage.STATUS_PENDING -> {
                    // Clock icon, Light Grey (Sending / Pending)
                    ivSentStatus.setImageResource(R.drawable.ic_msg_pending)
                    ivSentStatus.imageTintList = ColorStateList.valueOf(
                        ContextCompat.getColor(itemView.context, R.color.chat_status_pending)
                    )
                }
                else -> {
                    // Single checkmark, Grey (Sent to server)
                    ivSentStatus.setImageResource(R.drawable.ic_msg_sent)
                    ivSentStatus.imageTintList = ColorStateList.valueOf(
                        ContextCompat.getColor(itemView.context, R.color.chat_status_grey)
                    )
                }
            }
        }
    }

    inner class ReceivedMessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvReceivedMessage: TextView = itemView.findViewById(R.id.tvReceivedMessage)
        private val tvReceivedTime: TextView = itemView.findViewById(R.id.tvReceivedTime)

        fun bind(message: ChatMessage) {
            tvReceivedMessage.text = message.message
            tvReceivedTime.text = formatTime(message.timestamp)
        }
    }

    private fun formatTime(timestamp: Long): String {
        if (timestamp <= 0L) return ""
        return SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date(timestamp))
    }
}
