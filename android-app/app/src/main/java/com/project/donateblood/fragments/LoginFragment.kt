package com.project.donateblood.fragments

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.messaging.FirebaseMessaging
import com.project.donateblood.R
import com.project.donateblood.databinding.FragmentLoginBinding
import timber.log.Timber

class LoginFragment : Fragment() {

    private var _binding: FragmentLoginBinding? = null
    private val binding get() = _binding!!

    private val auth by lazy { FirebaseAuth.getInstance() }
    private val firestore by lazy { FirebaseFirestore.getInstance() }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var loginTimeoutRunnable: Runnable? = null

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentLoginBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val currentUser = auth.currentUser
        if (currentUser != null && currentUser.isEmailVerified) {
            findNavController().navigate(
                R.id.action_loginFragment_to_homeFragment
            )
            return
        }

        binding.btnSignIn.setOnClickListener { loginUser() }

        binding.tvSignUp.setOnClickListener {
            findNavController().navigate(
                R.id.action_loginFragment_to_signupPersonalFragment
            )
        }

        binding.tvForgotPassword.setOnClickListener {
            findNavController().navigate(
                R.id.action_loginFragment_to_forgotPasswordFragment
            )
        }
    }

    override fun onDestroyView() {
        loginTimeoutRunnable?.let { mainHandler.removeCallbacks(it) }
        super.onDestroyView()
        _binding = null
    }

    private fun loginUser() {
        if (_binding == null) return
        val email = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString().trim()

        if (email.isEmpty() || password.isEmpty()) {
            Toast.makeText(requireContext(), "All fields are required", Toast.LENGTH_SHORT).show()
            return
        }

        showLoading(true)

        // Safety timeout to avoid hanging indefinitely if network/DNS drops
        loginTimeoutRunnable?.let { mainHandler.removeCallbacks(it) }
        val timeout = Runnable {
            if (_binding != null && isAdded) {
                showLoading(false)
                Toast.makeText(
                    requireContext(),
                    "Connection timed out. Please check your internet connection and try again.",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
        loginTimeoutRunnable = timeout
        mainHandler.postDelayed(timeout, 20000L) // 20-second timeout

        Timber.d("Attempting sign in for: $email")

        auth.signInWithEmailAndPassword(email, password)
            .addOnSuccessListener { result ->
                loginTimeoutRunnable?.let { mainHandler.removeCallbacks(it) }
                if (_binding == null || !isAdded) return@addOnSuccessListener
                val user = result.user ?: return@addOnSuccessListener

                if (!user.isEmailVerified) {
                    showLoading(false)
                    Toast.makeText(
                        requireContext(),
                        "Please verify your email first",
                        Toast.LENGTH_LONG
                    ).show()
                    auth.signOut()
                    return@addOnSuccessListener
                }

                saveFcmToken(user.uid)
                subscribeToBloodTopic(user.uid)

                showLoading(false)
                Toast.makeText(requireContext(), "Login successful", Toast.LENGTH_SHORT).show()

                findNavController().navigate(
                    R.id.action_loginFragment_to_homeFragment
                )
            }
            .addOnFailureListener { error ->
                loginTimeoutRunnable?.let { mainHandler.removeCallbacks(it) }
                if (_binding == null || !isAdded) return@addOnFailureListener
                showLoading(false)
                Timber.e(error, "Sign in failed: ${error.message}")
                Toast.makeText(
                    requireContext(),
                    error.localizedMessage ?: "Login failed",
                    Toast.LENGTH_LONG
                ).show()
            }
    }

    private fun saveFcmToken(uid: String) {
        FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
            val updates = mapOf("fcmToken" to token)

            // Update users collection
            firestore.collection("users")
                .document(uid)
                .update(updates)
                .addOnFailureListener { e ->
                    Timber.w(e, "Failed to update users fcmToken")
                }

            // Update donors collection
            firestore.collection("donors")
                .document(uid)
                .update(updates)
                .addOnFailureListener { e ->
                    Timber.w(e, "Failed to update donors fcmToken")
                }
        }
    }

    private fun subscribeToBloodTopic(uid: String) {
        firestore.collection("users")
            .document(uid)
            .get()
            .addOnSuccessListener { document ->
                if (!document.exists()) return@addOnSuccessListener

                val bloodGroup = document.getString("bloodGroup") ?: return@addOnSuccessListener
                val district = document.getString("district") ?: return@addOnSuccessListener

                val topic = "donor_${bloodGroup}_${district}"
                    .replace("+", "pos")
                    .replace("-", "neg")
                    .replace(" ", "")

                FirebaseMessaging.getInstance().subscribeToTopic(topic)
            }
    }

    private fun showLoading(show: Boolean) {
        _binding?.let { b ->
            b.progressBar.visibility = if (show) View.VISIBLE else View.GONE
            b.btnSignIn.isEnabled = !show
        }
    }
}
