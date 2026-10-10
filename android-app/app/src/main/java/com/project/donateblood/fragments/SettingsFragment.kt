package com.project.donateblood.fragments

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.content.edit
import androidx.core.net.toUri
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.fragment.findNavController
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.firebase.auth.EmailAuthProvider
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.project.donateblood.MainActivity
import com.project.donateblood.R
import com.project.donateblood.databinding.DialogBottomSheetAboutBinding
import com.project.donateblood.databinding.DialogBottomSheetChangePasswordBinding
import com.project.donateblood.databinding.DialogBottomSheetSupportBinding
import com.project.donateblood.databinding.FragmentSettingsBinding
import com.project.donateblood.utils.FirebaseUtils
import com.project.donateblood.utils.ProfileImageManager
import com.project.donateblood.viewmodels.UserViewModel
import timber.log.Timber
import java.io.File
import java.text.DecimalFormat

class SettingsFragment : Fragment() {

    private var _binding: FragmentSettingsBinding? = null
    private val binding get() = _binding!!

    private lateinit var auth: FirebaseAuth
    private lateinit var firestore: FirebaseFirestore
    private lateinit var userViewModel: UserViewModel
    private lateinit var prefs: SharedPreferences

    // Flags to prevent triggering listener callbacks during initial programmatic population
    private var isProgrammaticUpdate = false

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
        userViewModel = ViewModelProvider(requireActivity())[UserViewModel::class.java]
        prefs = requireContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        setupToolbar()
        observeUserData()
        loadLocalPreferences()
        setupClickListeners()
        loadRemoteSettings()
        updateCacheSizeDisplay()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }
    }

    // =========================================================================
    // USER HERO CARD & LIVE OBSERVERS
    // =========================================================================

    private fun observeUserData() {
        userViewModel.userProfileImage.observe(viewLifecycleOwner) { imageUrl ->
            ProfileImageManager.loadAvatar(binding.ivUserAvatar, imageUrl)
        }

        userViewModel.userName.observe(viewLifecycleOwner) { name ->
            binding.tvUserName.text = name.ifBlank { "BloodLink Member" }
        }

        userViewModel.userEmail.observe(viewLifecycleOwner) { email ->
            binding.tvUserEmail.text = email.ifBlank { "No email set" }
        }

        val currentUser = auth.currentUser
        if (currentUser != null) {
            binding.tvUserEmail.text = currentUser.email ?: "No email set"
            binding.tvUserName.text = currentUser.displayName ?: currentUser.email?.substringBefore("@") ?: "Member"
        }
    }

    // =========================================================================
    // CLICK LISTENERS & USER INTERACTIONS
    // =========================================================================

    private fun setSwitchSilently(switch: androidx.appcompat.widget.SwitchCompat, checked: Boolean) {
        if (switch.isChecked != checked) {
            switch.isChecked = checked
        }
        switch.jumpDrawablesToCurrentState()
    }

    private fun setupClickListeners() {
        // Hero card and Profile settings navigate to profile
        binding.cardUserProfile.setOnClickListener { navigateToProfile() }
        binding.layoutProfileSettings.setOnClickListener { navigateToProfile() }

        // Change Password
        binding.layoutChangePassword.setOnClickListener { showChangePasswordBottomSheet() }

        // Donor Availability row & switch
        binding.layoutDonorAvailability.setOnClickListener {
            binding.switchDonorAvailability.toggle()
        }
        binding.switchDonorAvailability.setOnCheckedChangeListener { _, isChecked ->
            if (!isProgrammaticUpdate) {
                updateDonorAvailability(isChecked)
            }
        }

        // Push Notifications row & switch
        binding.layoutPushNotifications.setOnClickListener {
            binding.switchNotifications.toggle()
        }
        binding.switchNotifications.setOnCheckedChangeListener { _, isChecked ->
            if (!isProgrammaticUpdate) {
                updatePushNotificationStatus(isChecked)
            }
        }

        // Emergency Alert Sound row & switch
        binding.layoutEmergencySound.setOnClickListener {
            binding.switchEmergencySound.toggle()
        }
        binding.switchEmergencySound.setOnCheckedChangeListener { _, isChecked ->
            if (!isProgrammaticUpdate) {
                prefs.edit { putBoolean(KEY_EMERGENCY_SOUND, isChecked) }
                val msg = if (isChecked) "Urgent alert sounds enabled" else "Urgent alert sounds silenced"
                Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
            }
        }

        // Theme selection
        binding.layoutTheme.setOnClickListener { showThemeSelectionDialog() }

        // Language selection
        binding.layoutLanguage.setOnClickListener { showLanguageSelectionDialog() }

        // Clear Cache
        binding.layoutClearCache.setOnClickListener { confirmClearCache() }

        // Data Saver row & switch
        binding.layoutDataSaver.setOnClickListener {
            binding.switchDataSaver.toggle()
        }
        binding.switchDataSaver.setOnCheckedChangeListener { _, isChecked ->
            if (!isProgrammaticUpdate) {
                prefs.edit { putBoolean(KEY_DATA_SAVER, isChecked) }
                val msg = if (isChecked) "Data Saver enabled" else "Data Saver disabled"
                Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
            }
        }

        // Legal & Support
        binding.layoutPrivacyPolicy.setOnClickListener { showPrivacyPolicy() }
        binding.layoutTerms.setOnClickListener { showTermsOfService() }
        binding.layoutSupport.setOnClickListener { showSupportBottomSheet() }
        binding.layoutAbout.setOnClickListener { showAboutBottomSheet() }

        // Session Actions
        binding.layoutLogout.setOnClickListener { confirmLogout() }
        binding.layoutDeleteAccount.setOnClickListener { confirmDeleteAccount() }
    }

    // =========================================================================
    // LOCAL SETTINGS (SHARED PREFERENCES)
    // =========================================================================

    private fun loadLocalPreferences() {
        isProgrammaticUpdate = true

        // Donor Availability from cached prefs (defaults to true)
        val donorAvailable = prefs.getBoolean(KEY_DONOR_AVAILABILITY, true)
        setSwitchSilently(binding.switchDonorAvailability, donorAvailable)

        // Push Notifications from cached prefs (defaults to true)
        val notificationsEnabled = prefs.getBoolean(KEY_NOTIFICATIONS_ENABLED, true)
        setSwitchSilently(binding.switchNotifications, notificationsEnabled)

        // Emergency alert sounds
        val soundEnabled = prefs.getBoolean(KEY_EMERGENCY_SOUND, true)
        setSwitchSilently(binding.switchEmergencySound, soundEnabled)

        // Data Saver
        val dataSaverEnabled = prefs.getBoolean(KEY_DATA_SAVER, false)
        setSwitchSilently(binding.switchDataSaver, dataSaverEnabled)

        // Current Theme display
        val themeMode = prefs.getInt(KEY_APP_THEME, AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
        binding.tvCurrentTheme.text = when (themeMode) {
            AppCompatDelegate.MODE_NIGHT_NO -> "Light"
            AppCompatDelegate.MODE_NIGHT_YES -> "Dark"
            else -> "System Default"
        }

        // Current Language display
        val lang = prefs.getString(KEY_APP_LANGUAGE, "English") ?: "English"
        binding.tvCurrentLanguage.text = lang

        isProgrammaticUpdate = false
    }

    // =========================================================================
    // REMOTE SETTINGS (FIRESTORE)
    // =========================================================================

    @SuppressLint("SetTextI18n")
    private fun loadRemoteSettings() {
        val currentUser = auth.currentUser ?: return

        firestore.collection(FirebaseUtils.Collections.DONORS)
            .document(currentUser.uid)
            .get()
            .addOnSuccessListener { donorDoc ->
                if (_binding == null) return@addOnSuccessListener
                isProgrammaticUpdate = true

                if (donorDoc.exists()) {
                    val isAvailable = donorDoc.getBoolean(FirebaseUtils.DonorFields.IS_AVAILABLE) ?: true
                    val notificationEnabled = donorDoc.getBoolean("notificationEnabled") ?: true
                    val bloodGroup = donorDoc.getString(FirebaseUtils.DonorFields.BLOOD_GROUP) ?: ""

                    // Cache in preferences for immediate zero-jump sync on future screen loads
                    prefs.edit {
                        putBoolean(KEY_DONOR_AVAILABILITY, isAvailable)
                        putBoolean(KEY_NOTIFICATIONS_ENABLED, notificationEnabled)
                    }

                    setSwitchSilently(binding.switchDonorAvailability, isAvailable)
                    setSwitchSilently(binding.switchNotifications, notificationEnabled)

                    binding.tvDonorBadge.visibility = View.VISIBLE
                    if (isAvailable) {
                        binding.tvDonorBadge.setBackgroundResource(R.drawable.bg_donor_status_active)
                        binding.tvDonorBadge.setTextColor(requireContext().getColor(R.color.text_donation))
                        binding.tvDonorBadge.text = if (bloodGroup.isNotBlank()) "Active Donor • $bloodGroup" else "Active Donor"
                        binding.tvDonorAvailabilitySubtitle.text = "Available to receive emergency donation requests"
                    } else {
                        binding.tvDonorBadge.setBackgroundResource(R.drawable.bg_donor_status_inactive)
                        binding.tvDonorBadge.setTextColor(requireContext().getColor(R.color.text_secondary))
                        binding.tvDonorBadge.text = if (bloodGroup.isNotBlank()) "Inactive Donor • $bloodGroup" else "Inactive Donor"
                        binding.tvDonorAvailabilitySubtitle.text = "Currently paused from donation requests"
                    }
                } else {
                    // Non-donor registered user
                    prefs.edit {
                        putBoolean(KEY_DONOR_AVAILABILITY, false)
                    }
                    binding.tvDonorBadge.text = "Registered User"
                    binding.tvDonorBadge.setBackgroundResource(R.drawable.bg_badge_pill)
                    binding.tvDonorBadge.setTextColor(requireContext().getColor(R.color.text_secondary))
                    setSwitchSilently(binding.switchDonorAvailability, false)
                    binding.tvDonorAvailabilitySubtitle.text = "Register as a donor in Profile to receive requests"
                }

                isProgrammaticUpdate = false
            }
            .addOnFailureListener { e ->
                Timber.e(e, "Failed to load remote donor settings")
            }
    }

    private fun updateDonorAvailability(isAvailable: Boolean) {
        val currentUser = auth.currentUser ?: return

        // Update local cache immediately
        prefs.edit { putBoolean(KEY_DONOR_AVAILABILITY, isAvailable) }

        // Update UI badge & subtitle instantly without reloading from network
        if (isAvailable) {
            binding.tvDonorBadge.setBackgroundResource(R.drawable.bg_donor_status_active)
            binding.tvDonorBadge.setTextColor(requireContext().getColor(R.color.text_donation))
            val currentText = binding.tvDonorBadge.text.toString()
            if (!currentText.contains("•")) {
                binding.tvDonorBadge.text = "Active Donor"
            }
            binding.tvDonorAvailabilitySubtitle.text = "Available to receive emergency donation requests"
        } else {
            binding.tvDonorBadge.setBackgroundResource(R.drawable.bg_donor_status_inactive)
            binding.tvDonorBadge.setTextColor(requireContext().getColor(R.color.text_secondary))
            val currentText = binding.tvDonorBadge.text.toString()
            if (!currentText.contains("•")) {
                binding.tvDonorBadge.text = "Inactive Donor"
            }
            binding.tvDonorAvailabilitySubtitle.text = "Currently paused from donation requests"
        }

        firestore.collection(FirebaseUtils.Collections.DONORS)
            .document(currentUser.uid)
            .update(
                mapOf(
                    FirebaseUtils.DonorFields.IS_AVAILABLE to isAvailable,
                    "updatedAt" to System.currentTimeMillis()
                )
            )
            .addOnSuccessListener {
                firestore.collection(FirebaseUtils.Collections.USERS)
                    .document(currentUser.uid)
                    .update(FirebaseUtils.UserFields.IS_AVAILABLE, isAvailable)

                val msg = if (isAvailable) "You are now active for blood donations" else "Donation availability paused"
                Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
            }
            .addOnFailureListener { e ->
                Timber.e(e, "Failed to update donor availability")
                Toast.makeText(requireContext(), "Failed to update availability", Toast.LENGTH_SHORT).show()
                isProgrammaticUpdate = true
                setSwitchSilently(binding.switchDonorAvailability, !isAvailable)
                prefs.edit { putBoolean(KEY_DONOR_AVAILABILITY, !isAvailable) }
                isProgrammaticUpdate = false
            }
    }

    private fun updatePushNotificationStatus(isEnabled: Boolean) {
        val currentUser = auth.currentUser ?: return

        // Update local cache immediately
        prefs.edit { putBoolean(KEY_NOTIFICATIONS_ENABLED, isEnabled) }

        firestore.collection(FirebaseUtils.Collections.DONORS)
            .document(currentUser.uid)
            .update("notificationEnabled", isEnabled)
            .addOnSuccessListener {
                firestore.collection(FirebaseUtils.Collections.USERS)
                    .document(currentUser.uid)
                    .update("notificationEnabled", isEnabled)

                val msg = if (isEnabled) "Push notifications enabled" else "Push notifications muted"
                Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
            }
            .addOnFailureListener { e ->
                Timber.e(e, "Failed to update push notifications")
                Toast.makeText(requireContext(), "Failed to update settings", Toast.LENGTH_SHORT).show()
                isProgrammaticUpdate = true
                setSwitchSilently(binding.switchNotifications, !isEnabled)
                prefs.edit { putBoolean(KEY_NOTIFICATIONS_ENABLED, !isEnabled) }
                isProgrammaticUpdate = false
            }
    }

    // =========================================================================
    // THEME & LANGUAGE DIALOGS
    // =========================================================================

    private fun showThemeSelectionDialog() {
        val options = arrayOf("System Default", "Light Mode", "Dark Mode")
        val currentMode = prefs.getInt(KEY_APP_THEME, AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
        val selectedIndex = when (currentMode) {
            AppCompatDelegate.MODE_NIGHT_NO -> 1
            AppCompatDelegate.MODE_NIGHT_YES -> 2
            else -> 0
        }

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Choose App Theme")
            .setSingleChoiceItems(options, selectedIndex) { dialog, which ->
                val newMode = when (which) {
                    1 -> AppCompatDelegate.MODE_NIGHT_NO
                    2 -> AppCompatDelegate.MODE_NIGHT_YES
                    else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
                }
                prefs.edit { putInt(KEY_APP_THEME, newMode) }
                binding.tvCurrentTheme.text = options[which]
                AppCompatDelegate.setDefaultNightMode(newMode)
                dialog.dismiss()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showLanguageSelectionDialog() {
        val options = arrayOf("English", "বাংলা (Bengali)")
        val currentLang = prefs.getString(KEY_APP_LANGUAGE, "English") ?: "English"
        val selectedIndex = if (currentLang.startsWith("বাংলা")) 1 else 0

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Select Language")
            .setSingleChoiceItems(options, selectedIndex) { dialog, which ->
                val chosen = options[which]
                prefs.edit { putString(KEY_APP_LANGUAGE, chosen) }
                binding.tvCurrentLanguage.text = chosen
                Toast.makeText(requireContext(), "Language set to $chosen", Toast.LENGTH_SHORT).show()
                dialog.dismiss()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // =========================================================================
    // CACHE MANAGEMENT
    // =========================================================================

    private fun updateCacheSizeDisplay() {
        try {
            val totalBytes = calculateTotalCacheBytes()
            binding.tvCacheSize.text = formatFileSize(totalBytes)
        } catch (_: Exception) {
            binding.tvCacheSize.text = "0.0 B"
        }
    }

    private fun calculateTotalCacheBytes(): Long {
        var size = 0L
        val cacheDir = requireContext().cacheDir
        size += getDirectorySize(cacheDir)
        val externalCache = requireContext().externalCacheDir
        if (externalCache != null) {
            size += getDirectorySize(externalCache)
        }
        return size
    }

    private fun getDirectorySize(dir: File?): Long {
        if (dir == null || !dir.exists()) return 0L
        var bytes = 0L
        val files = dir.listFiles() ?: return 0L
        for (f in files) {
            bytes += if (f.isDirectory) getDirectorySize(f) else f.length()
        }
        return bytes
    }

    private fun formatFileSize(bytes: Long): String {
        if (bytes <= 0) return "0.0 B"
        val units = arrayOf("B", "KB", "MB", "GB")
        val digitGroups = (Math.log10(bytes.toDouble()) / Math.log10(1024.0)).toInt()
        val index = digitGroups.coerceIn(0, units.size - 1)
        return DecimalFormat("#,##0.#").format(bytes / Math.pow(1024.0, index.toDouble())) + " " + units[index]
    }

    private fun confirmClearCache() {
        val currentSize = binding.tvCacheSize.text.toString()

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Clear Cache")
            .setMessage("Clear temporary cached files and images ($currentSize)? Your personal profile and saved data will not be affected.")
            .setPositiveButton("Clear Now") { _, _ ->
                try {
                    requireContext().cacheDir?.deleteRecursively()
                    requireContext().externalCacheDir?.deleteRecursively()
                    updateCacheSizeDisplay()
                    Toast.makeText(requireContext(), "Cache cleared successfully", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Timber.e(e, "Error clearing cache")
                    Toast.makeText(requireContext(), "Failed to clear some cache files", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // =========================================================================
    // CHANGE PASSWORD BOTTOM SHEET
    // =========================================================================

    private fun showChangePasswordBottomSheet() {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            Toast.makeText(requireContext(), "Please sign in to change password", Toast.LENGTH_SHORT).show()
            return
        }

        val dialog = BottomSheetDialog(requireContext(), R.style.Theme_BloodLink_BottomSheetDialog)
        val sheetBinding = DialogBottomSheetChangePasswordBinding.inflate(LayoutInflater.from(requireContext()))
        dialog.setContentView(sheetBinding.root)

        sheetBinding.ivClosePasswordSheet.setOnClickListener { dialog.dismiss() }
        sheetBinding.btnCancelPassword.setOnClickListener { dialog.dismiss() }

        // Forgot current password -> send reset email
        sheetBinding.tvForgotPasswordResetLink.setOnClickListener {
            val email = currentUser.email
            if (!email.isNullOrBlank()) {
                auth.sendPasswordResetEmail(email)
                    .addOnSuccessListener {
                        Toast.makeText(requireContext(), "Password reset link sent to $email", Toast.LENGTH_LONG).show()
                        dialog.dismiss()
                    }
                    .addOnFailureListener { e ->
                        Toast.makeText(requireContext(), "Failed to send reset link: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
            } else {
                Toast.makeText(requireContext(), "No email registered with this account", Toast.LENGTH_SHORT).show()
            }
        }

        sheetBinding.btnSubmitPassword.setOnClickListener {
            val currentPass = sheetBinding.etCurrentPassword.text.toString().trim()
            val newPass = sheetBinding.etNewPassword.text.toString().trim()
            val confirmPass = sheetBinding.etConfirmPassword.text.toString().trim()

            if (currentPass.isEmpty()) {
                sheetBinding.tilCurrentPassword.error = "Current password is required"
                return@setOnClickListener
            } else {
                sheetBinding.tilCurrentPassword.error = null
            }

            if (newPass.length < 6) {
                sheetBinding.tilNewPassword.error = "Password must be at least 6 characters"
                return@setOnClickListener
            } else {
                sheetBinding.tilNewPassword.error = null
            }

            if (newPass != confirmPass) {
                sheetBinding.tilConfirmPassword.error = "Passwords do not match"
                return@setOnClickListener
            } else {
                sheetBinding.tilConfirmPassword.error = null
            }

            val email = currentUser.email ?: ""
            if (email.isBlank()) {
                Toast.makeText(requireContext(), "Email address not found", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            sheetBinding.progressBarPassword.visibility = View.VISIBLE
            sheetBinding.btnSubmitPassword.isEnabled = false

            val credential = EmailAuthProvider.getCredential(email, currentPass)
            currentUser.reauthenticate(credential)
                .addOnSuccessListener {
                    currentUser.updatePassword(newPass)
                        .addOnSuccessListener {
                            sheetBinding.progressBarPassword.visibility = View.GONE
                            Toast.makeText(requireContext(), "Password updated successfully!", Toast.LENGTH_LONG).show()
                            dialog.dismiss()
                        }
                        .addOnFailureListener { e ->
                            sheetBinding.progressBarPassword.visibility = View.GONE
                            sheetBinding.btnSubmitPassword.isEnabled = true
                            Toast.makeText(requireContext(), "Failed to update password: ${e.message}", Toast.LENGTH_SHORT).show()
                        }
                }
                .addOnFailureListener { e ->
                    sheetBinding.progressBarPassword.visibility = View.GONE
                    sheetBinding.btnSubmitPassword.isEnabled = true
                    sheetBinding.tilCurrentPassword.error = "Incorrect current password"
                    Toast.makeText(requireContext(), "Authentication failed: ${e.message}", Toast.LENGTH_SHORT).show()
                }
        }

        dialog.show()
    }

    // =========================================================================
    // HELP, SUPPORT & ABOUT SHEETS
    // =========================================================================

    private fun showSupportBottomSheet() {
        val dialog = BottomSheetDialog(requireContext(), R.style.Theme_BloodLink_BottomSheetDialog)
        val sheetBinding = DialogBottomSheetSupportBinding.inflate(LayoutInflater.from(requireContext()))
        dialog.setContentView(sheetBinding.root)

        sheetBinding.ivCloseSupportSheet.setOnClickListener { dialog.dismiss() }

        sheetBinding.cardEmergencyCall.setOnClickListener {
            dialog.dismiss()
            try {
                val dialIntent = Intent(Intent.ACTION_DIAL, "tel:01705107279".toUri())
                startActivity(dialIntent)
            } catch (_: Exception) {
                Toast.makeText(requireContext(), "Hotline: 01705107279", Toast.LENGTH_SHORT).show()
            }
        }

        sheetBinding.cardEmailSupport.setOnClickListener {
            dialog.dismiss()
            try {
                val emailIntent = Intent(Intent.ACTION_SENDTO, "mailto:support@bloodlink.org".toUri()).apply {
                    putExtra(Intent.EXTRA_SUBJECT, "BloodLink App Support Request")
                }
                startActivity(Intent.createChooser(emailIntent, "Send Email via..."))
            } catch (_: Exception) {
                Toast.makeText(requireContext(), "Support: support@bloodlink.org", Toast.LENGTH_SHORT).show()
            }
        }

        dialog.show()
    }

    private fun showAboutBottomSheet() {
        val dialog = BottomSheetDialog(requireContext(), R.style.Theme_BloodLink_BottomSheetDialog)
        val sheetBinding = DialogBottomSheetAboutBinding.inflate(LayoutInflater.from(requireContext()))
        dialog.setContentView(sheetBinding.root)

        sheetBinding.btnCloseAboutSheet.setOnClickListener { dialog.dismiss() }

        dialog.show()
    }

    private fun showPrivacyPolicy() {
        PrivacyPolicyDialogFragment().show(parentFragmentManager, "PrivacyPolicy")
    }

    private fun showTermsOfService() {
        TermsOfServiceDialogFragment().show(parentFragmentManager, "TermsOfService")
    }

    private fun navigateToProfile() {
        try {
            findNavController().navigate(R.id.action_settingsFragment_to_profileFragment)
        } catch (e: Exception) {
            Timber.e(e, "Navigation to profile failed")
            Toast.makeText(requireContext(), "Navigating to Profile", Toast.LENGTH_SHORT).show()
        }
    }

    // =========================================================================
    // SESSION LOGOUT & ACCOUNT DELETION
    // =========================================================================

    private fun confirmLogout() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Log Out")
            .setMessage("Are you sure you want to log out of your BloodLink account?")
            .setPositiveButton("Log Out") { _, _ ->
                (requireActivity() as? MainActivity)?.logoutCurrentUser()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun confirmDeleteAccount() {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Delete Account Permanently")
            .setMessage("This action cannot be undone. All your donor records, requests, and personal account details will be permanently erased from BloodLink.\n\nAre you sure you want to proceed?")
            .setPositiveButton("Delete Permanently") { _, _ ->
                executeDeleteAccount()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun executeDeleteAccount() {
        val currentUser = auth.currentUser ?: return
        val uid = currentUser.uid

        Toast.makeText(requireContext(), "Deleting account...", Toast.LENGTH_SHORT).show()

        firestore.collection(FirebaseUtils.Collections.DONORS)
            .document(uid)
            .delete()
            .addOnCompleteListener {
                firestore.collection(FirebaseUtils.Collections.USERS)
                    .document(uid)
                    .delete()
                    .addOnCompleteListener {
                        currentUser.delete()
                            .addOnSuccessListener {
                                Toast.makeText(requireContext(), "Account deleted successfully", Toast.LENGTH_LONG).show()
                                findNavController().navigate(R.id.action_settingsFragment_to_loginFragment)
                            }
                            .addOnFailureListener { e ->
                                Timber.e(e, "Failed to delete auth user")
                                Toast.makeText(requireContext(), "Failed to delete account: ${e.message}", Toast.LENGTH_LONG).show()
                            }
                    }
            }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        private const val PREFS_NAME = "app_prefs"
        private const val KEY_DONOR_AVAILABILITY = "donor_availability_enabled"
        private const val KEY_NOTIFICATIONS_ENABLED = "push_notifications_enabled"
        private const val KEY_EMERGENCY_SOUND = "emergency_sound_enabled"
        private const val KEY_DATA_SAVER = "data_saver_mode"
        private const val KEY_APP_THEME = "app_theme"
        private const val KEY_APP_LANGUAGE = "app_language"
    }
}