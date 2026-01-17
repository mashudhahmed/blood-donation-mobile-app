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

class DonorAdapter(
    private val onCallClick: (Donor) -> Unit,
    private val onViewDetailsClick: (Donor) -> Unit
    // REMOVED: onLongClick parameter
) : ListAdapter<Donor, DonorAdapter.DonorViewHolder>(DonorDiffCallback()) {

    class DonorViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {

        val tvName: TextView = itemView.findViewById(R.id.tvName)
        val tvBloodGroup: TextView = itemView.findViewById(R.id.tvBloodGroup)
        val tvAddress: TextView = itemView.findViewById(R.id.tvAddress)

        val btnCall: ImageView = itemView.findViewById(R.id.btnCall)
        val btnChat: ImageView = itemView.findViewById(R.id.btnChat)
        val btnViewDetails: MaterialButton = itemView.findViewById(R.id.btnViewDetails)
        val btnRequest: MaterialButton = itemView.findViewById(R.id.btnRequest)

        fun bind(
            donor: Donor,
            onCallClick: (Donor) -> Unit,
            onViewDetailsClick: (Donor) -> Unit
        ) {
            val context = itemView.context

            tvName.text = donor.name
            tvBloodGroup.text = donor.bloodGroup

            // Address shown correctly
            tvAddress.text = if (donor.district.isNotEmpty()) {
                "${donor.location}, ${donor.district}"
            } else {
                donor.location
            }

            // Blood group color based on availability
            tvBloodGroup.setTextColor(
                if (donor.isAvailable)
                    context.getColor(R.color.primary_red)
                else
                    context.getColor(R.color.text_secondary)
            )

            // Call button
            btnCall.visibility =
                if (donor.phone.isNotEmpty()) View.VISIBLE else View.GONE
            btnCall.setOnClickListener { onCallClick(donor) }

            // Chat button (kept – no feature loss)
            btnChat.setOnClickListener {
                // Future chat feature
            }

            // ✅ ONLY View Details button opens details
            btnViewDetails.setOnClickListener {
                onViewDetailsClick(donor)
            }

            // Request button
            if (donor.isAvailable) {
                btnRequest.isEnabled = true
                btnRequest.alpha = 1f
            } else {
                btnRequest.isEnabled = false
                btnRequest.alpha = 0.5f
            }

            // ❌ IMPORTANT: Disable item click
            itemView.setOnClickListener(null)
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DonorViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_donor, parent, false)
        return DonorViewHolder(view)
    }

    override fun onBindViewHolder(holder: DonorViewHolder, position: Int) {
        holder.bind(getItem(position), onCallClick, onViewDetailsClick)
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