package com.project.donateblood.viewmodels

import android.widget.Toast
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.project.donateblood.models.Donor

class HomeViewModel : ViewModel() {

    private val _allDonors = MutableLiveData<List<Donor>>()
    val allDonors: LiveData<List<Donor>> = _allDonors

    private val _donors = MutableLiveData<List<Donor>>()
    val donors: LiveData<List<Donor>> = _donors

    init {
        loadSampleDonors()
    }

    private fun loadSampleDonors() {
        val sampleDonors = listOf(
            Donor(
                id = "1",
                userId = "user1",
                name = "John Doe",
                bloodGroup = "O+",
                location = "Downtown, New York",
                district = "New York",
                phone = "+1234567890",

                // ✅ CRITICAL NOTIFICATION FIELDS (must match backend)
                fcmToken = "sample_token_1",
                isAvailable = true,
                notificationEnabled = true,

                // ✅ BACKWARD COMPATIBILITY FIELDS
                isActive = true,
                canDonate = true,
                hasFcmToken = true,

                // ✅ OPTIONAL FIELDS
                email = "john@example.com",
                lastDonation = "15/01/2024",
                lastDonationDate = 1705276800000L, // Store as Long
                imageUrl = "",
                createdAt = System.currentTimeMillis() - 86400000L * 30, // Store as Long
                updatedAt = System.currentTimeMillis() - 86400000L * 30, // ✅ FIXED: Changed from Timestamp to Long
                lastActive = System.currentTimeMillis() - 86400000L * 5 // Add lastActive as Long
            ),
            Donor(
                id = "2",
                userId = "user2",
                name = "Jane Smith",
                bloodGroup = "A+",
                location = "Uptown, Chicago",
                district = "Chicago",
                phone = "+1234567891",

                // ✅ CRITICAL NOTIFICATION FIELDS
                fcmToken = "sample_token_2",
                isAvailable = true,
                notificationEnabled = true,

                // ✅ BACKWARD COMPATIBILITY FIELDS
                isActive = true,
                canDonate = true,
                hasFcmToken = true,

                // ✅ OPTIONAL FIELDS
                email = "jane@example.com",
                lastDonation = "20/12/2023",
                lastDonationDate = 1703030400000L, // Store as Long
                imageUrl = "",
                createdAt = System.currentTimeMillis() - 86400000L * 45, // Store as Long
                updatedAt = System.currentTimeMillis() - 86400000L * 45, // ✅ FIXED: Changed from Timestamp to Long
                lastActive = System.currentTimeMillis() - 86400000L * 10
            ),
            Donor(
                id = "3",
                userId = "user3",
                name = "Mike Johnson",
                bloodGroup = "B+",
                location = "Midtown, Los Angeles",
                district = "Los Angeles",
                phone = "+1234567892",

                // ✅ CRITICAL NOTIFICATION FIELDS
                fcmToken = "sample_token_3",
                isAvailable = false, // Not available
                notificationEnabled = true,

                // ✅ BACKWARD COMPATIBILITY FIELDS
                isActive = false,
                canDonate = true,
                hasFcmToken = true,

                // ✅ OPTIONAL FIELDS
                email = "mike@example.com",
                lastDonation = "05/11/2023",
                lastDonationDate = 1699142400000L, // Store as Long
                imageUrl = "",
                createdAt = System.currentTimeMillis() - 86400000L * 60, // Store as Long
                updatedAt = System.currentTimeMillis() - 86400000L * 60, // ✅ FIXED: Changed from Timestamp to Long
                lastActive = System.currentTimeMillis() - 86400000L * 15
            ),
            Donor(
                id = "4",
                userId = "user4",
                name = "Sarah Williams",
                bloodGroup = "AB+",
                location = "West End, Boston",
                district = "Boston",
                phone = "+1234567893",

                // ✅ CRITICAL NOTIFICATION FIELDS
                fcmToken = "sample_token_4",
                isAvailable = true,
                notificationEnabled = false, // Notifications disabled

                // ✅ BACKWARD COMPATIBILITY FIELDS
                isActive = true,
                canDonate = true,
                hasFcmToken = true,

                // ✅ OPTIONAL FIELDS
                email = "sarah@example.com",
                lastDonation = "10/02/2024",
                lastDonationDate = 1707523200000L, // Store as Long
                imageUrl = "",
                createdAt = System.currentTimeMillis() - 86400000L * 15, // Store as Long
                updatedAt = System.currentTimeMillis() - 86400000L * 15, // ✅ FIXED: Changed from Timestamp to Long
                lastActive = System.currentTimeMillis() - 86400000L * 2
            ),
            Donor(
                id = "5",
                userId = "user5",
                name = "Robert Brown",
                bloodGroup = "O-",
                location = "East Side, Miami",
                district = "Miami",
                phone = "+1234567894",

                // ✅ CRITICAL NOTIFICATION FIELDS
                fcmToken = "", // No FCM token
                isAvailable = true,
                notificationEnabled = true,

                // ✅ BACKWARD COMPATIBILITY FIELDS
                isActive = true,
                canDonate = false, // Cannot donate recently
                hasFcmToken = false,

                // ✅ OPTIONAL FIELDS
                email = "robert@example.com",
                lastDonation = "25/01/2024",
                lastDonationDate = 1706140800000L, // Store as Long
                imageUrl = "",
                createdAt = System.currentTimeMillis() - 86400000L * 20, // Store as Long
                updatedAt = System.currentTimeMillis() - 86400000L * 20, // ✅ FIXED: Changed from Timestamp to Long
                lastActive = System.currentTimeMillis() - 86400000L * 1
            )
        )

        _allDonors.value = sampleDonors
        _donors.value = sampleDonors
    }

