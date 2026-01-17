package com.project.donateblood.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.project.donateblood.R
import com.project.donateblood.adapter.HistoryAdapter
import com.project.donateblood.databinding.FragmentHistoryBinding
import com.project.donateblood.models.HistoryItem
import com.project.donateblood.viewmodels.BottomNavViewModel
import java.text.SimpleDateFormat
import java.util.Locale

class HistoryFragment : Fragment() {

    private var _binding: FragmentHistoryBinding? = null
    private val binding get() = _binding!!

    private lateinit var firestore: FirebaseFirestore
    private lateinit var auth: FirebaseAuth
    private lateinit var bottomNavViewModel: BottomNavViewModel
    private var historyListener: ListenerRegistration? = null

    private val historyList = mutableListOf<HistoryItem>()
    private lateinit var historyAdapter: HistoryAdapter

    private var currentFilterType = "all" // all, requested, donated
    private var currentSortType = "recent" // recent, oldest, status
    private var currentSearchQuery = ""
    private var dataLoadCount = 0
    private val totalDataSources = 2 // requests + donations

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHistoryBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        auth = FirebaseAuth.getInstance()
        firestore = FirebaseFirestore.getInstance()
        bottomNavViewModel = ViewModelProvider(requireActivity())[BottomNavViewModel::class.java]

