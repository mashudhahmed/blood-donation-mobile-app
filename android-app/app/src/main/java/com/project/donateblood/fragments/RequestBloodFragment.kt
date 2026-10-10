package com.project.donateblood.fragments

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import com.google.gson.Gson
import com.project.donateblood.R
import com.project.donateblood.databinding.FragmentRequestBloodBinding
import com.project.donateblood.models.BloodRequest
import com.project.donateblood.network.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.*

class RequestBloodFragment : Fragment() {

    private var _binding: FragmentRequestBloodBinding? = null
    private val binding get() = _binding!!

    private lateinit var auth: FirebaseAuth
    private val firestore: FirebaseFirestore = Firebase.firestore
    private val calendar = Calendar.getInstance()
    private val gson = Gson()

    private val bloodGroups = arrayOf(
        "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"
    )

    private val districts = arrayOf(
        "Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna",
        "Barisal", "Rangpur", "Mymensingh", "Comilla", "Noakhali"
    )

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentRequestBloodBinding.inflate(inflater, container, false)
        auth = FirebaseAuth.getInstance()
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupUI()
        setupToolbar()
        setDefaultDateTime()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }
    }

    private fun setupUI() {
        // Setup blood group dropdown
        binding.actvBloodGroup.setAdapter(
            ArrayAdapter(requireContext(), android.R.layout.simple_dropdown_item_1line, bloodGroups)
        )

        // Setup district dropdown
        binding.actvDistrict.setAdapter(
            ArrayAdapter(requireContext(), android.R.layout.simple_dropdown_item_1line, districts)
        )

        // Date and time pickers
        binding.donationDateEditText.setOnClickListener { showDatePicker() }
        binding.donationTimeEditText.setOnClickListener { showTimePicker() }

        // Submit button
        binding.btnSubmit.setOnClickListener {
            submitBloodRequest()
        }
    }

    private fun setDefaultDateTime() {
        // Set default date to today
        binding.donationDateEditText.setText(
            SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(calendar.time)
        )

        // Set default time to current time + 1 hour
        calendar.add(Calendar.HOUR, 1)
        binding.donationTimeEditText.setText(
            SimpleDateFormat("hh:mm a", Locale.getDefault()).format(calendar.time)
        )
        calendar.add(Calendar.HOUR, -1) // Reset calendar
    }

    private fun showDatePicker() {
        if (!isAdded) return

        val datePicker = DatePickerDialog(
            requireContext(),
            { _, year, month, day ->
                if (!isAdded) return@DatePickerDialog
                calendar.set(year, month, day)
                binding.donationDateEditText.setText(
                    SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(calendar.time)
                )
                binding.textInputLayoutDate.error = null
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH)
        )

        // Set minimum date to today
        datePicker.datePicker.minDate = System.currentTimeMillis() - 1000
        datePicker.show()
    }

    private fun showTimePicker() {
        if (!isAdded) return

        TimePickerDialog(
            requireContext(),
            { _, hour, minute ->
                if (!isAdded) return@TimePickerDialog
                calendar.set(Calendar.HOUR_OF_DAY, hour)
                calendar.set(Calendar.MINUTE, minute)
                binding.donationTimeEditText.setText(
                    SimpleDateFormat("hh:mm a", Locale.getDefault()).format(calendar.time)
                )
                binding.textInputLayoutTime.error = null
            },
            calendar.get(Calendar.HOUR_OF_DAY),
            calendar.get(Calendar.MINUTE),
            false
        ).show()
    }

    private fun submitBloodRequest() {
        if (!validateInputs()) return

        val user = auth.currentUser
        if (user == null) {
            showToast("Please login first")
            return
        }

        setLoading(true)

        // Get units
        val unitsText = binding.unitsEditText.text.toString().trim()
        if (unitsText.isEmpty()) {
            showToast("Please enter number of units")
            setLoading(false)
            return
        }

        val units = try {
            unitsText.toInt()
        } catch (_: NumberFormatException) {
            showToast("Please enter a valid number for units")
            setLoading(false)
            return
        }

        if (units <= 0) {
            showToast("Units must be greater than 0")
            setLoading(false)
            return
        }

        if (units > 10) {
            showToast("Maximum 10 units allowed")
            setLoading(false)
            return
        }

        // Get phone number
        val phone = binding.phoneNumberEditText.text.toString().trim()
        if (!isValidPhoneNumber(phone)) {
            showToast("Please enter a valid 11-digit phone number")
            setLoading(false)
            return
        }

        // Create BloodRequest object
        val bloodRequest = BloodRequest(
            patientName = binding.patientNameEditText.text.toString().trim(),
            hospital = binding.medicalNameEditText.text.toString().trim(),
            phone = phone,
            units = units,
            bloodGroup = binding.actvBloodGroup.text.toString().trim(),
            date = binding.donationDateEditText.text.toString().trim(),
            time = binding.donationTimeEditText.text.toString().trim(),
            district = binding.actvDistrict.text.toString().trim(),
            location = binding.areaEditText.text.toString().trim(),
            requesterId = user.uid,
            urgency = if (units >= 5) "high" else "normal",
            status = "pending",
            createdAt = Timestamp.now(),
            updatedAt = Timestamp.now()
        )

        // Use coroutine for Firebase + Notification
        lifecycleScope.launch {
            try {
                Timber.d("📝 Starting blood request submission...")
                Timber.d("📱 User ID (requesterId): ${user.uid}")
                Timber.d("📱 User logged in: true")

                // 1. Save to Firebase Firestore
                Timber.d("💾 Saving to Firestore directly...")
                val bloodRequestRef = firestore.collection("bloodRequests")
                    .add(bloodRequest)
                    .await()

                val requestId = bloodRequestRef.id
                Timber.d("✅ Blood request saved to Firestore with ID: $requestId")

                // Update the document with ID for reference
                bloodRequestRef.update("id", requestId).await()
                Timber.d("✅ Document ID updated in Firestore")

                // 2. Send notification through backend
                val notificationSuccess = sendNotificationToBackend(bloodRequest, requestId, user.uid)

                // Update notification delivery status in Firestore
                bloodRequestRef.update("notificationStatus", if (notificationSuccess) "sent" else "pending").await()

                // 3. Show user-friendly success message
                requireActivity().runOnUiThread {
                    setLoading(false)

                    val toastMessage = if (notificationSuccess) {
                        "Blood request submitted! Compatible donors are being notified."
                    } else {
                        "Blood request posted successfully. Matching donors will be notified shortly."
                    }

                    Toast.makeText(
                        requireContext(),
                        toastMessage,
                        Toast.LENGTH_LONG
                    ).show()

                    // Navigate back after success
                    findNavController().navigateUp()
                }

            } catch (e: Exception) {
                if (!isAdded || _binding == null) return@launch
                requireActivity().runOnUiThread {
                    setLoading(false)
                }

                val errorMsg = when {
                    e.message?.contains("firestore") == true -> "Failed to save request to database"
                    e.message?.contains("network") == true -> "Network error. Please check connection"
                    else -> "Error: ${e.message?.substringBefore("\n") ?: "Unknown error"}"
                }

                Timber.e("❌ Blood request error: ${e.message}")
                requireActivity().runOnUiThread {
                    Toast.makeText(
                        requireContext(),
                        "❌ $errorMsg",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }

    private suspend fun sendNotificationToBackend(
        bloodRequest: BloodRequest,
        requestId: String,
        requesterId: String
    ): Boolean {
        try {
            Timber.d("🚀 Calling backend API...")
            Timber.d("📤 requesterId to exclude: $requesterId")

            // ✅ Create backend request with medicalName AND requesterId
            val backendRequest = BackendBloodRequest(
                requestId = requestId,
                bloodGroup = bloodRequest.bloodGroup,
                district = bloodRequest.district,
                medicalName = bloodRequest.hospital,
                urgency = bloodRequest.urgency,
                patientName = bloodRequest.patientName,
                contactPhone = bloodRequest.phone,
                units = bloodRequest.units,
                requesterId = requesterId  // ✅ CRITICAL: Pass requesterId to exclude self
            )

            Timber.d("📤 Sending request to backend:")
            Timber.d("   - Medical Name: ${backendRequest.medicalName}")
            Timber.d("   - Blood Group: ${backendRequest.bloodGroup}")
            Timber.d("   - District: ${backendRequest.district}")
            Timber.d("   - Requester ID: ${backendRequest.requesterId}")
            Timber.d("   - Units: ${backendRequest.units}")
            Timber.d("   - Urgency: ${backendRequest.urgency}")

            // ✅ Debug: Log the JSON being sent
            Timber.d("📤 Request JSON: ${gson.toJson(backendRequest)}")

            val response = RetrofitClient.notificationApi.submitBloodRequest(backendRequest)

            Timber.d("🔍 Backend Response:")
            Timber.d("   - Code: ${response.code()}")
            Timber.d("   - Success: ${response.isSuccessful}")
            Timber.d("   - Message: ${response.body()?.message}")

            if (response.isSuccessful) {
                val backendResponse = response.body()
                Timber.d("✅ Backend response received:")
                Timber.d("   - Success: ${backendResponse?.success}")
                Timber.d("   - Message: ${backendResponse?.message}")

                if (backendResponse?.success == true) {
                    val data = backendResponse.data
                    val notified = data?.notifiedDonors ?: 0
                    val eligible = data?.eligibleDonors ?: 0
                    val total = data?.totalCompatibleDonors ?: 0

                    // ✅ KEEP LOGGING FOR DEBUGGING BUT DON'T SHOW TO USER
                    Timber.d("📊 [DEBUG] Matching Stats:")
                    Timber.d("   - Total compatible donors: $total")
                    Timber.d("   - Eligible donors: $eligible")
                    Timber.d("   - Notified donors: $notified")
                    Timber.d("   - Request ID: ${data?.requestId}")
                    Timber.d("   - Failed notifications: ${data?.failedNotifications}")

                    return true
                } else {
                    Timber.e("❌ Backend returned error: ${backendResponse?.message}")
                    return false
                }
            } else {
                val errorBody = response.errorBody()?.string()
                Timber.e("❌ API Error ${response.code()}: $errorBody")
                return false
            }
        } catch (e: Exception) {
            Timber.e("❌ Error calling backend: ${e.message}")
            Timber.e(e,"❌ Stack trace:")
            return false
        }
    }

    @Suppress("RegExpRedundantEscape")
    private fun isValidPhoneNumber(phone: String): Boolean {
        // Validate Bangladeshi phone number format
        return phone.matches(Regex("^01[3-9]\\d{8}$"))
    }

    private fun setLoading(loading: Boolean) {
        if (!isAdded || _binding == null) return
        binding.progressBar.isVisible = loading
        binding.btnSubmit.isEnabled = !loading
        binding.btnSubmit.alpha = if (loading) 0.5f else 1f

        // Disable/enable all input fields
        val fields = listOf(
            binding.patientNameEditText,
            binding.medicalNameEditText,
            binding.phoneNumberEditText,
            binding.unitsEditText,
            binding.actvBloodGroup,
            binding.donationDateEditText,
            binding.donationTimeEditText,
            binding.actvDistrict,
            binding.areaEditText
        )
        fields.forEach { it.isEnabled = !loading }
    }

    private fun validateInputs(): Boolean {
        var valid = true

        fun check(text: String, layout: com.google.android.material.textfield.TextInputLayout) {
            if (text.isBlank()) {
                layout.error = "Required"
                valid = false
            } else {
                layout.error = null
            }
        }

        // Clear all errors first
        listOf(
            binding.textInputLayoutPatientName,
            binding.textInputLayoutMedicalName,
            binding.textInputLayoutPhone,
            binding.textInputLayoutUnits,
            binding.textInputLayoutBloodGroup,
            binding.textInputLayoutDate,
            binding.textInputLayoutTime,
            binding.textInputLayoutDistrict,
            binding.textInputLayoutArea
        ).forEach { it.error = null }

        // Check all required fields
        check(binding.patientNameEditText.text.toString(), binding.textInputLayoutPatientName)
        check(binding.medicalNameEditText.text.toString(), binding.textInputLayoutMedicalName)

        // Phone validation
        val phone = binding.phoneNumberEditText.text.toString().trim()
        if (phone.isBlank()) {
            binding.textInputLayoutPhone.error = "Required"
            valid = false
        } else if (!isValidPhoneNumber(phone)) {
            binding.textInputLayoutPhone.error = "Invalid format (01XXXXXXXXX)"
            valid = false
        } else {
            binding.textInputLayoutPhone.error = null
        }

        // Units validation
        val unitsText = binding.unitsEditText.text.toString().trim()
        if (unitsText.isBlank()) {
            binding.textInputLayoutUnits.error = "Required"
            valid = false
        } else {
            try {
                val units = unitsText.toInt()
                when {
                    units <= 0 -> {
                        binding.textInputLayoutUnits.error = "Must be > 0"
                        valid = false
                    }
                    units > 10 -> {
                        binding.textInputLayoutUnits.error = "Max 10 units"
                        valid = false
                    }
                    else -> {
                        binding.textInputLayoutUnits.error = null
                    }
                }
            } catch (_: NumberFormatException) {
                binding.textInputLayoutUnits.error = "Invalid number"
                valid = false
            }
        }

        // Blood group validation
        val bloodGroup = binding.actvBloodGroup.text.toString().trim()
        if (bloodGroup.isBlank()) {
            binding.textInputLayoutBloodGroup.error = "Required"
            valid = false
        } else if (!bloodGroups.contains(bloodGroup)) {
            binding.textInputLayoutBloodGroup.error = "Invalid blood group"
            valid = false
        } else {
            binding.textInputLayoutBloodGroup.error = null
        }

        // District validation
        val district = binding.actvDistrict.text.toString().trim()
        if (district.isBlank()) {
            binding.textInputLayoutDistrict.error = "Required"
            valid = false
        } else if (!districts.contains(district)) {
            binding.textInputLayoutDistrict.error = "Invalid district"
            valid = false
        } else {
            binding.textInputLayoutDistrict.error = null
        }

        check(binding.donationDateEditText.text.toString(), binding.textInputLayoutDate)
        check(binding.donationTimeEditText.text.toString(), binding.textInputLayoutTime)
        check(binding.areaEditText.text.toString(), binding.textInputLayoutArea)

        return valid
    }

    private fun showToast(message: String) {
        if (!isAdded) return
        activity?.runOnUiThread {
            Toast.makeText(requireContext(), message, Toast.LENGTH_LONG).show()
        }
    }

    companion object {
        // Helper function for testing
        fun getTestBackendRequest(): BackendBloodRequest {
            return BackendBloodRequest(
                requestId = "test_${System.currentTimeMillis()}",
                bloodGroup = "A+",
                district = "Dhaka",
                medicalName = "Test Hospital",
                urgency = "normal",
                patientName = "Test Patient",
                contactPhone = "01712345678",
                units = 1,
                requesterId = "test_requester_123"
            )
        }
    }
}