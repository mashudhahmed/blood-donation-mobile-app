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
import com.project.donateblood.adapter.BloodBankAdapter
import com.project.donateblood.databinding.FragmentBloodBanksBinding
import com.project.donateblood.models.BloodBank
import com.project.donateblood.repository.DirectoryRepository
import kotlinx.coroutines.launch
import timber.log.Timber

class BloodBanksFragment : Fragment() {

    private var _binding: FragmentBloodBanksBinding? = null
    private val binding get() = _binding!!

    private lateinit var bloodBankAdapter: BloodBankAdapter
    private val directoryRepository = DirectoryRepository()

    private var allBloodBanks: List<BloodBank> = emptyList()
    private var selectedCategory: String = "All"
    private var currentSearchQuery: String = ""

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentBloodBanksBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupToolbar()
        setupRecyclerView()
        setupSearch()
        setupCategoryChips()
        setupPullToRefresh()

        loadBloodBanks()
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
        bloodBankAdapter = BloodBankAdapter(
            onCallClick = { bb ->
                val phone = if (bb.hotline.isNotBlank()) bb.hotline else bb.phone
                dialPhoneNumber(phone)
            },
            onDirectionsClick = { bb ->
                openDirectionsInMaps(bb.name, bb.address, bb.latitude, bb.longitude)
            }
        )

        binding.rvBloodBanks.layoutManager = LinearLayoutManager(requireContext())
        binding.rvBloodBanks.adapter = bloodBankAdapter
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
        binding.chipGroupBloodBank.setOnCheckedStateChangeListener { _, checkedIds ->
            selectedCategory = if (checkedIds.isEmpty()) {
                "All"
            } else {
                when (checkedIds.first()) {
                    binding.chipBloodBankRedCrescent.id -> "Red Crescent"
                    binding.chipBloodBankQuantum.id -> "Quantum"
                    binding.chipBloodBankVoluntary.id -> "Voluntary Org"
                    binding.chipBloodBank24Hours.id -> "Open 24/7"
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
            loadBloodBanks()
        }
    }

    // ================= LOAD DATA =================
    private fun loadBloodBanks() {
        binding.swipeRefreshLayout.isRefreshing = true
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                allBloodBanks = directoryRepository.getBloodBanks()
            } catch (e: Exception) {
                Timber.e("Failed to load blood banks: ${e.message}")
                allBloodBanks = DirectoryRepository.getDefaultBloodBanks()
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

        var list = allBloodBanks
        if (selectedCategory != "All") {
            list = when (selectedCategory) {
                "Red Crescent" -> list.filter { it.organization.contains("Red Crescent", ignoreCase = true) }
                "Quantum" -> list.filter { it.organization.contains("Quantum", ignoreCase = true) }
                "Voluntary Org" -> list.filter {
                    it.organization.contains("Badhan", ignoreCase = true) ||
                    it.organization.contains("Sandhani", ignoreCase = true)
                }
                "Open 24/7" -> list.filter { it.isOpen24Hours }
                else -> list
            }
        }

        if (currentSearchQuery.isNotBlank()) {
            val q = currentSearchQuery.trim()
            list = list.filter {
                it.name.contains(q, true) ||
                it.address.contains(q, true) ||
                it.district.contains(q, true) ||
                it.organization.contains(q, true) ||
                it.availableComponents.contains(q, true)
            }
        }

        binding.tvBloodBankCountBadge.text = "${list.size} Reserves"
        bloodBankAdapter.submitList(ArrayList(list))

        if (list.isEmpty()) {
            binding.layoutBloodBankEmpty.visibility = View.VISIBLE
            binding.rvBloodBanks.visibility = View.GONE
        } else {
            binding.layoutBloodBankEmpty.visibility = View.GONE
            binding.rvBloodBanks.visibility = View.VISIBLE
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
