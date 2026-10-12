package com.project.donateblood.fragments

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.net.toUri
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import com.project.donateblood.R
import com.project.donateblood.adapter.DonorAdapter
import com.project.donateblood.databinding.FragmentDonorsBinding
import com.project.donateblood.models.Donor
import com.project.donateblood.repository.DirectoryRepository
import com.project.donateblood.utils.FirebaseUtils
import timber.log.Timber

class DonorsFragment : Fragment() {

    private var _binding: FragmentDonorsBinding? = null
    private val binding get() = _binding!!

    private lateinit var donorAdapter: DonorAdapter
    private val donorList = mutableListOf<Donor>()

    private val firestore by lazy { FirebaseFirestore.getInstance() }
    private var donorListener: ListenerRegistration? = null

    private var selectedBloodGroup: String = "All"
    private var currentSearchQuery: String = ""
    private var isRefreshing = false

    private var lastVisibleDonorDoc: com.google.firebase.firestore.DocumentSnapshot? = null
    private var isLoadingMoreDonors = false
    private var isLastDonorPage = false

    companion object {
        private const val PAGE_SIZE = 25L
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentDonorsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupToolbar()
        setupRecyclerView()
        setupSearch()
        setupBloodGroupChips()
        setupSortAndFilter()
        setupPullToRefresh()

        loadDonorsFromFirestore()
    }

