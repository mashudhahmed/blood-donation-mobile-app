package com.project.donateblood.fragments

import android.annotation.SuppressLint
import android.app.DatePickerDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.project.donateblood.R
import com.project.donateblood.databinding.FragmentSignupPersonalBinding
import com.project.donateblood.utils.SignupData
import java.util.Calendar
import java.util.regex.Pattern

class SignupPersonalFragment : Fragment() {

    private var _binding: FragmentSignupPersonalBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSignupPersonalBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.etDateOfBirth.setOnClickListener { showDatePicker() }

        binding.btnNextSignup.setOnClickListener {
            validateAndProceed()
        }

        binding.tvLogin.setOnClickListener {
            findNavController().navigate(R.id.action_signupPersonalFragment_to_loginFragment)
        }
    }

    private fun validateAndProceed() {
        binding.btnNextSignup.isEnabled = false
        binding.progressBar.visibility = View.VISIBLE

        val name = binding.etName.text.toString().trim()
        val email = binding.etEmail.text.toString().trim()
        val mobile = binding.etMobile.text.toString().trim()
        val dob = binding.etDateOfBirth.text.toString().trim()
        val password = binding.etPassword.text.toString()
        val confirmPassword = binding.etConfirmPassword.text.toString()

        if (name.isEmpty()) {
            binding.etName.error = "Name is required"
            resetUI()
            return
        }

        if (email.isEmpty()) {
            binding.etEmail.error = "Email is required"
            resetUI()
            return
        }

        if (!isValidEmail(email)) {
            binding.etEmail.error = "Invalid email address"
            resetUI()
            return
        }

        if (mobile.isEmpty()) {
            binding.etMobile.error = "Mobile number is required"
            resetUI()
            return
        }

        if (!isValidBangladeshiMobile(mobile)) {
            binding.etMobile.error = "Enter valid Bangladeshi mobile number (01XXXXXXXXX)"
            resetUI()
            return
        }

        if (dob.isEmpty()) {
            binding.etDateOfBirth.error = "Date of birth is required"
            resetUI()
            return
        }

        if (!isValidDateFormat(dob)) {
            binding.etDateOfBirth.error = "Invalid date format (DD/MM/YYYY)"
            resetUI()
            return
        }

        if (!isAtLeast18YearsOld(dob)) {
            binding.etDateOfBirth.error = "You must be at least 18 years old"
            resetUI()
            return
        }

        if (password.isEmpty()) {
            binding.etPassword.error = "Password is required"
            resetUI()
            return
        }

        if (password.length < 6) {
            binding.etPassword.error = "Password must be at least 6 characters"
            resetUI()
            return
        }

        if (confirmPassword.isEmpty()) {
            binding.etConfirmPassword.error = "Confirm password is required"
            resetUI()
            return
        }

        if (password != confirmPassword) {
            binding.etConfirmPassword.error = "Passwords do not match"
            resetUI()
            return
        }

        // Store data in SignupData object (not in Firebase yet)
        SignupData.apply {
            this.name = name
            this.email = email
            this.phone = mobile
            this.dateOfBirth = dob
            this.password = password
        }

        // Clear errors
        clearErrors()

        // Navigate to email verification fragment
        findNavController().navigate(
            R.id.action_signupPersonalFragment_to_signupOtpFragment
        )
        resetUI()
    }

    private fun isValidEmail(email: String): Boolean {
        val pattern = Pattern.compile(
            "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        )
        return pattern.matcher(email).matches()
    }

    private fun isValidBangladeshiMobile(mobile: String): Boolean {
        // Bangladeshi mobile: 01XXXXXXXXX (11 digits starting with 01)
        val pattern = Pattern.compile("^01[3-9]\\d{8}$")
        return pattern.matcher(mobile).matches()
    }

    private fun isValidDateFormat(dob: String): Boolean {
        return try {
            val parts = dob.split("/")
            parts.size == 3 && parts[0].length == 2 && parts[1].length == 2 && parts[2].length == 4
        } catch (e: Exception) {
            false
        }
    }

    private fun isAtLeast18YearsOld(dob: String): Boolean {
        return try {
            val parts = dob.split("/")
            val day = parts[0].toInt()
            val month = parts[1].toInt() - 1 // Calendar month is 0-based
            val year = parts[2].toInt()

            val dobCalendar = Calendar.getInstance().apply {
                set(year, month, day)
            }

            val today = Calendar.getInstance()
            var age = today.get(Calendar.YEAR) - dobCalendar.get(Calendar.YEAR)

            // Check if birthday hasn't occurred this year yet
            if (today.get(Calendar.DAY_OF_YEAR) < dobCalendar.get(Calendar.DAY_OF_YEAR)) {
                age--
            }
            age >= 18
        } catch (_: Exception) {
            false
        }
    }

    @SuppressLint("DefaultLocale")
    private fun showDatePicker() {
        val calendar = Calendar.getInstance()

        DatePickerDialog(
            requireContext(),
            { _, year, month, day ->
                binding.etDateOfBirth.setText(
                    String.format("%02d/%02d/%04d", day, month + 1, year)
                )
                binding.etDateOfBirth.error = null
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH)
        ).apply {
            // Set max date to today
            datePicker.maxDate = System.currentTimeMillis()
            // Set min date to 100 years ago
            val minCalendar = Calendar.getInstance()
            minCalendar.add(Calendar.YEAR, -100)
            datePicker.minDate = minCalendar.timeInMillis
        }.show()
    }

    private fun clearErrors() {
        binding.etName.error = null
        binding.etEmail.error = null
        binding.etMobile.error = null
        binding.etDateOfBirth.error = null
        binding.etPassword.error = null
        binding.etConfirmPassword.error = null
    }

    private fun resetUI() {
        binding.progressBar.visibility = View.GONE
        binding.btnNextSignup.isEnabled = true
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}