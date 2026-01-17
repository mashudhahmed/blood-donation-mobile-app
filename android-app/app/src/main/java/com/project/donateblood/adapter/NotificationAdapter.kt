package com.project.donateblood.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.cardview.widget.CardView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.RecyclerView
import com.project.donateblood.R
import com.project.donateblood.models.NotificationItem
import java.text.SimpleDateFormat
import java.util.*

class NotificationAdapter(
    private var notifications: List<NotificationItem> = emptyList(),
    private val onNotificationClick: ((NotificationItem) -> Unit)? = null
) : RecyclerView.Adapter<NotificationAdapter.ViewHolder>() {

    private val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())
    private val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())

    class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val iconImageView: ImageView = itemView.findViewById(R.id.iconImageView)
        val dotIndicator: View = itemView.findViewById(R.id.dotIndicator)
        val tvTitle: TextView = itemView.findViewById(R.id.tvTitle)
        val tvMessage: TextView = itemView.findViewById(R.id.tvMessage)
        val tvTime: TextView = itemView.findViewById(R.id.tvTime)
        val tvType: TextView = itemView.findViewById(R.id.tvType)
        val cardView: CardView = itemView.findViewById(R.id.notificationCard)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_notification, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val notification = notifications[position]

        holder.tvTitle.text = notification.title
        holder.tvMessage.text = notification.message

        val displayTime = if (notification.time.isNotEmpty()) {
            notification.time
        } else if (notification.timestamp > 0) {
            val date = Date(notification.timestamp)
            "${timeFormat.format(date)} · ${dateFormat.format(date)}"
        } else if (notification.createdAt > 0) {
            val date = Date(notification.createdAt)
            "${timeFormat.format(date)} · ${dateFormat.format(date)}"
        } else {
            ""
        }
        holder.tvTime.text = displayTime

        if (notification.isRead) {
            holder.dotIndicator.visibility = View.GONE
            holder.tvTitle.setTypeface(holder.tvTitle.typeface, android.graphics.Typeface.NORMAL)
            holder.tvTitle.setTextColor(
                ContextCompat.getColor(holder.itemView.context, R.color.text_secondary)
            )
            holder.cardView.alpha = 0.8f
        } else {
            holder.dotIndicator.visibility = View.VISIBLE
            holder.tvTitle.setTypeface(holder.tvTitle.typeface, android.graphics.Typeface.BOLD)
            holder.tvTitle.setTextColor(
                ContextCompat.getColor(holder.itemView.context, R.color.text_primary)
            )
            holder.cardView.alpha = 1f
        }

        val typeText = when {
            notification.urgency == "high" -> "URGENT"
            notification.isBloodRequest -> "BLOOD REQUEST"
            notification.type.isNotEmpty() && notification.type != "notification" ->
                notification.type.uppercase()
            else -> ""
        }

        if (typeText.isNotEmpty()) {
            holder.tvType.text = typeText
            holder.tvType.visibility = View.VISIBLE

            if (notification.urgency == "high") {
                holder.tvType.setTextColor(
                    ContextCompat.getColor(holder.itemView.context, R.color.primary_red)
                )
            } else {
                holder.tvType.setTextColor(
                    ContextCompat.getColor(holder.itemView.context, R.color.text_secondary)
                )
            }
        } else {
            holder.tvType.visibility = View.GONE
        }

        when {
            notification.urgency == "high" -> holder.iconImageView.setImageResource(R.drawable.ic_urgent)
            notification.isBloodRequest -> holder.iconImageView.setImageResource(R.drawable.ic_blood_drop_small)
            else -> holder.iconImageView.setImageResource(R.drawable.ic_notification)
        }

        holder.itemView.setOnClickListener {
            onNotificationClick?.invoke(notification)
        }
    }

    override fun getItemCount(): Int = notifications.size

    fun updateNotifications(newNotifications: List<NotificationItem>) {
        val diffResult = DiffUtil.calculateDiff(
            NotificationDiffCallback(notifications, newNotifications)
        )
        notifications = newNotifications
        diffResult.dispatchUpdatesTo(this)
    }
}

class NotificationDiffCallback(
    private val oldList: List<NotificationItem>,
    private val newList: List<NotificationItem>
) : DiffUtil.Callback() {

    override fun getOldListSize(): Int = oldList.size
    override fun getNewListSize(): Int = newList.size

    override fun areItemsTheSame(oldPos: Int, newPos: Int): Boolean {
        return oldList[oldPos].id == newList[newPos].id
    }

    override fun areContentsTheSame(oldPos: Int, newPos: Int): Boolean {
        return oldList[oldPos] == newList[newPos]
    }
}