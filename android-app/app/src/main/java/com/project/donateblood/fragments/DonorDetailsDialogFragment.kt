package com.project.donateblood.fragments

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.net.toUri
import androidx.navigation.fragment.findNavController
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.project.donateblood.R
import com.project.donateblood.databinding.FragmentDonorDetailsBinding
import com.project.donateblood.models.Donor
import com.project.donateblood.utils.ProfileImageManager

class DonorDetailsDialogFragment : BottomSheetDialogFragment() {

    private var _binding: FragmentDonorDetailsBinding? = null
    private val binding get() = _binding!!

    override fun getTheme(): Int = R.style.Theme_BloodLink_BottomSheetDialog

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentDonorDetailsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val donor = getDonorFromArgs() ?: return

        ProfileImageManager.loadAvatar(binding.ivProfilePicture, donor.imageUrl)
        binding.tvName.text = donor.name
        binding.tvBloodGroup.text = donor.bloodGroup
        binding.tvAddressLine1.text = donor.location.ifBlank { "Location not specified" }
        binding.tvAddressLine2.text = donor.district
        binding.tvMobileNumber.text = maskPhoneNumber(donor.phone)
        binding.tvCurrentStatus.text =
            if (donor.isAvailable) "Available" else "Busy"

        val triggerCallAction = {
            if (donor.phone.isNotEmpty()) {
                android.app.AlertDialog.Builder(requireContext())
                    .setTitle("Emergency Call Notice")
                    .setMessage("Please ensure this call is for a verified, urgent blood donation requirement.\n\nProceed to call ${donor.name}?")
                    .setPositiveButton("Proceed to Call") { _, _ ->
                        val sanitized = donor.phone.replace(" ", "")
                        startActivity(Intent(Intent.ACTION_DIAL, "tel:$sanitized".toUri()))
                    }
                    .setNegativeButton("Cancel", null)
                    .show()
            }
        }

        binding.tvMobileNumber.setOnClickListener { triggerCallAction() }
        binding.btnCallDonor.setOnClickListener { triggerCallAction() }

        binding.ivClose.setOnClickListener {
            dismiss()
        }

        binding.btnChatWithDonor.setOnClickListener {
            dismiss()
            val targetRecipientId = donor.userId.ifBlank { donor.id }
            if (targetRecipientId.isNotBlank()) {
                val bundle = ConversationFragment.newBundle(
                    recipientId = targetRecipientId,
                    recipientName = donor.name,
                    recipientBloodGroup = donor.bloodGroup,
                    recipientPhone = donor.phone,
                    recipientImage = donor.imageUrl
                )
                try {
                    findNavController().navigate(R.id.conversationFragment, bundle)
                } catch (_: Exception) {
                }
            }
        }

        binding.btnRequestDonate.setOnClickListener {
            dismiss()
            try {
                findNavController().navigate(R.id.requestBloodFragment)
            } catch (_: Exception) {
            }
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

    private fun getDonorFromArgs(): Donor? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arguments?.getSerializable(ARG_DONOR, Donor::class.java)
        } else {
            @Suppress("DEPRECATION")
            arguments?.getSerializable(ARG_DONOR) as? Donor
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        private const val ARG_DONOR = "donor"

        fun newInstance(donor: Donor): DonorDetailsDialogFragment {
            return DonorDetailsDialogFragment().apply {
                arguments = Bundle().apply {
                    putSerializable(ARG_DONOR, donor)
                }
            }
        }
    }
}
