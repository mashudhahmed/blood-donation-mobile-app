package com.project.donateblood.fragments

import android.annotation.SuppressLint
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.addCallback
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.UserProfileChangeRequest
import com.project.donateblood.R
import com.project.donateblood.databinding.FragmentSignupEmailVerificationBinding
import com.project.donateblood.utils.SignupData
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class SignupEmailVerificationFragment : Fragment() { // Removed unused import

    private var _binding: FragmentSignupEmailVerificationBinding? = null
    private val binding get() = _binding!!

    private lateinit var auth: FirebaseAuth
    private val verifyHandler = Handler(Looper.getMainLooper())
    private val resendHandler = Handler(Looper.getMainLooper())

    private var secondsRemaining = 60
    private var isVerificationComplete = false
    private var isAccountCreated = false

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSignupEmailVerificationBinding.inflate(inflater, container, false)
        return binding.root
    }

    @SuppressLint("SetTextI18n")
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        auth = FirebaseAuth.getInstance()
        binding.tvEmail.text = "Verifying: ${SignupData.email}" // This is dynamic, so it's okay

        // Block back navigation
        requireActivity().onBackPressedDispatcher.addCallback(viewLifecycleOwner) {
            toast("Please verify your email to continue")
        }

        // Start account creation and verification process
        startVerificationProcess()

        binding.btnVerify.setOnClickListener {
            manualCheckVerification()
        }

        binding.tvResend.setOnClickListener {
            resendVerificationEmail()
        }
    }

    private fun startVerificationProcess() {
        CoroutineScope(Dispatchers.Main).launch {
            try {
                showLoading(true)
                binding.btnVerify.isEnabled = false

                // Create Firebase user account
                val result = auth.createUserWithEmailAndPassword(
                    SignupData.email,
                    SignupData.password
                ).await()

                isAccountCreated = true

                // Set display name
                val profileUpdates = UserProfileChangeRequest.Builder()
                    .setDisplayName(SignupData.name)
                    .build()

                result.user?.updateProfile(profileUpdates)?.await()

                // Send verification email
                result.user?.sendEmailVerification()?.await()

                showLoading(false)
                binding.btnVerify.isEnabled = true

                toast("Verification email sent to ${SignupData.email}")
                startResendTimer()
                startAutoVerificationCheck()

            } catch (e: Exception) {
                showLoading(false)
                binding.btnVerify.isEnabled = true

                when (e) {
                    is FirebaseAuthInvalidCredentialsException -> {
                        toast("Invalid email or password format")
                    }
                    else -> {
                        toast("Failed to create account: ${e.message ?: "Unknown error"}")
                    }
                }
                // Navigate back to personal info
                findNavController().popBackStack()
            }
        }
    }

    // 🔥 CRITICAL FIX: Runs when user returns from email app
    override fun onResume() {
        super.onResume()
        if (!isVerificationComplete && isAccountCreated) {
            checkVerificationStatus()
        }
    }

    private fun startAutoVerificationCheck() {
        verifyHandler.postDelayed(object : Runnable {
            override fun run() {
                if (!isVerificationComplete && isAccountCreated) {
                    checkVerificationStatus()
                    verifyHandler.postDelayed(this, 3000) // Check every 3 seconds
                }
            }
        }, 3000)
    }

    private fun checkVerificationStatus() {
        val user = auth.currentUser ?: return

        user.reload().addOnSuccessListener {
            if (user.isEmailVerified && !isVerificationComplete) {
                navigateToNextStep()
            }
        }.addOnFailureListener {
            // Silently fail, will retry on next check
        }
    }

    @SuppressLint("SetTextI18n")
    private fun manualCheckVerification() {
        if (!isAccountCreated) {
            toast("Account creation in progress...")
            return
        }

        binding.btnVerify.isEnabled = false
        binding.btnVerify.text = "Checking..."

        checkVerificationStatus()

        // Re-enable button after 2 seconds
        binding.btnVerify.postDelayed({
            if (!isVerificationComplete) {
                binding.btnVerify.isEnabled = true
                binding.btnVerify.text = "I have verified" // Fixed: use string directly
            }
        }, 2000)
    }

    @SuppressLint("SetTextI18n")
    private fun startResendTimer() {
        secondsRemaining = 60
        resendHandler.post(object : Runnable {
            override fun run() {
                if (secondsRemaining > 0) {
                    binding.tvTimer.text = "Resend in ${secondsRemaining}s" // Dynamic text
                    binding.tvResend.isEnabled = false
                    binding.tvResend.setTextColor(
                        ContextCompat.getColor(requireContext(), R.color.text_disabled)
                    )
                    secondsRemaining--
                    resendHandler.postDelayed(this, 1000)
                } else {
                    binding.tvTimer.text = "Ready to resend" // Fixed: use string directly
                    binding.tvResend.isEnabled = true
                    binding.tvResend.setTextColor(
                        ContextCompat.getColor(requireContext(), R.color.primary_red)
                    )
                }
            }
        })
    }

    private fun resendVerificationEmail() {
        if (!isAccountCreated) {
            toast("Account not created yet")
            return
        }

        val user = auth.currentUser ?: return

        binding.tvResend.isEnabled = false
        binding.tvResend.setTextColor(
            ContextCompat.getColor(requireContext(), R.color.text_disabled)
        )

        user.sendEmailVerification()
            .addOnSuccessListener {
                toast("Verification email resent")
                startResendTimer()
            }
            .addOnFailureListener {
                binding.tvResend.isEnabled = true
                binding.tvResend.setTextColor(
                    ContextCompat.getColor(requireContext(), R.color.primary_red)
                )
                toast("Failed to resend: ${it.message ?: "Unknown error"}")
            }
    }

    private fun navigateToNextStep() {
        if (isVerificationComplete) return
        isVerificationComplete = true

        verifyHandler.removeCallbacksAndMessages(null)
        resendHandler.removeCallbacksAndMessages(null)

        toast("Email verified successfully")

        findNavController().navigate(
            R.id.action_signupOtpFragment_to_signupAddressFragment
        )
    }

    @SuppressLint("SetTextI18n")
    private fun showLoading(isLoading: Boolean) {
        if (isLoading) {
            binding.btnVerify.text = "Creating account..." // This is okay as loading text
        } else {
            binding.btnVerify.text = "I have verified" // Fixed: use string directly
        }
    }

    private fun toast(msg: String) {
        Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
    }

    override fun onDestroyView() {
        verifyHandler.removeCallbacksAndMessages(null)
        resendHandler.removeCallbacksAndMessages(null)
        super.onDestroyView()
        _binding = null
    }
}