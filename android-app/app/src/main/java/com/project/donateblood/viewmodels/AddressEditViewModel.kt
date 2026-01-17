package com.project.donateblood.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class AddressEditViewModel : ViewModel() {

    private val auth = FirebaseAuth.getInstance()
    private val firestore = FirebaseFirestore.getInstance()

    // Form fields
    val district = MutableLiveData<String>()
    val policeStation = MutableLiveData<String>()
    val postOffice = MutableLiveData<String>()
    val village = MutableLiveData<String>()
    val road = MutableLiveData<String>()

    // Form validation
    private val _districtError = MutableLiveData<String?>()
    val districtError: LiveData<String?> get() = _districtError

    private val _policeStationError = MutableLiveData<String?>()
    val policeStationError: LiveData<String?> get() = _policeStationError

    private val _villageError = MutableLiveData<String?>()
    val villageError: LiveData<String?> get() = _villageError

    // UI State
    private val _uiState = MutableLiveData<AddressEditUiState>()
    val uiState: LiveData<AddressEditUiState> get() = _uiState

    // Form validation
    val isFormValid: Boolean
        get() = district.value?.isNotEmpty() == true &&
                policeStation.value?.isNotEmpty() == true &&
                village.value?.isNotEmpty() == true &&
                _districtError.value == null &&
                _policeStationError.value == null &&
                _villageError.value == null

    // Sample data for dropdowns (you should load this from database)
    val districts = listOf(
        "Dhaka", "Chittagong", "Rajshahi", "Khulna", "Barishal",
        "Sylhet", "Rangpur", "Mymensingh", "Comilla", "Narayanganj"
    )

    init {
        loadUserData()
    }

    fun loadUserData() {
        viewModelScope.launch {
            try {
                _uiState.value = AddressEditUiState.Loading

                val currentUser = auth.currentUser
                if (currentUser == null) {
                    _uiState.value = AddressEditUiState.Error("User not logged in")
                    return@launch
                }

                val document = firestore.collection("users")
                    .document(currentUser.uid)
                    .get()
                    .await()

                if (document.exists()) {
                    val data = document.data

                    district.value = data?.get("district") as? String ?: ""
                    policeStation.value = data?.get("policeStation") as? String ?: ""
                    postOffice.value = data?.get("postOffice") as? String ?: ""
                    village.value = data?.get("village") as? String ?: ""
                    road.value = data?.get("road") as? String ?: ""

                    _uiState.value = AddressEditUiState.Loaded
                } else {
                    _uiState.value = AddressEditUiState.Error("User data not found")
                }
            } catch (e: Exception) {
                _uiState.value = AddressEditUiState.Error("Failed to load data: ${e.message}")
            }
        }
    }

    fun validateDistrict(input: String) {
        if (input.isEmpty()) {
            _districtError.value = "District is required"
        } else {
            _districtError.value = null
        }
    }

    fun validatePoliceStation(input: String) {
        if (input.isEmpty()) {
            _policeStationError.value = "Police Station is required"
        } else {
            _policeStationError.value = null
        }
    }

    fun validateVillage(input: String) {
        if (input.isEmpty()) {
            _villageError.value = "Village/Home is required"
        } else {
            _villageError.value = null
        }
    }

    fun saveAddressInfo(
        district: String,
        policeStation: String,
        postOffice: String,
        village: String,
        road: String
    ) {
        viewModelScope.launch {
            try {
                _uiState.value = AddressEditUiState.Loading

                val currentUser = auth.currentUser
                if (currentUser == null) {
                    _uiState.value = AddressEditUiState.Error("User not logged in")
                    return@launch
                }

                // Validate form
                validateDistrict(district)
                validatePoliceStation(policeStation)
                validateVillage(village)

                if (_districtError.value != null ||
                    _policeStationError.value != null ||
                    _villageError.value != null) {
                    _uiState.value = AddressEditUiState.Error("Please fix validation errors")
                    return@launch
                }

                // Prepare update data
                val updateData = hashMapOf<String, Any>(
                    "district" to district,
                    "policeStation" to policeStation,
                    "postOffice" to postOffice,
                    "village" to village,
                    "road" to road
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
                        firestore.collection("donors")
                            .document(currentUser.uid)
                            .update(updateData as Map<String, Any>)
                            .await()
                    }
                } catch (e: Exception) {
                    // Ignore donor update errors, main update succeeded
                }

                _uiState.value = AddressEditUiState.Success("Address information updated")

            } catch (e: Exception) {
                _uiState.value = AddressEditUiState.Error("Failed to save: ${e.message}")
            }
        }
    }
}

sealed class AddressEditUiState {
    object Loading : AddressEditUiState()
    object Loaded : AddressEditUiState()
    data class Success(val message: String) : AddressEditUiState()
    data class Error(val message: String) : AddressEditUiState()
}