        setupViews()
        setupRecyclerView()
        setupClickListeners()
        setupBottomNavigation()
        setupBottomNavObserver()
        loadHistoryData()
    }

    private fun setupBottomNavObserver() {
        // Observe bottom nav selection changes
        bottomNavViewModel.selectedItemId.observe(viewLifecycleOwner) { itemId ->
            binding.bottomNavigationView.selectedItemId = itemId
        }

        // Set initial selection
        bottomNavViewModel.setSelectedItem(R.id.nav_history)
    }

    private fun setupViews() {
        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }

        // Setup search functionality with debounce
        binding.etSearch.addTextChangedListener { editable ->
            currentSearchQuery = editable?.toString() ?: ""
            applyFiltersAndUpdate()
        }
    }

    private fun setupRecyclerView() {
        historyAdapter = HistoryAdapter(
            onItemClick = { historyItem ->
                showHistoryItemToast(historyItem)
            },
            onViewCertificateClick = { historyItem ->
                showDonationCertificate(historyItem)
            },
            onCancelRequestClick = { historyItem ->
                showCancelRequestConfirmation(historyItem)
            }
        )

        binding.rvHistory.layoutManager = LinearLayoutManager(requireContext())
        binding.rvHistory.adapter = historyAdapter
    }

    private fun setupBottomNavigation() {
        binding.bottomNavigationView.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_home -> {
                    try {
                        findNavController().navigate(R.id.action_historyFragment_to_homeFragment)
                    } catch (_: Exception) {
                        toast("Navigation failed")
                    }
                    true
                }
                R.id.nav_request_donate -> {
                    navigateToRequestBloodFragment()
                    true
                }
                R.id.nav_history -> {
                    true
                }
                else -> false
            }
        }
    }

    private fun setupClickListeners() {
        binding.btnFilter.setOnClickListener {
            showFilterOptionsDialog()
        }

        binding.btnSort.setOnClickListener {
            showSortOptionsDialog()
        }
    }

    private fun loadHistoryData() {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            showNoData("Please login to view history")
            return
        }

        binding.progressBar.visibility = View.VISIBLE
        binding.tvNoHistory.visibility = View.GONE
        binding.rvHistory.visibility = View.GONE

        // Clear existing data
        historyList.clear()
        dataLoadCount = 0

        // Load both blood requests and donations
        loadBloodRequests(currentUser.uid)
        loadDonations(currentUser.uid)
    }

    private fun loadBloodRequests(userId: String) {
        historyListener?.remove()

        historyListener = firestore.collection("bloodRequests")
            .whereEqualTo("requesterId", userId)
            .addSnapshotListener { snapshot, error ->
                dataLoadCount++

                if (error != null) {
                    if (dataLoadCount >= totalDataSources) {
                        binding.progressBar.visibility = View.GONE
                        showNoData("Failed to load blood requests")
                    }
                    return@addSnapshotListener
                }

                val requestsLoaded = mutableListOf<HistoryItem>()

                snapshot?.documents?.forEach { doc ->
                    try {
                        val data = doc.data
                        val requestId = doc.id
                        val patientName = data?.get("patientName") as? String ?: "Unknown Patient"
                        val hospital = data?.get("hospital") as? String ?: "Unknown Hospital"
                        val bloodGroup = data?.get("bloodGroup") as? String ?: "Unknown"
                        val units = (data?.get("units") as? Long)?.toInt() ?: 1
                        val location = data?.get("location") as? String ?: "Unknown Location"
                        val district = data?.get("district") as? String ?: ""
                        val status = data?.get("status") as? String ?: "pending"
                        val createdAt = data?.get("createdAt") as? Timestamp ?: Timestamp.now()

                        val fullLocation = if (district.isNotEmpty()) "$location, $district" else location

                        val historyItem = HistoryItem(
                            id = requestId,
                            title = "Blood Request",
                            description = "Requested $units units of $bloodGroup blood",
                            date = createdAt.toDate(),
                            type = "requested",
                            status = status,
                            patientName = patientName,
                            hospital = hospital,
                            bloodGroup = bloodGroup,
                            units = units,
                            location = fullLocation
                        )

                        requestsLoaded.add(historyItem)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }

                // Update requests in history list
                updateHistoryListForType("requested", requestsLoaded)

                // Update UI after both data sources are loaded
                if (dataLoadCount >= totalDataSources) {
                    updateUI()
                }
            }
    }

    private fun updateHistoryListForType(type: String, newItems: List<HistoryItem>) {
        // Remove all items of this type
        historyList.removeAll { it.type == type }
        // Add new items
        historyList.addAll(newItems)
    }

    private fun loadDonations(userId: String) {
        firestore.collection("donations")
            .whereEqualTo("userId", userId)
            .get()
            .addOnSuccessListener { snapshot ->
                dataLoadCount++

                val donationsLoaded = mutableListOf<HistoryItem>()

                snapshot.documents.forEach { doc ->
                    try {
                        val data = doc.data
                        val donationId = doc.id
                        val hospital = data?.get("hospital") as? String ?: "Blood Donation Center"
                        val bloodGroup = data?.get("bloodGroup") as? String ?: "Unknown"
                        val units = (data?.get("units") as? Long)?.toInt() ?: 1
                        val location = data?.get("location") as? String ?: "Unknown Location"
                        val donationDate = data?.get("donationDate") as? Timestamp ?: Timestamp.now()
                        val status = "completed"

                        val historyItem = HistoryItem(
                            id = donationId,
                            title = "Blood Donation",
                            description = "Donated $units unit${if (units > 1) "s" else ""} of $bloodGroup blood",
                            date = donationDate.toDate(),
                            type = "donated",
                            status = status,
                            patientName = "N/A",
                            hospital = hospital,
                            bloodGroup = bloodGroup,
                            units = units,
                            location = location
                        )
                        donationsLoaded.add(historyItem)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }

                // Update donations in history list
                updateHistoryListForType("donated", donationsLoaded)

                // Update UI after both data sources are loaded
                if (dataLoadCount >= totalDataSources) {
                    updateUI()
                }
            }
            .addOnFailureListener { _ ->
                dataLoadCount++
                // Still update UI if we have requests loaded
                if (dataLoadCount >= totalDataSources) {
                    updateUI()
                }
            }
    }

    private fun updateUI() {
        binding.progressBar.visibility = View.GONE

        if (historyList.isEmpty()) {
            showNoData("No history available")
            return
        }

        applyFiltersAndUpdate()
    }

    private fun applyFiltersAndUpdate() {
        val filteredItems = applyFilters(historyList)
        val sortedItems = applySort(filteredItems)

        updateHistoryList(sortedItems)
    }

    private fun applyFilters(items: List<HistoryItem>): List<HistoryItem> {
        // Apply type filter
        val filteredByType = when (currentFilterType) {
            "requested" -> items.filter { it.type == "requested" }
            "donated" -> items.filter { it.type == "donated" }
            else -> items // "all"
        }

        // Apply search query filter
        return if (currentSearchQuery.isNotEmpty()) {
            val searchQuery = currentSearchQuery.lowercase(Locale.getDefault())
            filteredByType.filter { item ->
                item.title.lowercase(Locale.getDefault()).contains(searchQuery) ||
                        item.description.lowercase(Locale.getDefault()).contains(searchQuery) ||
                        item.patientName.lowercase(Locale.getDefault()).contains(searchQuery) ||
                        item.hospital.lowercase(Locale.getDefault()).contains(searchQuery) ||
                        item.bloodGroup.lowercase(Locale.getDefault()).contains(searchQuery) ||
                        item.location.lowercase(Locale.getDefault()).contains(searchQuery) ||
                        item.status.lowercase(Locale.getDefault()).contains(searchQuery)
            }
        } else {
            filteredByType
        }
    }

    private fun applySort(items: List<HistoryItem>): List<HistoryItem> {
        return when (currentSortType) {
            "recent" -> items.sortedByDescending { it.date } // Most recent first
            "oldest" -> items.sortedBy { it.date } // Oldest first
            "status" -> {
                // Sort by status: completed, pending, cancelled
                val statusOrder = mapOf("completed" to 1, "pending" to 2, "cancelled" to 3, "processing" to 4)
                items.sortedBy { statusOrder[it.status.lowercase()] ?: 5 }
            }
            else -> items
        }
    }

    private fun showFilterOptionsDialog() {
        val options = arrayOf("All History", "Blood Requests", "Donations")
        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Filter History")
            .setItems(options) { _, i ->
                currentFilterType = when (i) {
                    0 -> "all"
                    1 -> "requested"
                    2 -> "donated"
                    else -> "all"
                }
                applyFiltersAndUpdate()
            }.show()
    }

    private fun showSortOptionsDialog() {
        val options = arrayOf("Most Recent", "Oldest First", "By Status")
        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Sort History")
            .setItems(options) { _, i ->
                currentSortType = when (i) {
                    0 -> "recent"
                    1 -> "oldest"
                    2 -> "status"
                    else -> "recent"
                }
                applyFiltersAndUpdate()
            }.show()
    }

    private fun updateHistoryList(items: List<HistoryItem>) {
        if (items.isEmpty()) {
            showNoData(getNoDataMessage())
        } else {
            // Submit a new list to trigger DiffUtil
            historyAdapter.submitList(ArrayList(items))
            binding.tvNoHistory.visibility = View.GONE
            binding.rvHistory.visibility = View.VISIBLE
        }
    }

    private fun getNoDataMessage(): String {
        return when {
            currentSearchQuery.isNotEmpty() && currentFilterType != "all" ->
                "No $currentFilterType history found for '$currentSearchQuery'"
            currentSearchQuery.isNotEmpty() ->
                "No history found for '$currentSearchQuery'"
            currentFilterType != "all" ->
                "No $currentFilterType history found"
            else -> "No history available"
        }
    }

    private fun showNoData(message: String) {
        binding.tvNoHistory.text = message
        binding.tvNoHistory.visibility = View.VISIBLE
        binding.rvHistory.visibility = View.GONE
    }

    private fun showHistoryItemToast(historyItem: HistoryItem) {
        val dateFormat = SimpleDateFormat("dd MMM yyyy", Locale.getDefault())
        val message = when (historyItem.type) {
            "requested" -> {
                "Request: ${historyItem.patientName} at ${historyItem.hospital}\n" +
                        "${historyItem.bloodGroup} • ${historyItem.units} units • ${historyItem.status}"
            }
            "donated" -> {
                "Donation: ${historyItem.hospital}\n" +
                        "${historyItem.bloodGroup} • ${historyItem.units} units • ${dateFormat.format(historyItem.date)}"
            }
            else -> "History item clicked"
        }
        Toast.makeText(requireContext(), message, Toast.LENGTH_LONG).show()
    }

    private fun showDonationCertificate(historyItem: HistoryItem) {
        toast("Donation certificate for ${historyItem.bloodGroup} blood on ${SimpleDateFormat("dd MMM yyyy", Locale.getDefault()).format(historyItem.date)} coming soon")
    }

    // NEW: Show cancel confirmation dialog
    private fun showCancelRequestConfirmation(historyItem: HistoryItem) {
        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Cancel Blood Request")
            .setMessage("Are you sure you want to cancel this blood request?\n\nPatient: ${historyItem.patientName}\nHospital: ${historyItem.hospital}\nBlood Group: ${historyItem.bloodGroup}")
            .setPositiveButton("Yes, Cancel") { _, _ ->
                cancelRequest(historyItem)
            }
            .setNegativeButton("No", null)
            .show()
    }

    // NEW: Cancel request function
    private fun cancelRequest(historyItem: HistoryItem) {
        if (historyItem.type != "requested") {
            toast("Only blood requests can be cancelled")
            return
        }

        if (historyItem.status.lowercase() != "pending") {
            toast("Only pending requests can be cancelled")
            return
        }

        // Update in Firestore
        firestore.collection("bloodRequests").document(historyItem.id)
            .update("status", "cancelled")
            .addOnSuccessListener {
                // Update locally
                val index = historyList.indexOfFirst { it.id == historyItem.id && it.type == "requested" }
                if (index != -1) {
                    historyList[index] = historyList[index].copy(status = "cancelled")
                    applyFiltersAndUpdate()
                    toast("Request cancelled successfully")
                }
            }
            .addOnFailureListener { e ->
                toast("Failed to cancel request: ${e.message}")
            }
    }

    private fun navigateToRequestBloodFragment() {
        try {
            findNavController().navigate(R.id.action_historyFragment_to_requestBloodFragment)
        } catch (_: Exception) {
            toast("Request Blood feature coming soon")
            try {
                findNavController().navigate(R.id.action_historyFragment_to_homeFragment)
            } catch (_: Exception) {
                toast("Navigation failed")
            }
        }
    }

    override fun onDestroyView() {
        historyListener?.remove()
        _binding = null
        super.onDestroyView()
    }

    private fun toast(message: String) {
        Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show()
    }
}