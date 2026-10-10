package com.project.donateblood.fragments

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.datepicker.CalendarConstraints
import com.google.android.material.datepicker.DateValidatorPointForward
import com.google.android.material.datepicker.MaterialDatePicker
import com.google.android.material.timepicker.MaterialTimePicker
import com.google.android.material.timepicker.TimeFormat
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import com.google.gson.Gson
import com.project.donateblood.R
import com.project.donateblood.databinding.BottomSheetDistrictPickerBinding
import com.project.donateblood.databinding.FragmentRequestBloodBinding
import com.project.donateblood.databinding.ItemDistrictPickerBinding
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
        "Bagerhat", "Bandarban", "Barguna", "Barisal", "Bhola", "Bogra",
        "Brahmanbaria", "Chandpur", "Chapai Nawabganj", "Chattogram",
        "Chuadanga", "Comilla", "Cox's Bazar", "Cumilla", "Dhaka", "Dinajpur",
        "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj",
        "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah",
        "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram",
        "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur", "Magura",
        "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", "Mymensingh",
        "Naogaon", "Narail", "Narayanganj", "Narsingdi", "Natore",
        "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh",
        "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati",
        "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj",
        "Sunamganj", "Sylhet", "Tangail", "Thakurgaon"
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
        binding.scrollView.post {
            binding.scrollView.scrollTo(0, 0)
        }
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
        // Setup blood group dropdown with custom styled item layout
        binding.actvBloodGroup.setAdapter(
            ArrayAdapter(requireContext(), R.layout.item_dropdown_menu, bloodGroups)
        )

        // Setup searchable district selection
        val openDistrictPicker = { showDistrictPickerBottomSheet() }
        binding.actvDistrict.setOnClickListener { openDistrictPicker() }
        binding.textInputLayoutDistrict.setOnClickListener { openDistrictPicker() }
        binding.textInputLayoutDistrict.setEndIconOnClickListener { openDistrictPicker() }

        // Date and time pickers with Material 3 BloodLink theming
        binding.donationDateEditText.setOnClickListener { showDatePicker() }
        binding.textInputLayoutDate.setOnClickListener { showDatePicker() }
        binding.textInputLayoutDate.setEndIconOnClickListener { showDatePicker() }

        binding.donationTimeEditText.setOnClickListener { showTimePicker() }
        binding.textInputLayoutTime.setOnClickListener { showTimePicker() }
        binding.textInputLayoutTime.setEndIconOnClickListener { showTimePicker() }

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

        val constraints = CalendarConstraints.Builder()
            .setValidator(DateValidatorPointForward.now())
            .build()

        val datePicker = MaterialDatePicker.Builder.datePicker()
            .setTitleText("Select Donation Date")
            .setSelection(calendar.timeInMillis)
            .setCalendarConstraints(constraints)
            .setTheme(R.style.ThemeOverlay_BloodLink_MaterialCalendar)
            .build()

        datePicker.addOnPositiveButtonClickListener { selection ->
            val utcCalendar = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
                timeInMillis = selection
            }
            calendar.set(
                utcCalendar.get(Calendar.YEAR),
                utcCalendar.get(Calendar.MONTH),
                utcCalendar.get(Calendar.DAY_OF_MONTH)
            )
            binding.donationDateEditText.setText(
                SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(calendar.time)
            )
            binding.textInputLayoutDate.error = null
        }

        datePicker.show(parentFragmentManager, "BLOODLINK_DATE_PICKER")
    }

    private fun showTimePicker() {
        if (!isAdded) return

        val timePicker = MaterialTimePicker.Builder()
            .setTimeFormat(TimeFormat.CLOCK_12H)
            .setHour(calendar.get(Calendar.HOUR_OF_DAY))
            .setMinute(calendar.get(Calendar.MINUTE))
            .setTitleText("Select Donation Time")
            .setTheme(R.style.ThemeOverlay_BloodLink_MaterialTimePicker)
            .build()

        timePicker.addOnPositiveButtonClickListener {
            calendar.set(Calendar.HOUR_OF_DAY, timePicker.hour)
            calendar.set(Calendar.MINUTE, timePicker.minute)
            binding.donationTimeEditText.setText(
                SimpleDateFormat("hh:mm a", Locale.getDefault()).format(calendar.time)
            )
            binding.textInputLayoutTime.error = null
        }

        timePicker.show(parentFragmentManager, "BLOODLINK_TIME_PICKER")
    }

    private fun showDistrictPickerBottomSheet() {
        if (!isAdded) return

        val dialog = BottomSheetDialog(
            requireContext(),
            R.style.Theme_BloodLink_BottomSheetDialog
        )
        val dialogBinding = BottomSheetDistrictPickerBinding.inflate(layoutInflater)
        dialog.setContentView(dialogBinding.root)

        val selectedDistrict = binding.actvDistrict.text.toString().trim()
        val allList = districts.toList()
        var currentList = allList

        val adapter = DistrictAdapter(currentList, selectedDistrict) { clickedDistrict ->
            binding.actvDistrict.setText(clickedDistrict)
            binding.textInputLayoutDistrict.error = null
            dialog.dismiss()
        }

        dialogBinding.rvDistricts.layoutManager = LinearLayoutManager(requireContext())
        dialogBinding.rvDistricts.adapter = adapter

        dialogBinding.etDistrictSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val query = s?.toString()?.trim() ?: ""
                currentList = if (query.isEmpty()) {
                    allList
                } else {
                    allList.filter { it.contains(query, ignoreCase = true) }
                }
                adapter.updateList(currentList)
                dialogBinding.tvNoDistrictFound.isVisible = currentList.isEmpty()
                dialogBinding.rvDistricts.isVisible = currentList.isNotEmpty()
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        dialogBinding.ivCloseDistrictPicker.setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()
    }

    private class DistrictAdapter(
        private var list: List<String>,
        private val selected: String,
        private val onItemClick: (String) -> Unit
    ) : RecyclerView.Adapter<DistrictAdapter.DistrictViewHolder>() {

        fun updateList(newList: List<String>) {
            list = newList
            notifyDataSetChanged()
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DistrictViewHolder {
            val itemBinding = ItemDistrictPickerBinding.inflate(
                LayoutInflater.from(parent.context), parent, false
            )
            return DistrictViewHolder(itemBinding)
        }

        override fun onBindViewHolder(holder: DistrictViewHolder, position: Int) {
            val item = list[position]
            holder.binding.tvDistrictName.text = item
            val isCurrent = item.equals(selected, ignoreCase = true)
            holder.binding.ivSelectedCheck.isVisible = isCurrent
            if (isCurrent) {
                holder.binding.tvDistrictName.setTextColor(
                    ContextCompat.getColor(holder.itemView.context, R.color.primary_red)
                )
            } else {
                holder.binding.tvDistrictName.setTextColor(
                    ContextCompat.getColor(holder.itemView.context, R.color.text_primary)
                )
            }
            holder.itemView.setOnClickListener { onItemClick(item) }
        }

        override fun getItemCount(): Int = list.size

        class DistrictViewHolder(val binding: ItemDistrictPickerBinding) :
            RecyclerView.ViewHolder(binding.root)
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