package com.project.donateblood.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.project.donateblood.R
import com.project.donateblood.models.BloodBank

class BloodBankAdapter(
    private val onCallClick: (BloodBank) -> Unit,
    private val onDirectionsClick: (BloodBank) -> Unit,
    private val onItemClick: ((BloodBank) -> Unit)? = null
) : ListAdapter<BloodBank, BloodBankAdapter.BloodBankViewHolder>(BloodBankDiffCallback()) {

    class BloodBankViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val tvBloodBankName: TextView = itemView.findViewById(R.id.tvBloodBankName)
        val tvBloodBankOrg: TextView = itemView.findViewById(R.id.tvBloodBankOrg)
        val tvOperatingHours: TextView = itemView.findViewById(R.id.tvOperatingHours)
        val tvBloodBankAddress: TextView = itemView.findViewById(R.id.tvBloodBankAddress)
        val tvComponents: TextView = itemView.findViewById(R.id.tvComponents)
        val tvBloodBankHotline: TextView = itemView.findViewById(R.id.tvBloodBankHotline)
        val btnCallBloodBank: MaterialButton = itemView.findViewById(R.id.btnCallBloodBank)
        val btnBloodBankDirections: MaterialButton = itemView.findViewById(R.id.btnBloodBankDirections)

        fun bind(
            bloodBank: BloodBank,
            onCallClick: (BloodBank) -> Unit,
            onDirectionsClick: (BloodBank) -> Unit,
            onItemClick: ((BloodBank) -> Unit)?
        ) {
            tvBloodBankName.text = bloodBank.name.ifBlank { "Blood Bank Center" }
            tvBloodBankOrg.text = bloodBank.organization.ifBlank { "Authorized Blood Bank" }
            tvOperatingHours.text = bloodBank.operatingHours.ifBlank { "Open 24/7" }

            val addressDisplay = when {
                bloodBank.address.isNotBlank() && bloodBank.district.isNotBlank() ->
                    "${bloodBank.address}, ${bloodBank.district}"
                bloodBank.address.isNotBlank() -> bloodBank.address
                bloodBank.district.isNotBlank() -> bloodBank.district
                else -> "Location not specified"
            }
            tvBloodBankAddress.text = addressDisplay

            tvComponents.text = "Components: ${bloodBank.availableComponents.ifBlank { "Whole Blood, PRBC" }}"

            val phoneDisplay = when {
                bloodBank.hotline.isNotBlank() -> "Hotline: ${bloodBank.hotline}"
                bloodBank.phone.isNotBlank() -> "Phone: ${bloodBank.phone}"
                else -> "Hotline available on site"
            }
            tvBloodBankHotline.text = phoneDisplay

            btnCallBloodBank.setOnClickListener { onCallClick(bloodBank) }
            btnBloodBankDirections.setOnClickListener { onDirectionsClick(bloodBank) }
            itemView.setOnClickListener { onItemClick?.invoke(bloodBank) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): BloodBankViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_home_blood_bank, parent, false)
        return BloodBankViewHolder(view)
    }

    override fun onBindViewHolder(holder: BloodBankViewHolder, position: Int) {
        holder.bind(getItem(position), onCallClick, onDirectionsClick, onItemClick)
    }
}

class BloodBankDiffCallback : DiffUtil.ItemCallback<BloodBank>() {
    override fun areItemsTheSame(oldItem: BloodBank, newItem: BloodBank): Boolean {
        return oldItem.id == newItem.id
    }

    override fun areContentsTheSame(oldItem: BloodBank, newItem: BloodBank): Boolean {
        return oldItem == newItem
    }
}
