package com.project.donateblood.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController

import com.project.donateblood.databinding.FragmentAboutUsBinding
import androidx.core.net.toUri

class AboutUsFragment : Fragment() {

    private var _binding: FragmentAboutUsBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAboutUsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupToolbar()
        setupClickListeners()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }

        binding.toolbar.title = "About Us"
    }

    private fun setupClickListeners() {
        // Social media click listeners
        binding.ivFacebook.setOnClickListener {
            openUrl("https://facebook.com/donateblood")
        }

        binding.ivTwitter.setOnClickListener {
            openUrl("https://twitter.com/donateblood")
        }

        binding.ivInstagram.setOnClickListener {
            openUrl("https://instagram.com/donateblood")
        }

        binding.ivLinkedin.setOnClickListener {
            openUrl("https://linkedin.com/company/donateblood")
        }

        // Email click
        binding.tvEmail.setOnClickListener {
            sendEmail()
        }

        // Website click
        binding.tvWebsite.setOnClickListener {
            openUrl("https://donateblood.com")
        }

        // Phone click
        binding.tvPhone.setOnClickListener {
            makePhoneCall()
        }

        // Privacy Policy
        binding.btnPrivacyPolicy.setOnClickListener {
            PrivacyPolicyDialogFragment().show(parentFragmentManager, "PrivacyPolicy")
        }

        // Terms of Service
        binding.btnTerms.setOnClickListener {
            Toast.makeText(requireContext(), "Terms of Service", Toast.LENGTH_SHORT).show()
        }

        // Rate App
        binding.btnRateApp.setOnClickListener {
            openAppOnPlayStore()
        }

        // Share App
        binding.btnShareApp.setOnClickListener {
            shareApp()
        }
    }

    private fun openUrl(url: String) {
        try {
            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW)
            intent.data = url.toUri()
            startActivity(intent)
        } catch (_: Exception) {
            Toast.makeText(
                requireContext(),
                "Unable to open link",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    private fun sendEmail() {
        try {
            val email = "support@donateblood.com"
            val intent = android.content.Intent(android.content.Intent.ACTION_SENDTO).apply {
                data = "mailto:$email".toUri()
                putExtra(android.content.Intent.EXTRA_SUBJECT, "Donate Blood App Inquiry")
            }
            startActivity(intent)
        } catch (_: Exception) {
            Toast.makeText(
                requireContext(),
                "No email app found",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    private fun makePhoneCall() {
        try {
            val phone = "+12345678900"
            val intent = android.content.Intent(android.content.Intent.ACTION_DIAL)
            intent.data = "tel:$phone".toUri()
            startActivity(intent)
        } catch (_: Exception) {
            Toast.makeText(
                requireContext(),
                "Unable to make call",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    private fun openAppOnPlayStore() {
        try {
            val packageName = requireContext().packageName
            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW).apply {
                data = "market://details?id=$packageName".toUri()
            }
            startActivity(intent)
        } catch (_: android.content.ActivityNotFoundException) {
            // If Play Store not available, open browser
            val packageName = requireContext().packageName
            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW).apply {
                data = "https://play.google.com/store/apps/details?id=$packageName".toUri()
            }
            startActivity(intent)
        } catch (_: Exception) {
            Toast.makeText(requireContext(), "Unable to open Play Store", Toast.LENGTH_SHORT).show()
        }
    }

    private fun shareApp() {
        try {
            val shareText = "Check out this amazing blood donation app! Download it from: https://play.google.com/store/apps/details?id=${requireContext().packageName}"
            val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(android.content.Intent.EXTRA_TEXT, shareText)
            }
            startActivity(android.content.Intent.createChooser(intent, "Share App"))
        } catch (_: Exception) {
            Toast.makeText(requireContext(), "Unable to share app", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}