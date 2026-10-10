package com.project.donateblood.fragments

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import android.net.Uri
import androidx.core.content.edit
import androidx.core.net.toUri
import androidx.core.view.GravityCompat
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.tabs.TabLayout
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import com.project.donateblood.MainActivity
import com.project.donateblood.R
import com.project.donateblood.adapter.BloodBankAdapter
import com.project.donateblood.adapter.DonorAdapter
import com.project.donateblood.adapter.HomeUrgentRequestAdapter
import com.project.donateblood.adapter.HospitalAdapter
import com.project.donateblood.databinding.FragmentHomeBinding
import com.project.donateblood.models.BloodBank
import com.project.donateblood.models.BloodRequest
import com.project.donateblood.models.Donor
import com.project.donateblood.models.Hospital
import com.project.donateblood.repository.DirectoryRepository
import com.project.donateblood.utils.FirebaseUtils
import com.project.donateblood.utils.ProfileImageManager
import com.project.donateblood.viewmodels.UserViewModel
import kotlinx.coroutines.launch
import timber.log.Timber

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!

    private lateinit var donorAdapter: DonorAdapter
    private val donorList = mutableListOf<Donor>()

    private lateinit var urgentRequestAdapter: HomeUrgentRequestAdapter
    private val urgentRequestList = mutableListOf<BloodRequest>()
    private var urgentRequestsListener: ListenerRegistration? = null

    // Directory Tabs (Hospitals & Blood Banks)
    private lateinit var hospitalAdapter: HospitalAdapter
    private lateinit var bloodBankAdapter: BloodBankAdapter
    private val directoryRepository = DirectoryRepository()
    private var allHospitals: List<Hospital> = emptyList()
    private var filteredHospitals: List<Hospital> = emptyList()
    private var allBloodBanks: List<BloodBank> = emptyList()
    private var filteredBloodBanks: List<BloodBank> = emptyList()
    private var selectedHospitalFilter: String = "All"
    private var selectedBloodBankFilter: String = "All"

    private lateinit var firestore: FirebaseFirestore
    private lateinit var auth: FirebaseAuth
    private var donorListener: ListenerRegistration? = null

    // Add ViewModels for data management
    private lateinit var userViewModel: UserViewModel

    // Auto-refresh properties
    companion object {
        private const val REFRESH_INTERVAL = 10 * 60 * 1000L // 10 minutes
        private const val MIN_REFRESH_INTERVAL = 2 * 60 * 1000L // 2 minutes minimum
    }

    private var lastRefreshTime = 0L
    private val handler = Handler(Looper.getMainLooper())
    private val refreshRunnable = object : Runnable {
        override fun run() {
            if (shouldRefresh()) {
                loadRealDonorsFromFirestore()
            }
            handler.postDelayed(this, REFRESH_INTERVAL)
        }
    }
    private var isRefreshing = false
    private var refreshAttempts = 0
    private val maxRefreshAttempts = 3
    private var networkAvailable = true
    private var selectedBloodGroup: String = "All"
    private var currentSearchQuery: String = ""

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        auth = FirebaseAuth.getInstance()
        firestore = FirebaseFirestore.getInstance()

        // Initialize ViewModels
        userViewModel = ViewModelProvider(requireActivity())[UserViewModel::class.java]

        setupViews()
        setupHeroDashboard()
        setupUrgentRequestsRecyclerView()
        setupRecyclerView()
        setupNavigationDrawer()
        setupClickListeners()
        setupPullToRefresh()
        setupNavigationViewHeader()
        setupNetworkMonitor()

        // Load initial data
        loadInitialData()

        // Test query to debug
        testFirestoreConnection()

        checkPrivacyPolicyAcceptance()
    }

    override fun onResume() {
        super.onResume()
        // Refresh user data when fragment resumes
        userViewModel.loadUserData()

        // Smart refresh logic
        if (shouldRefresh()) {
            loadUrgentRequestsFromFirestore()
            loadRealDonorsFromFirestore()
        }

        startAutoRefresh()
    }

    override fun onPause() {
        super.onPause()
        stopAutoRefresh()
    }

    override fun onDestroyView() {
        donorListener?.remove()
        urgentRequestsListener?.remove()
        stopAutoRefresh()
        handler.removeCallbacksAndMessages(null)
        _binding = null
        super.onDestroyView()
    }

    // ---------------- FIXED: FIRESTORE CONNECTION TEST ----------------
    private fun testFirestoreConnection() {
        Timber.tag("FirestoreDebug").d("=== TESTING FIRESTORE CONNECTION ===")

        firestore.collection(FirebaseUtils.Collections.DONORS)
            .limit(1)
            .get()
            .addOnSuccessListener { snapshot ->
                if (snapshot.isEmpty) {
                    Timber.tag("FirestoreDebug").w("⚠️ No donors in collection!")
                    Toast.makeText(requireContext(), "Database is empty", Toast.LENGTH_SHORT).show()
                } else {
                    Timber.tag("FirestoreDebug").d("✅ Firestore connected successfully")
                    snapshot.documents.forEach { doc ->
                        Timber.tag("FirestoreDebug").d("Sample donor: ${doc.get("name")}, isLoggedIn: ${doc.get("isLoggedIn")}, isAvailable: ${doc.get("isAvailable")}")
                    }
                }
            }
            .addOnFailureListener { error ->
                Timber.tag("FirestoreDebug").e("❌ Firestore connection failed: ${error.message}")
            }
    }

    // ---------------- UI ----------------
    @SuppressLint("SetTextI18n")
    private fun setupViews() {
        binding.tvTitle.text = "BloodLink"
        binding.etSearch.hint = "Search donors by name, location, or district"

        // Hide clickable overlay since feature is removed
        binding.clickableOverlay.visibility = View.GONE

        // Initialize empty state
        binding.errorLayout.visibility = View.GONE
        binding.layoutUrgentEmpty.visibility = View.GONE
        binding.layoutHospitalEmpty.visibility = View.GONE
        binding.layoutBloodBankEmpty.visibility = View.GONE

        // Setup Directory Tabs
        setupDirectoryTabs()

        // Setup blood group quick filter chips
        setupBloodGroupChips()

        // Setup hospital and blood bank filter chips
        setupHospitalFilterChips()
        setupBloodBankFilterChips()
    }

    @SuppressLint("SetTextI18n")
    private fun setupHeroDashboard() {
        // Live update hero name
        userViewModel.userName.observe(viewLifecycleOwner) { name ->
            if (!name.isNullOrBlank() && name != "Guest") {
                binding.tvHeroGreetingName.text = name
            } else {
                val user = auth.currentUser
                binding.tvHeroGreetingName.text = user?.displayName ?: "Friend"
            }
        }

        // Live update donor persona badge
        userViewModel.userBloodGroup.observe(viewLifecycleOwner) { bg ->
            updateHeroDonorBadge(bg, userViewModel.isAvailable.value ?: true)
        }

        userViewModel.isAvailable.observe(viewLifecycleOwner) { isAvail ->
            updateHeroDonorBadge(userViewModel.userBloodGroup.value ?: "", isAvail)
        }

        // Hero quick action buttons
        binding.btnHeroRequestBlood.setOnClickListener {
            navigateToRequestBloodFragment()
        }

        binding.btnHeroFindDonors.setOnClickListener {
            binding.nestedScrollViewHome.smoothScrollTo(0, binding.tabLayoutDirectory.top)
            binding.etSearch.requestFocus()
        }

        binding.btnViewAllUrgentRequests.setOnClickListener {
            navigateToHistoryFragment()
        }
    }

    @SuppressLint("SetTextI18n")
    private fun updateHeroDonorBadge(bloodGroup: String, isAvailable: Boolean) {
        if (!isAdded || _binding == null) return
        if (bloodGroup.isNotBlank()) {
            binding.tvHeroDonorBadge.text = "$bloodGroup • ${if (isAvailable) "Available" else "Unavailable"}"
            binding.tvHeroDonorBadge.setTextColor(
                requireContext().getColor(if (isAvailable) R.color.primary_red else R.color.text_secondary)
            )
        } else {
            binding.tvHeroDonorBadge.text = "Donor Ready"
            binding.tvHeroDonorBadge.setTextColor(requireContext().getColor(R.color.primary_red))
        }
    }

    // ---------------- URGENT REQUESTS RECYCLER VIEW ----------------
    private fun setupUrgentRequestsRecyclerView() {
        urgentRequestAdapter = HomeUrgentRequestAdapter(
            onCallClick = { request ->
                if (request.phone.isNotEmpty()) {
                    makePhoneCall(request.phone)
                } else {
                    toast("Requester phone number not available")
                }
            },
            onChatClick = { request ->
                openChatWithRequester(request)
            },
            onHelpClick = { request ->
                handleHelpClick(request)
            },
            onItemClick = { request ->
                showRequestDetailsDialog(request)
            }
        )

        binding.rvUrgentRequests.layoutManager = LinearLayoutManager(
            requireContext(),
            LinearLayoutManager.HORIZONTAL,
            false
        )
        binding.rvUrgentRequests.adapter = urgentRequestAdapter
    }

    private fun showLoading(show: Boolean) {
        if (!isAdded || _binding == null) return
        if (show) {
            binding.shimmerLayout.visibility = View.VISIBLE
            binding.shimmerLayout.startShimmer()
            binding.rvDonors.visibility = View.GONE
            binding.errorLayout.visibility = View.GONE
            binding.progressBar.visibility = View.GONE
        } else {
            binding.shimmerLayout.stopShimmer()
            binding.shimmerLayout.visibility = View.GONE
            binding.progressBar.visibility = View.GONE
        }
    }

    // ---------------- RECYCLER VIEW ----------------
    private fun setupRecyclerView() {
        donorAdapter = DonorAdapter(
            onCallClick = { donor ->
                if (donor.phone.isNotEmpty()) {
                    showEmergencyCallConfirmation(donor)
                } else {
                    toast("Phone number not available")
                }
            },
            onViewDetailsClick = { donor ->
                showDonorDetailsDialog(donor)
            },
            onChatClick = { donor ->
                openChatWithDonor(donor)
            },
            onRequestClick = { _ ->
                navigateToRequestBloodFragment()
            }
        )
        binding.rvDonors.layoutManager = LinearLayoutManager(requireContext())
        binding.rvDonors.adapter = donorAdapter

        // Setup Hospitals RecyclerView
        hospitalAdapter = HospitalAdapter(
            onCallClick = { hospital ->
                dialPhoneNumber(if (hospital.emergencyHotline.isNotBlank()) hospital.emergencyHotline else hospital.phone)
            },
            onDirectionsClick = { hospital ->
                openDirectionsInMaps(hospital.name, hospital.address, hospital.latitude, hospital.longitude)
            }
        )
        binding.rvHospitals.layoutManager = LinearLayoutManager(requireContext())
        binding.rvHospitals.adapter = hospitalAdapter

        // Setup Blood Banks RecyclerView
        bloodBankAdapter = BloodBankAdapter(
            onCallClick = { bb ->
                dialPhoneNumber(if (bb.hotline.isNotBlank()) bb.hotline else bb.phone)
            },
            onDirectionsClick = { bb ->
                openDirectionsInMaps(bb.name, bb.address, bb.latitude, bb.longitude)
            }
        )
        binding.rvBloodBanks.layoutManager = LinearLayoutManager(requireContext())
        binding.rvBloodBanks.adapter = bloodBankAdapter
    }

    // ---------------- PULL TO REFRESH ----------------
    private fun setupPullToRefresh() {
        binding.swipeRefreshLayout.setColorSchemeResources(
            R.color.primary_red,
            R.color.primary_red_dark,
            R.color.success_green
        )

        binding.swipeRefreshLayout.setProgressBackgroundColorSchemeResource(R.color.surface_white)

        binding.swipeRefreshLayout.setOnRefreshListener {
            if (networkAvailable) {
                loadUrgentRequestsFromFirestore()
                loadRealDonorsFromFirestore()
                loadDirectoryData()
            } else {
                binding.swipeRefreshLayout.isRefreshing = false
                toast("No internet connection")
            }
        }
    }

    // ---------------- NETWORK MONITOR ----------------
    private fun setupNetworkMonitor() {
        val connectivityManager = requireContext().getSystemService(Context.CONNECTIVITY_SERVICE)
                as ConnectivityManager

        try {
            connectivityManager.registerDefaultNetworkCallback(object :
                ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    networkAvailable = true
                    if (shouldRefresh()) {
                        requireActivity().runOnUiThread {
                            loadRealDonorsFromFirestore()
                            loadDirectoryData()
                        }
                    }
                }

                override fun onLost(network: Network) {
                    networkAvailable = false
                    requireActivity().runOnUiThread {
                        showOfflineMode()
                    }
                }
            })
        } catch (e: Exception) {
            Timber.tag("HomeFragment").e("Network monitor setup failed: ${e.message}")
        }
    }

    @SuppressLint("SetTextI18n")
    private fun showOfflineMode() {
        if (isAdded && _binding != null) {
            showLoading(false)
            binding.tvNoDonors.text = "No internet connection"
            binding.errorLayout.visibility = View.VISIBLE
            binding.btnRetry.visibility = View.VISIBLE
            binding.rvDonors.visibility = View.GONE

            binding.btnRetry.setOnClickListener {
                if (networkAvailable) {
                    loadRealDonorsFromFirestore()
                    loadDirectoryData()
                } else {
                    toast("Still offline. Check your connection.")
                }
            }
        }
    }

    // ---------------- INITIAL DATA LOAD ----------------
    private fun loadInitialData() {
        showLoading(true)
        loadUrgentRequestsFromFirestore()
        loadRealDonorsFromFirestore()
        loadDirectoryData()
    }

    // ---------------- AUTO REFRESH ----------------
    private fun shouldRefresh(): Boolean {
        if (!networkAvailable) return false
        if (isRefreshing) return false
        if (refreshAttempts >= maxRefreshAttempts) return false

        val currentTime = System.currentTimeMillis()
        val timeSinceLastRefresh = currentTime - lastRefreshTime

        // Don't refresh too frequently
        return timeSinceLastRefresh > MIN_REFRESH_INTERVAL
    }

    private fun startAutoRefresh() {
        if (!networkAvailable) return

        handler.removeCallbacks(refreshRunnable)
        handler.postDelayed(refreshRunnable, REFRESH_INTERVAL)
    }

    private fun stopAutoRefresh() {
        handler.removeCallbacks(refreshRunnable)
    }

    // ---------------- DRAWER ----------------
    private fun setupNavigationDrawer() {
        binding.ivMenu.setOnClickListener {
            binding.drawerLayout.openDrawer(GravityCompat.START)
        }

        binding.navigationView.setNavigationItemSelectedListener { item ->
            binding.drawerLayout.closeDrawer(GravityCompat.START)
            when (item.itemId) {
                R.id.nav_profile -> navigateToProfile()
                R.id.nav_status -> {
                    // Updated: Toggle donor availability status
                    toggleDonorStatus()
                }
                R.id.nav_settings -> navigateToSettingsFragment() // UPDATED: Navigate to settings fragment
                R.id.nav_privacy -> showPrivacyPolicyDialog()
                R.id.nav_feedback -> toast("Feedback")
                R.id.nav_support -> toast("Support Us")
                R.id.nav_about -> navigateToAboutFragment() // UPDATED: Changed from dialog to fragment
                R.id.nav_logout -> performLogout()
                else -> {
                    // Handle custom menu items
                    // "Enable Click Mode" feature removed
                }
            }
            true
        }
    }

    // ---------------- FIXED: FIRESTORE DATA LOADING ----------------
    @SuppressLint("SetTextI18n")
    private fun loadRealDonorsFromFirestore() {
        if (isRefreshing) return

        isRefreshing = true
        refreshAttempts++
        lastRefreshTime = System.currentTimeMillis()

        if (!binding.swipeRefreshLayout.isRefreshing) {
            showLoading(true)
        }

        // Cancel any existing listener first
        donorListener?.remove()

        Timber.tag("HomeFragment").d("Starting Firestore query...")

        // FIXED: Three-level fallback approach
        // Try with ordering first, then without ordering, then manual filtering

        // LEVEL 1: Try with ordering (requires index)
        tryOrderedQuery()
    }

    private fun tryOrderedQuery() {
        Timber.tag("HomeFragment").d("Trying ordered query (requires index)...")

        donorListener = firestore.collection(FirebaseUtils.Collections.DONORS)
            .whereEqualTo("isAvailable", true)
            .orderBy("name", Query.Direction.ASCENDING)
            .limit(15)
            .addSnapshotListener { snapshot, error ->
                handleQueryResult(snapshot, error, "ordered")
            }
    }

    private fun tryUnorderedQuery() {
        Timber.tag("HomeFragment").d("Falling back to unordered query...")

        donorListener?.remove()

        donorListener = firestore.collection(FirebaseUtils.Collections.DONORS)
            .whereEqualTo("isAvailable", true)
            .limit(15)
            .addSnapshotListener { snapshot, error ->
                handleQueryResult(snapshot, error, "unordered")
            }
    }

    private fun tryManualFiltering() {
        Timber.tag("HomeFragment").d("Falling back to manual filtering...")

        donorListener?.remove()

        donorListener = firestore.collection(FirebaseUtils.Collections.DONORS)
            .limit(15)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Timber.tag("HomeFragment").e("Manual filtering failed: ${error.message}")
                    showNoDonorsMessage("❌ Failed to load donors", showRetry = true)
                    isRefreshing = false
                    binding.swipeRefreshLayout.isRefreshing = false
                    showLoading(false)
                    return@addSnapshotListener
                }

                // Manual filtering
                donorList.clear()

                snapshot?.documents?.forEach { doc ->
                    try {
                        // Check if donor is available
                        val isAvailable = doc.getBoolean("isAvailable") ?:
                        doc.get("available")?.toString()?.toBoolean() ?: false

                        if (isAvailable) {
                            // Try to parse as Donor object
                            val donor = parseDonorFromDocument(doc)
                            donor?.let {
                                donorList.add(it)
                                Timber.tag("HomeFragment").d("Manually added donor: ${it.name}, isLoggedIn: ${it.isLoggedIn}")
                            }
                        }
                    } catch (e: Exception) {
                        Timber.tag("HomeFragment").e("Error in manual filtering: ${e.message}")
                    }
                }

                // Merge verified default donors for full blood group coverage
                val existingIds = donorList.map { it.id }.toSet()
                val defaults = DirectoryRepository.getDefaultDonors().filter { it.id !in existingIds }
                donorList.addAll(defaults)

                // Sort locally by name
                donorList.sortBy { it.name.lowercase() }

                updateUIAfterLoad("manual")
            }
    }

    private fun handleQueryResult(snapshot: com.google.firebase.firestore.QuerySnapshot?,
                                  error: Exception?, queryType: String) {
        isRefreshing = false
        binding.swipeRefreshLayout.isRefreshing = false
        showLoading(false)

        if (error != null) {
            Timber.tag("HomeFragment").e("$queryType query error: ${error.message}")

            // Check if it's an index error
            if (error.message?.contains("index") == true || error.message?.contains("FAILED_PRECONDITION") == true) {
                when (queryType) {
                    "ordered" -> tryUnorderedQuery()
                    "unordered" -> tryManualFiltering()
                    else -> showNoDonorsMessage("Database index required. Please contact admin.", showRetry = true)
                }
            } else {
                // If network/firestore error, fallback to verified volunteer donors
                donorList.clear()
                donorList.addAll(DirectoryRepository.getDefaultDonors())
                updateUIAfterLoad("fallback")
            }
            return
        }

        donorList.clear()

        snapshot?.documents?.forEach { doc ->
            try {
                val donor = parseDonorFromDocument(doc)
                donor?.let {
                    donorList.add(it)
                    Timber.tag("HomeFragment").d("Added donor via $queryType: ${it.name}, isLoggedIn: ${it.isLoggedIn}")
                }
            } catch (e: Exception) {
                Timber.tag("HomeFragment").e("Error parsing donor ${doc.id}: ${e.message}")
            }
        }

        // Merge verified default donors for full blood group coverage
        val existingIds = donorList.map { it.id }.toSet()
        val defaults = DirectoryRepository.getDefaultDonors().filter { it.id !in existingIds }
        donorList.addAll(defaults)

        // Sort locally by name
        donorList.sortBy { it.name.lowercase() }

        updateUIAfterLoad(queryType)
    }

    // ✅ FIXED: Donor parsing function to handle correct data types
    private fun parseDonorFromDocument(doc: com.google.firebase.firestore.DocumentSnapshot): Donor? {
        return try {
            // Method 1: Try automatic mapping first
            val donor = doc.toObject(Donor::class.java)
            donor?.id = doc.id

            // If automatic mapping fails or returns null, create manually
            if (donor == null || donor.name.isEmpty()) {
                createManualDonor(doc)
            } else {
                donor
            }
        } catch (e: Exception) {
            // Method 2: Manual creation if automatic fails
            Timber.tag("HomeFragment").w("Auto-mapping failed for ${doc.id}, trying manual: ${e.message}")
            createManualDonor(doc)
        }
    }

    // ✅ FIXED: Manual donor creation with correct data types
    private fun createManualDonor(doc: com.google.firebase.firestore.DocumentSnapshot): Donor? {
        return try {
            // Parse timestamps - handle both Long and Firebase Timestamp
            fun parseTimestamp(value: Any?): Long {
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

                // ✅ CORRECTED: All timestamps as Long
                updatedAt = parseTimestamp(doc.get("updatedAt")),
                createdAt = parseTimestamp(doc.get("createdAt")),
                lastActive = parseTimestamp(doc.get("lastActive")),
                lastDonationDate = parseTimestamp(doc.get("lastDonationDate")),

                isAvailable = doc.getBoolean("isAvailable") ?: true,
                notificationEnabled = doc.getBoolean("notificationEnabled") ?: true,
                isLoggedIn = doc.getBoolean("isLoggedIn") ?: true,  // ✅ CRITICAL: Must match backend
                isActive = doc.getBoolean("isActive") ?: true,
                canDonate = doc.getBoolean("canDonate") ?: true,
                hasFcmToken = doc.getBoolean("hasFcmToken") ?: true,

                fcmToken = doc.getString("fcmToken") ?: "",
                deviceId = doc.getString("deviceId"),
                compoundTokenId = doc.getString("compoundTokenId"),
                deviceType = doc.getString("deviceType") ?: "android",
                appVersion = doc.getString("appVersion"),
                userType = doc.getString("userType") ?: "donor",
                daysSinceLastDonation = (doc.get("daysSinceLastDonation") as? Number)?.toInt() ?: 0,
                age = (doc.get("age") as? Number)?.toInt(),
                weight = (doc.get("weight") as? Number)?.toInt(),
                gender = doc.getString("gender")
            )
        } catch (e: Exception) {
            Timber.tag("HomeFragment").e("Failed to create manual donor: ${e.message}")
            null
        }
    }

    @SuppressLint("SetTextI18n")
    private fun updateUIAfterLoad(queryType: String) {
        Timber.tag("HomeFragment").d("Update UI: ${donorList.size} donors loaded via $queryType")

        // Count logged in vs logged out donors
        val loggedInCount = donorList.count { it.isLoggedIn }
        val loggedOutCount = donorList.count { !it.isLoggedIn }
        Timber.tag("HomeFragment").d("Login stats: $loggedInCount logged in, $loggedOutCount logged out")

        if (donorList.isEmpty()) {
            showNoDonorsMessage("No available donors at the moment", showRetry = false)
        } else {
            // Success - reset attempts
            refreshAttempts = 0

            // Update donor count in UI
            binding.tvTitle.text = "BloodLink"

            // Submit filtered list to adapter
            applyFilters()

            // Optional: add animation
            binding.rvDonors.scheduleLayoutAnimation()

            Timber.tag("HomeFragment").d("UI updated with ${donorList.size} donors")
        }
    }

    private fun showNoDonorsMessage(msg: String, showRetry: Boolean = false) {
        if (isAdded) {
            binding.tvNoDonors.text = msg
            binding.errorLayout.visibility = View.VISIBLE
            binding.rvDonors.visibility = View.GONE

            if (showRetry) {
                binding.btnRetry.visibility = View.VISIBLE
                binding.btnRetry.setOnClickListener {
                    loadRealDonorsFromFirestore()
                }
            } else {
                binding.btnRetry.visibility = View.GONE
            }
        }
    }

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

    @SuppressLint("SetTextI18n")
    private fun applyFilters() {
        if (!isAdded || _binding == null) return

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

        donorAdapter.submitList(ArrayList(filtered))

        if (filtered.isEmpty()) {
            binding.tvNoDonors.text = when {
                selectedBloodGroup != "All" && currentSearchQuery.isNotBlank() ->
                    "No $selectedBloodGroup donors found for \"$currentSearchQuery\""
                selectedBloodGroup != "All" ->
                    "No $selectedBloodGroup donors available"
                currentSearchQuery.isNotBlank() ->
                    "No donors found for \"$currentSearchQuery\""
                else ->
                    "No available donors at the moment"
            }
            binding.errorLayout.visibility = View.VISIBLE
            binding.btnRetry.visibility = View.GONE
            binding.rvDonors.visibility = View.GONE
        } else {
            binding.errorLayout.visibility = View.GONE
            binding.rvDonors.visibility = View.VISIBLE
        }
    }

    private fun filterDonors(query: String) {
        currentSearchQuery = query
        applyFilters()
    }

    @SuppressLint("SetTextI18n")
    private fun updateEmptyState() {
        if (donorList.isEmpty()) {
            binding.tvNoDonors.text = "No available donors at the moment"
            binding.errorLayout.visibility = View.VISIBLE
            binding.rvDonors.visibility = View.GONE
        } else {
            binding.errorLayout.visibility = View.GONE
            binding.rvDonors.visibility = View.VISIBLE
        }
    }

    // ---------------- PRIVACY ----------------
    private fun checkPrivacyPolicyAcceptance() {
        val pref = requireActivity().getSharedPreferences("app_prefs", 0)
        if (!pref.getBoolean("privacy_policy_accepted", false)) {
            PrivacyPolicyDialogFragment()
                .show(parentFragmentManager, "PrivacyPolicy")
        }
    }

    @Suppress("unused")
    fun savePrivacyPolicyAccepted() {
        requireActivity().getSharedPreferences("app_prefs", 0).edit {
            putBoolean("privacy_policy_accepted", true)
        }
    }

    // ---------------- HEADER ----------------
    @SuppressLint("SetTextI18n")
    private fun setupNavigationViewHeader() {
        val header = binding.navigationView.getHeaderView(0)
        val tvUserName = header.findViewById<android.widget.TextView>(R.id.tvUserName)
        val tvUserEmail = header.findViewById<android.widget.TextView>(R.id.tvUserEmail)
        val ivNavUserAvatar = header.findViewById<android.widget.ImageView>(R.id.ivNavUserAvatar)

        // Observe user avatar changes live
        userViewModel.userProfileImage.observe(viewLifecycleOwner) { imageUrl ->
            ProfileImageManager.loadAvatar(ivNavUserAvatar, imageUrl)
        }

        // Observe user name changes
        userViewModel.userName.observe(viewLifecycleOwner) { name ->
            tvUserName.text = name
        }

        // Observe user email changes
        userViewModel.userEmail.observe(viewLifecycleOwner) { email ->
            tvUserEmail.text = email
        }

        // Set initial values
        val user = auth.currentUser
        if (user != null) {
            tvUserEmail.text = user.email ?: "No email"
            tvUserName.text = user.displayName ?: user.email?.substringBefore("@") ?: "User"
            userViewModel.loadUserData()
        } else {
            tvUserName.text = "Guest"
            tvUserEmail.text = "Not logged in"
            ivNavUserAvatar?.setImageResource(R.drawable.ic_user_placeholder)
        }

        ivNavUserAvatar?.setOnClickListener {
            binding.drawerLayout.closeDrawer(GravityCompat.START)
            navigateToProfile()
        }
    }

    // ---------------- CLICK LISTENERS ----------------
    private fun setupClickListeners() {
        // Navigate to NotificationFragment instead of opening dialog
        binding.ivNotification.setOnClickListener {
            navigateToNotificationFragment()
        }

        binding.btnSort.setOnClickListener { showSortOptionsDialog() }
        binding.btnFilter.setOnClickListener { showFilterOptionsDialog() }

        binding.etSearch.addTextChangedListener {
            val query = it?.toString() ?: ""
            currentSearchQuery = query
            when (binding.tabLayoutDirectory.selectedTabPosition) {
                0 -> filterDonors(query)
                1 -> applyHospitalFilters()
                2 -> applyBloodBankFilters()
            }
        }
    }

    // ---------------- DIRECTORY TABS (DONORS / HOSPITALS / BLOOD BANKS) ----------------
    private fun setupDirectoryTabs() {
        binding.tabLayoutDirectory.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab?) {
                when (tab?.position) {
                    0 -> {
                        binding.layoutDonorsTabContent.visibility = View.VISIBLE
                        binding.layoutHospitalsTabContent.visibility = View.GONE
                        binding.layoutBloodBanksTabContent.visibility = View.GONE
                        binding.etSearch.hint = "Search donors by name, location, or district"
                        applyFilters()
                    }
                    1 -> {
                        binding.layoutDonorsTabContent.visibility = View.GONE
                        binding.layoutHospitalsTabContent.visibility = View.VISIBLE
                        binding.layoutBloodBanksTabContent.visibility = View.GONE
                        binding.etSearch.hint = "Search hospitals by name, area, or type"
                        applyHospitalFilters()
                    }
                    2 -> {
                        binding.layoutDonorsTabContent.visibility = View.GONE
                        binding.layoutHospitalsTabContent.visibility = View.GONE
                        binding.layoutBloodBanksTabContent.visibility = View.VISIBLE
                        binding.etSearch.hint = "Search blood banks by name, district, or org"
                        applyBloodBankFilters()
                    }
                }
            }

            override fun onTabUnselected(tab: TabLayout.Tab?) {}
            override fun onTabReselected(tab: TabLayout.Tab?) {}
        })
    }

    private fun setupHospitalFilterChips() {
        binding.chipGroupHospital.setOnCheckedStateChangeListener { _, checkedIds ->
            selectedHospitalFilter = if (checkedIds.isEmpty()) {
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
            applyHospitalFilters()
        }
    }

    private fun setupBloodBankFilterChips() {
        binding.chipGroupBloodBank.setOnCheckedStateChangeListener { _, checkedIds ->
            selectedBloodBankFilter = if (checkedIds.isEmpty()) {
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
            applyBloodBankFilters()
        }
    }

    private fun loadDirectoryData() {
        viewLifecycleOwner.lifecycleScope.launch {
            try {
                allHospitals = directoryRepository.getHospitals()
            } catch (e: Exception) {
                Timber.tag("HomeFragment").e("Failed to load hospitals: ${e.message}")
                allHospitals = DirectoryRepository.getDefaultHospitals()
            }
            applyHospitalFilters()
        }

        viewLifecycleOwner.lifecycleScope.launch {
            try {
                allBloodBanks = directoryRepository.getBloodBanks()
            } catch (e: Exception) {
                Timber.tag("HomeFragment").e("Failed to load blood banks: ${e.message}")
                allBloodBanks = DirectoryRepository.getDefaultBloodBanks()
            }
            applyBloodBankFilters()
        }
    }

    private fun applyHospitalFilters() {
        if (!isAdded || _binding == null) return
        var list = allHospitals
        if (selectedHospitalFilter != "All") {
            list = when (selectedHospitalFilter) {
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
        filteredHospitals = list
        hospitalAdapter.submitList(ArrayList(list))

        if (list.isEmpty()) {
            binding.layoutHospitalEmpty.visibility = View.VISIBLE
            binding.rvHospitals.visibility = View.GONE
        } else {
            binding.layoutHospitalEmpty.visibility = View.GONE
            binding.rvHospitals.visibility = View.VISIBLE
        }
    }

    private fun applyBloodBankFilters() {
        if (!isAdded || _binding == null) return
        var list = allBloodBanks
        if (selectedBloodBankFilter != "All") {
            list = when (selectedBloodBankFilter) {
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
        filteredBloodBanks = list
        bloodBankAdapter.submitList(ArrayList(list))

        if (list.isEmpty()) {
            binding.layoutBloodBankEmpty.visibility = View.VISIBLE
            binding.rvBloodBanks.visibility = View.GONE
        } else {
            binding.layoutBloodBankEmpty.visibility = View.GONE
            binding.rvBloodBanks.visibility = View.VISIBLE
        }
    }

    private fun dialPhoneNumber(phone: String) {
        if (phone.isBlank()) {
            toast("Phone number not available")
            return
        }
        try {
            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${phone.trim()}"))
            startActivity(intent)
        } catch (_: Exception) {
            toast("Unable to open dialer")
        }
    }

    private fun openDirectionsInMaps(name: String, address: String, lat: Double, lng: Double) {
        try {
            val uri = if (lat != 0.0 && lng != 0.0) {
                Uri.parse("geo:$lat,$lng?q=$lat,$lng(${Uri.encode(name)})")
            } else {
                Uri.parse("geo:0,0?q=${Uri.encode("$name, $address")}")
            }
            val mapIntent = Intent(Intent.ACTION_VIEW, uri)
            startActivity(mapIntent)
        } catch (_: Exception) {
            try {
                val webUri = Uri.parse("https://www.google.com/maps/search/?api=1&query=${Uri.encode("$name, $address")}")
                startActivity(Intent(Intent.ACTION_VIEW, webUri))
            } catch (_: Exception) {
                toast("Unable to open map")
            }
        }
    }

    // ---------------- FIXED: SORT & FILTER ----------------
    @SuppressLint("SetTextI18n")
    private fun showSortOptionsDialog() {
        val options = arrayOf("Name (A-Z)", "Name (Z-A)", "Blood Group", "Availability", "Recent", "Login Status")
        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Sort By")
            .setItems(options) { _, i ->
                val sortedList = when (i) {
                    0 -> donorList.sortedBy { it.name }
                    1 -> donorList.sortedByDescending { it.name }
                    2 -> donorList.sortedBy { it.bloodGroup }
                    3 -> donorList.sortedByDescending { it.isAvailable }
                    4 -> donorList.sortedByDescending { it.createdAt }
                    5 -> donorList.sortedByDescending { it.isLoggedIn } // ✅ Sort by login status
                    else -> donorList
                }
                donorAdapter.submitList(ArrayList(sortedList))
                // Show/hide empty state based on sorted list
                if (sortedList.isEmpty()) {
                    binding.errorLayout.visibility = View.VISIBLE
                    binding.tvNoDonors.text = "No donors available after sorting"
                    binding.rvDonors.visibility = View.GONE
                } else {
                    binding.errorLayout.visibility = View.GONE
                    binding.rvDonors.visibility = View.VISIBLE
                }
            }.show()
    }

    @SuppressLint("SetTextI18n")
    private fun showFilterOptionsDialog() {
        val groups = arrayOf("All", "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-", "Logged In Only", "Logged Out Only")
        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Filter")
            .setItems(groups) { _, i ->
                val filteredList = when {
                    i == 0 -> donorList
                    i <= 8 -> donorList.filter { it.bloodGroup == groups[i] }
                    i == 9 -> donorList.filter { it.isLoggedIn } // ✅ Filter logged in
                    i == 10 -> donorList.filter { !it.isLoggedIn } // ✅ Filter logged out
                    else -> donorList
                }
                donorAdapter.submitList(ArrayList(filteredList))

                // Show appropriate message
                if (filteredList.isEmpty()) {
                    binding.tvNoDonors.text = "No donors found with filter: ${groups[i]}"
                    binding.errorLayout.visibility = View.VISIBLE
                    binding.rvDonors.visibility = View.GONE
                } else {
                    binding.errorLayout.visibility = View.GONE
                    binding.rvDonors.visibility = View.VISIBLE
                }
            }.show()
    }

    // ---------------- NAVIGATION METHODS ----------------
    private fun navigateToProfile() {
        try {
            findNavController().navigate(R.id.action_homeFragment_to_profileFragment)
        } catch (_: Exception) {
            toast("Profile feature coming soon")
        }
    }

    private fun navigateToHistoryFragment() {
        try {
            findNavController().navigate(R.id.action_homeFragment_to_historyFragment)
        } catch (_: Exception) {
            toast("Activity feature coming soon")
        }
    }

    private fun navigateToRequestBloodFragment() {
        try {
            findNavController().navigate(R.id.action_homeFragment_to_requestBloodFragment)
        } catch (_: Exception) {
            toast("Request Blood feature coming soon")
        }
    }

    // Navigation to NotificationFragment
    private fun navigateToNotificationFragment() {
        try {
            findNavController().navigate(R.id.action_homeFragment_to_notificationFragment)
        } catch (e: Exception) {
            toast("Notifications feature coming soon")
            Timber.e("Navigation to notification fragment failed: ${e.message}")
        }
    }

    // NEW: Navigation to AboutFragment
    private fun navigateToAboutFragment() {
        try {
            findNavController().navigate(R.id.action_homeFragment_to_aboutFragment)
        } catch (e: Exception) {
            toast("About Us feature coming soon")
            Timber.e("Navigation to about fragment failed: ${e.message}")
        }
    }

    // NEW: Navigation to SettingsFragment
    private fun navigateToSettingsFragment() {
        try {
            findNavController().navigate(R.id.action_homeFragment_to_settingsFragment)
        } catch (e: Exception) {
            toast("Settings feature coming soon")
            Timber.e("Navigation to settings fragment failed: ${e.message}")
        }
    }

    // ---------------- DIALOGS ----------------
    private fun showPrivacyPolicyDialog() {
        PrivacyPolicyDialogFragment().show(parentFragmentManager, "PrivacyPolicy")
    }

    private fun showDonorDetailsDialog(donor: Donor) {
        DonorDetailsDialogFragment.newInstance(donor)
            .show(parentFragmentManager, "DonorDetails")
    }

    private fun showEmergencyCallConfirmation(donor: Donor) {
        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Emergency Call Notice")
            .setMessage("Blood donors are unpaid volunteers. Please ensure this call is for a verified, urgent blood donation requirement.\n\nProceed to call ${donor.name}?")
            .setPositiveButton("Proceed to Call") { _, _ ->
                makePhoneCall(donor.phone)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ---------------- UTILS ----------------
    private fun makePhoneCall(phone: String?) {
        if (phone.isNullOrEmpty()) {
            toast("Phone number not available")
            return
        }
        val sanitized = phone.replace(" ", "")
        startActivity(Intent(Intent.ACTION_DIAL, "tel:$sanitized".toUri()))
    }

    private fun openChatWithDonor(donor: Donor) {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            toast("Please sign in to chat with donors")
            findNavController().navigate(R.id.loginFragment)
            return
        }

        val targetRecipientId = donor.userId.ifBlank { donor.id }
        if (targetRecipientId == currentUser.uid) {
            toast("You cannot message your own profile")
            return
        }

        if (targetRecipientId.isNotBlank()) {
            val bundle = ConversationFragment.newBundle(
                recipientId = targetRecipientId,
                recipientName = donor.name,
                recipientBloodGroup = donor.bloodGroup,
                recipientPhone = donor.phone,
                recipientImage = donor.imageUrl
            )
            try {
                findNavController().navigate(R.id.action_homeFragment_to_conversationFragment, bundle)
            } catch (e: Exception) {
                Timber.e(e, "Failed to navigate to conversation")
                fallbackSmsChat(donor)
            }
        } else {
            fallbackSmsChat(donor)
        }
    }

    private fun fallbackSmsChat(donor: Donor) {
        if (donor.phone.isEmpty()) {
            toast("Donor contact number not available")
            return
        }
        val sanitized = donor.phone.replace(" ", "")
        val prefilledMsg = "Hello ${donor.name}, I found your contact on BloodLink for blood group ${donor.bloodGroup}. Are you currently available to donate?"
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

    // Updated logout function to use MainActivity's logout
    private fun performLogout() {
        // Show confirmation dialog
        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Logout")
            .setMessage("Are you sure you want to logout?")
            .setPositiveButton("Yes") { _, _ ->
                // Call MainActivity's logout function
                (requireActivity() as MainActivity).logoutCurrentUser()
            }
            .setNegativeButton("No", null)
            .show()
    }

    // New function to toggle donor status
    private fun toggleDonorStatus() {
        val currentUser = auth.currentUser ?: return

        firestore.collection(FirebaseUtils.Collections.DONORS)
            .document(currentUser.uid)
            .get()
            .addOnSuccessListener { document ->
                if (document.exists()) {
                    val currentStatus = document.getBoolean("isAvailable") ?: true
                    val newStatus = !currentStatus

                    // Update status in Firestore
                    firestore.collection(FirebaseUtils.Collections.DONORS)
                        .document(currentUser.uid)
                        .update("isAvailable", newStatus)
                        .addOnSuccessListener {
                            val statusText = if (newStatus) "available" else "unavailable"
                            toast("You are now $statusText for donations")

                            // Refresh donor list to reflect the change
                            loadRealDonorsFromFirestore()
                        }
                        .addOnFailureListener {
                            toast("Failed to update status")
                        }
                }
            }
    }

    // ---------------- URGENT BLOOD REQUESTS DATA LOADING ----------------
    private fun loadUrgentRequestsFromFirestore() {
        if (!isAdded || _binding == null) return

        if (!binding.swipeRefreshLayout.isRefreshing) {
            binding.shimmerUrgent.visibility = View.VISIBLE
            binding.shimmerUrgent.startShimmer()
        }

        urgentRequestsListener?.remove()

        urgentRequestsListener = firestore.collection(FirebaseUtils.Collections.REQUESTS)
            .whereEqualTo("status", "pending")
            .limit(10)
            .addSnapshotListener { snapshot, error ->
                if (!isAdded || _binding == null) return@addSnapshotListener

                binding.shimmerUrgent.stopShimmer()
                binding.shimmerUrgent.visibility = View.GONE

                if (error != null) {
                    Timber.tag("HomeFragment").e("Urgent requests query error: ${error.message}")
                    binding.tvUrgentCountBadge.text = "0 Active"
                    if (urgentRequestList.isEmpty()) {
                        binding.layoutUrgentEmpty.visibility = View.VISIBLE
                        binding.rvUrgentRequests.visibility = View.GONE
                    }
                    return@addSnapshotListener
                }

                urgentRequestList.clear()
                snapshot?.documents?.forEach { doc ->
                    try {
                        val req = parseBloodRequestFromDocument(doc)
                        if (req != null) {
                            urgentRequestList.add(req)
                        }
                    } catch (e: Exception) {
                        Timber.tag("HomeFragment").e("Error parsing blood request ${doc.id}: ${e.message}")
                    }
                }

                // Prioritize high/urgent urgency or larger requests
                urgentRequestList.sortByDescending {
                    it.urgency.equals("high", ignoreCase = true) ||
                    it.urgency.equals("urgent", ignoreCase = true) ||
                    it.units >= 3
                }

                urgentRequestAdapter.submitList(ArrayList(urgentRequestList)) {
                    if (isAdded && _binding != null) {
                        binding.rvUrgentRequests.scrollToPosition(0)
                    }
                }

                val count = urgentRequestList.size
                binding.tvUrgentCountBadge.text = if (count > 0) "$count Active" else "0 Active"

                if (urgentRequestList.isEmpty()) {
                    binding.layoutUrgentEmpty.visibility = View.VISIBLE
                    binding.rvUrgentRequests.visibility = View.GONE
                } else {
                    binding.layoutUrgentEmpty.visibility = View.GONE
                    binding.rvUrgentRequests.visibility = View.VISIBLE
                }
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
        } catch (e: Exception) {
            null
        }
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
                recipientName = request.patientName.ifBlank { "Patient Request" },
                recipientBloodGroup = request.bloodGroup,
                recipientPhone = request.phone,
                recipientImage = ""
            )
            try {
                findNavController().navigate(R.id.action_homeFragment_to_conversationFragment, bundle)
            } catch (e: Exception) {
                Timber.e(e, "Failed to navigate to conversation from urgent request")
                fallbackSmsForRequest(request)
            }
        } else {
            fallbackSmsForRequest(request)
        }
    }

    private fun fallbackSmsForRequest(request: BloodRequest) {
        if (request.phone.isEmpty()) {
            toast("Requester contact number not available")
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

    private fun handleHelpClick(request: BloodRequest) {
        val currentUser = auth.currentUser
        if (currentUser != null && request.requesterId == currentUser.uid) {
            navigateToHistoryFragment()
            return
        }

        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Offer Blood Donation")
            .setMessage("Would you like to contact the requester for ${request.patientName.ifBlank { "Patient" }} (${request.bloodGroup}) at ${request.hospital}?")
            .setPositiveButton("Message on BloodLink") { _, _ ->
                openChatWithRequester(request)
            }
            .setNeutralButton("Call Directly") { _, _ ->
                makePhoneCall(request.phone)
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
            if (request.date.isNotBlank()) append("Date: ${request.date} ${request.time}\n")
            if (request.phone.isNotBlank()) append("Phone: ${request.phone}\n")
        }

        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Blood Request Details")
            .setMessage(detailsMsg)
            .setPositiveButton("I Can Help") { _, _ ->
                handleHelpClick(request)
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