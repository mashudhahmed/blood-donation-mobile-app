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
import androidx.core.content.edit
import androidx.core.net.toUri
import androidx.core.view.GravityCompat
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import com.project.donateblood.MainActivity
import com.project.donateblood.R
import com.project.donateblood.adapter.DonorAdapter
import com.project.donateblood.databinding.FragmentHomeBinding
import com.project.donateblood.models.Donor
import com.project.donateblood.utils.FirebaseUtils
import com.project.donateblood.viewmodels.BottomNavViewModel
import com.project.donateblood.viewmodels.UserViewModel
import timber.log.Timber

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!

    private lateinit var donorAdapter: DonorAdapter
    private val donorList = mutableListOf<Donor>()

    private lateinit var firestore: FirebaseFirestore
    private lateinit var auth: FirebaseAuth
    private var donorListener: ListenerRegistration? = null

    // Add ViewModels for data management
    private lateinit var userViewModel: UserViewModel
    private lateinit var bottomNavViewModel: BottomNavViewModel

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
        bottomNavViewModel = ViewModelProvider(requireActivity())[BottomNavViewModel::class.java]

        setupViews()
        setupRecyclerView()
        setupNavigationDrawer()
        setupClickListeners()
        setupPullToRefresh()
        setupNavigationViewHeader()
        setupNetworkMonitor()
        setupBottomNavObserver()

        // Load initial data
        loadInitialData()

        // Test query to debug
        testFirestoreConnection()

        checkPrivacyPolicyAcceptance()
    }

    private fun setupBottomNavObserver() {
        // Observe bottom nav selection changes
        bottomNavViewModel.selectedItemId.observe(viewLifecycleOwner) { itemId ->
            binding.bottomNavigationView.selectedItemId = itemId
        }

        // Set initial selection
        bottomNavViewModel.setSelectedItem(R.id.nav_home)
    }

    override fun onResume() {
        super.onResume()
        // Refresh user data when fragment resumes
        userViewModel.loadUserData()

        // Smart refresh logic
        if (shouldRefresh()) {
            loadRealDonorsFromFirestore()
        }

        startAutoRefresh()

        // Update bottom nav selection
        bottomNavViewModel.setSelectedItem(R.id.nav_home)
    }

    override fun onPause() {
        super.onPause()
        stopAutoRefresh()
    }

    override fun onDestroyView() {
        donorListener?.remove()
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
        binding.tvTitle.text = "Available Donors"
        binding.etSearch.hint = "Search by name, blood group, or location"

        // Hide clickable overlay since feature is removed
        binding.clickableOverlay.visibility = View.GONE

        // Initialize empty state
        binding.errorLayout.visibility = View.GONE
    }

    // ---------------- RECYCLER VIEW ----------------
    private fun setupRecyclerView() {
        donorAdapter = DonorAdapter(
            onCallClick = { donor ->
                if (donor.phone.isNotEmpty()) {
                    makePhoneCall(donor.phone)
                } else {
                    toast("Phone number not available")
                }
            },
            onViewDetailsClick = { donor ->
                showDonorDetailsDialog(donor)
            }
        )

        binding.rvDonors.layoutManager = LinearLayoutManager(requireContext())
        binding.rvDonors.adapter = donorAdapter
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
                loadRealDonorsFromFirestore()
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
        if (isAdded) {
            binding.tvNoDonors.text = "📵 No internet connection"
            binding.errorLayout.visibility = View.VISIBLE
            binding.btnRetry.visibility = View.VISIBLE
            binding.rvDonors.visibility = View.GONE
            binding.progressBar.visibility = View.GONE

            binding.btnRetry.setOnClickListener {
                if (networkAvailable) {
                    loadRealDonorsFromFirestore()
                } else {
                    toast("Still offline. Check your connection.")
                }
            }
        }
    }

    // ---------------- INITIAL DATA LOAD ----------------
    private fun loadInitialData() {
        // Show loading state
        binding.progressBar.visibility = View.VISIBLE
        binding.errorLayout.visibility = View.GONE
        binding.rvDonors.visibility = View.GONE

        // Load fresh data
        loadRealDonorsFromFirestore()
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

        binding.progressBar.visibility = View.VISIBLE
        binding.errorLayout.visibility = View.GONE
        binding.rvDonors.visibility = View.GONE

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
            .addSnapshotListener { snapshot, error ->
                handleQueryResult(snapshot, error, "ordered")
            }
    }

    private fun tryUnorderedQuery() {
        Timber.tag("HomeFragment").d("Falling back to unordered query...")

        donorListener?.remove()

        donorListener = firestore.collection(FirebaseUtils.Collections.DONORS)
            .whereEqualTo("isAvailable", true)
            .addSnapshotListener { snapshot, error ->
                handleQueryResult(snapshot, error, "unordered")
            }
    }

    private fun tryManualFiltering() {
        Timber.tag("HomeFragment").d("Falling back to manual filtering...")

        donorListener?.remove()

        donorListener = firestore.collection(FirebaseUtils.Collections.DONORS)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Timber.tag("HomeFragment").e("Manual filtering failed: ${error.message}")
                    showNoDonorsMessage("❌ Failed to load donors", showRetry = true)
                    isRefreshing = false
                    binding.swipeRefreshLayout.isRefreshing = false
                    binding.progressBar.visibility = View.GONE
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

                // Sort locally by name
                donorList.sortBy { it.name.lowercase() }

                updateUIAfterLoad("manual")
            }
    }

    private fun handleQueryResult(snapshot: com.google.firebase.firestore.QuerySnapshot?,
                                  error: Exception?, queryType: String) {
        isRefreshing = false
        binding.swipeRefreshLayout.isRefreshing = false
        binding.progressBar.visibility = View.GONE

        if (error != null) {
            Timber.tag("HomeFragment").e("$queryType query error: ${error.message}")

            // Check if it's an index error
            if (error.message?.contains("index") == true || error.message?.contains("FAILED_PRECONDITION") == true) {
                when (queryType) {
                    "ordered" -> tryUnorderedQuery()
                    "unordered" -> tryManualFiltering()
                    else -> showNoDonorsMessage("❌ Database index required. Please contact admin.", showRetry = true)
                }
            } else {
                showNoDonorsMessage("❌ Network error: ${error.message}", showRetry = true)
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

        // If ordered query failed to sort, sort locally
        if (queryType != "ordered") {
            donorList.sortBy { it.name.lowercase() }
        }

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
            showNoDonorsMessage("🤷‍♂️ No available donors at the moment", showRetry = false)
        } else {
            // Success - reset attempts
            refreshAttempts = 0

            // Update donor count in UI
            binding.tvTitle.text = "Available Donors (${donorList.size})"

            // Submit list to adapter
            donorAdapter.submitList(ArrayList(donorList))

            // Force UI update
            binding.rvDonors.visibility = View.VISIBLE
            binding.errorLayout.visibility = View.GONE

            // Optional: add animation
            binding.rvDonors.scheduleLayoutAnimation()

            Timber.tag("HomeFragment").d("✅ UI updated with ${donorList.size} donors")
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

    @SuppressLint("SetTextI18n")
    private fun filterDonors(query: String) {
        if (query.isEmpty()) {
            donorAdapter.submitList(ArrayList(donorList))
            updateEmptyState()
            return
        }

        val filtered = donorList.filter { donor ->
            donor.name.contains(query, true) ||
                    donor.bloodGroup.contains(query, true) ||
                    donor.location.contains(query, true) ||
                    donor.district.contains(query, true) ||
                    donor.phone.contains(query, true)
        }

        donorAdapter.submitList(ArrayList(filtered))

        // Show empty state if filtered results are empty
        if (filtered.isEmpty()) {
            binding.tvNoDonors.text = "🔍 No donors found for \"$query\""
            binding.errorLayout.visibility = View.VISIBLE
            binding.btnRetry.visibility = View.GONE
            binding.rvDonors.visibility = View.GONE
        } else {
            binding.errorLayout.visibility = View.GONE
            binding.rvDonors.visibility = View.VISIBLE
        }
    }

    @SuppressLint("SetTextI18n")
    private fun updateEmptyState() {
        if (donorList.isEmpty()) {
            binding.tvNoDonors.text = "🤷‍♂️ No available donors at the moment"
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
        } else {
            tvUserName.text = "Guest"
            tvUserEmail.text = "Not logged in"
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
            filterDonors(it.toString())
        }

        binding.bottomNavigationView.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_home -> {
                    // Already on home, do nothing
                    true
                }
                R.id.nav_request_donate -> {
                    navigateToRequestBloodFragment()
                    true
                }
                R.id.nav_history -> {
                    // This is the "Activity" tab in bottom nav
                    navigateToHistoryFragment()
                    true
                }
                else -> false
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

    // ---------------- UTILS ----------------
    private fun makePhoneCall(phone: String?) {
        if (phone.isNullOrEmpty()) {
            toast("Phone number not available")
            return
        }
        val sanitized = phone.replace(" ", "")
        startActivity(Intent(Intent.ACTION_DIAL, "tel:$sanitized".toUri()))
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

    private fun toast(msg: String) {
        if (isAdded) {
            Toast.makeText(requireContext(), msg, Toast.LENGTH_SHORT).show()
        }
    }
}