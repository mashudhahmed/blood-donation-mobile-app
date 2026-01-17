package com.project.donateblood.fragments

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.content.edit
import androidx.fragment.app.DialogFragment
import com.project.donateblood.databinding.FragmentPrivacyPolicyDialogBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class PrivacyPolicyDialogFragment : DialogFragment() {

    private var _binding: FragmentPrivacyPolicyDialogBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentPrivacyPolicyDialogBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupDialog()
        setupViews()
        setupClickListeners()
    }

    private fun setupDialog() {
        // Set dialog dimensions
        dialog?.window?.setLayout(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )

        // Set transparent background for rounded corners
        dialog?.window?.setBackgroundDrawableResource(android.R.color.transparent)

        // Make dialog cancelable by clicking outside (but show warning)
        isCancelable = false
    }

    @SuppressLint("SetTextI18n")
    private fun setupViews() {
        // Set last updated date
        val dateFormat = SimpleDateFormat("dd MMMM yyyy", Locale.getDefault())
        val currentDate = dateFormat.format(Date())
        binding.tvLastUpdated.text = "Last Updated: $currentDate"

        // Set privacy policy content directly
        val privacyContent = """
            1. Information We Collect
            We collect the following information to provide our services:
            - Personal Information: Name, email, phone number
            - Health Information: Blood type, donation history, medical eligibility
            - Location Data: District, city for connecting donors and recipients
            - Device Information: App version, device type for technical support

            2. How We Use Your Information
            - To connect blood donors with recipients in need
            - To send important notifications about blood requests
            - To maintain donation history records
            - To improve our services and user experience
            - To comply with legal requirements

            3. Data Security
            - Your data is encrypted and stored securely
            - We use industry-standard security measures
            - Access to personal information is restricted
            - Regular security audits are conducted

            4. Data Sharing
            - We do not sell your personal information
            - Data is shared only for connecting donors/recipients
            - Medical information is kept confidential
            - We may share aggregated, non-personal data

            5. Your Rights
            - Access your personal information
            - Request data correction
            - Request data deletion
            - Opt-out of notifications
            - Export your data

            6. Contact Us
            For privacy concerns, contact: privacy@donateblood.com
        """.trimIndent()

        binding.tvPrivacyContent.text = privacyContent
    }

    private fun setupClickListeners() {
        // Close button
        binding.ivClose.setOnClickListener {
            showDeclineWarning()
        }

        // Accept button
        binding.btnAccept.setOnClickListener {
            acceptPrivacyPolicy()
        }

        // Decline button
        binding.btnDecline.setOnClickListener {
            showDeclineWarning()
        }
    }

    private fun acceptPrivacyPolicy() {
        // Save acceptance in shared preferences
        requireActivity().getSharedPreferences("app_prefs", 0).edit {
            putBoolean("privacy_policy_accepted", true)
        }

        // Notify HomeFragment if it's visible
        val homeFragment = parentFragmentManager.findFragmentByTag("HomeFragment")
        if (homeFragment is HomeFragment) {
            homeFragment.savePrivacyPolicyAccepted()
        }

        // Dismiss dialog
        dismiss()

        // Show confirmation
        Toast.makeText(requireContext(), "Privacy Policy accepted", Toast.LENGTH_SHORT).show()
    }

    private fun showDeclineWarning() {
        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Privacy Policy Required")
            .setMessage("You must accept the Privacy Policy to use Donate Blood app. If you decline, you will be logged out of the app.")
            .setPositiveButton("Accept") { _, _ ->
                acceptPrivacyPolicy()
            }
            .setNegativeButton("Decline & Logout") { _, _ ->
                logoutUser()
            }
            .setNeutralButton("Review Again", null)
            .show()
    }

    private fun logoutUser() {
        // Perform logout
        val mainActivity = requireActivity() as? com.project.donateblood.MainActivity
        mainActivity?.logoutCurrentUser()
        dismiss()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        fun newInstance() = PrivacyPolicyDialogFragment()
    }
}