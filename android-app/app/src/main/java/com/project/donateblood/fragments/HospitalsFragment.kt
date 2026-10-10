package com.project.donateblood.fragments

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.project.donateblood.R
import com.project.donateblood.adapter.HospitalAdapter
import com.project.donateblood.databinding.FragmentHospitalsBinding
import com.project.donateblood.models.Hospital
import com.project.donateblood.repository.DirectoryRepository
import kotlinx.coroutines.launch
import timber.log.Timber

class HospitalsFragment : Fragment() {

    private var _binding: FragmentHospitalsBinding? = null
    private val binding get() = _binding!!

    private lateinit var hospitalAdapter: HospitalAdapter
    private val directoryRepository = DirectoryRepository()

    private var allHospitals: List<Hospital> = emptyList()
    private var selectedCategory: String = "All"
    private var currentSearchQuery: String = ""

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHospitalsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupToolbar()
        setupRecyclerView()
        setupSearch()
        setupCategoryChips()
        setupPullToRefresh()

        loadHospitals()
    }

    override fun onDestroyView() {
        _binding = null
        super.onDestroyView()
    }

    // ================= TOOLBAR SETUP =================
    private fun setupToolbar() {
        binding.btnBack.setOnClickListener {
            findNavController().navigateUp()
        }
    }

    // ================= RECYCLER VIEW SETUP =================
    private fun setupRecyclerView() {
        hospitalAdapter = HospitalAdapter(
            onCallClick = { hospital ->
                val phone = if (hospital.emergencyHotline.isNotBlank()) hospital.emergencyHotline else hospital.phone
                dialPhoneNumber(phone)
            },
            onDirectionsClick = { hospital ->
                openDirectionsInMaps(hospital.name, hospital.address, hospital.latitude, hospital.longitude)
            }
        )

        binding.rvHospitals.layoutManager = LinearLayoutManager(requireContext())
        binding.rvHospitals.adapter = hospitalAdapter
    }

    // ================= SEARCH SETUP =================
    private fun setupSearch() {
        binding.etSearch.addTextChangedListener { text ->
            currentSearchQuery = text?.toString().orEmpty()
            binding.btnClearSearch.visibility = if (currentSearchQuery.isNotEmpty()) View.VISIBLE else View.GONE
            applyFilters()
        }

        binding.btnClearSearch.setOnClickListener {
            binding.etSearch.text?.clear()
        }
    }

    // ================= CATEGORY FILTER CHIPS =================
    private fun setupCategoryChips() {
        binding.chipGroupHospital.setOnCheckedStateChangeListener { _, checkedIds ->
            selectedCategory = if (checkedIds.isEmpty()) {
                "All"
            } else {
                when (checkedIds.first()) {
                    binding.chipHospitalGovt.id -> "Govt Medical"
                    binding.chipHospitalPrivate.id -> "Private"
                    binding.chipHospitalEmergency.id -> "24/7 Emergency"
                    binding.chipHospitalSpecialized.id -> "Specialized"
                    else -> "All"
                }
            }
            applyFilters()
        }
    }

    // ================= PULL TO REFRESH =================
    private fun setupPullToRefresh() {
        binding.swipeRefreshLayout.setColorSchemeResources(
            R.color.primary_red,
            R.color.primary_red_dark,
            R.color.success_green
        )
        binding.swipeRefreshLayout.setOnRefreshListener {
            loadHospitals()
        }
    }

    // ================= LOAD DATA =================
    private fun loadHospitals() {
        binding.swipeRefreshLayout.isRefreshing = true
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                allHospitals = directoryRepository.getHospitals()
            } catch (e: Exception) {
                Timber.e("Failed to load hospitals: ${e.message}")
                allHospitals = DirectoryRepository.getDefaultHospitals()
            } finally {
                _binding?.swipeRefreshLayout?.isRefreshing = false
                applyFilters()
            }
        }
    }

    // ================= FILTER & DISPLAY =================
    @SuppressLint("SetTextI18n")
    private fun applyFilters() {
        if (_binding == null) return

        var list = allHospitals
        if (selectedCategory != "All") {
            list = when (selectedCategory) {
                "Govt Medical" -> list.filter { it.type.contains("Govt", ignoreCase = true) }
                "Private" -> list.filter { it.type.contains("Private", ignoreCase = true) }
                "24/7 Emergency" -> list.filter { it.isEmergency24Hours }
                "Specialized" -> list.filter { it.type.contains("Specialized", ignoreCase = true) }
                else -> list
            }
        }

        if (currentSearchQuery.isNotBlank()) {
            val q = currentSearchQuery.trim()
            list = list.filter {
                it.name.contains(q, true) ||
                it.address.contains(q, true) ||
                it.district.contains(q, true) ||
                it.area.contains(q, true) ||
                it.type.contains(q, true)
            }
        }

        binding.tvHospitalCountBadge.text = "${list.size} Facilities"
        hospitalAdapter.submitList(ArrayList(list))

        if (list.isEmpty()) {
            binding.layoutHospitalEmpty.visibility = View.VISIBLE
            binding.rvHospitals.visibility = View.GONE
        } else {
            binding.layoutHospitalEmpty.visibility = View.GONE
            binding.rvHospitals.visibility = View.VISIBLE
        }
    }

    // ================= ACTIONS =================
    private fun dialPhoneNumber(phone: String) {
        if (phone.isBlank()) {
            Toast.makeText(requireContext(), "Phone number not available", Toast.LENGTH_SHORT).show()
            return
        }
        try {
            val clean = phone.replace(" ", "").trim()
            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$clean"))
            startActivity(intent)
        } catch (_: Exception) {
            Toast.makeText(requireContext(), "Unable to open dialer", Toast.LENGTH_SHORT).show()
        }
    }

    private fun openDirectionsInMaps(name: String, address: String, lat: Double, lng: Double) {
        try {
            val uri = if (lat != 0.0 && lng != 0.0) {
                Uri.parse("geo:$lat,$lng?q=$lat,$lng(${Uri.encode(name)})")
            } else {
                Uri.parse("geo:0,0?q=${Uri.encode("$name, $address")}")
            }
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: Exception) {
            try {
                val webUri = Uri.parse("https://www.google.com/maps/search/?api=1&query=${Uri.encode("$name, $address")}")
                startActivity(Intent(Intent.ACTION_VIEW, webUri))
            } catch (_: Exception) {
                Toast.makeText(requireContext(), "Unable to open map application", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
