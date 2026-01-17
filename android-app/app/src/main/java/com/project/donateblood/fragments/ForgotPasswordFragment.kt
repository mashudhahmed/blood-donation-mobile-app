package com.project.donateblood.fragments

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.firebase.auth.FirebaseAuth
import com.project.donateblood.R
import com.project.donateblood.databinding.FragmentForgotPasswordBinding
import com.project.donateblood.utils.Validator

class ForgotPasswordFragment : Fragment() {

    private var _binding: FragmentForgotPasswordBinding? = null
    private val binding get() = _binding!!
    private lateinit var auth: FirebaseAuth

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentForgotPasswordBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        auth = FirebaseAuth.getInstance()

        setupViews()
        setupTextWatchers()
    }

    private fun setupViews() {
        // Update button text to use string resource
        binding.btnSendCode.text = getString(R.string.send_reset_link)

        // Send reset link button
        binding.btnSendCode.setOnClickListener {
            sendResetEmail()
        }

        // Back to sign in
        binding.tvSignIn.setOnClickListener {
            findNavController().navigate(
                R.id.action_forgotPasswordFragment_to_loginFragment
            )
        }

        // Clear error when email field is focused
        binding.etEmailForgot.setOnFocusChangeListener { _, hasFocus ->
            if (hasFocus) {
                clearErrors()
            }
        }
    }

    private fun setupTextWatchers() {
        // Clear errors when user starts typing
        binding.etEmailForgot.addTextChangedListener { text ->
            if (text?.isNotEmpty() == true) {
                clearErrors()
            }
        }
    }

    private fun sendResetEmail() {
        val email = binding.etEmailForgot.text.toString().trim()

        // Clear previous errors
        clearErrors()

        // Validate email using string resources
        if (email.isEmpty()) {
            binding.textInputLayoutEmail.error = getString(R.string.error_email_required)
            binding.etEmailForgot.requestFocus()
            return
        }

        if (!Validator.isValidEmail(email)) {
            binding.textInputLayoutEmail.error = getString(R.string.error_valid_email)
            binding.etEmailForgot.requestFocus()
            return
        }

        // Show loading state
        showLoading(true)

        // Send password reset email
        auth.sendPasswordResetEmail(email)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    handleSuccess(email)
                } else {
                    handleFailure(task.exception)
                }
            }
    }

    private fun handleSuccess(email: String) {
        // Hide loading
        showLoading(false)

        // Use string resource with placeholder (fixes concatenation warning)
        val successMessage = getString(R.string.reset_link_sent, email)
        binding.tvSuccess.text = successMessage
        binding.tvSuccess.visibility = View.VISIBLE

        // Hide error if visible
        binding.tvError.visibility = View.GONE

        // Navigate back to login after delay
        Handler(Looper.getMainLooper()).postDelayed({
            findNavController().navigate(
                R.id.action_forgotPasswordFragment_to_loginFragment
            )
        }, 2000)
    }

    private fun handleFailure(exception: Exception?) {
        // Hide loading
        showLoading(false)

        // Show error message using string resources
        val errorMessage = when (exception?.message) {
            "There is no user record corresponding to this identifier. The user may have been deleted." -> {
                binding.textInputLayoutEmail.error = getString(R.string.error_account_not_found)
                getString(R.string.error_account_not_found)
            }
            "The email address is badly formatted." -> {
                binding.textInputLayoutEmail.error = getString(R.string.error_invalid_email_format)
                getString(R.string.error_invalid_email_format)
            }
            "A network error (such as timeout, interrupted connection or unreachable host) has occurred." -> {
                getString(R.string.error_network)
            }
            "We have blocked all requests from this device due to unusual activity. Try again later." -> {
                getString(R.string.error_too_many_attempts)
            }
            else -> exception?.message ?: getString(R.string.error_reset_failed)
        }

        // Show error in TextView
        binding.tvError.text = errorMessage
        binding.tvError.visibility = View.VISIBLE

        // Hide success if visible
        binding.tvSuccess.visibility = View.GONE
    }

    private fun showLoading(isLoading: Boolean) {
        if (isLoading) {
            binding.btnSendCode.text = getString(R.string.sending_reset_link)
            binding.progressBar.visibility = View.VISIBLE
            binding.btnSendCode.isEnabled = false
            binding.btnSendCode.alpha = 0.7f
        } else {
            binding.btnSendCode.text = getString(R.string.send_reset_link)
            binding.progressBar.visibility = View.GONE
            binding.btnSendCode.isEnabled = true
            binding.btnSendCode.alpha = 1f
        }
    }

    private fun clearErrors() {
        binding.textInputLayoutEmail.error = null
        binding.tvError.visibility = View.GONE
        binding.tvSuccess.visibility = View.GONE
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}