    override fun onDestroyView() {
        donorListener?.remove()
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
        donorAdapter = DonorAdapter(
            onCallClick = { donor ->
                if (donor.phone.isNotBlank()) {
                    showEmergencyCallConfirmation(donor)
                } else {
                    Toast.makeText(requireContext(), "Phone number not available", Toast.LENGTH_SHORT).show()
                }
            },
            onViewDetailsClick = { donor ->
                showDonorDetailsDialog(donor)
            },
            onChatClick = { donor ->
                openChatWithDonor(donor)
            },
            onRequestClick = { _ ->
                try {
                    findNavController().navigate(R.id.action_donorsFragment_to_requestBloodFragment)
                } catch (_: Exception) {
                    try {
                        findNavController().navigate(R.id.requestBloodFragment)
                    } catch (_: Exception) {}
                }
            }
        )

        val lm = LinearLayoutManager(requireContext())
        binding.rvDonors.layoutManager = lm
        binding.rvDonors.adapter = donorAdapter

        binding.rvDonors.addOnScrollListener(object : androidx.recyclerview.widget.RecyclerView.OnScrollListener() {
            override fun onScrolled(recyclerView: androidx.recyclerview.widget.RecyclerView, dx: Int, dy: Int) {
                super.onScrolled(recyclerView, dx, dy)
                val totalItemCount = lm.itemCount
                val lastVisibleItem = lm.findLastVisibleItemPosition()

                if (!isLoadingMoreDonors && !isLastDonorPage && totalItemCount > 0 && lastVisibleItem >= totalItemCount - 4) {
                    loadMoreDonors()
                }
            }
        })
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

    // ================= BLOOD GROUP FILTER CHIPS =================
    private fun setupBloodGroupChips() {
        binding.chipGroupBlood.setOnCheckedStateChangeListener { _, checkedIds ->
            selectedBloodGroup = if (checkedIds.isEmpty()) {
                "All"
            } else {
                when (checkedIds.first()) {
                    binding.chipAPos.id -> "A+"
                    binding.chipANeg.id -> "A-"
                    binding.chipBPos.id -> "B+"
                    binding.chipBNeg.id -> "B-"
                    binding.chipOPos.id -> "O+"
                    binding.chipONeg.id -> "O-"
                    binding.chipABPos.id -> "AB+"
                    binding.chipABNeg.id -> "AB-"
                    else -> "All"
                }
            }
            applyFilters()
        }
    }

    // ================= SORT & FILTER =================
    private fun setupSortAndFilter() {
        binding.btnSort.setOnClickListener { showSortOptionsDialog() }
        binding.btnFilter.setOnClickListener { showFilterOptionsDialog() }
    }

    private fun showSortOptionsDialog() {
        val options = arrayOf("Name (A-Z)", "Name (Z-A)", "Blood Group", "Availability", "Recent")
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Sort Donors")
            .setItems(options) { _, which ->
                val sorted = when (which) {
                    0 -> donorList.sortedBy { it.name.lowercase() }
                    1 -> donorList.sortedByDescending { it.name.lowercase() }
                    2 -> donorList.sortedBy { it.bloodGroup }
                    3 -> donorList.sortedByDescending { it.isAvailable }
                    4 -> donorList.sortedByDescending { it.createdAt }
                    else -> donorList
                }
                donorList.clear()
                donorList.addAll(sorted)
                applyFilters()
            }
            .show()
    }

    private fun showFilterOptionsDialog() {
        val groups = arrayOf("All", "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-")
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Filter Blood Group")
            .setItems(groups) { _, which ->
                selectedBloodGroup = groups[which]
                // sync chip state
                when (selectedBloodGroup) {
                    "A+" -> binding.chipAPos.isChecked = true
                    "A-" -> binding.chipANeg.isChecked = true
                    "B+" -> binding.chipBPos.isChecked = true
                    "B-" -> binding.chipBNeg.isChecked = true
                    "O+" -> binding.chipOPos.isChecked = true
                    "O-" -> binding.chipONeg.isChecked = true
                    "AB+" -> binding.chipABPos.isChecked = true
                    "AB-" -> binding.chipABNeg.isChecked = true
                    else -> binding.chipAll.isChecked = true
                }
                applyFilters()
            }
            .show()
    }

    // ================= PULL TO REFRESH =================
    private fun setupPullToRefresh() {
        binding.swipeRefreshLayout.setColorSchemeResources(
            R.color.primary_red,
            R.color.primary_red_dark,
            R.color.success_green
        )
        binding.swipeRefreshLayout.setOnRefreshListener {
            loadDonorsFromFirestore()
        }
    }

    // ================= DATA LOADING =================
    private fun showLoading(show: Boolean) {
        if (_binding == null) return
        if (show) {
            binding.shimmerLayout.visibility = View.VISIBLE
            binding.shimmerLayout.startShimmer()
            binding.rvDonors.visibility = View.GONE
            binding.errorLayout.visibility = View.GONE
        } else {
            binding.shimmerLayout.stopShimmer()
            binding.shimmerLayout.visibility = View.GONE
        }
    }

    private fun loadDonorsFromFirestore() {
        if (isRefreshing) return
        isRefreshing = true

        if (!binding.swipeRefreshLayout.isRefreshing) {
            showLoading(true)
        }

        donorListener?.remove()
        lastVisibleDonorDoc = null
        isLastDonorPage = false
        isLoadingMoreDonors = false

        // 3-level fallback query: ordered -> unordered -> manual
        donorListener = firestore.collection(FirebaseUtils.Collections.DONORS)
            .whereEqualTo("isAvailable", true)
            .orderBy("name", Query.Direction.ASCENDING)
            .limit(PAGE_SIZE)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    tryUnorderedQuery()
                    return@addSnapshotListener
                }
                handleQueryResult(snapshot)
            }
    }

    private fun tryUnorderedQuery() {
        donorListener?.remove()
        donorListener = firestore.collection(FirebaseUtils.Collections.DONORS)
            .whereEqualTo("isAvailable", true)
            .limit(PAGE_SIZE)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    tryManualFiltering()
                    return@addSnapshotListener
                }
                handleQueryResult(snapshot)
            }
    }

    private fun tryManualFiltering() {
        donorListener?.remove()
        donorListener = firestore.collection(FirebaseUtils.Collections.DONORS)
            .limit(PAGE_SIZE)
            .addSnapshotListener { snapshot, error ->
                isRefreshing = false
                binding.swipeRefreshLayout.isRefreshing = false
                showLoading(false)

                donorList.clear()
                val docs = snapshot?.documents ?: emptyList()
                docs.forEach { doc ->
                    val isAvailable = doc.getBoolean("isAvailable") ?: true
                    if (isAvailable) {
                        parseDonor(doc)?.let { donorList.add(it) }
                    }
                }
                lastVisibleDonorDoc = docs.lastOrNull()
                isLastDonorPage = docs.size < PAGE_SIZE

                // Fallback to default verified donors
                val existingIds = donorList.map { it.id }.toSet()
                val defaults = DirectoryRepository.getDefaultDonors().filter { it.id !in existingIds }
                donorList.addAll(defaults)
                donorList.sortBy { it.name.lowercase() }

                applyFilters()
            }
    }

    private fun handleQueryResult(snapshot: com.google.firebase.firestore.QuerySnapshot?) {
        isRefreshing = false
        binding.swipeRefreshLayout.isRefreshing = false
        showLoading(false)

        donorList.clear()
        val docs = snapshot?.documents ?: emptyList()
        docs.forEach { doc ->
            parseDonor(doc)?.let { donorList.add(it) }
        }
        lastVisibleDonorDoc = docs.lastOrNull()
        isLastDonorPage = docs.size < PAGE_SIZE

        // Merge verified default donors for full coverage
        val existingIds = donorList.map { it.id }.toSet()
        val defaults = DirectoryRepository.getDefaultDonors().filter { it.id !in existingIds }
        donorList.addAll(defaults)
        donorList.sortBy { it.name.lowercase() }

        applyFilters()
    }

    private fun loadMoreDonors() {
        val lastDoc = lastVisibleDonorDoc ?: return
        if (isLoadingMoreDonors || isLastDonorPage) return
        isLoadingMoreDonors = true

        firestore.collection(FirebaseUtils.Collections.DONORS)
            .whereEqualTo("isAvailable", true)
            .orderBy("name", Query.Direction.ASCENDING)
            .startAfter(lastDoc)
            .limit(PAGE_SIZE)
            .get()
            .addOnSuccessListener { snapshot ->
                if (_binding == null) return@addOnSuccessListener
                isLoadingMoreDonors = false

                val docs = snapshot.documents
                if (docs.isEmpty() || docs.size < PAGE_SIZE) {
                    isLastDonorPage = true
                }
                if (docs.isNotEmpty()) {
                    lastVisibleDonorDoc = docs.lastOrNull()
                    val newDonors = mutableListOf<Donor>()
                    docs.forEach { doc ->
                        parseDonor(doc)?.let { newDonors.add(it) }
                    }
                    val existingIds = donorList.map { it.id }.toSet()
                    val deduped = newDonors.filter { it.id !in existingIds }
                    donorList.addAll(deduped)
                    applyFilters()
                }
            }
            .addOnFailureListener {
                loadMoreDonorsUnordered(lastDoc)
            }
    }

    private fun loadMoreDonorsUnordered(lastDoc: com.google.firebase.firestore.DocumentSnapshot) {
        firestore.collection(FirebaseUtils.Collections.DONORS)
            .whereEqualTo("isAvailable", true)
            .startAfter(lastDoc)
            .limit(PAGE_SIZE)
            .get()
            .addOnSuccessListener { snapshot ->
                if (_binding == null) return@addOnSuccessListener
                isLoadingMoreDonors = false

                val docs = snapshot.documents
                if (docs.isEmpty() || docs.size < PAGE_SIZE) {
                    isLastDonorPage = true
                }
                if (docs.isNotEmpty()) {
                    lastVisibleDonorDoc = docs.lastOrNull()
                    val newDonors = mutableListOf<Donor>()
                    docs.forEach { doc ->
                        parseDonor(doc)?.let { newDonors.add(it) }
                    }
                    val existingIds = donorList.map { it.id }.toSet()
                    val deduped = newDonors.filter { it.id !in existingIds }
                    donorList.addAll(deduped)
                    applyFilters()
                }
            }
            .addOnFailureListener {
                isLoadingMoreDonors = false
            }
    }

    private fun parseDonor(doc: com.google.firebase.firestore.DocumentSnapshot): Donor? {
        return try {
            val donor = doc.toObject(Donor::class.java)
            donor?.id = doc.id
            if (donor == null || donor.name.isBlank()) {
                createManualDonor(doc)
            } else donor
        } catch (_: Exception) {
            createManualDonor(doc)
        }
    }

    private fun createManualDonor(doc: com.google.firebase.firestore.DocumentSnapshot): Donor? {
        return try {
            fun parseTs(value: Any?): Long {
                return when (value) {
                    is Long -> value
                    is Number -> value.toLong()
                    is com.google.firebase.Timestamp -> value.toDate().time
                    else -> 0L
                }
            }
            Donor(
                id = doc.id,
                userId = doc.getString("userId") ?: doc.id,
                name = doc.getString("name") ?: "Unknown Donor",
                phone = doc.getString("phone") ?: "",
                bloodGroup = doc.getString("bloodGroup") ?: "Unknown",
                district = doc.getString("district") ?: "",
                location = doc.getString("location") ?: "",
                email = doc.getString("email") ?: "",
                lastDonation = doc.getString("lastDonation") ?: "",
                imageUrl = doc.getString("imageUrl") ?: "",
                updatedAt = parseTs(doc.get("updatedAt")),
                createdAt = parseTs(doc.get("createdAt")),
                lastActive = parseTs(doc.get("lastActive")),
                lastDonationDate = parseTs(doc.get("lastDonationDate")),
                isAvailable = doc.getBoolean("isAvailable") ?: true,
                notificationEnabled = doc.getBoolean("notificationEnabled") ?: true,
                isLoggedIn = doc.getBoolean("isLoggedIn") ?: true,
                isActive = doc.getBoolean("isActive") ?: true,
                canDonate = doc.getBoolean("canDonate") ?: true,
                hasFcmToken = doc.getBoolean("hasFcmToken") ?: true,
                fcmToken = doc.getString("fcmToken") ?: ""
            )
        } catch (e: Exception) {
            Timber.e("Failed to manual parse donor: ${e.message}")
            null
        }
    }

    // ================= FILTER & DISPLAY =================
    @SuppressLint("SetTextI18n")
    private fun applyFilters() {
        if (_binding == null) return

        var filtered = donorList.toList()
        if (selectedBloodGroup != "All") {
            filtered = filtered.filter { it.bloodGroup.equals(selectedBloodGroup, ignoreCase = true) }
        }
        if (currentSearchQuery.isNotBlank()) {
            val q = currentSearchQuery.trim()
            filtered = filtered.filter { donor ->
                donor.name.contains(q, true) ||
                donor.bloodGroup.contains(q, true) ||
                donor.location.contains(q, true) ||
                donor.district.contains(q, true) ||
                donor.phone.contains(q, true)
            }
        }

        binding.tvDonorCountBadge.text = "${filtered.size} Donors"
        donorAdapter.submitList(ArrayList(filtered))

        if (filtered.isEmpty()) {
            binding.tvNoDonors.text = when {
                selectedBloodGroup != "All" && currentSearchQuery.isNotBlank() ->
                    "No $selectedBloodGroup donors found for \"$currentSearchQuery\""
                selectedBloodGroup != "All" ->
                    "No $selectedBloodGroup donors available right now"
                currentSearchQuery.isNotBlank() ->
                    "No donors found matching \"$currentSearchQuery\""
                else ->
                    "No available donors at the moment"
            }
            binding.errorLayout.visibility = View.VISIBLE
            binding.rvDonors.visibility = View.GONE
        } else {
            binding.errorLayout.visibility = View.GONE
            binding.rvDonors.visibility = View.VISIBLE
        }
    }

    // ================= ACTIONS =================
    private fun showDonorDetailsDialog(donor: Donor) {
        val sheet = DonorDetailsDialogFragment.newInstance(donor)
        sheet.show(parentFragmentManager, "DonorDetailsDialog")
    }

    private fun showEmergencyCallConfirmation(donor: Donor) {
        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Emergency Call Notice")
            .setMessage("Please ensure this call is for a verified, urgent blood donation requirement.\n\nProceed to call ${donor.name}?")
            .setPositiveButton("Proceed to Call") { _, _ ->
                val cleanPhone = donor.phone.replace(" ", "").trim()
                try {
                    startActivity(Intent(Intent.ACTION_DIAL, "tel:$cleanPhone".toUri()))
                } catch (_: Exception) {
                    Toast.makeText(requireContext(), "Unable to open phone dialer", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun openChatWithDonor(donor: Donor) {
        val targetRecipientId = donor.userId.ifBlank { donor.id }
        if (targetRecipientId.isNotBlank()) {
            val bundle = ConversationFragment.newBundle(
                recipientId = targetRecipientId,
                recipientName = donor.name,
                recipientBloodGroup = donor.bloodGroup,
                recipientPhone = donor.phone,
                recipientImage = donor.imageUrl
            )
            try {
                findNavController().navigate(R.id.action_donorsFragment_to_conversationFragment, bundle)
            } catch (_: Exception) {
                try {
                    findNavController().navigate(R.id.conversationFragment, bundle)
                } catch (_: Exception) {}
            }
        }
    }
}
