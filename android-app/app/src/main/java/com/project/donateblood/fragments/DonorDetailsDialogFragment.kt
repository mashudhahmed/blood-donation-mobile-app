package com.project.donateblood.fragments

import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.DialogFragment
import com.project.donateblood.databinding.FragmentDonorDetailsBinding
import com.project.donateblood.models.Donor

class DonorDetailsDialogFragment : DialogFragment() {

    private var _binding: FragmentDonorDetailsBinding? = null
    private val binding get() = _binding!!

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

        binding.tvName.text = donor.name
        binding.tvBloodGroup.text = donor.bloodGroup
        binding.tvAddressLine1.text = donor.location
        binding.tvAddressLine2.text = donor.district
        binding.tvMobileNumber.text = donor.phone
        binding.tvCurrentStatus.text =
            if (donor.isAvailable) "Available" else "Not Available"

        binding.ivClose.setOnClickListener {
            dismiss()
        }

        binding.btnRequestDonate.setOnClickListener {
            dismiss()
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
