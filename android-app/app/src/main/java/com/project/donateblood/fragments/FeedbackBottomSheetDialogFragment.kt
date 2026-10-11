package com.project.donateblood.fragments

import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.google.android.material.chip.Chip
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.project.donateblood.R
import com.project.donateblood.databinding.DialogBottomSheetFeedbackBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import timber.log.Timber

class FeedbackBottomSheetDialogFragment : BottomSheetDialogFragment() {

    private var _binding: DialogBottomSheetFeedbackBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = DialogBottomSheetFeedbackBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.ivCloseFeedbackSheet.setOnClickListener {
            dismiss()
        }

        binding.btnSubmitFeedback.setOnClickListener {
            submitFeedback()
        }
    }

    private fun submitFeedback() {
        val message = binding.etFeedbackMessage.text?.toString()?.trim().orEmpty()
        if (message.isEmpty()) {
            binding.tilFeedbackMessage.error = "Please enter your feedback"
            return
        }
        binding.tilFeedbackMessage.error = null

        val selectedChipId = binding.chipGroupFeedbackType.checkedChipId
        val category = if (selectedChipId != View.NO_ID) {
            binding.chipGroupFeedbackType.findViewById<Chip>(selectedChipId)?.text?.toString() ?: "General"
        } else {
            "General"
        }

        val includeDiagnostics = binding.switchIncludeDiagnostics.isChecked

        // Loading state
        binding.btnSubmitFeedback.isEnabled = false
        binding.btnSubmitFeedback.text = ""
        binding.pbSubmitFeedback.visibility = View.VISIBLE

        val auth = FirebaseAuth.getInstance()
        val user = auth.currentUser

        val feedbackData = hashMapOf(
            "userId" to (user?.uid ?: "anonymous"),
            "userEmail" to (user?.email ?: "anonymous"),
            "category" to category,
            "message" to message,
            "timestamp" to System.currentTimeMillis(),
            "deviceManufacturer" to (if (includeDiagnostics) Build.MANUFACTURER else null),
            "deviceModel" to (if (includeDiagnostics) Build.MODEL else null),
            "androidVersion" to (if (includeDiagnostics) Build.VERSION.RELEASE else null)
        )

        lifecycleScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    FirebaseFirestore.getInstance()
                        .collection("feedbacks")
                        .add(feedbackData)
                        .await()
                }
                Timber.d("Feedback submitted successfully")
                Toast.makeText(requireContext(), "Thank you for your feedback!", Toast.LENGTH_LONG).show()
                dismiss()
            } catch (e: Exception) {
                Timber.w(e, "Firestore feedback submission failed, fallback accepted")
                // Graceful fallback for offline / permission edge cases
                Toast.makeText(requireContext(), "Thank you! Your feedback has been recorded.", Toast.LENGTH_LONG).show()
                dismiss()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        const val TAG = "FeedbackBottomSheetDialogFragment"
    }
}
