package com.project.donateblood.utils

import android.annotation.SuppressLint
import android.content.Context
import android.content.res.ColorStateList
import android.view.LayoutInflater
import android.view.View
import androidx.core.content.ContextCompat
import androidx.core.widget.TextViewCompat
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.project.donateblood.R
import com.project.donateblood.databinding.BottomSheetBloodRequestDetailsBinding
import com.project.donateblood.models.BloodRequest

object BloodRequestDetailsSheet {

    @SuppressLint("SetTextI18n")
    fun show(
        context: Context,
        layoutInflater: LayoutInflater,
        request: BloodRequest,
        currentUserBloodGroup: String = "",
        currentUserId: String? = null,
        onCallClick: (BloodRequest) -> Unit,
        onChatClick: (BloodRequest) -> Unit,
        onShareClick: (BloodRequest) -> Unit,
        onDirectionsClick: (BloodRequest) -> Unit,
        onHelpClick: (BloodRequest) -> Unit
    ) {
        val dialog = BottomSheetDialog(context, R.style.Theme_BloodLink_BottomSheetDialog)
        val binding = BottomSheetBloodRequestDetailsBinding.inflate(layoutInflater)
        dialog.setContentView(binding.root)

        // Close button
        binding.ivCloseSheet.setOnClickListener { dialog.dismiss() }

        // Blood group badge
        binding.tvSheetBloodGroup.text = request.bloodGroup.ifBlank { "?" }

        // Urgency Tag
        val isUrgent = request.urgency.equals("high", ignoreCase = true) ||
                request.urgency.equals("urgent", ignoreCase = true) ||
                request.units >= 3

        if (isUrgent) {
            binding.tvSheetUrgencyTag.text = "URGENT"
            binding.tvSheetUrgencyTag.setTextColor(ContextCompat.getColor(context, R.color.primary_red))
            binding.tvSheetUrgencyTag.setBackgroundResource(R.drawable.bg_tag_urgent_2026)
            binding.tvSheetUrgencyTag.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_clock, 0, 0, 0)
            TextViewCompat.setCompoundDrawableTintList(
                binding.tvSheetUrgencyTag,
                ColorStateList.valueOf(ContextCompat.getColor(context, R.color.primary_red))
            )
        } else {
            binding.tvSheetUrgencyTag.text = "NEEDED"
            binding.tvSheetUrgencyTag.setTextColor(ContextCompat.getColor(context, R.color.text_secondary))
            binding.tvSheetUrgencyTag.setBackgroundResource(R.drawable.bg_tag_needed_2026)
            binding.tvSheetUrgencyTag.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_blood_drop, 0, 0, 0)
            TextViewCompat.setCompoundDrawableTintList(
                binding.tvSheetUrgencyTag,
                ColorStateList.valueOf(ContextCompat.getColor(context, R.color.primary_red))
            )
        }

        // Units Badge
        val unitsText = if (request.units == 1) "1 Unit Needed" else "${request.units} Units Needed"
        binding.tvSheetUnitsBadge.text = unitsText

        // Status Badge
        val statusText = request.status.ifBlank { "Pending" }.replaceFirstChar { it.uppercase() }
        binding.tvSheetStatusBadge.text = statusText

        // Compatibility Banner
        if (currentUserBloodGroup.isNotBlank() && request.bloodGroup.isNotBlank()) {
            val isCompatible = BloodCompatibility.isCompatible(currentUserBloodGroup, request.bloodGroup)
            if (isCompatible) {
                binding.layoutSheetCompatibility.visibility = View.VISIBLE
                binding.tvSheetCompatibility.text =
                    "Your blood group ($currentUserBloodGroup) is compatible with this patient!"
            } else {
                binding.layoutSheetCompatibility.visibility = View.GONE
            }
        } else {
            binding.layoutSheetCompatibility.visibility = View.GONE
        }

        // Patient Name
        binding.tvSheetPatientName.text = request.patientName.ifBlank { "Emergency Request" }

        // Hospital
        binding.tvSheetHospital.text = request.hospital.ifBlank { "Hospital not specified" }

        // Location
        val locationText = when {
            request.location.isNotBlank() && request.district.isNotBlank() ->
                "${request.location}, ${request.district}"
            request.district.isNotBlank() -> request.district
            request.location.isNotBlank() -> request.location
            else -> "Location not specified"
        }
        binding.tvSheetLocation.text = locationText

        // Required Date & Time
        val dateTimeText = when {
            request.date.isNotBlank() && request.time.isNotBlank() ->
                "${request.date} (${request.time})"
            request.date.isNotBlank() -> request.date
            else -> "Immediate requirement"
        }
        binding.tvSheetDateTime.text = dateTimeText

        // Phone
        if (request.phone.isNotBlank()) {
            binding.rowSheetPhone.visibility = View.VISIBLE
            binding.tvSheetPhone.text = request.phone
        } else {
            binding.rowSheetPhone.visibility = View.GONE
        }

        // Own Request Check
        val isOwnRequest = currentUserId != null && currentUserId == request.requesterId
        if (isOwnRequest) {
            binding.btnSheetCall.visibility = View.GONE
            binding.btnSheetChat.visibility = View.GONE
            binding.btnSheetHelp.text = "Your Request"
            binding.btnSheetHelp.isEnabled = false
            binding.btnSheetHelp.alpha = 0.6f
        } else {
            binding.btnSheetCall.visibility = if (request.phone.isNotBlank()) View.VISIBLE else View.GONE
            binding.btnSheetChat.visibility = View.VISIBLE
            binding.btnSheetHelp.text = "I Can Help"
            binding.btnSheetHelp.isEnabled = true
            binding.btnSheetHelp.alpha = 1.0f
        }

        // Button Click Listeners
        binding.btnSheetCall.setOnClickListener {
            dialog.dismiss()
            onCallClick(request)
        }

        binding.btnSheetChat.setOnClickListener {
            dialog.dismiss()
            onChatClick(request)
        }

        binding.btnSheetShare.setOnClickListener {
            dialog.dismiss()
            onShareClick(request)
        }

        binding.btnSheetDirections.setOnClickListener {
            dialog.dismiss()
            onDirectionsClick(request)
        }

        binding.btnSheetHelp.setOnClickListener {
            if (!isOwnRequest) {
                dialog.dismiss()
                onHelpClick(request)
            }
        }

        dialog.show()
    }
}
