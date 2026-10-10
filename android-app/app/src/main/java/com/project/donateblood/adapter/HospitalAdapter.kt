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
import com.project.donateblood.models.Hospital

class HospitalAdapter(
    private val onCallClick: (Hospital) -> Unit,
    private val onDirectionsClick: (Hospital) -> Unit,
    private val onItemClick: ((Hospital) -> Unit)? = null
) : ListAdapter<Hospital, HospitalAdapter.HospitalViewHolder>(HospitalDiffCallback()) {

    class HospitalViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val tvHospitalName: TextView = itemView.findViewById(R.id.tvHospitalName)
        val tvHospitalType: TextView = itemView.findViewById(R.id.tvHospitalType)
        val tvEmergencyBadge: TextView = itemView.findViewById(R.id.tvEmergencyBadge)
        val tvHospitalAddress: TextView = itemView.findViewById(R.id.tvHospitalAddress)
        val tvHospitalHotline: TextView = itemView.findViewById(R.id.tvHospitalHotline)
        val btnCallHospital: MaterialButton = itemView.findViewById(R.id.btnCallHospital)
        val btnHospitalDirections: MaterialButton = itemView.findViewById(R.id.btnHospitalDirections)

        fun bind(
            hospital: Hospital,
            onCallClick: (Hospital) -> Unit,
            onDirectionsClick: (Hospital) -> Unit,
            onItemClick: ((Hospital) -> Unit)?
        ) {
            tvHospitalName.text = hospital.name.ifBlank { "Hospital Facility" }
            tvHospitalType.text = hospital.type.ifBlank { "Medical Center" }

            if (hospital.isEmergency24Hours) {
                tvEmergencyBadge.visibility = View.VISIBLE
                tvEmergencyBadge.text = "24/7 Emergency"
            } else {
                tvEmergencyBadge.visibility = View.GONE
            }

            val addressDisplay = when {
                hospital.address.isNotBlank() && hospital.district.isNotBlank() ->
                    "${hospital.address}, ${hospital.district}"
                hospital.address.isNotBlank() -> hospital.address
                hospital.district.isNotBlank() -> hospital.district
                else -> "Location not specified"
            }
            tvHospitalAddress.text = addressDisplay

            val phoneDisplay = when {
                hospital.emergencyHotline.isNotBlank() -> "Hotline: ${hospital.emergencyHotline}"
                hospital.phone.isNotBlank() -> "Phone: ${hospital.phone}"
                else -> "Hotline available on site"
            }
            tvHospitalHotline.text = phoneDisplay

            btnCallHospital.setOnClickListener { onCallClick(hospital) }
            btnHospitalDirections.setOnClickListener { onDirectionsClick(hospital) }
            itemView.setOnClickListener { onItemClick?.invoke(hospital) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): HospitalViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_home_hospital, parent, false)
        return HospitalViewHolder(view)
    }

    override fun onBindViewHolder(holder: HospitalViewHolder, position: Int) {
        holder.bind(getItem(position), onCallClick, onDirectionsClick, onItemClick)
    }
}

class HospitalDiffCallback : DiffUtil.ItemCallback<Hospital>() {
    override fun areItemsTheSame(oldItem: Hospital, newItem: Hospital): Boolean {
        return oldItem.id == newItem.id
    }

    override fun areContentsTheSame(oldItem: Hospital, newItem: Hospital): Boolean {
        return oldItem == newItem
    }
}
