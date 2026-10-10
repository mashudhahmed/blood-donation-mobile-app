package com.project.donateblood.fragments

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.net.toUri
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.project.donateblood.R
import com.project.donateblood.adapter.BloodRequestFeedAdapter
import com.project.donateblood.databinding.FragmentUrgentRequestsBinding
import com.project.donateblood.models.BloodRequest
import com.project.donateblood.utils.BloodCompatibility
import com.project.donateblood.utils.FirebaseUtils
import com.project.donateblood.viewmodels.UserViewModel
import timber.log.Timber

class UrgentRequestsFragment : Fragment() {

    private var _binding: FragmentUrgentRequestsBinding? = null
    private val binding get() = _binding!!

    private val auth by lazy { FirebaseAuth.getInstance() }
    private val firestore by lazy { FirebaseFirestore.getInstance() }
    private val userViewModel: UserViewModel by activityViewModels()

    private lateinit var feedAdapter: BloodRequestFeedAdapter
    private var requestsListener: ListenerRegistration? = null

    private val allRequestsList = mutableListOf<BloodRequest>()
    private var currentSortMode = SortMode.URGENT_FIRST
    private var currentUserBloodGroup: String = ""

    private enum class SortMode(val label: String) {
        URGENT_FIRST("Sort: Urgent First"),
        DATE_SOONEST("Sort: Soonest Date"),
        MOST_UNITS("Sort: Most Units"),
        NEWEST_FIRST("Sort: Newest First")
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentUrgentRequestsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        setupToolbar()
        setupRecyclerView()
        setupSearch()
        setupFilterChips()
        setupSortButton()
        setupSwipeRefresh()
        setupEmptyState()
        observeUserBloodGroup()

        loadRequestsFromFirestore()
    }

    override fun onDestroyView() {
        requestsListener?.remove()
        _binding = null
        super.onDestroyView()
    }

    // ================= TOOLBAR SETUP =================
    private fun setupToolbar() {
        binding.btnBack.setOnClickListener {
            findNavController().navigateUp()
        }
    }

    // ================= USER PROFILE OBSERVATION =================
    private fun observeUserBloodGroup() {
        userViewModel.userBloodGroup.observe(viewLifecycleOwner) { bloodGroup ->
            val cleanGroup = bloodGroup?.trim()?.uppercase().orEmpty()
            if (currentUserBloodGroup != cleanGroup) {
                currentUserBloodGroup = cleanGroup
                feedAdapter.updateUserBloodGroup(currentUserBloodGroup)
                // If user is currently filtering by "Matches My Blood", re-apply filter
                if (binding.chipMatchesMyBlood.isChecked) {
                    applyFiltersAndSort()
                }
            }
        }
    }

