package com.project.donateblood.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.project.donateblood.R
import com.project.donateblood.models.Donor
import com.project.donateblood.utils.ProfileImageManager

class DonorAdapter(
    private val onCallClick: (Donor) -> Unit,
    private val onViewDetailsClick: (Donor) -> Unit,
    private val onChatClick: ((Donor) -> Unit)? = null,
    private val onRequestClick: ((Donor) -> Unit)? = null
) : ListAdapter<Donor, DonorAdapter.DonorViewHolder>(DonorDiffCallback()) {

    class DonorViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {

        val imgProfile: ImageView = itemView.findViewById(R.id.imgProfile)
        val tvName: TextView = itemView.findViewById(R.id.tvName)
        val tvBloodGroup: TextView = itemView.findViewById(R.id.tvBloodGroup)
        val tvStatusBadge: TextView? = itemView.findViewById(R.id.tvStatusBadge)
        val tvPrivacyBadge: TextView? = itemView.findViewById(R.id.tvPrivacyBadge)
        val tvAddress: TextView = itemView.findViewById(R.id.tvAddress)
        val tvPhoneMasked: TextView? = itemView.findViewById(R.id.tvPhoneMasked)

        val btnCall: ImageView = itemView.findViewById(R.id.btnCall)
        val btnChat: ImageView = itemView.findViewById(R.id.btnChat)
        val btnViewDetails: MaterialButton = itemView.findViewById(R.id.btnViewDetails)
        val btnRequest: MaterialButton = itemView.findViewById(R.id.btnRequest)

        fun bind(
            donor: Donor,
            onCallClick: (Donor) -> Unit,
            onViewDetailsClick: (Donor) -> Unit,
            onChatClick: ((Donor) -> Unit)? = null,
            onRequestClick: ((Donor) -> Unit)? = null
        ) {
            val context = itemView.context

            ProfileImageManager.loadAvatar(imgProfile, donor.imageUrl)
            tvName.text = donor.name
            tvBloodGroup.text = donor.bloodGroup

            // Address
            tvAddress.text = if (donor.district.isNotEmpty() && !donor.location.contains(donor.district, ignoreCase = true)) {
                "${donor.location}, ${donor.district}"
            } else {
                donor.location.ifBlank { donor.district.ifBlank { "Dhaka" } }
            }

            // Status badge
            tvStatusBadge?.text = if (donor.isAvailable) "Available" else "Busy"
            tvStatusBadge?.setTextColor(
                if (donor.isAvailable) 0xFF16A34A.toInt() else 0xFF6B7280.toInt()
            )

            // Masked phone display for privacy protection
            tvPhoneMasked?.text = maskPhoneNumber(donor.phone)

            // Call button
            btnCall.visibility = if (donor.phone.isNotEmpty()) View.VISIBLE else View.GONE
            btnCall.setOnClickListener { onCallClick(donor) }

            // Chat button
            btnChat.visibility = if (donor.phone.isNotEmpty() || donor.userId.isNotEmpty()) View.VISIBLE else View.GONE
            btnChat.setOnClickListener {
                onChatClick?.invoke(donor)
            }

            // View Details button
            btnViewDetails.setOnClickListener {
                onViewDetailsClick(donor)
            }

            // Request Blood button
            if (donor.isAvailable) {
                btnRequest.isEnabled = true
                btnRequest.alpha = 1f
                btnRequest.setOnClickListener {
                    onRequestClick?.invoke(donor)
                }
            } else {
                btnRequest.isEnabled = false
                btnRequest.alpha = 0.5f
                btnRequest.setOnClickListener(null)
            }

            // Item click on root
            itemView.setOnClickListener {
                onViewDetailsClick(donor)
            }
        }

        private fun maskPhoneNumber(phone: String): String {
            if (phone.isBlank()) return "Protected"
            val clean = phone.trim()
            val digits = clean.filter { it.isDigit() }
            if (digits.length < 7) return "Protected"
            return if (clean.startsWith("+880")) {
                val rest = clean.removePrefix("+880").trim()
                val start = rest.take(3)
                val end = rest.takeLast(2)
                "+880 $start•• ••$end"
            } else {
                val start = clean.take(3)
                val end = clean.takeLast(2)
                "$start•• ••$end"
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DonorViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_donor, parent, false)
        return DonorViewHolder(view)
    }

    override fun onBindViewHolder(holder: DonorViewHolder, position: Int) {
        holder.bind(getItem(position), onCallClick, onViewDetailsClick, onChatClick, onRequestClick)
    }
}

class DonorDiffCallback : DiffUtil.ItemCallback<Donor>() {
    override fun areItemsTheSame(oldItem: Donor, newItem: Donor): Boolean {
        return oldItem.id == newItem.id
    }

    override fun areContentsTheSame(oldItem: Donor, newItem: Donor): Boolean {
        return oldItem == newItem
    }
}