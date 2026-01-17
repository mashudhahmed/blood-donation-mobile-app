package com.project.donateblood.utils

import android.util.Patterns
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.regex.Pattern

object Validator {

    // EMAIL VALIDATION
    fun isValidEmail(email: String): Boolean {
        return Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }

    // PHONE VALIDATION (Bangladesh specific)
    fun isValidPhone(phone: String): Boolean {
        // Remove any spaces, dashes, or plus signs
        val cleanPhone = phone.replace("\\s+".toRegex(), "")
            .replace("-", "")
            .replace("+", "")

        // Check if it's a valid Bangladesh mobile number
        return cleanPhone.length == 11 && cleanPhone.startsWith("01") && cleanPhone.all { it.isDigit() }
    }

    // PASSWORD VALIDATION
    fun isValidPassword(password: String): Boolean {
        // Minimum 6 characters, at least one letter and one number
        val passwordPattern = "^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@\$!%*#?&]{6,}\$"
        return Pattern.compile(passwordPattern).matcher(password).matches()
    }

    // PASSWORD STRENGTH CHECK
    fun getPasswordStrength(password: String): String {
        return when {
            password.length < 6 -> "Weak"
            password.length >= 8 && password.any { it.isUpperCase() } &&
                    password.any { it.isDigit() } && password.any { !it.isLetterOrDigit() } -> "Strong"
            password.length >= 6 && password.any { it.isDigit() } -> "Medium"
            else -> "Weak"
        }
    }

    // NAME VALIDATION
    fun isValidName(name: String): Boolean {
        // At least 2 characters, only letters and spaces allowed
        val namePattern = "^[A-Za-z\\s]{2,}\$"
        return Pattern.compile(namePattern).matcher(name.trim()).matches()
    }

    // OTP VALIDATION
    fun isValidOtp(otp: String): Boolean {
        return otp.length == 6 && otp.all { it.isDigit() }
    }

    // PASSWORD MATCH VALIDATION
    fun passwordsMatch(password: String, confirmPassword: String): Boolean {
        return password == confirmPassword
    }

    // DATE OF BIRTH VALIDATION - FIXED NULLABLE DATE ISSUE
    fun isValidDateOfBirth(dateOfBirth: String): Boolean {
        if (dateOfBirth.isEmpty()) return false

        // Check format DD/MM/YYYY
        val datePattern = "^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/(19|20)\\d{2}\$"
        if (!Pattern.compile(datePattern).matcher(dateOfBirth).matches()) {
            return false
        }

        // Parse date and check if valid
        return try {
            val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
            dateFormat.isLenient = false
            val date = dateFormat.parse(dateOfBirth)

            if (date == null) return false // Handle null case

            // Check if date is in the past
            val today = Calendar.getInstance()
            val selectedDate = Calendar.getInstance().apply { time = date }

            // Check if at least 18 years old
            val minAgeCalendar = Calendar.getInstance().apply {
                add(Calendar.YEAR, -18)
            }

            selectedDate.before(minAgeCalendar) && selectedDate.before(today)
        } catch (e: Exception) {
            false
        }
    }

    // AGE CALCULATION FROM DATE OF BIRTH - FIXED NULLABLE DATE ISSUE
    fun calculateAge(dateOfBirth: String): Int? {
        if (!isValidDateOfBirth(dateOfBirth)) return null

        return try {
            val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
            val birthDate = dateFormat.parse(dateOfBirth)

            if (birthDate == null) return null // Handle null case

            val today = Calendar.getInstance()
            val birthCalendar = Calendar.getInstance().apply { time = birthDate }

            var age = today.get(Calendar.YEAR) - birthCalendar.get(Calendar.YEAR)

            // Check if birthday hasn't occurred this year
            if (today.get(Calendar.DAY_OF_YEAR) < birthCalendar.get(Calendar.DAY_OF_YEAR)) {
                age--
            }
            age
        } catch (e: Exception) {
            null
        }
    }

    // BLOOD GROUP VALIDATION
    fun isValidBloodGroup(bloodGroup: String): Boolean {
        val validBloodGroups = listOf(
            "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"
        )
        return bloodGroup in validBloodGroups
    }

    // ADDRESS VALIDATION
    fun isValidAddressComponent(component: String): Boolean {
        return component.isNotEmpty() && component.length >= 3
    }

    // WEIGHT VALIDATION (for blood donation - minimum 50kg)
    fun isValidWeight(weight: String): Boolean {
        return try {
            val weightValue = weight.toDouble()
            weightValue >= 50.0 && weightValue <= 200.0
        } catch (e: Exception) {
            false
        }
    }

    // EMERGENCY CONTACT VALIDATION
    fun isValidEmergencyContact(contact: String): Boolean {
        return contact.length >= 7 && contact.all { it.isDigit() }
    }

    // GENDER VALIDATION
    fun isValidGender(gender: String): Boolean {
        val validGenders = listOf("male", "female", "other", "Male", "Female", "Other")
        return gender in validGenders
    }

    // PIN CODE VALIDATION (Bangladesh postal codes are 4 digits)
    fun isValidPinCode(pinCode: String): Boolean {
        return pinCode.length == 4 && pinCode.all { it.isDigit() }
    }

    // URL VALIDATION (for profile images)
    fun isValidUrl(url: String): Boolean {
        return Patterns.WEB_URL.matcher(url).matches() || url.startsWith("content://") || url.startsWith("file://")
    }

    // DATE VALIDATION (for last donation date)
    fun isValidDate(date: String): Boolean {
        if (date.isEmpty()) return true // Empty date is valid (never donated)

        return try {
            val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
            dateFormat.isLenient = false
            val parsedDate = dateFormat.parse(date)
            parsedDate != null // Check if parsing was successful
        } catch (e: Exception) {
            false
        }
    }

    // EMAIL VERIFICATION CHECK
    fun isEmailVerified(email: String): Boolean {
        // Simple check - you might want to integrate with Firebase Auth
        return isValidEmail(email) && email.contains("@")
    }

    // PHONE VERIFICATION CHECK
    fun isPhoneVerified(phone: String): Boolean {
        return isValidPhone(phone)
    }

    // HELPER FUNCTION: SAFE PARSE DATE (Optional)
    fun safeParseDate(dateString: String, format: String = "dd/MM/yyyy"): java.util.Date? {
        return try {
            val dateFormat = SimpleDateFormat(format, Locale.getDefault())
            dateFormat.isLenient = false
            dateFormat.parse(dateString)
        } catch (e: Exception) {
            null
        }
    }
}