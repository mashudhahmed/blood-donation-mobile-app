package com.project.donateblood.adapter

import android.annotation.SuppressLint
import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.core.widget.TextViewCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.google.firebase.auth.FirebaseAuth
import com.project.donateblood.R
import com.project.donateblood.models.BloodRequest
import com.project.donateblood.utils.BloodCompatibility

class BloodRequestFeedAdapter(
    private var currentUserBloodGroup: String = "",
    private val onCallClick: (BloodRequest) -> Unit,
    private val onChatClick: (BloodRequest) -> Unit,
    private val onShareClick: (BloodRequest) -> Unit,
    private val onDirectionsClick: (BloodRequest) -> Unit,
    private val onHelpClick: (BloodRequest) -> Unit,
    private val onItemClick: ((BloodRequest) -> Unit)? = null
) : ListAdapter<BloodRequest, BloodRequestFeedAdapter.RequestFeedViewHolder>(RequestFeedDiffCallback()) {

    private val currentUserId: String? = FirebaseAuth.getInstance().currentUser?.uid

    fun updateUserBloodGroup(bloodGroup: String) {
        if (currentUserBloodGroup != bloodGroup) {
            currentUserBloodGroup = bloodGroup
            notifyDataSetChanged()
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RequestFeedViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_feed_urgent_request, parent, false)
        return RequestFeedViewHolder(view)
    }

    override fun onBindViewHolder(holder: RequestFeedViewHolder, position: Int) {
        holder.bind(
            getItem(position),
            currentUserId,
            currentUserBloodGroup,
            onCallClick,
            onChatClick,
            onShareClick,
            onDirectionsClick,
            onHelpClick,
            onItemClick
        )
    }

    class RequestFeedViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvBloodGroupBadge: TextView = itemView.findViewById(R.id.tvBloodGroupBadge)
        private val tvUrgencyTag: TextView = itemView.findViewById(R.id.tvUrgencyTag)
        private val tvUnitsBadge: TextView = itemView.findViewById(R.id.tvUnitsBadge)
        private val tvCompatibilityBadge: TextView = itemView.findViewById(R.id.tvCompatibilityBadge)
        private val btnShare: ImageView = itemView.findViewById(R.id.btnShare)
        private val btnChat: ImageView = itemView.findViewById(R.id.btnChat)
        private val btnCall: ImageView = itemView.findViewById(R.id.btnCall)
        private val tvPatientName: TextView = itemView.findViewById(R.id.tvPatientName)
        private val tvHospital: TextView = itemView.findViewById(R.id.tvHospital)
        private val tvLocation: TextView = itemView.findViewById(R.id.tvLocation)
        private val tvDateTime: TextView = itemView.findViewById(R.id.tvDateTime)
        private val btnDirections: MaterialButton = itemView.findViewById(R.id.btnDirections)
        private val btnHelp: MaterialButton = itemView.findViewById(R.id.btnHelp)

        @SuppressLint("SetTextI18n")
        fun bind(
            request: BloodRequest,
            currentUserId: String?,
            currentUserBloodGroup: String,
            onCallClick: (BloodRequest) -> Unit,
            onChatClick: (BloodRequest) -> Unit,
            onShareClick: (BloodRequest) -> Unit,
            onDirectionsClick: (BloodRequest) -> Unit,
            onHelpClick: (BloodRequest) -> Unit,
            onItemClick: ((BloodRequest) -> Unit)?
        ) {
            val context = itemView.context

            // Blood Group badge
            tvBloodGroupBadge.text = request.bloodGroup.ifBlank { "?" }

            // Urgency tag
            val isUrgent = request.urgency.equals("high", ignoreCase = true) ||
                    request.urgency.equals("urgent", ignoreCase = true) ||
                    request.units >= 3

            if (isUrgent) {
                tvUrgencyTag.text = "URGENT"
                tvUrgencyTag.setTextColor(ContextCompat.getColor(context, R.color.primary_red))
                tvUrgencyTag.setBackgroundResource(R.drawable.bg_tag_urgent_2026)
                tvUrgencyTag.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_clock, 0, 0, 0)
                TextViewCompat.setCompoundDrawableTintList(
                    tvUrgencyTag,
                    ColorStateList.valueOf(ContextCompat.getColor(context, R.color.primary_red))
                )
            } else {
                tvUrgencyTag.text = "NEEDED"
                tvUrgencyTag.setTextColor(ContextCompat.getColor(context, R.color.text_secondary))
                tvUrgencyTag.setBackgroundResource(R.drawable.bg_tag_needed_2026)
                tvUrgencyTag.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_blood_drop, 0, 0, 0)
                TextViewCompat.setCompoundDrawableTintList(
                    tvUrgencyTag,
                    ColorStateList.valueOf(ContextCompat.getColor(context, R.color.primary_red))
                )
            }

            // Units badge
            tvUnitsBadge.text = if (request.units == 1) "1 Unit Needed" else "${request.units} Units Needed"

            // Compatibility badge
            if (currentUserBloodGroup.isNotBlank() && request.bloodGroup.isNotBlank()) {
                val isCompatible = BloodCompatibility.isCompatible(currentUserBloodGroup, request.bloodGroup)
                if (isCompatible) {
                    tvCompatibilityBadge.visibility = View.VISIBLE
                    tvCompatibilityBadge.text = "Compatible with your blood ($currentUserBloodGroup)"
                } else {
                    tvCompatibilityBadge.visibility = View.GONE
                }
            } else {
                tvCompatibilityBadge.visibility = View.GONE
            }

            // Patient Name
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

            // Required Date & Time
            val dateTimeText = when {
                request.date.isNotBlank() && request.time.isNotBlank() ->
                    "Required: ${request.date} (${request.time})"
                request.date.isNotBlank() -> "Required: ${request.date}"
                else -> "Immediate requirement"
            }
            tvDateTime.text = dateTimeText

            // Own request state
            val isOwnRequest = currentUserId != null && request.requesterId == currentUserId
            if (isOwnRequest) {
                btnHelp.text = "Your Request"
                btnHelp.isEnabled = false
                btnHelp.alpha = 0.6f
            } else {
                btnHelp.text = "I Can Help"
                btnHelp.isEnabled = true
                btnHelp.alpha = 1.0f
            }

            // Action Listeners
            btnShare.setOnClickListener { onShareClick(request) }
            btnChat.setOnClickListener { onChatClick(request) }
            btnCall.setOnClickListener { onCallClick(request) }
            btnDirections.setOnClickListener { onDirectionsClick(request) }
            btnHelp.setOnClickListener {
                if (!isOwnRequest) onHelpClick(request)
            }
            itemView.setOnClickListener { onItemClick?.invoke(request) }
        }
    }

    private class RequestFeedDiffCallback : DiffUtil.ItemCallback<BloodRequest>() {
        override fun areItemsTheSame(oldItem: BloodRequest, newItem: BloodRequest): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: BloodRequest, newItem: BloodRequest): Boolean {
            return oldItem == newItem
        }
    }
}
