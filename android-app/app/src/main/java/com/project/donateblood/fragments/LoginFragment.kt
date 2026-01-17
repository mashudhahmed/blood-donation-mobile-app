package com.project.donateblood.fragments

import android.os.Bundle
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

class LoginFragment : Fragment() {

    private lateinit var binding: FragmentLoginBinding
    private lateinit var auth: FirebaseAuth
    private lateinit var firestore: FirebaseFirestore

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = FragmentLoginBinding.inflate(inflater, container, false)
        auth = FirebaseAuth.getInstance()
        firestore = FirebaseFirestore.getInstance()

        val currentUser = auth.currentUser
        if (currentUser != null && currentUser.isEmailVerified) {
            findNavController().navigate(
                R.id.action_loginFragment_to_homeFragment
            )
            return binding.root
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

        return binding.root
    }

    private fun loginUser() {
        val email = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString().trim()

        if (email.isEmpty() || password.isEmpty()) {
            Toast.makeText(requireContext(), "All fields are required", Toast.LENGTH_SHORT).show()
            return
        }

        showLoading(true)

        auth.signInWithEmailAndPassword(email, password)
            .addOnSuccessListener { result ->
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

                // 🔥 FIXED: Token now saved in BOTH collections
                saveFcmToken(user.uid)

                subscribeToBloodTopic(user.uid)

                showLoading(false)
                Toast.makeText(requireContext(), "Login successful", Toast.LENGTH_SHORT).show()

                findNavController().navigate(
                    R.id.action_loginFragment_to_homeFragment
                )
            }
            .addOnFailureListener {
                showLoading(false)
                Toast.makeText(
                    requireContext(),
                    it.localizedMessage ?: "Login failed",
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

            // 🔥 CRITICAL: Update donors collection
            firestore.collection("donors")
                .document(uid)
                .update(updates)
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
        binding.progressBar.visibility = if (show) View.VISIBLE else View.GONE
        binding.btnSignIn.isEnabled = !show
    }
}
