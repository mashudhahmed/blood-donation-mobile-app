package com.project.donateblood.models

@Suppress("RECEIVER_NULLABILITY_MISMATCH_BASED_ON_JAVA_ANNOTATIONS")
data class User(
    val uid: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val bloodGroup: String = "",
    val dateOfBirth: String = "",
    val district: String = "",
    val postOffice: String = "",
    val policeStation: String = "",
    val village: String = "",
    val road: String = "",
    val profileImage: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val lastDonationDate: String = "", // Added: Track last donation
    val totalDonations: Int = 0, // Added: Count total donations
    var isAvailable: Boolean = true, // Added: Availability status
    val userType: String = "donor" // Added: donor/recipient/admin
) {
    // Required empty constructor for Firebase
    constructor() : this(
        uid = "",
        name = "",
        email = "",
        phone = "",
        bloodGroup = "",
        dateOfBirth = "",
        district = "",
        postOffice = "",
        policeStation = "",
        village = "",
        road = "",
        profileImage = "",
        createdAt = 0L,
        lastDonationDate = "",
        totalDonations = 0,
        isAvailable = true,
        userType = "donor"
    )

    // Helper function to get full address
    fun getFullAddress(): String {
        return buildString {
            if (village.isNotEmpty()) append("$village, ")
            if (road.isNotEmpty()) append("$road, ")
            if (postOffice.isNotEmpty()) append("$postOffice, ")
            if (policeStation.isNotEmpty()) append("$policeStation, ")
            if (district.isNotEmpty()) append(district)
        }.trim().trimEnd(',')
    }

    // Helper function to check if user can donate (minimum 3 months gap)
    fun canDonate(): Boolean {
        if (lastDonationDate.isEmpty()) return true

        val dateFormat = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.getDefault())
        return try {
            val lastDonation = dateFormat.parse(lastDonationDate)
            val threeMonthsAgo = java.util.Calendar.getInstance().apply {
                add(java.util.Calendar.MONTH, -3)
            }.time
            lastDonation.before(threeMonthsAgo)
        } catch (e: Exception) {
            true
        }
    }

    // Helper function to get age from dateOfBirth
    fun getAge(): Int? {
        if (dateOfBirth.isEmpty()) return null

        val dateFormat = java.text.SimpleDateFormat("dd/MM/yyyy", java.util.Locale.getDefault())
        return try {
            val birthDate = dateFormat.parse(dateOfBirth)
            val today = java.util.Calendar.getInstance()
            val birthCalendar = java.util.Calendar.getInstance().apply {
                if (birthDate != null) {
                    time = birthDate
                }
            }

            var age = today.get(java.util.Calendar.YEAR) - birthCalendar.get(java.util.Calendar.YEAR)

            // Adjust age if birthday hasn't occurred this year
            if (today.get(java.util.Calendar.DAY_OF_YEAR) < birthCalendar.get(java.util.Calendar.DAY_OF_YEAR)) {
                age--
            }
            age
        } catch (e: Exception) {
            null
        }
    }
}