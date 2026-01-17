package com.project.donateblood.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class PersonalEditViewModel : ViewModel() {

    private val auth = FirebaseAuth.getInstance()
    private val firestore = FirebaseFirestore.getInstance()

    // Form fields
    val name = MutableLiveData<String>()
    val phone = MutableLiveData<String>()
    val dateOfBirth = MutableLiveData<String>()
    val bloodGroup = MutableLiveData<String>()

    // Form validation
    private val _nameError = MutableLiveData<String?>()
    val nameError: LiveData<String?> get() = _nameError

    private val _phoneError = MutableLiveData<String?>()
    val phoneError: LiveData<String?> get() = _phoneError

    private val _dateOfBirthError = MutableLiveData<String?>()
    val dateOfBirthError: LiveData<String?> get() = _dateOfBirthError

    // UI State
    private val _uiState = MutableLiveData<PersonalEditUiState>()
    val uiState: LiveData<PersonalEditUiState> get() = _uiState

    // Form validation
    val isFormValid: Boolean
        get() = name.value?.isNotEmpty() == true &&
                phone.value?.isNotEmpty() == true &&
                _nameError.value == null &&
                _phoneError.value == null

    init {
        loadUserData()
    }

    fun loadUserData() {
        viewModelScope.launch {
            try {
                _uiState.value = PersonalEditUiState.Loading

                val currentUser = auth.currentUser
                if (currentUser == null) {
                    _uiState.value = PersonalEditUiState.Error("User not logged in")
                    return@launch
                }

                val document = firestore.collection("users")
                    .document(currentUser.uid)
                    .get()
                    .await()

                if (document.exists()) {
                    val data = document.data

                    name.value = data?.get("name") as? String ?: ""
                    phone.value = data?.get("phone") as? String ?: ""
                    dateOfBirth.value = data?.get("dateOfBirth") as? String ?: ""
                    bloodGroup.value = data?.get("bloodGroup") as? String ?: ""

                    _uiState.value = PersonalEditUiState.Loaded
                } else {
                    _uiState.value = PersonalEditUiState.Error("User data not found")
                }
            } catch (e: Exception) {
                _uiState.value = PersonalEditUiState.Error("Failed to load data: ${e.message}")
            }
        }
    }

    fun validateName(input: String) {
        if (input.isEmpty()) {
            _nameError.value = "Name is required"
        } else if (input.length < 2) {
            _nameError.value = "Name must be at least 2 characters"
        } else {
            _nameError.value = null
        }
    }

    fun validatePhone(input: String) {
        val phoneRegex = Regex("^01[3-9]\\d{8}$")

        if (input.isEmpty()) {
            _phoneError.value = "Phone number is required"
        } else if (!input.matches(phoneRegex)) {
            _phoneError.value = "Invalid phone number format"
        } else {
            _phoneError.value = null
        }
    }

    fun savePersonalInfo(
        name: String,
        phone: String,
        dateOfBirth: String,
        bloodGroup: String
    ) {
        viewModelScope.launch {
            try {
                _uiState.value = PersonalEditUiState.Loading

                val currentUser = auth.currentUser
                if (currentUser == null) {
                    _uiState.value = PersonalEditUiState.Error("User not logged in")
                    return@launch
                }

                // Validate form
                validateName(name)
                validatePhone(phone)

                if (_nameError.value != null || _phoneError.value != null) {
                    _uiState.value = PersonalEditUiState.Error("Please fix validation errors")
                    return@launch
                }

                // Prepare update data
                val updateData = hashMapOf<String, Any>(
                    "name" to name,
                    "phone" to phone,
                    "dateOfBirth" to dateOfBirth,
                    "bloodGroup" to bloodGroup
                )

                // Update in users collection
                firestore.collection("users")
                    .document(currentUser.uid)
                    .update(updateData as Map<String, Any>)
                    .await()

                // Also update in donors collection if user is a donor
                try {
                    val donorDoc = firestore.collection("donors")
                        .document(currentUser.uid)
                        .get()
                        .await()

                    if (donorDoc.exists()) {
                        val donorUpdateData = hashMapOf<String, Any>(
                            "bloodGroup" to bloodGroup
                        )
                        firestore.collection("donors")
                            .document(currentUser.uid)
                            .update(donorUpdateData as Map<String, Any>)
                            .await()
                    }
                } catch (_: Exception) {
                    // Ignore donor update errors, main update succeeded
                }

                _uiState.value = PersonalEditUiState.Success("Personal information updated")

            } catch (e: Exception) {
                _uiState.value = PersonalEditUiState.Error("Failed to save: ${e.message}")
            }
        }
    }
}

sealed class PersonalEditUiState {
    object Loading : PersonalEditUiState()
    object Loaded : PersonalEditUiState()
    data class Success(val message: String) : PersonalEditUiState()
    data class Error(val message: String) : PersonalEditUiState()
}