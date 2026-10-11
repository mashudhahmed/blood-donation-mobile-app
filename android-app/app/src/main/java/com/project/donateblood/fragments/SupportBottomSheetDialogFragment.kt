package com.project.donateblood.fragments

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.project.donateblood.databinding.DialogBottomSheetSupportBinding

class SupportBottomSheetDialogFragment : BottomSheetDialogFragment() {

    private var _binding: DialogBottomSheetSupportBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = DialogBottomSheetSupportBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.ivCloseSupportSheet.setOnClickListener {
            dismiss()
        }

        binding.cardEmergencyCall.setOnClickListener {
            val phone = "+880180000000"
            val intent = Intent(Intent.ACTION_DIAL).apply {
                data = Uri.parse("tel:$phone")
            }
            try {
                startActivity(intent)
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Unable to open dialer", Toast.LENGTH_SHORT).show()
            }
        }

        binding.cardEmailSupport.setOnClickListener {
            val intent = Intent(Intent.ACTION_SENDTO).apply {
                data = Uri.parse("mailto:support@bloodlink.org")
                putExtra(Intent.EXTRA_SUBJECT, "[BloodLink Support] Assistance Request")
                putExtra(
                    Intent.EXTRA_TEXT,
                    "Hello BloodLink Support Team,\n\nI need assistance with:\n\n---\nDevice: ${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}\nAndroid: ${android.os.Build.VERSION.RELEASE}"
                )
            }
            try {
                startActivity(Intent.createChooser(intent, "Send Email Support"))
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "No email app found", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        const val TAG = "SupportBottomSheetDialogFragment"
    }
}
