package com.project.donateblood.utils

/**
 * Temporary in-memory holder for signup data
 * Used across multiple signup steps before final save
 */
object SignupData {

    /* ---------------- PERSONAL DETAILS ---------------- */
    var name: String = ""
    var email: String = ""
    var phone: String = ""
    var dateOfBirth: String = ""
    var password: String = ""   // Used temporarily during signup only

    /* ---------------- ADDRESS DETAILS ---------------- */
    var district: String = ""
    var postOffice: String = ""
    var policeStation: String = ""
    var village: String = ""
    var road: String = ""

    /* ---------------- MEDICAL DETAILS ---------------- */
    var bloodGroup: String = ""
    var medicalHistory: String = ""  // Add this
    var lastDonation: String = ""    // Add this

    /* ---------------- OPTIONAL / EXTRA ---------------- */
    var profileImage: String = ""   // ✅ Firebase Storage download URL
    var gender: String = ""
    var weight: String = ""
    var emergencyContact: String = ""

    /* ---------------- STATUS FLAGS ---------------- */  // Add this section
    var isAvailable: Boolean = true
    var registrationComplete: Boolean = false

    /* ---------------- HELPERS ---------------- */

    /** Clears all stored signup data */
    fun clear() {
        name = ""
        email = ""
        phone = ""
        dateOfBirth = ""
        password = ""

        district = ""
        postOffice = ""
        policeStation = ""
        village = ""
        road = ""

        bloodGroup = ""
        medicalHistory = ""  // Add this
        lastDonation = ""    // Add this
        profileImage = ""
        gender = ""
        weight = ""
        emergencyContact = ""

        isAvailable = true          // Add this
        registrationComplete = false // Add this
    }

    /** Checks if minimum required fields are filled */
    fun isComplete(): Boolean {
        return name.isNotEmpty() &&
                email.isNotEmpty() &&
                phone.isNotEmpty() &&
                dateOfBirth.isNotEmpty() &&
                bloodGroup.isNotEmpty() &&
                district.isNotEmpty() &&
                policeStation.isNotEmpty()
    }

    // Add these helper methods for better validation
    fun isPersonalInfoComplete(): Boolean {
        return name.isNotEmpty() &&
                email.isNotEmpty() &&
                phone.isNotEmpty() &&
                dateOfBirth.isNotEmpty() &&
                password.isNotEmpty()
    }

    fun isAddressComplete(): Boolean {
        return district.isNotEmpty() &&
                postOffice.isNotEmpty() &&
                policeStation.isNotEmpty() &&
                village.isNotEmpty()
    }

    fun isMedicalInfoComplete(): Boolean {
        return bloodGroup.isNotEmpty()
    }

    /** Human-readable summary (debug / review screen) */
    fun getSummary(): String {
        return """
            Name: $name
            Email: $email
            Phone: $phone
            Date of Birth: $dateOfBirth
            Blood Group: $bloodGroup
            Medical History: $medicalHistory
            Last Donation: $lastDonation
            Address: $village, $road, $postOffice, $policeStation, $district
            Available for Donation: $isAvailable
            Registration Complete: $registrationComplete
        """.trimIndent()
    }
}