package com.project.donateblood.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.DialogFragment
import com.project.donateblood.databinding.FragmentTermsOfServiceDialogBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class TermsOfServiceDialogFragment : DialogFragment() {

    private var _binding: FragmentTermsOfServiceDialogBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentTermsOfServiceDialogBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        dialog?.window?.setLayout(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        dialog?.window?.setBackgroundDrawableResource(android.R.color.transparent)

        val dateFormat = SimpleDateFormat("dd MMMM yyyy", Locale.getDefault())
        binding.tvTermsLastUpdated.text = "Last Updated: ${dateFormat.format(Date())}"

        binding.ivCloseTerms.setOnClickListener {
            dismiss()
        }

        binding.btnAcceptTerms.setOnClickListener {
            dismiss()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
