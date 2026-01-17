package com.project.donateblood.fragments

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.project.donateblood.MainActivity
import com.project.donateblood.R
import com.project.donateblood.databinding.FragmentSettingsBinding
import com.project.donateblood.utils.FirebaseUtils
import timber.log.Timber

class SettingsFragment : Fragment() {

    private var _binding: FragmentSettingsBinding? = null
    private val binding get() = _binding!!

    private lateinit var auth: FirebaseAuth
    private lateinit var firestore: FirebaseFirestore

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSettingsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        auth = FirebaseAuth.getInstance()
        firestore = FirebaseFirestore.getInstance()

        setupToolbar()
        setupClickListeners()
        loadNotificationStatus()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }

        binding.toolbar.title = "Settings"
    }

    private fun setupClickListeners() {
        // Notification toggle
        binding.switchNotifications.setOnCheckedChangeListener { _, isChecked ->
            updateNotificationStatus(isChecked)
        }

        // Profile settings
        binding.layoutProfileSettings.setOnClickListener {
            navigateToProfile()
        }

        // Privacy Policy
        binding.layoutPrivacyPolicy.setOnClickListener {
            showPrivacyPolicy()
        }

        // Terms of Service
        binding.layoutTerms.setOnClickListener {
            showTermsOfService()
        }

        // Change Password
        binding.layoutChangePassword.setOnClickListener {
            changePassword()
        }

        // Language Settings
        binding.layoutLanguage.setOnClickListener {
            showLanguageSettings()
        }

        // Data Usage
        binding.layoutDataUsage.setOnClickListener {
            showDataUsageSettings()
        }

        // Clear Cache
        binding.layoutClearCache.setOnClickListener {
            clearCache()
        }



        // Delete Account
        binding.btnDeleteAccount.setOnClickListener {
            deleteAccount()
        }
    }

    private fun loadNotificationStatus() {
        val currentUser = auth.currentUser ?: return

        firestore.collection(FirebaseUtils.Collections.DONORS)
            .document(currentUser.uid)
            .get()
            .addOnSuccessListener { document ->
                if (document.exists()) {
                    val notificationEnabled = document.getBoolean("notificationEnabled") ?: true
                    binding.switchNotifications.isChecked = notificationEnabled
                }
            }
            .addOnFailureListener { e ->
                Timber.e("Failed to load notification status: ${e.message}")
                binding.switchNotifications.isChecked = true // Default to enabled
            }
    }

    private fun updateNotificationStatus(isEnabled: Boolean) {
        val currentUser = auth.currentUser ?: return

        firestore.collection(FirebaseUtils.Collections.DONORS)
            .document(currentUser.uid)
            .update("notificationEnabled", isEnabled)
            .addOnSuccessListener {
                val message = if (isEnabled) "Notifications enabled" else "Notifications disabled"
                Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
            }
            .addOnFailureListener { e ->
                Timber.e("Failed to update notification status: ${e.message}")
                Toast.makeText(requireContext(), "Failed to update settings", Toast.LENGTH_SHORT).show()
                // Revert the switch
                binding.switchNotifications.isChecked = !isEnabled
            }
    }

    private fun navigateToProfile() {
        try {
            findNavController().navigate(R.id.action_settingsFragment_to_profileFragment)
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Profile feature coming soon", Toast.LENGTH_SHORT).show()
            Timber.e("Navigation to profile failed: ${e.message}")
        }
    }

    private fun showPrivacyPolicy() {
        PrivacyPolicyDialogFragment().show(parentFragmentManager, "PrivacyPolicy")
    }

    private fun showTermsOfService() {
        Toast.makeText(requireContext(), "Terms of Service", Toast.LENGTH_SHORT).show()
    }

    private fun changePassword() {
        Toast.makeText(requireContext(), "Change Password feature coming soon", Toast.LENGTH_SHORT).show()
    }

    private fun showLanguageSettings() {
        Toast.makeText(requireContext(), "Language Settings feature coming soon", Toast.LENGTH_SHORT).show()
    }

    private fun showDataUsageSettings() {
        Toast.makeText(requireContext(), "Data Usage Settings feature coming soon", Toast.LENGTH_SHORT).show()
    }

    private fun clearCache() {
        Toast.makeText(requireContext(), "Cache cleared", Toast.LENGTH_SHORT).show()
    }

    private fun performLogout() {
        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Logout")
            .setMessage("Are you sure you want to logout?")
            .setPositiveButton("Yes") { _, _ ->
                (requireActivity() as MainActivity).logoutCurrentUser()
            }
            .setNegativeButton("No", null)
            .show()
    }

    private fun deleteAccount() {
        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Delete Account")
            .setMessage("Are you sure you want to delete your account? This action cannot be undone.")
            .setPositiveButton("Delete") { _, _ ->
                deleteAccountFromFirebase()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun deleteAccountFromFirebase() {
        val currentUser = auth.currentUser ?: return

        // Show loading
        Toast.makeText(requireContext(), "Deleting account...", Toast.LENGTH_SHORT).show()

        // First delete from Firestore
        firestore.collection(FirebaseUtils.Collections.DONORS)
            .document(currentUser.uid)
            .delete()
            .addOnSuccessListener {
                // Then delete from Firebase Auth
                currentUser.delete()
                    .addOnCompleteListener { task ->
                        if (task.isSuccessful) {
                            Toast.makeText(requireContext(), "Account deleted successfully", Toast.LENGTH_SHORT).show()
                            // Navigate to login
                            findNavController().navigate(R.id.action_settingsFragment_to_loginFragment)
                        } else {
                            Toast.makeText(requireContext(), "Failed to delete account", Toast.LENGTH_SHORT).show()
                        }
                    }
            }
            .addOnFailureListener { e ->
                Timber.e("Failed to delete user data: ${e.message}")
                Toast.makeText(requireContext(), "Failed to delete account", Toast.LENGTH_SHORT).show()
            }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}