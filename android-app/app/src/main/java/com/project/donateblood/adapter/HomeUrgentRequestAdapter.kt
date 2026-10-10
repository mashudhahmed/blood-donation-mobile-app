package com.project.donateblood.adapter

import android.annotation.SuppressLint
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.google.firebase.auth.FirebaseAuth
import com.project.donateblood.R
import com.project.donateblood.models.BloodRequest

class HomeUrgentRequestAdapter(
    private val onCallClick: (BloodRequest) -> Unit,
    private val onChatClick: (BloodRequest) -> Unit,
    private val onHelpClick: (BloodRequest) -> Unit,
    private val onItemClick: ((BloodRequest) -> Unit)? = null
) : ListAdapter<BloodRequest, HomeUrgentRequestAdapter.UrgentRequestViewHolder>(RequestDiffCallback()) {

    private val currentUserId: String? = FirebaseAuth.getInstance().currentUser?.uid

    class UrgentRequestViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val tvBloodGroupBadge: TextView = itemView.findViewById(R.id.tvBloodGroupBadge)
        val tvUrgencyTag: TextView = itemView.findViewById(R.id.tvUrgencyTag)
        val tvUnitsBadge: TextView = itemView.findViewById(R.id.tvUnitsBadge)
        val tvPatientName: TextView = itemView.findViewById(R.id.tvPatientName)
        val tvHospital: TextView = itemView.findViewById(R.id.tvHospital)
        val tvLocation: TextView = itemView.findViewById(R.id.tvLocation)
        val tvDateTime: TextView = itemView.findViewById(R.id.tvDateTime)
        val btnCall: ImageView = itemView.findViewById(R.id.btnCall)
        val btnChat: ImageView = itemView.findViewById(R.id.btnChat)
        val btnHelp: MaterialButton = itemView.findViewById(R.id.btnHelp)

        @SuppressLint("SetTextI18n")
        fun bind(
            request: BloodRequest,
            currentUserId: String?,
            onCallClick: (BloodRequest) -> Unit,
            onChatClick: (BloodRequest) -> Unit,
            onHelpClick: (BloodRequest) -> Unit,
            onItemClick: ((BloodRequest) -> Unit)?
        ) {
            val context = itemView.context

            // Blood Group
            tvBloodGroupBadge.text = request.bloodGroup.ifBlank { "?" }

            // Urgency Tag
            val isUrgent = request.urgency.equals("high", ignoreCase = true) ||
                    request.urgency.equals("urgent", ignoreCase = true) ||
                    request.units >= 3

            if (isUrgent) {
                tvUrgencyTag.text = "URGENT"
                tvUrgencyTag.setTextColor(ContextCompat.getColor(context, R.color.primary_red))
                tvUrgencyTag.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_urgent, 0, 0, 0)
                androidx.core.widget.TextViewCompat.setCompoundDrawableTintList(
                    tvUrgencyTag,
                    android.content.res.ColorStateList.valueOf(ContextCompat.getColor(context, R.color.primary_red))
                )
            } else {
                tvUrgencyTag.text = "NEEDED"
                tvUrgencyTag.setTextColor(ContextCompat.getColor(context, R.color.text_primary))
                tvUrgencyTag.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_blood_drop, 0, 0, 0)
                androidx.core.widget.TextViewCompat.setCompoundDrawableTintList(
                    tvUrgencyTag,
                    android.content.res.ColorStateList.valueOf(ContextCompat.getColor(context, R.color.primary_red))
                )
            }

            // Units
            val unitsText = if (request.units == 1) "1 Unit" else "${request.units} Units"
            tvUnitsBadge.text = unitsText

            // Patient
            tvPatientName.text = "Patient: ${request.patientName.ifBlank { "Emergency Request" }}"

            // Hospital
            tvHospital.text = request.hospital.ifBlank { "Hospital not specified" }

            // Location
            val locationText = when {
                request.location.isNotBlank() && request.district.isNotBlank() ->
                    "${request.location}, ${request.district}"
                request.district.isNotBlank() -> request.district
                request.location.isNotBlank() -> request.location
                else -> "Location not specified"
            }
            tvLocation.text = locationText

            // Date & Time
            val dateTimeText = when {
                request.date.isNotBlank() && request.time.isNotBlank() ->
                    "Required: ${request.date} (${request.time})"
                request.date.isNotBlank() -> "Required: ${request.date}"
                else -> "Required: ASAP"
            }
            tvDateTime.text = dateTimeText

            // If current user is the requester
            val isCurrentUser = currentUserId != null && currentUserId == request.requesterId

            if (isCurrentUser) {
                btnCall.visibility = View.GONE
                btnChat.visibility = View.GONE
                btnHelp.text = "Your Request"
                btnHelp.backgroundTintList = ContextCompat.getColorStateList(context, R.color.primary_red_dark)
                btnHelp.setOnClickListener { onHelpClick(request) }
            } else {
                btnCall.visibility = if (request.phone.isNotBlank()) View.VISIBLE else View.GONE
                btnChat.visibility = View.VISIBLE
                btnHelp.text = "I Can Help"
                btnHelp.backgroundTintList = ContextCompat.getColorStateList(context, R.color.primary_red)

                btnCall.setOnClickListener { onCallClick(request) }
                btnChat.setOnClickListener { onChatClick(request) }
                btnHelp.setOnClickListener { onHelpClick(request) }
            }

            itemView.setOnClickListener {
                onItemClick?.invoke(request)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): UrgentRequestViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_home_urgent_request, parent, false)
        return UrgentRequestViewHolder(view)
    }

    override fun onBindViewHolder(holder: UrgentRequestViewHolder, position: Int) {
        holder.bind(
            getItem(position),
            currentUserId,
            onCallClick,
            onChatClick,
            onHelpClick,
            onItemClick
        )
    }
}

class RequestDiffCallback : DiffUtil.ItemCallback<BloodRequest>() {
    override fun areItemsTheSame(oldItem: BloodRequest, newItem: BloodRequest): Boolean {
        return oldItem.id == newItem.id
    }

    override fun areContentsTheSame(oldItem: BloodRequest, newItem: BloodRequest): Boolean {
        return oldItem == newItem
    }
}
