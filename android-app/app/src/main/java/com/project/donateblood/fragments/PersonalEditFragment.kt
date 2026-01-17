package com.project.donateblood.fragments

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.snackbar.Snackbar
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.project.donateblood.databinding.FragmentPersonalEditBinding
import com.project.donateblood.models.User
import com.project.donateblood.utils.FirebaseUtils
import timber.log.Timber

class PersonalEditFragment : Fragment() {

    private var _binding: FragmentPersonalEditBinding? = null
    private val binding get() = _binding!!

    private lateinit var auth: FirebaseAuth
    private lateinit var firestore: FirebaseFirestore
    private var currentUser: User? = null

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

        setupToolbar()
        setupClickListeners()
        loadCurrentUserData()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            // Navigate back to profile
            findNavController().navigateUp()
        }

        binding.toolbar.title = "Edit Personal Information"
    }

    private fun setupClickListeners() {
        binding.btnSave.setOnClickListener {
            savePersonalInfo()
        }

        binding.btnCancel.setOnClickListener {
            // Navigate back to profile
            findNavController().navigateUp()
        }

        // Clear error on text change
        setupTextChangeListeners()
    }

    private fun setupTextChangeListeners() {
        binding.etName.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus && binding.etName.text.isNullOrEmpty()) {
                binding.etName.error = "Name is required"
            } else {
                binding.etName.error = null
            }
        }

        binding.etPhone.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus && binding.etPhone.text.isNullOrEmpty()) {
                binding.etPhone.error = "Phone number is required"
            } else {
                binding.etPhone.error = null
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

                // Show success message
                showSuccessMessage()

                // Navigate back to profile after a short delay
                binding.root.postDelayed({
                    findNavController().navigateUp()
                }, 1500)
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
            binding.etName.error = "Name is required"
            binding.etName.requestFocus()
            isValid = false
        }

        if (phone.isEmpty()) {
            binding.etPhone.error = "Phone number is required"
            if (isValid) {
                binding.etPhone.requestFocus()
            }
            isValid = false
        }

        if (dateOfBirth.isNotEmpty()) {
            if (!validateDateOfBirth(dateOfBirth)) {
                binding.etDateOfBirth.error = "Date must be in DD/MM/YYYY format"
                if (isValid) {
                    binding.etDateOfBirth.requestFocus()
                }
                isValid = false
            }
        }

        return isValid
    }

    private fun validateDateOfBirth(dateOfBirth: String = binding.etDateOfBirth.text.toString()): Boolean {
        if (dateOfBirth.isEmpty()) {
            return true // Empty is allowed
        }

        // Validate date format (dd/MM/yyyy)
        val dateRegex = Regex("""^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}$""")
        return dateRegex.matches(dateOfBirth)
    }

    private fun showSuccessMessage() {
        binding.progressBar.visibility = View.GONE
        binding.btnSave.isEnabled = true
        binding.btnCancel.isEnabled = true

        // Show success message
        Toast.makeText(
            requireContext(),
            "Personal information updated successfully!",
            Toast.LENGTH_SHORT
        ).show()

        // Also show a snackbar for better visibility
        showSnackbar("Personal information has been updated", Snackbar.LENGTH_LONG)
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