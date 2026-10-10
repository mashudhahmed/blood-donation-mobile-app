package com.project.donateblood.fragments

import android.annotation.SuppressLint
import android.app.Activity
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.github.dhaval2404.imagepicker.ImagePicker
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.snackbar.Snackbar
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.project.donateblood.R
import com.project.donateblood.databinding.FragmentPersonalEditBinding
import com.project.donateblood.models.User
import com.project.donateblood.utils.DistrictPickerHelper
import com.project.donateblood.utils.FirebaseUtils
import com.project.donateblood.utils.ProfileImageManager
import androidx.lifecycle.ViewModelProvider
import com.project.donateblood.viewmodels.UserViewModel
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

class PersonalEditFragment : Fragment() {

    private var _binding: FragmentPersonalEditBinding? = null
    private val binding get() = _binding!!

    private lateinit var auth: FirebaseAuth
    private lateinit var firestore: FirebaseFirestore
    private lateinit var userViewModel: UserViewModel
    private var currentUser: User? = null

    private val imagePickerLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val resultCode = result.resultCode
        val data = result.data

        if (resultCode == Activity.RESULT_OK) {
            val fileUri: Uri? = data?.data
            if (fileUri != null) {
                uploadProfileImage(fileUri)
            }
        } else if (resultCode == ImagePicker.RESULT_ERROR) {
            showSnackbar(ImagePicker.getError(data))
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentPersonalEditBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        auth = FirebaseAuth.getInstance()
        firestore = FirebaseFirestore.getInstance()
        userViewModel = ViewModelProvider(requireActivity())[UserViewModel::class.java]

        userViewModel.userProfileImage.observe(viewLifecycleOwner) { imageUrl ->
            if (!imageUrl.isNullOrBlank()) {
                ProfileImageManager.loadAvatar(binding.ivProfile, imageUrl)
                currentUser?.let {
                    currentUser = it.copy(profileImage = imageUrl)
                }
            }
        }

        setupToolbar()
        setupClickListeners()
        loadCurrentUserData()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }
        binding.toolbar.title = "Edit Personal Information"
        binding.toolbar.subtitle = "Update your name, contact & personal info"
    }

    private fun setupClickListeners() {
        binding.ivProfile.setOnClickListener {
            showAvatarOptions()
        }

        binding.btnEditAvatar.setOnClickListener {
            showAvatarOptions()
        }

        binding.btnSave.setOnClickListener {
            savePersonalInfo()
        }

        binding.btnCancel.setOnClickListener {
            findNavController().navigateUp()
        }

        // Date of birth picker
        val openDatePicker = { showDatePicker() }
        binding.etDateOfBirth.setOnClickListener { openDatePicker() }
        binding.inputLayoutDateOfBirth.setOnClickListener { openDatePicker() }
        binding.inputLayoutDateOfBirth.setEndIconOnClickListener { openDatePicker() }

        // Blood group chooser
        val openBloodGroupPicker = { showBloodGroupPicker() }
        binding.etBloodGroup.setOnClickListener { openBloodGroupPicker() }
        binding.inputLayoutBloodGroup.setOnClickListener { openBloodGroupPicker() }
        binding.inputLayoutBloodGroup.setEndIconOnClickListener { openBloodGroupPicker() }

        // Clear error on text change
        setupTextChangeListeners()
    }

    private fun showAvatarOptions() {
        val hasExistingPhoto = !currentUser?.profileImage.isNullOrBlank()
        ProfileImageManager.showAvatarOptionsDialog(
            context = requireContext(),
            hasExistingPhoto = hasExistingPhoto,
            onTakePhoto = {
                ProfileImageManager.launchCamera(this, imagePickerLauncher)
            },
            onChooseGallery = {
                ProfileImageManager.launchGallery(this, imagePickerLauncher)
            },
            onRemovePhoto = {
                removeProfileImage()
            }
        )
    }

    private fun uploadProfileImage(uri: Uri) {
        val uid = auth.currentUser?.uid ?: return
        binding.layoutAvatarProgress.visibility = View.VISIBLE
        binding.btnEditAvatar.isEnabled = false

        ProfileImageManager.uploadProfileImage(
            userId = uid,
            imageUri = uri,
            onProgress = { _ -> },
            onSuccess = { downloadUrl ->
                if (!isAdded) return@uploadProfileImage
                binding.layoutAvatarProgress.visibility = View.GONE
                binding.btnEditAvatar.isEnabled = true
                ProfileImageManager.loadAvatar(binding.ivProfile, downloadUrl)
                currentUser?.let {
                    currentUser = it.copy(profileImage = downloadUrl)
                }
                userViewModel.updateProfileImage(downloadUrl)
                showSnackbar("Profile photo updated successfully!")
            },
            onFailure = { e ->
                if (!isAdded) return@uploadProfileImage
                binding.layoutAvatarProgress.visibility = View.GONE
                binding.btnEditAvatar.isEnabled = true
                showSnackbar("Failed to upload photo: ${e.message}")
            }
        )
    }

    private fun removeProfileImage() {
        val uid = auth.currentUser?.uid ?: return
        binding.layoutAvatarProgress.visibility = View.VISIBLE
        binding.btnEditAvatar.isEnabled = false

        ProfileImageManager.removeProfileImage(
            userId = uid,
            onSuccess = {
                if (!isAdded) return@removeProfileImage
                binding.layoutAvatarProgress.visibility = View.GONE
                binding.btnEditAvatar.isEnabled = true
                binding.ivProfile.setImageResource(R.drawable.ic_user_placeholder)
                currentUser?.let {
                    currentUser = it.copy(profileImage = "")
                }
                userViewModel.updateProfileImage("")
                showSnackbar("Profile photo removed")
            },
            onFailure = { e ->
                if (!isAdded) return@removeProfileImage
                binding.layoutAvatarProgress.visibility = View.GONE
                binding.btnEditAvatar.isEnabled = true
                showSnackbar("Failed to remove photo: ${e.message}")
            }
        )
    }

    private fun showDatePicker() {
        if (!isAdded) return

        val builder = MaterialDatePicker.Builder.datePicker()
            .setTitleText("Select Date of Birth")
            .setTheme(R.style.ThemeOverlay_BloodLink_MaterialCalendar)

        // Preselect current date if valid
        val currentText = binding.etDateOfBirth.text?.toString()?.trim()
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
            binding.etDateOfBirth.setText(format.format(calendar.time))
            binding.inputLayoutDateOfBirth.error = null
        }
        datePicker.show(childFragmentManager, "DOB_PICKER")
    }

    private fun showBloodGroupPicker() {
        if (!isAdded) return
        DistrictPickerHelper.showBloodGroupPicker(
            requireContext(),
            binding.etBloodGroup.text?.toString() ?: ""
        ) { selectedGroup ->
            binding.etBloodGroup.setText(selectedGroup)
            binding.inputLayoutBloodGroup.error = null
        }
    }

    private fun setupTextChangeListeners() {
        binding.etName.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus && binding.etName.text.isNullOrEmpty()) {
                binding.inputLayoutName.error = "Name is required"
            } else {
                binding.inputLayoutName.error = null
            }
        }

        binding.etPhone.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus && binding.etPhone.text.isNullOrEmpty()) {
                binding.inputLayoutPhone.error = "Phone number is required"
            } else {
                binding.inputLayoutPhone.error = null
            }
        }

        binding.etDateOfBirth.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                validateDateOfBirth()
            }
        }
    }

    private fun loadCurrentUserData() {
        val userId = auth.currentUser?.uid ?: return

        showLoading(true)

        firestore.collection(FirebaseUtils.Collections.USERS)
            .document(userId)
            .get()
            .addOnSuccessListener { document ->
                if (document.exists()) {
                    val data = document.data
                    currentUser = User(
                        uid = userId,
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
                        isAvailable = data?.get(FirebaseUtils.UserFields.IS_AVAILABLE) as? Boolean ?: true,
                        userType = data?.get(FirebaseUtils.UserFields.USER_TYPE) as? String ?: "user"
                    )

                    // Populate fields
                    currentUser?.let {
                        ProfileImageManager.loadAvatar(binding.ivProfile, it.profileImage)
                        binding.etName.setText(it.name)
                        binding.etPhone.setText(it.phone)
                        binding.etDateOfBirth.setText(it.dateOfBirth)
                        binding.etBloodGroup.setText(it.bloodGroup)
                        binding.etEmail.setText(it.email)
                    }
                } else {
                    showSnackbar("User profile not found. Please try again.")
                    Timber.e("User document does not exist for userId: $userId")
                }
                showLoading(false)
            }
            .addOnFailureListener { e ->
                showLoading(false)
                showSnackbar("Failed to load user data. Please check your connection.")
                Timber.e(e, "Failed to load user data")
            }
    }

    private fun savePersonalInfo() {
        val name = binding.etName.text.toString().trim()
        val phone = binding.etPhone.text.toString().trim()
        val dateOfBirth = binding.etDateOfBirth.text.toString().trim()
        val bloodGroup = binding.etBloodGroup.text.toString().trim()
        val email = binding.etEmail.text.toString().trim()

        // Validate inputs
        if (!validateInputs(name, phone, dateOfBirth)) {
            return
        }

        val userId = auth.currentUser?.uid ?: return

        // Prepare update data
        val updateData = hashMapOf<String, Any>(
            FirebaseUtils.UserFields.NAME to name,
            FirebaseUtils.UserFields.PHONE to phone,
            FirebaseUtils.UserFields.DATE_OF_BIRTH to dateOfBirth,
            FirebaseUtils.UserFields.BLOOD_GROUP to bloodGroup,
            FirebaseUtils.UserFields.EMAIL to email,
            FirebaseUtils.UserFields.UPDATED_AT to System.currentTimeMillis()
        )

        showLoading(true)

        // Update in Firestore
        firestore.collection(FirebaseUtils.Collections.USERS)
            .document(userId)
            .update(updateData)
            .addOnSuccessListener {
                Timber.d("Personal info updated successfully for user: $userId")

                // Also update donors collection if user is a donor
                firestore.collection(FirebaseUtils.Collections.DONORS)
                    .document(userId)
                    .update(
                        mapOf(
                            "name" to name,
                            "phone" to phone,
                            "bloodGroup" to bloodGroup,
                            "updatedAt" to System.currentTimeMillis()
                        )
                    )
                    .addOnFailureListener {
                        // User might not be a registered donor yet, non-fatal
                        Timber.d("Not updating donor doc: ${it.message}")
                    }

                // Show success message
                showSuccessMessage()

                // Navigate back to profile after a short delay
                binding.root.postDelayed({
                    findNavController().navigateUp()
                }, 1200)
            }
            .addOnFailureListener { e ->
                showLoading(false)
                showSnackbar("Failed to update personal information. Please try again.")
                Timber.e(e, "Failed to update personal information")
            }
    }

    private fun validateInputs(name: String, phone: String, dateOfBirth: String): Boolean {
        var isValid = true

        if (name.isEmpty()) {
            binding.inputLayoutName.error = "Name is required"
            binding.etName.requestFocus()
            isValid = false
        } else {
            binding.inputLayoutName.error = null
        }

        if (phone.isEmpty()) {
            binding.inputLayoutPhone.error = "Phone number is required"
            if (isValid) {
                binding.etPhone.requestFocus()
            }
            isValid = false
        } else {
            binding.inputLayoutPhone.error = null
        }

        if (dateOfBirth.isNotEmpty()) {
            if (!validateDateOfBirth(dateOfBirth)) {
                binding.inputLayoutDateOfBirth.error = "Date must be in DD/MM/YYYY format"
                if (isValid) {
                    binding.etDateOfBirth.requestFocus()
                }
                isValid = false
            } else {
                binding.inputLayoutDateOfBirth.error = null
            }
        }

        return isValid
    }

    private fun validateDateOfBirth(dateOfBirth: String = binding.etDateOfBirth.text.toString()): Boolean {
        if (dateOfBirth.isEmpty()) {
            return true // Empty is allowed
        }

        val dateRegex = Regex("""^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}$""")
        return dateRegex.matches(dateOfBirth)
    }

    private fun showSuccessMessage() {
        binding.progressBar.visibility = View.GONE
        binding.btnSave.isEnabled = true
        binding.btnCancel.isEnabled = true

        Toast.makeText(
            requireContext(),
            "Personal information updated successfully!",
            Toast.LENGTH_SHORT
        ).show()

        showSnackbar("Personal information has been updated", Snackbar.LENGTH_SHORT)
    }

    private fun showSnackbar(message: String, duration: Int = Snackbar.LENGTH_SHORT) {
        view?.let {
            Snackbar.make(it, message, duration).show()
        }
    }

    @SuppressLint("SetTextI18n")
    private fun showLoading(show: Boolean) {
        if (show) {
            binding.progressBar.visibility = View.VISIBLE
            binding.btnSave.isEnabled = false
            binding.btnCancel.isEnabled = false
            binding.btnSave.text = "Saving..."
        } else {
            binding.progressBar.visibility = View.GONE
            binding.btnSave.isEnabled = true
            binding.btnCancel.isEnabled = true
            binding.btnSave.text = "Save Changes"
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}