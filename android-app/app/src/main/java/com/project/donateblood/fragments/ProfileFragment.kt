package com.project.donateblood.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.project.donateblood.R
import com.project.donateblood.databinding.FragmentProfileBinding
import com.project.donateblood.models.User
import com.project.donateblood.utils.FirebaseUtils
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.*

class ProfileFragment : Fragment() {

    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!

    private lateinit var auth: FirebaseAuth
    private lateinit var firestore: FirebaseFirestore
    private var user: User? = null
    private var isDonor = false
    private var donorDocumentId: String = ""

    // ✅ FIX: Track initial switch state to prevent toast on refresh
    private var initialSwitchState: Boolean? = null
    private var isInitialSetupComplete = false

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        auth = FirebaseAuth.getInstance()
        firestore = FirebaseFirestore.getInstance()

        setupToolbar()
        setupClickListeners()
        checkDonorStatusAndLoadProfile()
    }

    override fun onResume() {
        super.onResume()
        checkDonorStatusAndLoadProfile()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }
    }

    private fun setupClickListeners() {
        binding.btnEditPersonal.setOnClickListener {
            navigateToPersonalEdit()
        }

        binding.btnEditDonor.setOnClickListener {
            if (isDonor) {
                editDonorInfo()
            } else {
                navigateToDonorRegistration()
            }
        }

        binding.btnEditAddress.setOnClickListener {
            navigateToAddressEdit()
        }

        binding.btnRegisterDonor.setOnClickListener {
            navigateToDonorRegistration()
        }

        binding.switchAvailability.setOnCheckedChangeListener { _, isChecked ->
            // ✅ FIX: Only trigger updates after initial setup is complete
            if (isInitialSetupComplete && isDonor) {
                updateDonorAvailability(isChecked, isUserAction = true)
            } else if (!isDonor) {
                binding.switchAvailability.isChecked = false
                showRegistrationPrompt()
            }
        }
    }

    private fun navigateToPersonalEdit() {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            showLoginPrompt()
            return
        }

        try {
            // Navigate to PersonalEditFragment using the action from navigation graph
            findNavController().navigate(R.id.action_profileFragment_to_personalEditFragment)
        } catch (e: Exception) {
            Timber.e(e, "Failed to navigate to personal edit")
            toast("Unable to open edit screen. Please try again.")
        }
    }

    private fun navigateToAddressEdit() {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            showLoginPrompt()
            return
        }

        try {
            // Navigate to AddressEditFragment using the action from navigation graph
            findNavController().navigate(R.id.action_profileFragment_to_addressEditFragment)
        } catch (e: Exception) {
            Timber.e(e, "Failed to navigate to address edit")
            toast("Unable to open edit screen. Please try again.")
        }
    }

    private fun navigateToDonorRegistration() {
        try {
            // Check if user is logged in
            if (auth.currentUser == null) {
                showLoginPrompt()
                return
            }

            Timber.tag("ProfileFragment").d("Navigating to donor registration")

            // Navigate to donor registration
            findNavController().navigate(R.id.action_profileFragment_to_donorRegistrationFragment)
        } catch (e: Exception) {
            Timber.tag("ProfileFragment").e(e, "Navigation error: ${e.message}")

            android.app.AlertDialog.Builder(requireContext())
                .setTitle("Navigation Error")
                .setMessage("Unable to open donor registration. Please try again.")
                .setPositiveButton("OK", null)
                .show()
        }
    }

    private fun editDonorInfo() {
        try {
            // Check if user is logged in
            if (auth.currentUser == null) {
                showLoginPrompt()
                return
            }

            // Check if user is a donor
            if (!isDonor) {
                toast("You are not registered as a donor yet.")
                navigateToDonorRegistration()
                return
            }

            Timber.tag("ProfileFragment").d("Navigating to edit donor info")

            // Create a bundle with donor data
            val bundle = Bundle().apply {
                putString("donorDocumentId", donorDocumentId)
                putBoolean("isEditMode", true)
            }

            // Navigate to donor registration fragment in edit mode
            findNavController().navigate(
                R.id.action_profileFragment_to_donorRegistrationFragment,
                bundle
            )

        } catch (e: Exception) {
            Timber.tag("ProfileFragment").e(e, "Edit donor info error: ${e.message}")

            android.app.AlertDialog.Builder(requireContext())
                .setTitle("Error")
                .setMessage("Unable to edit donor information. Please try again.")
                .setPositiveButton("OK", null)
                .show()
        }
    }

    private fun checkDonorStatusAndLoadProfile() {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            showLoginPrompt()
            return
        }

        showLoading(true)

        // ✅ FIX: Reset initial state tracking
        initialSwitchState = null
        isInitialSetupComplete = false

        // Check if user exists in donors collection
        firestore.collection(FirebaseUtils.Collections.DONORS)
            .document(currentUser.uid)
            .get()
            .addOnSuccessListener { donorDocument ->
                // User is a donor if document exists in donors collection
                isDonor = donorDocument.exists()
                donorDocumentId = currentUser.uid

                if (isDonor) {
                    // User is donor - load donor data
                    loadDonorData(donorDocument)
                } else {
                    // User is not a donor - load basic profile
                    loadUserProfile()
                }
            }
            .addOnFailureListener { e ->
                toast("Error checking donor status: ${e.message}")
                // On error, assume not donor and load basic profile
                isDonor = false
                loadUserProfile()
            }
    }

    private fun loadDonorData(donorDocument: com.google.firebase.firestore.DocumentSnapshot) {
        val data = donorDocument.data

        // Update UI with donor data
        data?.let {
            binding.tvBloodGroup.text = (it[FirebaseUtils.DonorFields.BLOOD_GROUP] as? String) ?: "Not set"

            // ✅ FIX: Capture initial state and set switch without triggering toast
            val isAvailable = (it[FirebaseUtils.DonorFields.IS_AVAILABLE] as? Boolean) ?: true
            initialSwitchState = isAvailable

            // Temporarily remove listener to prevent triggering during setup
            binding.switchAvailability.setOnCheckedChangeListener(null)

            binding.switchAvailability.isChecked = isAvailable
            binding.switchAvailability.isEnabled = true

            // Restore listener
            binding.switchAvailability.setOnCheckedChangeListener { _, isChecked ->
                if (isInitialSetupComplete && isDonor) {
                    updateDonorAvailability(isChecked, isUserAction = true)
                } else if (!isDonor) {
                    binding.switchAvailability.isChecked = false
                    showRegistrationPrompt()
                }
            }

            binding.tvAvailability.text = if (isAvailable) "Available" else "Not Available"

            // Set availability color
            val availabilityColor = if (isAvailable) {
                resources.getColor(R.color.green_dark, requireContext().theme)
            } else {
                resources.getColor(R.color.primary_red_dark, requireContext().theme)
            }
            binding.tvAvailability.setTextColor(availabilityColor)

            // Last donation - fixed when expression
            val lastDonationDate = it[FirebaseUtils.DonorFields.LAST_DONATION_DATE]
            val lastDonationText = when (lastDonationDate) {
                is Long -> if (lastDonationDate > 0) {
                    try {
                        val date = Date(lastDonationDate)
                        val sdf = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
                        sdf.format(date)
                    } catch (_: Exception) {
                        "Never donated"
                    }
                } else {
                    "Never donated"
                }
                is String -> if (lastDonationDate.isNotEmpty()) {
                    try {
                        val inputFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
                        val date = inputFormat.parse(lastDonationDate)
                        val outputFormat = SimpleDateFormat("MMM dd, yyyy", Locale.getDefault())
                        outputFormat.format(date ?: Date())
                    } catch (_: Exception) {
                        lastDonationDate
                    }
                } else {
                    "Never donated"
                }
                else -> "Never donated"
            }
            binding.tvLastDonation.text = lastDonationText

            // Update donor badge
            updateDonorBadge(isAvailable)
        }

        // Now load the basic user profile for other info
        loadUserProfile()
    }

    private fun loadUserProfile() {
        val userId = auth.currentUser?.uid ?: return

        firestore.collection(FirebaseUtils.Collections.USERS)
            .document(userId)
            .get()
            .addOnSuccessListener { document ->
                if (document.exists()) {
                    try {
                        val data = document.data
                        user = parseUserData(data, userId)
                        updateUIWithProfile(user)
                    } catch (e: Exception) {
                        toast("Error parsing user data: ${e.message}")
                        createNewUserProfile()
                    }
                } else {
                    createNewUserProfile()
                }
                showLoading(false)

                // ✅ FIX: Mark initial setup as complete AFTER loading data
                isInitialSetupComplete = true
            }
            .addOnFailureListener { e ->
                toast("Failed to load profile: ${e.message}")
                showLoading(false)
                isInitialSetupComplete = true
            }
    }

    private fun parseUserData(data: Map<String, Any>?, uid: String): User {
        // Fixed when expression for lastDonationDate
        val lastDonationDate = data?.get(FirebaseUtils.UserFields.LAST_DONATION_DATE)
        val formattedLastDonation = when (lastDonationDate) {
            is String -> lastDonationDate
            is Long -> if (lastDonationDate > 0) formatTimestampToString(lastDonationDate) else ""
            else -> ""
        }

        return User(
            uid = uid,
            name = data?.get(FirebaseUtils.UserFields.NAME) as? String ?: "",
            email = data?.get(FirebaseUtils.UserFields.EMAIL) as? String ?: "",
            phone = data?.get(FirebaseUtils.UserFields.PHONE) as? String ?: "",
            bloodGroup = data?.get(FirebaseUtils.UserFields.BLOOD_GROUP) as? String ?: "",
            dateOfBirth = data?.get(FirebaseUtils.UserFields.DATE_OF_BIRTH) as? String ?: "",
            district = data?.get(FirebaseUtils.UserFields.DISTRICT) as? String ?: "",
            postOffice = data?.get(FirebaseUtils.UserFields.POST_OFFICE) as? String ?: "",
            policeStation = data?.get(FirebaseUtils.UserFields.POLICE_STATION) as? String ?: "",
            village = data?.get(FirebaseUtils.UserFields.VILLAGE) as? String ?: "",
            road = data?.get(FirebaseUtils.UserFields.ROAD) as? String ?: "",
            profileImage = data?.get(FirebaseUtils.UserFields.PROFILE_IMAGE) as? String ?: "",
            createdAt = (data?.get(FirebaseUtils.UserFields.CREATED_AT) as? Long) ?: System.currentTimeMillis(),
            lastDonationDate = formattedLastDonation,
            totalDonations = (data?.get(FirebaseUtils.UserFields.TOTAL_DONATIONS) as? Long)?.toInt() ?: 0,
            isAvailable = data?.get(FirebaseUtils.UserFields.IS_AVAILABLE) as? Boolean ?: true,
            userType = data?.get(FirebaseUtils.UserFields.USER_TYPE) as? String ?: "user"
        )
    }

    private fun formatTimestampToString(timestamp: Long): String {
        return try {
            val date = Date(timestamp)
            val sdf = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
            sdf.format(date)
        } catch (_: Exception) {
            ""
        }
    }

    private fun updateUIWithProfile(user: User?) {
        user?.let {
            // Always update personal info
            binding.tvUserName.text = it.name.ifEmpty { "User" }
            binding.tvUserEmail.text = it.email.ifEmpty { "No email" }
            binding.tvName.text = it.name.ifEmpty { "Not set" }
            binding.tvPhone.text = it.phone.ifEmpty { "Not set" }
            binding.tvDateOfBirth.text = it.dateOfBirth.ifEmpty { "Not set" }

            // Address info
            binding.tvDistrict.text = it.district.ifEmpty { "Not set" }
            binding.tvPoliceStation.text = it.policeStation.ifEmpty { "Not set" }
            binding.tvPostOffice.text = it.postOffice.ifEmpty { "Not set" }
            binding.tvVillage.text = if (it.village.isNotEmpty() || it.road.isNotEmpty()) {
                "${it.village} ${it.road}".trim()
            } else {
                "Not set"
            }

            // Show/hide donor info based on donor status
            if (isDonor) {
                // User is donor - SHOW DONOR INFO CARD
                binding.cardDonorInfo.visibility = View.VISIBLE
                binding.btnEditDonor.text = "Update Donor Info"

                // HIDE promotion
                binding.cardDonorPromotion.visibility = View.GONE

            } else {
                // User is NOT donor - SHOW PROMOTION CARD
                binding.cardDonorInfo.visibility = View.GONE

                // SHOW promotion card
                binding.cardDonorPromotion.visibility = View.VISIBLE

                // Update button text
                binding.btnEditDonor.text = "Register as Donor"

                // Disable donor-only features
                binding.switchAvailability.isChecked = false
                binding.switchAvailability.isEnabled = false
                binding.layoutDonorStatus.visibility = View.GONE
            }
        } ?: run {
            // User is null - show promotion
            showPromotionOnly()
        }
    }

    private fun showPromotionOnly() {
        binding.cardDonorInfo.visibility = View.GONE
        binding.cardDonorPromotion.visibility = View.VISIBLE
        binding.btnEditDonor.text = "Register as Donor"
        binding.switchAvailability.isChecked = false
        binding.switchAvailability.isEnabled = false
        binding.layoutDonorStatus.visibility = View.GONE
    }

    private fun updateDonorBadge(isAvailable: Boolean) {
        binding.layoutDonorStatus.visibility = View.VISIBLE
        binding.tvDonorStatus.text = if (isAvailable) "Active Donor" else "Inactive Donor"

        val backgroundColor = if (isAvailable) {
            resources.getColor(R.color.green_dark, requireContext().theme)
        } else {
            resources.getColor(R.color.primary_red_dark, requireContext().theme)
        }
        binding.layoutDonorStatus.setBackgroundColor(backgroundColor)
    }

    // ✅ FIX: Added isUserAction parameter to distinguish between setup vs user toggle
    private fun updateDonorAvailability(isAvailable: Boolean, isUserAction: Boolean = false) {
        val userId = auth.currentUser?.uid ?: return

        // Check if this is just setting initial value (no toast) vs user action (show toast)
        if (!isUserAction) {
            // This is initial setup or programmatic change - update UI without toast
            user?.isAvailable = isAvailable
            updateDonorBadge(isAvailable)
            binding.tvAvailability.text = if (isAvailable) "Available" else "Not Available"

            val availabilityColor = if (isAvailable) {
                resources.getColor(R.color.green_dark, requireContext().theme)
            } else {
                resources.getColor(R.color.primary_red_dark, requireContext().theme)
            }
            binding.tvAvailability.setTextColor(availabilityColor)
            return
        }

        // This is a user action - proceed with Firestore update and show toast
        // Update in both donors and users collections
        val updateData = mapOf(
            FirebaseUtils.UserFields.IS_AVAILABLE to isAvailable,
            FirebaseUtils.DonorFields.IS_AVAILABLE to isAvailable
        )

        firestore.collection(FirebaseUtils.Collections.DONORS)
            .document(userId)
            .update(updateData)
            .addOnSuccessListener {
                // Also update users collection for consistency
                firestore.collection(FirebaseUtils.Collections.USERS)
                    .document(userId)
                    .update(updateData)
                    .addOnSuccessListener {
                        // ✅ Only show toast for user actions (not during page refresh)
                        if (isUserAction) {
                            toast(if (isAvailable) "Available for donations" else "Unavailable for donations")
                        }

                        // Update local user object
                        user?.isAvailable = isAvailable

                        // Update initial state for future comparisons
                        initialSwitchState = isAvailable

                        // Update UI
                        updateDonorBadge(isAvailable)
                        binding.tvAvailability.text = if (isAvailable) "Available" else "Not Available"

                        val availabilityColor = if (isAvailable) {
                            resources.getColor(R.color.green_dark, requireContext().theme)
                        } else {
                            resources.getColor(R.color.primary_red_dark, requireContext().theme)
                        }
                        binding.tvAvailability.setTextColor(availabilityColor)
                    }
            }
            .addOnFailureListener { e ->
                toast("Failed to update availability: ${e.message}")
                // Revert the toggle to previous state on failure
                val currentValue = user?.isAvailable ?: false
                binding.switchAvailability.isChecked = currentValue
            }
    }

    private fun showRegistrationPrompt() {
        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Register as Donor")
            .setMessage("You need to register as a donor first to set your availability status.")
            .setPositiveButton("Register Now") { _, _ ->
                navigateToDonorRegistration()
            }
            .setNegativeButton("Later", null)
            .show()
    }

    private fun createNewUserProfile() {
        val currentUser = auth.currentUser ?: return
        val newUser = User(
            uid = currentUser.uid,
            name = currentUser.displayName ?: "",
            email = currentUser.email ?: "",
            phone = "",
            bloodGroup = "",
            dateOfBirth = "",
            district = "",
            postOffice = "",
            policeStation = "",
            village = "",
            road = "",
            profileImage = "",
            isAvailable = false,
            userType = "user"
        )

        firestore.collection(FirebaseUtils.Collections.USERS)
            .document(currentUser.uid)
            .set(newUser)
            .addOnSuccessListener {
                user = newUser
                updateUIWithProfile(user)
            }
            .addOnFailureListener { e ->
                toast("Failed to create profile: ${e.message}")
                user = newUser
                showPromotionOnly()
            }
    }

    private fun showLoginPrompt() {
        binding.tvUserName.text = "Please Login"
        binding.tvUserEmail.text = "Tap to login"

        binding.cardDonorInfo.visibility = View.GONE
        binding.cardDonorPromotion.visibility = View.GONE

        disableAllActions()

        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Login Required")
            .setMessage("Login to access your profile")
            .setPositiveButton("Login") { _, _ ->
                try {
                    findNavController().navigate(R.id.action_profileFragment_to_loginFragment)
                } catch (_: Exception) {
                    requireActivity().finish()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun disableAllActions() {
        binding.btnEditPersonal.isEnabled = false
        binding.btnEditDonor.isEnabled = false
        binding.btnEditAddress.isEnabled = false
        binding.switchAvailability.isEnabled = false
        binding.btnRegisterDonor.isEnabled = false
    }

    private fun showLoading(show: Boolean) {
        binding.progressBar.visibility = if (show) View.VISIBLE else View.GONE

        // Disable buttons during loading
        val buttons = listOf(
            binding.btnEditPersonal,
            binding.btnEditDonor,
            binding.btnEditAddress,
            binding.btnRegisterDonor,
            binding.switchAvailability
        )
        buttons.forEach { it.isEnabled = !show }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    private fun toast(msg: String) {
        Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
    }
}