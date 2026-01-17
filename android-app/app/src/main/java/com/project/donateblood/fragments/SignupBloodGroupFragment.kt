package com.project.donateblood.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.google.android.material.card.MaterialCardView
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.project.donateblood.R
import com.project.donateblood.databinding.FragmentSignupBloodGroupBinding
import com.project.donateblood.utils.SignupData

class SignupBloodGroupFragment : Fragment() {

    private var _binding: FragmentSignupBloodGroupBinding? = null
    private val binding get() = _binding!!

    private lateinit var auth: FirebaseAuth
    private lateinit var firestore: FirebaseFirestore

    private var selectedBloodGroup: String? = null
    private val bloodGroupCards = mutableMapOf<String, MaterialCardView>()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSignupBloodGroupBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        auth = FirebaseAuth.getInstance()
        firestore = FirebaseFirestore.getInstance()

        setupBloodGroupCards()
        setupClickListeners()
    }

    private fun setupBloodGroupCards() {
        bloodGroupCards["A+"] = binding.cardAPositive
        bloodGroupCards["A-"] = binding.cardANegative
        bloodGroupCards["B+"] = binding.cardBPositive
        bloodGroupCards["B-"] = binding.cardBNegative
        bloodGroupCards["O+"] = binding.cardOPositive
        bloodGroupCards["O-"] = binding.cardONegative
        bloodGroupCards["AB+"] = binding.cardABPositive
        bloodGroupCards["AB-"] = binding.cardABNegative
    }

    private fun setupClickListeners() {
        bloodGroupCards.forEach { (bloodGroup, cardView) ->
            cardView.setOnClickListener { selectBloodGroup(bloodGroup) }
        }

        binding.btnFinish.setOnClickListener {
            completeRegistration()
        }
    }

    private fun selectBloodGroup(bloodGroup: String) {
        bloodGroupCards.values.forEach { card ->
            card.setCardBackgroundColor(
                ContextCompat.getColor(requireContext(), R.color.surface_white)
            )
            card.strokeColor = ContextCompat.getColor(requireContext(), R.color.border_color)
            card.strokeWidth = 1
        }

        bloodGroupCards[bloodGroup]?.let {
            it.setCardBackgroundColor(
                ContextCompat.getColor(requireContext(), R.color.primary_red_light)
            )
            it.strokeColor =
                ContextCompat.getColor(requireContext(), R.color.primary_red_dark)
            it.strokeWidth = 3
        }

        selectedBloodGroup = bloodGroup
    }

    private fun completeRegistration() {
        if (selectedBloodGroup.isNullOrEmpty()) {
            Toast.makeText(
                requireContext(),
                "Please select your blood group",
                Toast.LENGTH_SHORT
            ).show()
            return
        }

        SignupData.bloodGroup = selectedBloodGroup!!
        SignupData.medicalHistory = ""
        SignupData.lastDonation = ""
        SignupData.isAvailable = true
        SignupData.registrationComplete = true

        binding.progressBar.visibility = View.VISIBLE
        binding.btnFinish.isEnabled = false

        saveUserToFirestore()
    }

    private fun saveUserToFirestore() {
        val currentUser = auth.currentUser

        if (currentUser == null || !currentUser.isEmailVerified) {
            resetUi()
            Toast.makeText(
                requireContext(),
                "Please verify your email first",
                Toast.LENGTH_SHORT
            ).show()
            return
        }

        val uid = currentUser.uid

        // ================= USERS COLLECTION =================
        val userData = hashMapOf<String, Any>(
            "userId" to uid,
            "name" to SignupData.name,
            "email" to SignupData.email,
            "phone" to SignupData.phone,
            "dateOfBirth" to SignupData.dateOfBirth,
            "bloodGroup" to SignupData.bloodGroup,
            "district" to SignupData.district,
            "postOffice" to SignupData.postOffice,
            "policeStation" to SignupData.policeStation,
            "village" to SignupData.village,
            "road" to SignupData.road,
            "medicalHistory" to SignupData.medicalHistory,
            "lastDonation" to SignupData.lastDonation,

            // ✅ CRITICAL FIX
            "lastDonationDate" to 0L,

            "isAvailable" to SignupData.isAvailable,
            "registrationComplete" to SignupData.registrationComplete,
            "createdAt" to System.currentTimeMillis(),
            "updatedAt" to System.currentTimeMillis()
        )

        // ================= DONORS COLLECTION =================
        val donorData = hashMapOf<String, Any>(
            "id" to uid,
            "name" to SignupData.name,
            "bloodGroup" to SignupData.bloodGroup,
            "district" to SignupData.district,
            "phone" to SignupData.phone,
            "isAvailable" to true,

            // ✅ REQUIRED FOR NOTIFICATIONS
            "lastDonationDate" to 0L,
            "fcmToken" to ""
        )

        firestore.collection("users").document(uid)
            .set(userData)
            .addOnSuccessListener {

                firestore.collection("donors").document(uid)
                    .set(donorData)
                    .addOnSuccessListener {

                        resetUi()
                        SignupData.clear()

                        Toast.makeText(
                            requireContext(),
                            "Registration completed successfully!",
                            Toast.LENGTH_SHORT
                        ).show()

                        findNavController().navigate(
                            R.id.action_signupBloodGroupFragment_to_homeFragment
                        )
                    }
                    .addOnFailureListener { e ->
                        resetUi()
                        Toast.makeText(
                            requireContext(),
                            "Donor save failed: ${e.message}",
                            Toast.LENGTH_LONG
                        ).show()
                    }
            }
            .addOnFailureListener { e ->
                resetUi()
                Toast.makeText(
                    requireContext(),
                    "Registration failed: ${e.message}",
                    Toast.LENGTH_LONG
                ).show()
            }
    }

    private fun resetUi() {
        binding.progressBar.visibility = View.GONE
        binding.btnFinish.isEnabled = true
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}
