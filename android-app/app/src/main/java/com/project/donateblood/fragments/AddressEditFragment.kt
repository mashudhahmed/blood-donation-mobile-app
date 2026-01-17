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
import com.project.donateblood.databinding.FragmentAddressEditBinding
import com.project.donateblood.models.User
import com.project.donateblood.utils.FirebaseUtils
import timber.log.Timber

class AddressEditFragment : Fragment() {

    private var _binding: FragmentAddressEditBinding? = null
    private val binding get() = _binding!!

    private lateinit var auth: FirebaseAuth
    private lateinit var firestore: FirebaseFirestore
    private var currentUser: User? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAddressEditBinding.inflate(inflater, container, false)
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

        binding.toolbar.title = "Edit Address"
    }

    private fun setupClickListeners() {
        binding.btnSave.setOnClickListener {
            saveAddressInfo()
        }

        binding.btnCancel.setOnClickListener {
            // Navigate back to profile
            findNavController().navigateUp()
        }

        // Clear error on text change
        setupTextChangeListeners()
    }

    private fun setupTextChangeListeners() {
        binding.etDistrict.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus && binding.etDistrict.text.isNullOrEmpty()) {
                binding.etDistrict.error = "District is required"
            } else {
                binding.etDistrict.error = null
            }
        }

        binding.etPoliceStation.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus && binding.etPoliceStation.text.isNullOrEmpty()) {
                binding.etPoliceStation.error = "Police station is required"
            } else {
                binding.etPoliceStation.error = null
            }
        }

        binding.etPostOffice.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus && binding.etPostOffice.text.isNullOrEmpty()) {
                binding.etPostOffice.error = "Post office is required"
            } else {
                binding.etPostOffice.error = null
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
                        binding.etDistrict.setText(it.district)
                        binding.etPoliceStation.setText(it.policeStation)
                        binding.etPostOffice.setText(it.postOffice)
                        binding.etVillage.setText(it.village)
                        binding.etRoad.setText(it.road)
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

    private fun saveAddressInfo() {
        val district = binding.etDistrict.text.toString().trim()
        val policeStation = binding.etPoliceStation.text.toString().trim()
        val postOffice = binding.etPostOffice.text.toString().trim()
        val village = binding.etVillage.text.toString().trim()
        val road = binding.etRoad.text.toString().trim()

        // Validate inputs
        if (!validateInputs(district, policeStation, postOffice)) {
            return
        }

        val userId = auth.currentUser?.uid ?: return

        // Prepare update data
        val updateData = hashMapOf<String, Any>(
            FirebaseUtils.UserFields.DISTRICT to district,
            FirebaseUtils.UserFields.POLICE_STATION to policeStation,
            FirebaseUtils.UserFields.POST_OFFICE to postOffice,
            FirebaseUtils.UserFields.VILLAGE to village,
            FirebaseUtils.UserFields.ROAD to road,
            FirebaseUtils.UserFields.UPDATED_AT to System.currentTimeMillis()
        )

        showLoading(true)

        // Update in Firestore
        firestore.collection(FirebaseUtils.Collections.USERS)
            .document(userId)
            .update(updateData)
            .addOnSuccessListener {
                Timber.d("Address updated successfully for user: $userId")

                // Show success message
                showSuccessMessage()

                // Navigate back to profile after a short delay
                binding.root.postDelayed({
                    findNavController().navigateUp()
                }, 1500)
            }
            .addOnFailureListener { e ->
                showLoading(false)
                showSnackbar("Failed to update address. Please try again.")
                Timber.e(e, "Failed to update address")
            }
    }

    private fun validateInputs(district: String, policeStation: String, postOffice: String): Boolean {
        var isValid = true

        if (district.isEmpty()) {
            binding.etDistrict.error = "District is required"
            binding.etDistrict.requestFocus()
            isValid = false
        }

        if (policeStation.isEmpty()) {
            binding.etPoliceStation.error = "Police station is required"
            if (isValid) {
                binding.etPoliceStation.requestFocus()
            }
            isValid = false
        }

        if (postOffice.isEmpty()) {
            binding.etPostOffice.error = "Post office is required"
            if (isValid) {
                binding.etPostOffice.requestFocus()
            }
            isValid = false
        }

        return isValid
    }

    private fun showSuccessMessage() {
        binding.progressBar.visibility = View.GONE
        binding.btnSave.isEnabled = true
        binding.btnCancel.isEnabled = true

        // Show success message
        Toast.makeText(
            requireContext(),
            "Address updated successfully!",
            Toast.LENGTH_SHORT
        ).show()

        // Also show a snackbar for better visibility
        showSnackbar("Address information has been updated", Snackbar.LENGTH_LONG)
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