    // All other methods remain exactly the same...
    fun searchDonors(query: String) {
        val allDonors = _allDonors.value ?: return

        if (query.isEmpty()) {
            _donors.value = allDonors
            return
        }

        val filtered = allDonors.filter { donor ->
            donor.location.contains(query, ignoreCase = true) ||
                    donor.name.contains(query, ignoreCase = true) ||
                    donor.bloodGroup.contains(query, ignoreCase = true) ||
                    donor.district.contains(query, ignoreCase = true)
        }

        _donors.value = filtered
    }

    fun sortByTime() {
        val currentList = _donors.value ?: return

        // ✅ FIXED: Sort by lastDonationDate (Long) instead of Timestamp
        val sorted = currentList.sortedByDescending { donor ->
            donor.lastDonationDate // Sort by Long timestamp
        }

        _donors.value = sorted
    }

    fun sortByDistance() {
        // This feature remains - just showing toast
        Toast.makeText(
            android.app.Application().applicationContext,
            "Distance sorting requires location data",
            Toast.LENGTH_SHORT
        ).show()
    }

    fun sortByAvailability() {
        val currentList = _donors.value ?: return

        // ✅ FIXED: Sort by isAvailable (true first)
        val sorted = currentList.sortedByDescending { donor ->
            donor.isAvailable
        }

        _donors.value = sorted
    }

    fun sortByNotificationEnabled() {
        val currentList = _donors.value ?: return

        // ✅ NEW: Sort by notificationEnabled (true first)
        val sorted = currentList.sortedByDescending { donor ->
            donor.notificationEnabled
        }

        _donors.value = sorted
    }

    fun sortByRating() {
        Toast.makeText(
            android.app.Application().applicationContext,
            "Rating sorting requires rating data",
            Toast.LENGTH_SHORT
        ).show()
    }

    fun filterByBloodGroup(bloodGroups: List<String>) {
        val allDonors = _allDonors.value ?: return

        if (bloodGroups.contains("All") || bloodGroups.isEmpty()) {
            _donors.value = allDonors
        } else {
            val filtered = allDonors.filter { donor ->
                bloodGroups.contains(donor.bloodGroup)
            }
            _donors.value = filtered
        }
    }

    fun filterByAvailability(showAvailableOnly: Boolean) {
        val allDonors = _allDonors.value ?: return

        val filtered = if (showAvailableOnly) {
            allDonors.filter { donor ->
                donor.isAvailable
            }
        } else {
            allDonors
        }

        _donors.value = filtered
    }

    fun filterByDistrict(districts: List<String>) {
        val allDonors = _allDonors.value ?: return

        if (districts.contains("All") || districts.isEmpty()) {
            _donors.value = allDonors
        } else {
            val filtered = allDonors.filter { donor ->
                districts.contains(donor.district)
            }
            _donors.value = filtered
        }
    }

    fun clearFilters() {
        _donors.value = _allDonors.value
    }

    // ✅ NEW: Get donors eligible for notifications
    fun getEligibleDonorsForNotifications(): List<Donor> {
        return _allDonors.value?.filter { donor ->
            donor.isAvailable &&
                    donor.notificationEnabled &&
                    donor.hasValidFCMToken() &&
                    donor.isEligibleToDonate()
        } ?: emptyList()
    }

    // ✅ NEW: Get donor by ID
    fun getDonorById(donorId: String): Donor? {
        return _allDonors.value?.find { it.id == donorId }
    }
}