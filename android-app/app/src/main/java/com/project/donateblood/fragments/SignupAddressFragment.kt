package com.project.donateblood.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import com.project.donateblood.R
import com.project.donateblood.databinding.FragmentSignupAddressBinding
import com.project.donateblood.utils.SignupData

class SignupAddressFragment : Fragment() {

    private var _binding: FragmentSignupAddressBinding? = null
    private val binding get() = _binding!!

    // Sample data for dropdowns
    private val districts = arrayOf("Dhaka", "Chittagong", "Sylhet", "Rajshahi", "Khulna", "Barisal", "Rangpur", "Mymensingh")
    private val postOffices = mapOf(
        "Dhaka" to arrayOf("Gulshan", "Banani", "Dhanmondi", "Mirpur", "Uttara"),
        "Chittagong" to arrayOf("Agrabad", "Khulshi", "Pahartali", "Halishahar"),
        "Sylhet" to arrayOf("Sylhet Sadar", "Moulvibazar", "Sunamganj", "Habiganj")
    )
    private val policeStations = mapOf(
        "Dhaka" to arrayOf("Gulshan", "Banani", "Dhanmondi", "Mirpur", "Uttara"),
        "Chittagong" to arrayOf("Kotwali", "Double Mooring", "Pahartali"),
        "Sylhet" to arrayOf("Sylhet Sadar", "Moulvibazar", "Sunamganj")
    )

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSignupAddressBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupDropdowns()

        binding.btnNextAddress.setOnClickListener {
            saveAddressAndProceed()
        }
    }

    private fun setupDropdowns() {
        // Setup District dropdown
        val districtAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_dropdown_item_1line, districts)
        binding.actvDistrict.setAdapter(districtAdapter)

        // When district is selected, update post offices
        binding.actvDistrict.setOnItemClickListener { _, _, position, _ ->
            val selectedDistrict = districts[position]
            val postOfficeList = postOffices[selectedDistrict] ?: emptyArray()
            val postOfficeAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_dropdown_item_1line, postOfficeList)
            binding.actvPostOffice.setAdapter(postOfficeAdapter)

            // Also update police stations
            val policeStationList = policeStations[selectedDistrict] ?: emptyArray()
            val policeStationAdapter = ArrayAdapter(requireContext(), android.R.layout.simple_dropdown_item_1line, policeStationList)
            binding.actvPoliceStation.setAdapter(policeStationAdapter)
        }
    }

    private fun saveAddressAndProceed() {
        // Get values from all address fields
        val district = binding.actvDistrict.text.toString().trim()
        val postOffice = binding.actvPostOffice.text.toString().trim()
        val policeStation = binding.actvPoliceStation.text.toString().trim()
        val village = binding.etVillage.text.toString().trim()
        val road = binding.etRoad.text.toString().trim()

        // Validate required fields
        if (district.isEmpty()) {
            binding.textInputLayoutDistrict.error = "District is required"
            binding.actvDistrict.requestFocus()
            return
        } else {
            binding.textInputLayoutDistrict.error = null
        }

        if (postOffice.isEmpty()) {
            binding.textInputLayoutPostOffice.error = "Post office is required"
            binding.actvPostOffice.requestFocus()
            return
        } else {
            binding.textInputLayoutPostOffice.error = null
        }

        if (policeStation.isEmpty()) {
            binding.textInputLayoutPoliceStation.error = "Police station is required"
            binding.actvPoliceStation.requestFocus()
            return
        } else {
            binding.textInputLayoutPoliceStation.error = null
        }

        if (village.isEmpty()) {
            binding.textInputLayoutVillage.error = "Village/Home is required"
            binding.etVillage.requestFocus()
            return
        } else {
            binding.textInputLayoutVillage.error = null
        }

        // Save individual address components to SignupData
        SignupData.district = district
        SignupData.postOffice = postOffice
        SignupData.policeStation = policeStation
        SignupData.village = village
        SignupData.road = road

        // Show success message
        Toast.makeText(requireContext(), "Address saved successfully!", Toast.LENGTH_SHORT).show()

        // Navigate to blood group selection
        findNavController().navigate(
            R.id.action_signupAddressFragment_to_signupBloodGroupFragment
        )
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }
}