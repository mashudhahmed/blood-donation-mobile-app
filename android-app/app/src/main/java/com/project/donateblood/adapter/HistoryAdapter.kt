package com.project.donateblood.adapter

import android.annotation.SuppressLint
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.project.donateblood.R
import com.project.donateblood.models.HistoryItem
import java.text.SimpleDateFormat
import java.util.Locale

class HistoryAdapter(
    private val onItemClick: (HistoryItem) -> Unit = {},
    private val onViewCertificateClick: (HistoryItem) -> Unit = {},
    private val onCancelRequestClick: (HistoryItem) -> Unit = {}
) : ListAdapter<HistoryItem, RecyclerView.ViewHolder>(HistoryDiffCallback()) {

    companion object {
        private const val VIEW_TYPE_REQUEST = 1
        private const val VIEW_TYPE_DONATION = 2
        @SuppressLint("ConstantLocale")
        private val dateFormat = SimpleDateFormat("dd MMM yyyy", Locale.getDefault())
    }

    override fun getItemViewType(position: Int): Int {
        return when (getItem(position).type) {
            "requested" -> VIEW_TYPE_REQUEST
            "donated" -> VIEW_TYPE_DONATION
            else -> VIEW_TYPE_REQUEST
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return when (viewType) {
            VIEW_TYPE_REQUEST -> {
                val view = LayoutInflater.from(parent.context)
                    .inflate(R.layout.item_history_request, parent, false)
                RequestViewHolder(view, onItemClick, onCancelRequestClick)
            }
            VIEW_TYPE_DONATION -> {
                val view = LayoutInflater.from(parent.context)
                    .inflate(R.layout.item_history_donation, parent, false)
                DonationViewHolder(view, onItemClick, onViewCertificateClick)
            }
            else -> throw IllegalArgumentException("Invalid view type")
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val item = getItem(position)

        when (holder) {
            is RequestViewHolder -> holder.bind(item)
            is DonationViewHolder -> holder.bind(item)
        }
    }

    class RequestViewHolder(
        itemView: View,
        private val onItemClick: (HistoryItem) -> Unit,
        private val onCancelRequestClick: (HistoryItem) -> Unit
    ) : RecyclerView.ViewHolder(itemView) {
        private val tvTitle: TextView = itemView.findViewById(R.id.tvTitle)
        private val tvStatus: TextView = itemView.findViewById(R.id.tvStatus)
        private val tvPatient: TextView = itemView.findViewById(R.id.tvPatient)
        private val tvHospital: TextView = itemView.findViewById(R.id.tvHospital)
        private val tvBloodGroup: TextView = itemView.findViewById(R.id.tvBloodGroup)
        private val tvLocation: TextView = itemView.findViewById(R.id.tvLocation)
        private val tvDate: TextView = itemView.findViewById(R.id.tvDate)
        private val tvUnits: TextView = itemView.findViewById(R.id.tvUnits)
        private val btnViewDetails: com.google.android.material.button.MaterialButton =
            itemView.findViewById(R.id.btnViewDetails)
        private val btnCancelRequest: com.google.android.material.button.MaterialButton =
            itemView.findViewById(R.id.btnUpdateStatus)

        @SuppressLint("SetTextI18n")
        fun bind(item: HistoryItem) {
            tvTitle.text = "Blood Request"
            tvPatient.text = item.patientName
            tvHospital.text = item.hospital
            tvBloodGroup.text = "(${item.bloodGroup})"
            tvUnits.text = "${item.units} unit${if (item.units > 1) "s" else ""}"
            tvLocation.text = item.location
            tvDate.text = dateFormat.format(item.date)

            // Set status text (always black)
            tvStatus.text = item.status.replaceFirstChar { it.uppercase() }
            tvStatus.setTextColor(
                ContextCompat.getColor(itemView.context, R.color.text_primary) // Always black
            )

            // Set background based on status
            when (item.status.lowercase()) {
                "completed" -> {
                    tvStatus.setBackgroundResource(R.drawable.bg_status_completed)
                }
                "cancelled" -> {
                    tvStatus.setBackgroundResource(R.drawable.bg_status_cancelled)
                }
                "processing" -> {
                    tvStatus.setBackgroundResource(R.drawable.bg_status_processing)
                }
                else -> { // pending
                    tvStatus.setBackgroundResource(R.drawable.bg_status_pending)
                }
            }

            // Set button text based on status
            if (item.status.lowercase() == "pending") {
                btnCancelRequest.text = "Cancel Request"
                btnCancelRequest.visibility = View.VISIBLE
            } else {
                btnCancelRequest.visibility = View.GONE
            }

            // Set click listeners
            itemView.setOnClickListener { onItemClick(item) }
            btnViewDetails.setOnClickListener { onItemClick(item) }
            btnCancelRequest.setOnClickListener { onCancelRequestClick(item) }
        }
    }

    class DonationViewHolder(
        itemView: View,
        private val onItemClick: (HistoryItem) -> Unit,
        private val onViewCertificateClick: (HistoryItem) -> Unit
    ) : RecyclerView.ViewHolder(itemView) {
        private val tvTitle: TextView = itemView.findViewById(R.id.tvTitle)
        private val tvStatus: TextView = itemView.findViewById(R.id.tvStatus)
        private val tvHospital: TextView = itemView.findViewById(R.id.tvHospital)
        private val tvImpact: TextView = itemView.findViewById(R.id.tvImpact)
        private val tvLocation: TextView = itemView.findViewById(R.id.tvLocation)
        private val tvDate: TextView = itemView.findViewById(R.id.tvDate)
        private val btnViewCertificate: com.google.android.material.button.MaterialButton =
            itemView.findViewById(R.id.btnViewCertificate)

        @SuppressLint("SetTextI18n")
        fun bind(item: HistoryItem) {
            tvTitle.text = "Blood Donation"
            tvHospital.text = "Donation Center: ${item.hospital}"
            tvLocation.text = item.location
            tvDate.text = dateFormat.format(item.date)

            // Set impact message based on units
            tvImpact.text = when (item.units) {
                1 -> "🎉 You helped save up to 3 lives!"
                2 -> "🎉 You helped save up to 6 lives!"
                else -> "🎉 You helped save multiple lives!"
            }

            // Set status text (always black for consistency)
            tvStatus.text = item.status.replaceFirstChar { it.uppercase() }
            tvStatus.setTextColor(
                ContextCompat.getColor(itemView.context, R.color.text_primary) // Always black
            )
            tvStatus.setBackgroundResource(R.drawable.bg_status_completed)

            // Set click listeners
            itemView.setOnClickListener { onItemClick(item) }
            btnViewCertificate.setOnClickListener { onViewCertificateClick(item) }
        }
    }
}

class HistoryDiffCallback : DiffUtil.ItemCallback<HistoryItem>() {
    override fun areItemsTheSame(oldItem: HistoryItem, newItem: HistoryItem): Boolean {
        return oldItem.id == newItem.id
    }

    override fun areContentsTheSame(oldItem: HistoryItem, newItem: HistoryItem): Boolean {
        return oldItem == newItem
    }
}