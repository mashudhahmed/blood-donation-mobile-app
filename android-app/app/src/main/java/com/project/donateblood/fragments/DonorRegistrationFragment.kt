package com.project.donateblood.fragments

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.datepicker.CalendarConstraints
import com.google.android.material.datepicker.DateValidatorPointBackward
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.snackbar.Snackbar
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessaging
import com.project.donateblood.BuildConfig
import com.project.donateblood.R
import com.project.donateblood.databinding.FragmentDonorRegistrationBinding
import com.project.donateblood.models.Donor
import com.project.donateblood.network.FcmTokenSyncManager
import com.project.donateblood.utils.DistrictPickerHelper
import com.project.donateblood.utils.FirebaseUtils
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

@Suppress("DEPRECATION")
class DonorRegistrationFragment : Fragment() {

    private var _binding: FragmentDonorRegistrationBinding? = null
    private val binding get() = _binding!!

    private lateinit var auth: FirebaseAuth
    private lateinit var firestore: FirebaseFirestore
    private var isEditMode: Boolean = false

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
            isEditMode = arguments?.getBoolean("isEditMode", false) ?: false

            setupToolbar()
            setupPickers()
            loadUserData()
            setupClickListeners()

            Timber.tag("DonorRegistration").d("Setup completed successfully. EditMode=$isEditMode")
        } catch (e: Exception) {
            Timber.tag("DonorRegistration").e(e, "Error in setup: ${e.message}")
            Snackbar.make(view, "Setup error: ${e.message}", Snackbar.LENGTH_LONG).show()
        }
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }

        if (isEditMode) {
            binding.toolbar.title = "Edit Donor Info"
            binding.toolbar.subtitle = "Update your blood donation & location details"
            binding.tvSectionTitle.text = "Update Donor Profile"
            binding.tvSectionSubtitle.text = "Keep your donation status and address up to date"
            binding.btnRegister.text = "Update Donor Info"
        } else {
            binding.toolbar.title = "Donor Registration"
            binding.toolbar.subtitle = "Join as an active blood donor"
            binding.tvSectionTitle.text = "Donor Information"
            binding.tvSectionSubtitle.text = "Help save lives by keeping your info accurate"
            binding.btnRegister.text = "Register as Donor"
        }
    }

    private fun setupPickers() {
        // Blood Group Chooser
        val openBloodGroupPicker = {
            DistrictPickerHelper.showBloodGroupPicker(
                requireContext(),
                binding.spinnerBloodGroup.text?.toString() ?: ""
            ) { selected ->
                binding.spinnerBloodGroup.setText(selected, false)
                binding.tilBloodGroup.error = null
            }
        }
        binding.spinnerBloodGroup.setOnClickListener { openBloodGroupPicker() }
        binding.tilBloodGroup.setOnClickListener { openBloodGroupPicker() }
        binding.tilBloodGroup.setEndIconOnClickListener { openBloodGroupPicker() }

        // Date of last donation picker
        val openDatePicker = { showDatePicker() }
        binding.etLastDonation.setOnClickListener { openDatePicker() }
        binding.tilLastDonation.setOnClickListener { openDatePicker() }
        binding.tilLastDonation.setEndIconOnClickListener { openDatePicker() }

        // District Searchable Modal Picker
        val openDistrictPicker = {
            DistrictPickerHelper.showDistrictPicker(
                requireContext(),
                layoutInflater,
                binding.etDistrict.text?.toString() ?: ""
            ) { selectedDistrict ->
                binding.etDistrict.setText(selectedDistrict)
                binding.tilDistrict.error = null
            }
        }
        binding.etDistrict.setOnClickListener { openDistrictPicker() }
        binding.tilDistrict.setOnClickListener { openDistrictPicker() }
        binding.tilDistrict.setEndIconOnClickListener { openDistrictPicker() }
    }

    private fun showDatePicker() {
        if (!isAdded) return

        val constraints = CalendarConstraints.Builder()
            .setValidator(DateValidatorPointBackward.now())
            .build()

        val builder = MaterialDatePicker.Builder.datePicker()
            .setTitleText("Select Last Donation Date")
            .setTheme(R.style.ThemeOverlay_BloodLink_MaterialCalendar)
            .setCalendarConstraints(constraints)

        val currentText = binding.etLastDonation.text?.toString()?.trim()
        if (!currentText.isNullOrEmpty()) {
            try {
                val format = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }
                format.parse(currentText)?.let {
                    builder.setSelection(it.time)
                }
            } catch (_: Exception) {}
        }

        val datePicker = builder.build()
        datePicker.addOnPositiveButtonClickListener { selectionMillis ->
            val calendar = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
                timeInMillis = selectionMillis
            }
            val format = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            binding.etLastDonation.setText(format.format(calendar.time))
            binding.tilLastDonation.error = null
        }
        datePicker.show(childFragmentManager, "DONATION_DATE_PICKER")
    }

    private fun loadUserData() {
        val currentUser = auth.currentUser ?: return

        // 1. Load from users collection
        firestore.collection(FirebaseUtils.Collections.USERS)
            .document(currentUser.uid)
            .get()
            .addOnSuccessListener { document ->
                if (document.exists()) {
                    document.getString(FirebaseUtils.UserFields.BLOOD_GROUP)?.let {
                        if (it.isNotEmpty()) binding.spinnerBloodGroup.setText(it, false)
                    }
                    document.getString(FirebaseUtils.UserFields.DISTRICT)?.let {
                        if (it.isNotEmpty()) binding.etDistrict.setText(it)
                    }
                    val loc = document.getString(FirebaseUtils.UserFields.LOCATION)
                        ?: document.getString(FirebaseUtils.UserFields.POLICE_STATION)
                    if (!loc.isNullOrEmpty()) {
                        binding.etLocation.setText(loc)
                    }
                }
            }

        // 2. Also load from donors collection (critical for lastDonation date)
        firestore.collection(FirebaseUtils.Collections.DONORS)
            .document(currentUser.uid)
            .get()
            .addOnSuccessListener { donorDoc ->
                if (donorDoc.exists()) {
                    donorDoc.getString("lastDonation")?.let { date ->
                        if (date.isNotEmpty()) binding.etLastDonation.setText(date)
                    }
                    donorDoc.getString("bloodGroup")?.let { bg ->
                        if (bg.isNotEmpty()) binding.spinnerBloodGroup.setText(bg, false)
                    }
                    donorDoc.getString("district")?.let { dist ->
                        if (dist.isNotEmpty()) binding.etDistrict.setText(dist)
                    }
                    donorDoc.getString("location")?.let { loc ->
                        if (loc.isNotEmpty()) binding.etLocation.setText(loc)
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
            .d("Registering with: BloodGroup=$bloodGroup, Location=$location, District=$district, EditMode=$isEditMode")

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

                        updatedAt = System.currentTimeMillis(),
                        createdAt = if (isEditMode) (document.getLong("createdAt") ?: System.currentTimeMillis()) else System.currentTimeMillis(),
                        lastActive = System.currentTimeMillis(),
                        lastDonationDate = parseDateToLong(lastDonation),

                        isAvailable = true,
                        isActive = true,
                        canDonate = true,
                        hasFcmToken = true,
                        notificationEnabled = true,
                        isLoggedIn = true,

                        fcmToken = fcmToken,
                        deviceId = deviceId,
                        compoundTokenId = compoundTokenId,
                        deviceType = "android",
                        appVersion = BuildConfig.VERSION_NAME,
                        userType = "donor",

                        daysSinceLastDonation = 0
                    )

                    // Save to Firestore
                    saveDonorToFirestore(currentUser.uid, donor, bloodGroup, district, location)

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

            updatedAt = System.currentTimeMillis(),
            createdAt = System.currentTimeMillis(),
            lastActive = System.currentTimeMillis(),
            lastDonationDate = parseDateToLong(lastDonation),

            isAvailable = true,
            isActive = true,
            canDonate = true,
            hasFcmToken = true,
            notificationEnabled = true,
            isLoggedIn = true,

            fcmToken = fcmToken,
            deviceId = deviceId,
            compoundTokenId = compoundTokenId,
            deviceType = "android",
            appVersion = BuildConfig.VERSION_NAME,
            userType = "donor",

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
                val updates = mapOf<String, Any>(
                    FirebaseUtils.UserFields.BLOOD_GROUP to bloodGroup,
                    FirebaseUtils.UserFields.DISTRICT to district,
                    FirebaseUtils.UserFields.LOCATION to location,
                    FirebaseUtils.UserFields.IS_AVAILABLE to true,
                    FirebaseUtils.UserFields.USER_TYPE to "donor"
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
        val message = if (isEditMode) {
            "Donor information updated successfully!"
        } else {
            "Successfully registered as donor!"
        }

        Snackbar.make(binding.root, message, Snackbar.LENGTH_LONG)
            .setBackgroundTint(requireContext().getColor(R.color.success_green))
            .setAction("OK") {
                findNavController().navigateUp()
            }
            .show()

        // Also navigate back automatically after delay
        binding.root.postDelayed({
            if (isAdded) {
                findNavController().navigateUp()
            }
        }, 1200)
    }

    private fun handleError(e: Exception) {
        Timber.tag("DonorRegistration").e(e, "Error saving donor: ${e.message}")
        binding.progressBar.visibility = View.GONE
        binding.btnRegister.isEnabled = true
        binding.btnCancel.isEnabled = true
        val errorMsg = if (isEditMode) "Update failed: ${e.message}" else "Registration failed: ${e.message}"
        Snackbar.make(binding.root, errorMsg, Snackbar.LENGTH_LONG)
            .setBackgroundTint(requireContext().getColor(R.color.primary_red_dark))
            .show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}