package com.project.donateblood.fragments

import android.annotation.SuppressLint
import android.app.DatePickerDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.snackbar.Snackbar
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessaging
import com.project.donateblood.BuildConfig
import com.project.donateblood.R
import com.project.donateblood.databinding.FragmentDonorRegistrationBinding
import com.project.donateblood.models.Donor
import com.project.donateblood.network.FcmTokenSyncManager
import com.project.donateblood.utils.FirebaseUtils
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.*

@Suppress("DEPRECATION")
class DonorRegistrationFragment : Fragment() {

    private var _binding: FragmentDonorRegistrationBinding? = null
    private val binding get() = _binding!!

    private lateinit var auth: FirebaseAuth
    private lateinit var firestore: FirebaseFirestore

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentDonorRegistrationBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.tag("DonorRegistration").d("Fragment onViewCreated called")

        try {
            auth = FirebaseAuth.getInstance()
            firestore = FirebaseFirestore.getInstance()

            setupToolbar()
            setupBloodGroupAutoComplete()
            setupDatePicker()
            loadUserData()
            setupClickListeners()

            Timber.tag("DonorRegistration").d("Setup completed successfully")
        } catch (e: Exception) {
            Timber.tag("DonorRegistration").e(e, "Error in setup: ${e.message}")
            Snackbar.make(view, "Setup error: ${e.message}", Snackbar.LENGTH_LONG).show()
        }
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }
        binding.toolbar.title = "Donor Registration"
    }

    private fun setupBloodGroupAutoComplete() {
        try {
            val bloodGroups = arrayOf(
                "Select Blood Group", "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"
            )

            val adapter = ArrayAdapter(
                requireContext(),
                android.R.layout.simple_dropdown_item_1line,
                bloodGroups
            )

            binding.spinnerBloodGroup.setAdapter(adapter)
            binding.spinnerBloodGroup.threshold = 1

            Timber.tag("DonorRegistration").d("Blood group adapter setup complete")
        } catch (e: Exception) {
            Timber.tag("DonorRegistration").e(e, "Error setting up blood group: ${e.message}")
        }
    }

    private fun setupDatePicker() {
        binding.etLastDonation.setOnClickListener {
            showDatePicker()
        }
    }

    private fun showDatePicker() {
        val calendar = Calendar.getInstance()
        DatePickerDialog(
            requireContext(),
            { _, year, month, day ->
                calendar.set(year, month, day)
                val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
                binding.etLastDonation.setText(dateFormat.format(calendar.time))
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH)
        ).show()
    }

    private fun loadUserData() {
        val currentUser = auth.currentUser ?: return

        firestore.collection(FirebaseUtils.Collections.USERS)
            .document(currentUser.uid)
            .get()
            .addOnSuccessListener { document ->
                if (document.exists()) {
                    document.getString(FirebaseUtils.UserFields.BLOOD_GROUP)?.let {
                        setBloodGroupSelection(it)
                    }
                    document.getString(FirebaseUtils.UserFields.DISTRICT)?.let {
                        binding.etDistrict.setText(it)
                    }
                    document.getString(FirebaseUtils.UserFields.LOCATION)?.let {
                        binding.etLocation.setText(it)
                    }
                }
            }
    }

    private fun setBloodGroupSelection(bloodGroup: String) {
        val adapter = binding.spinnerBloodGroup.adapter as? ArrayAdapter<*>
        adapter?.let {
            for (i in 0 until it.count) {
                if ((it.getItem(i) as? String) == bloodGroup) {
                    binding.spinnerBloodGroup.setText(bloodGroup, false)
                    break
                }
            }
        }
    }

    private fun setupClickListeners() {
        binding.btnCancel.setOnClickListener {
            findNavController().navigateUp()
        }

        binding.btnRegister.setOnClickListener {
            registerAsDonor()
        }
    }

    @SuppressLint("HardwareIds")
    private fun getDeviceId(): String {
        return try {
            android.provider.Settings.Secure.getString(
                requireContext().contentResolver,
                android.provider.Settings.Secure.ANDROID_ID
            ) ?: (android.os.Build.DEVICE + "_" + android.os.Build.SERIAL)
        } catch (_: Exception) {
            android.os.Build.DEVICE + "_" + android.os.Build.SERIAL
        }
    }

    private fun registerAsDonor() {
        val bloodGroup = binding.spinnerBloodGroup.text.toString().trim()
        val lastDonation = binding.etLastDonation.text.toString().trim()
        val location = binding.etLocation.text.toString().trim()
        val district = binding.etDistrict.text.toString().trim()

        Timber.tag("DonorRegistration")
            .d("Registering with: BloodGroup=$bloodGroup, Location=$location, District=$district")

        // Validation
        if (bloodGroup == "Select Blood Group" || bloodGroup.isEmpty()) {
            binding.tilBloodGroup.error = "Please select blood group"
            binding.spinnerBloodGroup.requestFocus()
            return
        }
        binding.tilBloodGroup.error = null

        if (location.isEmpty()) {
            binding.tilLocation.error = "Please enter location"
            binding.etLocation.requestFocus()
            return
        }
        binding.tilLocation.error = null

        if (district.isEmpty()) {
            binding.tilDistrict.error = "Please enter district"
            binding.etDistrict.requestFocus()
            return
        }
        binding.tilDistrict.error = null

        val currentUser = auth.currentUser
        if (currentUser == null) {
            Snackbar.make(binding.root, "Please login first", Snackbar.LENGTH_LONG).show()
            return
        }

        binding.progressBar.visibility = View.VISIBLE
        binding.btnRegister.isEnabled = false
        binding.btnCancel.isEnabled = false

        // Get FCM token for notifications
        FirebaseMessaging.getInstance().token.addOnCompleteListener { tokenTask ->
            val fcmToken = if (tokenTask.isSuccessful) tokenTask.result else ""
            val deviceId = getDeviceId()
            val compoundTokenId = "${currentUser.uid}_$deviceId"

            // Get user info
            firestore.collection(FirebaseUtils.Collections.USERS)
                .document(currentUser.uid)
                .get()
                .addOnSuccessListener { document ->
                    val userName = document.getString(FirebaseUtils.UserFields.NAME)
                        ?: currentUser.displayName ?: "Unknown"
                    val userPhone = document.getString(FirebaseUtils.UserFields.PHONE) ?: ""
                    val profileImage = document.getString(FirebaseUtils.UserFields.PROFILE_IMAGE) ?: ""

                    // ✅ CREATE DONOR WITH ALL REQUIRED FIELDS
                    val donor = Donor(
                        id = currentUser.uid,
                        userId = currentUser.uid,
                        name = userName,
                        bloodGroup = bloodGroup,
                        location = location,
                        district = district,
                        phone = userPhone,
                        email = currentUser.email ?: "",
                        lastDonation = lastDonation.ifEmpty { "" },
                        imageUrl = profileImage,

                        // ✅ TIMESTAMPS
                        updatedAt = System.currentTimeMillis(),
                        createdAt = System.currentTimeMillis(),
                        lastActive = System.currentTimeMillis(),
                        lastDonationDate = parseDateToLong(lastDonation),

                        // ✅ STATUS FIELDS
                        isAvailable = true,
                        isActive = true,
                        canDonate = true,
                        hasFcmToken = true,
                        notificationEnabled = true,
                        isLoggedIn = true, // ✅ CRITICAL: Set to true on registration

                        // ✅ FCM TOKEN & DEVICE MANAGEMENT
                        fcmToken = fcmToken,
                        deviceId = deviceId,
                        compoundTokenId = compoundTokenId,
                        deviceType = "android",
                        appVersion = BuildConfig.VERSION_NAME,
                        userType = "donor",

                        // Optional
                        daysSinceLastDonation = 0
                    )

                    // Save to Firestore
                    saveDonorToFirestore(currentUser.uid, donor, bloodGroup, district, location)

                    // ✅ SYNC TOKEN WITH BACKEND
                    if (fcmToken.isNotEmpty()) {
                        FcmTokenSyncManager.syncTokenWithBackend(
                            token = fcmToken,
                            context = requireContext(),
                            targetUserId = currentUser.uid,
                            isLoggedIn = true
                        )
                    }
                }
                .addOnFailureListener {
                    // Create with basic info if user doc doesn't exist
                    val donor = createBasicDonor(
                        currentUser = currentUser,
                        bloodGroup = bloodGroup,
                        location = location,
                        district = district,
                        fcmToken = fcmToken,
                        lastDonation = lastDonation,
                        deviceId = deviceId,
                        compoundTokenId = compoundTokenId
                    )
                    saveDonorToFirestore(currentUser.uid, donor, bloodGroup, district, location)

                    // ✅ SYNC TOKEN WITH BACKEND
                    if (fcmToken.isNotEmpty()) {
                        FcmTokenSyncManager.syncTokenWithBackend(
                            token = fcmToken,
                            context = requireContext(),
                            targetUserId = currentUser.uid,
                            isLoggedIn = true
                        )
                    }
                }
        }
    }

    private fun parseDateToLong(dateString: String): Long {
        return if (dateString.isNotEmpty()) {
            try {
                val date = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).parse(dateString)
                date?.time ?: 0L
            } catch (_: Exception) {
                0L
            }
        } else {
            0L
        }
    }

    private fun createBasicDonor(
        currentUser: com.google.firebase.auth.FirebaseUser,
        bloodGroup: String,
        location: String,
        district: String,
        fcmToken: String,
        lastDonation: String,
        deviceId: String,
        compoundTokenId: String
    ): Donor {
        return Donor(
            id = currentUser.uid,
            userId = currentUser.uid,
            name = currentUser.displayName ?: "Unknown",
            bloodGroup = bloodGroup,
            location = location,
            district = district,
            phone = "",
            email = currentUser.email ?: "",
            lastDonation = lastDonation.ifEmpty { "" },
            imageUrl = "",

            // ✅ TIMESTAMPS
            updatedAt = System.currentTimeMillis(),
            createdAt = System.currentTimeMillis(),
            lastActive = System.currentTimeMillis(),
            lastDonationDate = parseDateToLong(lastDonation),

            // ✅ STATUS FIELDS
            isAvailable = true,
            isActive = true,
            canDonate = true,
            hasFcmToken = true,
            notificationEnabled = true,
            isLoggedIn = true, // ✅ CRITICAL

            // ✅ FCM TOKEN & DEVICE MANAGEMENT
            fcmToken = fcmToken,
            deviceId = deviceId,
            compoundTokenId = compoundTokenId,
            deviceType = "android",
            appVersion = BuildConfig.VERSION_NAME,
            userType = "donor",

            // Optional
            daysSinceLastDonation = 0
        )
    }

    private fun saveDonorToFirestore(
        userId: String,
        donor: Donor,
        bloodGroup: String,
        district: String,
        location: String
    ) {
        firestore.collection(FirebaseUtils.Collections.DONORS)
            .document(userId)
            .set(donor)
            .addOnSuccessListener {
                // Update user document with donor information
                val updates = mapOf<String, Any>(
                    FirebaseUtils.UserFields.BLOOD_GROUP to bloodGroup,
                    FirebaseUtils.UserFields.DISTRICT to district,
                    FirebaseUtils.UserFields.LOCATION to location,
                    FirebaseUtils.UserFields.IS_AVAILABLE to true
                )

                firestore.collection(FirebaseUtils.Collections.USERS)
                    .document(userId)
                    .update(updates)
                    .addOnSuccessListener {
                        binding.progressBar.visibility = View.GONE
                        showSuccessMessage()
                    }
                    .addOnFailureListener { e ->
                        handleError(e)
                    }
            }
            .addOnFailureListener { e ->
                handleError(e)
            }
    }

    private fun showSuccessMessage() {
        Snackbar.make(binding.root, "Successfully registered as donor!", Snackbar.LENGTH_LONG)
            .setBackgroundTint(requireContext().getColor(R.color.success_green))
            .setAction("OK") {
                // Go back to profile
                findNavController().navigateUp()
            }
            .show()
    }

    private fun handleError(e: Exception) {
        Timber.tag("DonorRegistration").e(e, "Error saving donor: ${e.message}")
        binding.progressBar.visibility = View.GONE
        binding.btnRegister.isEnabled = true
        binding.btnCancel.isEnabled = true
        Snackbar.make(binding.root, "Registration failed: ${e.message}", Snackbar.LENGTH_LONG)
            .setBackgroundTint(requireContext().getColor(R.color.primary_red_dark))
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}