    // ================= RECYCLER VIEW SETUP =================
    private fun setupRecyclerView() {
        feedAdapter = BloodRequestFeedAdapter(
            currentUserBloodGroup = currentUserBloodGroup,
            onCallClick = { request -> handleCallClick(request) },
            onChatClick = { request -> openChatWithRequester(request) },
            onShareClick = { request -> handleShareClick(request) },
            onDirectionsClick = { request -> handleDirectionsClick(request) },
            onHelpClick = { request -> handleHelpClick(request) },
            onItemClick = { request -> showRequestDetailsDialog(request) }
        )

        binding.rvUrgentRequests.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = feedAdapter
            setHasFixedSize(false)
        }
    }

    // ================= SEARCH SETUP =================
    private fun setupSearch() {
        binding.etSearch.addTextChangedListener { text ->
            val query = text?.toString()?.trim().orEmpty()
            binding.btnClearSearch.visibility = if (query.isNotEmpty()) View.VISIBLE else View.GONE
            applyFiltersAndSort()
        }

        binding.btnClearSearch.setOnClickListener {
            binding.etSearch.text?.clear()
        }
    }

    // ================= FILTER CHIPS SETUP =================
    private fun setupFilterChips() {
        binding.chipGroupFilters.setOnCheckedStateChangeListener { _, checkedIds ->
            if (checkedIds.isEmpty()) {
                binding.chipAll.isChecked = true
                return@setOnCheckedStateChangeListener
            }

            if (binding.chipMatchesMyBlood.isChecked && currentUserBloodGroup.isBlank()) {
                toast("Blood group not set in profile. Showing all requests.")
            }

            applyFiltersAndSort()
        }
    }

    // ================= SORT BUTTON SETUP =================
    private fun setupSortButton() {
        binding.btnSort.text = currentSortMode.label
        binding.btnSort.setOnClickListener {
            showSortDialog()
        }
    }

    private fun showSortDialog() {
        val options = arrayOf(
            SortMode.URGENT_FIRST.label,
            SortMode.DATE_SOONEST.label,
            SortMode.MOST_UNITS.label,
            SortMode.NEWEST_FIRST.label
        )
        val currentIndex = SortMode.values().indexOf(currentSortMode)

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Sort Requests")
            .setSingleChoiceItems(options, currentIndex) { dialog, which ->
                currentSortMode = SortMode.values()[which]
                binding.btnSort.text = currentSortMode.label
                applyFiltersAndSort()
                dialog.dismiss()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ================= SWIPE TO REFRESH =================
    private fun setupSwipeRefresh() {
        binding.swipeRefreshLayout.setColorSchemeResources(R.color.primary_red)
        binding.swipeRefreshLayout.setOnRefreshListener {
            loadRequestsFromFirestore()
        }
    }

    // ================= EMPTY STATE =================
    private fun setupEmptyState() {
        binding.btnResetFilters.setOnClickListener {
            binding.etSearch.text?.clear()
            binding.chipGroupFilters.check(R.id.chipAll)
            currentSortMode = SortMode.URGENT_FIRST
            binding.btnSort.text = currentSortMode.label
            applyFiltersAndSort()
        }
    }

    // ================= FIRESTORE DATA LOADING =================
    private fun loadRequestsFromFirestore() {
        if (_binding == null) return

        if (!binding.swipeRefreshLayout.isRefreshing) {
            showLoading(true)
        }

        requestsListener?.remove()

        // Query only pending (active) blood requests
        requestsListener = firestore.collection(FirebaseUtils.Collections.REQUESTS)
            .whereEqualTo("status", "pending")
            .addSnapshotListener { snapshot, error ->
                if (_binding == null) return@addSnapshotListener

                showLoading(false)
                binding.swipeRefreshLayout.isRefreshing = false

                if (error != null) {
                    Timber.tag("UrgentRequests").e("Query error: ${error.message}")
                    toast("Failed to refresh requests: ${error.localizedMessage}")
                    if (allRequestsList.isEmpty()) {
                        showEmptyState(true)
                    }
                    return@addSnapshotListener
                }

                allRequestsList.clear()
                snapshot?.documents?.forEach { doc ->
                    try {
                        val req = parseBloodRequestFromDocument(doc)
                        if (req != null) {
                            allRequestsList.add(req)
                        }
                    } catch (e: Exception) {
                        Timber.tag("UrgentRequests").e("Error parsing request ${doc.id}: ${e.message}")
                    }
                }

                val totalActive = allRequestsList.size
                binding.tvActiveCountBadge.text = "$totalActive Active"

                applyFiltersAndSort()
            }
    }

    private fun parseBloodRequestFromDocument(doc: com.google.firebase.firestore.DocumentSnapshot): BloodRequest? {
        return try {
            val req = doc.toObject(BloodRequest::class.java)
            if (req != null && req.hospital.isNotBlank()) {
                req.copy(id = doc.id)
            } else {
                createManualBloodRequest(doc)
            }
        } catch (e: Exception) {
            createManualBloodRequest(doc)
        }
    }

    private fun createManualBloodRequest(doc: com.google.firebase.firestore.DocumentSnapshot): BloodRequest? {
        return try {
            val data = doc.data ?: return null
            BloodRequest(
                id = doc.id,
                patientName = data["patientName"] as? String ?: "",
                hospital = data["hospital"] as? String ?: "",
                phone = data["phone"] as? String ?: "",
                units = (data["units"] as? Number)?.toInt() ?: 1,
                bloodGroup = data["bloodGroup"] as? String ?: "",
                date = data["date"] as? String ?: "",
                time = data["time"] as? String ?: "",
                district = data["district"] as? String ?: "",
                location = data["location"] as? String ?: "",
                requesterId = data["requesterId"] as? String ?: "",
                urgency = data["urgency"] as? String ?: "normal",
                status = data["status"] as? String ?: "pending"
            )
        } catch (_: Exception) {
            null
        }
    }

    // ================= FILTER & SORT CORE LOGIC =================
    @SuppressLint("SetTextI18n")
    private fun applyFiltersAndSort() {
        if (_binding == null) return

        val searchQuery = binding.etSearch.text?.toString()?.trim()?.lowercase().orEmpty()
        val checkedChipId = binding.chipGroupFilters.checkedChipId

        // 1. FILTERING
        val filtered = allRequestsList.filter { req ->
            // Medical compatibility / Category Filter
            val matchesCategory = when (checkedChipId) {
                R.id.chipMatchesMyBlood -> {
                    if (currentUserBloodGroup.isNotBlank()) {
                        BloodCompatibility.isCompatible(currentUserBloodGroup, req.bloodGroup)
                    } else {
                        true
                    }
                }
                R.id.chipCriticalOnly -> {
                    req.urgency.equals("high", ignoreCase = true) ||
                            req.urgency.equals("urgent", ignoreCase = true) ||
                            req.units >= 3
                }
                R.id.chipAPos -> req.bloodGroup.equals("A+", ignoreCase = true)
                R.id.chipANeg -> req.bloodGroup.equals("A-", ignoreCase = true)
                R.id.chipBPos -> req.bloodGroup.equals("B+", ignoreCase = true)
                R.id.chipBNeg -> req.bloodGroup.equals("B-", ignoreCase = true)
                R.id.chipOPos -> req.bloodGroup.equals("O+", ignoreCase = true)
                R.id.chipONeg -> req.bloodGroup.equals("O-", ignoreCase = true)
                R.id.chipABPos -> req.bloodGroup.equals("AB+", ignoreCase = true)
                R.id.chipABNeg -> req.bloodGroup.equals("AB-", ignoreCase = true)
                else -> true // chipAll or default
            }

            // Search query filter
            val matchesSearch = if (searchQuery.isEmpty()) {
                true
            } else {
                req.patientName.lowercase().contains(searchQuery) ||
                        req.hospital.lowercase().contains(searchQuery) ||
                        req.district.lowercase().contains(searchQuery) ||
                        req.location.lowercase().contains(searchQuery) ||
                        req.bloodGroup.lowercase().contains(searchQuery)
            }

            matchesCategory && matchesSearch
        }.toMutableList()

        // 2. SORTING
        when (currentSortMode) {
            SortMode.URGENT_FIRST -> {
                filtered.sortWith(
                    compareByDescending<BloodRequest> {
                        it.urgency.equals("high", ignoreCase = true) ||
                                it.urgency.equals("urgent", ignoreCase = true)
                    }.thenByDescending { it.units }
                )
            }
            SortMode.DATE_SOONEST -> {
                filtered.sortBy { it.date.ifBlank { "9999-99-99" } }
            }
            SortMode.MOST_UNITS -> {
                filtered.sortByDescending { it.units }
            }
            SortMode.NEWEST_FIRST -> {
                filtered.sortByDescending { it.createdAt.seconds }
            }
        }

        // 3. UPDATE UI
        feedAdapter.submitList(filtered)

        val count = filtered.size
        binding.tvResultsCount.text = when {
            count == 0 -> "No requests found"
            count == 1 -> "Showing 1 urgent request"
            else -> "Showing $count urgent requests"
        }

        showEmptyState(count == 0)
    }

    private fun showLoading(isLoading: Boolean) {
        if (_binding == null) return
        if (isLoading) {
            binding.shimmerLayout.visibility = View.VISIBLE
            binding.shimmerLayout.startShimmer()
            binding.rvUrgentRequests.visibility = View.GONE
            binding.layoutEmpty.visibility = View.GONE
        } else {
            binding.shimmerLayout.stopShimmer()
            binding.shimmerLayout.visibility = View.GONE
            binding.rvUrgentRequests.visibility = View.VISIBLE
        }
    }

    private fun showEmptyState(show: Boolean) {
        if (_binding == null) return
        if (show) {
            binding.layoutEmpty.visibility = View.VISIBLE
            binding.rvUrgentRequests.visibility = View.GONE
        } else {
            binding.layoutEmpty.visibility = View.GONE
            binding.rvUrgentRequests.visibility = View.VISIBLE
        }
    }

    // ================= ACTIONS =================
    private fun handleCallClick(request: BloodRequest) {
        if (request.phone.isBlank()) {
            toast("Phone number not provided")
            return
        }

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Emergency Call Notice")
            .setMessage("You are about to dial the emergency contact for patient ${request.patientName.ifBlank { "Patient" }} (${request.bloodGroup}) at ${request.hospital}.\n\nProceed to call ${request.phone}?")
            .setPositiveButton("Proceed to Call") { _, _ ->
                val sanitized = request.phone.replace(" ", "")
                try {
                    startActivity(Intent(Intent.ACTION_DIAL, "tel:$sanitized".toUri()))
                } catch (_: Exception) {
                    toast("Unable to launch phone dialer")
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun openChatWithRequester(request: BloodRequest) {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            toast("Please sign in to chat")
            findNavController().navigate(R.id.loginFragment)
            return
        }

        if (request.requesterId == currentUser.uid) {
            toast("This is your own blood request")
            return
        }

        if (request.requesterId.isNotBlank()) {
            val bundle = ConversationFragment.newBundle(
                recipientId = request.requesterId,
                recipientName = request.patientName.ifBlank { "Emergency Requester" },
                recipientBloodGroup = request.bloodGroup,
                recipientPhone = request.phone,
                recipientImage = ""
            )
            try {
                findNavController().navigate(R.id.action_urgentRequestsFragment_to_conversationFragment, bundle)
            } catch (e: Exception) {
                Timber.e(e, "Navigation to conversation failed")
                fallbackSms(request)
            }
        } else {
            fallbackSms(request)
        }
    }

    private fun fallbackSms(request: BloodRequest) {
        if (request.phone.isBlank()) {
            toast("Contact phone number not available")
            return
        }
        val sanitized = request.phone.replace(" ", "")
        val prefilledMsg = "Hello, I saw your urgent request for ${request.bloodGroup} blood at ${request.hospital} on BloodLink. I would like to help."
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = "smsto:$sanitized".toUri()
                putExtra("sms_body", prefilledMsg)
            }
            startActivity(intent)
        } catch (_: Exception) {
            toast("Unable to open messaging app")
        }
    }

    private fun handleShareClick(request: BloodRequest) {
        val locationStr = when {
            request.location.isNotBlank() && request.district.isNotBlank() -> "${request.location}, ${request.district}"
            request.district.isNotBlank() -> request.district
            else -> request.location
        }

        val shareMessage = buildString {
            append("EMERGENCY BLOOD REQUEST\n")
            append("Blood Group: ${request.bloodGroup}\n")
            append("Units Needed: ${request.units}\n")
            if (request.patientName.isNotBlank()) append("Patient: ${request.patientName}\n")
            append("Hospital: ${request.hospital}\n")
            if (locationStr.isNotBlank()) append("Location: $locationStr\n")
            if (request.date.isNotBlank()) append("Required Date: ${request.date} ${request.time}\n")
            if (request.phone.isNotBlank()) append("Contact: ${request.phone}\n")
            append("\nBroadcast via BloodLink App. Please share to save a life!")
        }

        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "Urgent ${request.bloodGroup} Blood Request")
            putExtra(Intent.EXTRA_TEXT, shareMessage)
        }
        startActivity(Intent.createChooser(shareIntent, "Share Blood Emergency"))
    }

    private fun handleDirectionsClick(request: BloodRequest) {
        val destinationQuery = buildString {
            if (request.hospital.isNotBlank()) append(request.hospital)
            if (request.location.isNotBlank()) append(", ${request.location}")
            if (request.district.isNotBlank()) append(", ${request.district}")
        }.trim(',', ' ')

        if (destinationQuery.isBlank()) {
            toast("Location details not specified")
            return
        }

        val gmmIntentUri = "geo:0,0?q=${Uri.encode(destinationQuery)}".toUri()
        val mapIntent = Intent(Intent.ACTION_VIEW, gmmIntentUri)
        try {
            startActivity(mapIntent)
        } catch (_: Exception) {
            val webMapUri = "https://www.google.com/maps/search/?api=1&query=${Uri.encode(destinationQuery)}".toUri()
            try {
                startActivity(Intent(Intent.ACTION_VIEW, webMapUri))
            } catch (_: Exception) {
                toast("Unable to open map")
            }
        }
    }

    private fun handleHelpClick(request: BloodRequest) {
        val currentUser = auth.currentUser
        if (currentUser != null && request.requesterId == currentUser.uid) {
            toast("This is your own blood request")
            return
        }

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Offer Blood Donation")
            .setMessage("Would you like to message or call the requester for ${request.patientName.ifBlank { "Patient" }} (${request.bloodGroup}) at ${request.hospital}?")
            .setPositiveButton("Message on BloodLink") { _, _ ->
                openChatWithRequester(request)
            }
            .setNeutralButton("Call Contact") { _, _ ->
                handleCallClick(request)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showRequestDetailsDialog(request: BloodRequest) {
        val detailsMsg = buildString {
            append("Blood Group: ${request.bloodGroup}\n")
            if (request.patientName.isNotBlank()) append("Patient: ${request.patientName}\n")
            append("Hospital: ${request.hospital}\n")
            val loc = if (request.district.isNotBlank()) "${request.location}, ${request.district}".trim(',', ' ') else request.location
            if (loc.isNotBlank()) append("Location: $loc\n")
            append("Units Needed: ${request.units}\n")
            if (request.date.isNotBlank()) append("Required Date: ${request.date} ${request.time}\n")
            if (request.phone.isNotBlank()) append("Contact Phone: ${request.phone}\n")
            append("Urgency: ${request.urgency.replaceFirstChar { it.uppercase() }}\n")
            append("Status: ${request.status.replaceFirstChar { it.uppercase() }}")
        }

        MaterialAlertDialogBuilder(requireContext())
            .setTitle("Blood Request Details")
            .setMessage(detailsMsg)
            .setPositiveButton("I Can Help") { _, _ ->
                handleHelpClick(request)
            }
            .setNeutralButton("Share") { _, _ ->
                handleShareClick(request)
            }
            .setNegativeButton("Close", null)
            .show()
    }

    private fun toast(msg: String) {
        if (isAdded) {
            Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
        }
    }
}
