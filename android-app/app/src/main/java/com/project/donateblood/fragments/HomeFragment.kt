package com.project.donateblood.fragments

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.Toast
import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.view.animation.AccelerateDecelerateInterpolator
import androidx.core.content.edit
import androidx.core.net.toUri
import androidx.core.view.GravityCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.widget.CompositePageTransformer
import androidx.viewpager2.widget.MarginPageTransformer
import androidx.viewpager2.widget.ViewPager2
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.project.donateblood.MainActivity
import com.project.donateblood.R
import com.project.donateblood.adapter.HomeBannerAdapter
import com.project.donateblood.adapter.HomeUrgentRequestAdapter
import com.project.donateblood.databinding.FragmentHomeBinding
import com.project.donateblood.models.BannerAction
import com.project.donateblood.models.BloodRequest
import com.project.donateblood.models.HomeBanner
import com.project.donateblood.utils.BloodRequestDetailsSheet
import com.project.donateblood.utils.FirebaseUtils
import com.project.donateblood.utils.ProfileImageManager
import com.project.donateblood.viewmodels.UserViewModel
import timber.log.Timber

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!

    private lateinit var urgentRequestAdapter: HomeUrgentRequestAdapter
    private val urgentRequestList = mutableListOf<BloodRequest>()
    private var urgentRequestsListener: ListenerRegistration? = null

    private lateinit var firestore: FirebaseFirestore
    private lateinit var auth: FirebaseAuth
    private lateinit var userViewModel: UserViewModel

    private var networkAvailable = true

    // 2026 Slideable SVG Banners
    private val homeBanners = listOf(
        HomeBanner(
            id = 1,
            title = "Donate Blood Today",
            subtitle = "Your blood type could be someone’s hope",
            backgroundResId = R.drawable.bg_banner_svg_1,
            action = BannerAction.FIND_DONORS
        ),
        HomeBanner(
            id = 2,
            title = "Together We Save",
            subtitle = "Join thousands of donors\nmaking a difference every day",
            backgroundResId = R.drawable.bg_banner_svg_2,
            action = BannerAction.COMMUNITY
        ),
        HomeBanner(
            id = 3,
            title = "Urgent Requests",
            subtitle = "Help patients who need blood now",
            backgroundResId = R.drawable.bg_banner_svg_3,
            action = BannerAction.URGENT_REQUESTS
        ),
        HomeBanner(
            id = 4,
            title = "Be Someone’s Hero",
            subtitle = "Donate blood. Change a life today.",
            backgroundResId = R.drawable.bg_banner_svg_4,
            action = BannerAction.REQUEST_BLOOD
        ),
        HomeBanner(
            id = 5,
            title = "Every Drop Counts",
            subtitle = "1 donation can save up to 3 lives",
            backgroundResId = R.drawable.bg_banner_svg_5,
            action = BannerAction.REQUEST_BLOOD
        )
    )

    private val bannerAutoSlideInterval = 4000L
    private val bannerHandler = Handler(Looper.getMainLooper())
    private var lastSelectedIndicatorPosition = 0

    private val bannerSlideRunnable = object : Runnable {
        override fun run() {
            if (_binding != null && isAdded && homeBanners.isNotEmpty()) {
                val currentItem = binding.vpHomeBanners.currentItem
                binding.vpHomeBanners.setCurrentItem(currentItem + 1, true)
                bannerHandler.postDelayed(this, bannerAutoSlideInterval)
            }
        }
    }

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
        setupHomeBannerCarousel()
        setupUrgentRequestsRecyclerView()
        setupHubCards()
        setupNavigationDrawer()
        setupClickListeners()
        setupPullToRefresh()
        setupNavigationViewHeader()
        setupNetworkMonitor()

        // Load initial data
        loadUrgentRequestsFromFirestore()

        checkPrivacyPolicyAcceptance()
    }

    override fun onResume() {
        super.onResume()
        userViewModel.loadUserData()
        loadUrgentRequestsFromFirestore()
        startBannerAutoSlide()
    }

    override fun onPause() {
        super.onPause()
        stopBannerAutoSlide()
    }

    override fun onDestroyView() {
        urgentRequestsListener?.remove()
        stopBannerAutoSlide()
        bannerHandler.removeCallbacksAndMessages(null)
        _binding?.vpHomeBanners?.adapter = null
        _binding = null
        super.onDestroyView()
    }

    // ---------------- UI INITIALIZATION ----------------
    private fun setupViews() {
        binding.tvTitle.text = "BloodLink"
        binding.clickableOverlay.visibility = View.GONE
        binding.layoutUrgentEmpty.visibility = View.GONE
    }

    // ---------------- 2026 BANNER CAROUSEL (BKASH / NAGAD STYLE) ----------------
    private fun setupHomeBannerCarousel() {
        val bannerAdapter = HomeBannerAdapter(homeBanners) { banner ->
            handleBannerClick(banner)
        }
        binding.vpHomeBanners.adapter = bannerAdapter

        // Start in the center of the infinite range aligned to banner index 0
        if (homeBanners.size > 1) {
            val startPosition = (HomeBannerAdapter.INFINITE_COUNT / 2) - ((HomeBannerAdapter.INFINITE_COUNT / 2) % homeBanners.size)
            binding.vpHomeBanners.setCurrentItem(startPosition, false)
        }

        // Configure internal RecyclerView for zero-clipping and smooth gliding
        val recyclerView = binding.vpHomeBanners.getChildAt(0) as? RecyclerView
        recyclerView?.apply {
            clipToPadding = false
            clipChildren = false
            overScrollMode = RecyclerView.OVER_SCROLL_NEVER
        }

        // bKash / Nagad style smooth PageTransformer: Margin + Subtle Scale + Alpha Peek
        val density = resources.displayMetrics.density
        val compositePageTransformer = CompositePageTransformer().apply {
            addTransformer(MarginPageTransformer((10 * density).toInt()))
            addTransformer { page, position ->
                val absPos = Math.abs(position)
                val scale = 0.93f + (1 - absPos.coerceAtMost(1f)) * 0.07f
                page.scaleY = scale
                page.alpha = 0.80f + (1 - absPos.coerceAtMost(1f)) * 0.20f
            }
        }
        binding.vpHomeBanners.setPageTransformer(compositePageTransformer)
        binding.vpHomeBanners.offscreenPageLimit = 3

        setupBannerIndicators(homeBanners.size)

        binding.vpHomeBanners.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(position: Int) {
                super.onPageSelected(position)
                val realPosition = if (homeBanners.isNotEmpty()) position % homeBanners.size else 0
                updateBannerIndicators(realPosition)
            }

            override fun onPageScrollStateChanged(state: Int) {
                super.onPageScrollStateChanged(state)
                when (state) {
                    ViewPager2.SCROLL_STATE_DRAGGING -> {
                        stopBannerAutoSlide()
                    }
                    ViewPager2.SCROLL_STATE_IDLE -> {
                        startBannerAutoSlide()
                    }
                }
            }
        })

        startBannerAutoSlide()
    }

    private fun setupBannerIndicators(count: Int) {
        val container = binding.layoutBannerIndicators
        container.removeAllViews()
        val context = requireContext()
        val density = resources.displayMetrics.density
        lastSelectedIndicatorPosition = 0

        for (i in 0 until count) {
            val indicator = View(context).apply {
                val widthPx = if (i == 0) (20 * density).toInt() else (6 * density).toInt()
                val heightPx = (6 * density).toInt()
                val params = LinearLayout.LayoutParams(widthPx, heightPx).apply {
                    if (i < count - 1) marginEnd = (6 * density).toInt()
                }
                layoutParams = params
                setBackgroundResource(
                    if (i == 0) R.drawable.bg_banner_indicator_active
                    else R.drawable.bg_banner_indicator_inactive
                )
            }
            container.addView(indicator)
        }
    }

    private fun updateBannerIndicators(selectedPosition: Int) {
        val container = _binding?.layoutBannerIndicators ?: return
        val density = resources.displayMetrics.density
        val childCount = container.childCount
        if (selectedPosition !in 0 until childCount) return
        if (selectedPosition == lastSelectedIndicatorPosition && container.getChildAt(selectedPosition)?.width == (20 * density).toInt()) return

        val prevPos = lastSelectedIndicatorPosition
        lastSelectedIndicatorPosition = selectedPosition

        val activeWidth = (20 * density).toInt()
        val inactiveWidth = (6 * density).toInt()

        val prevView = container.getChildAt(prevPos)
        val nextView = container.getChildAt(selectedPosition)

        if (prevView != null && prevView != nextView) {
            prevView.setBackgroundResource(R.drawable.bg_banner_indicator_inactive)
            ValueAnimator.ofInt(prevView.width, inactiveWidth).apply {
                duration = 280L
                interpolator = AccelerateDecelerateInterpolator()
                addUpdateListener { va ->
                    val lp = prevView.layoutParams
                    lp.width = va.animatedValue as Int
                    prevView.layoutParams = lp
                }
                start()
            }
        }

        if (nextView != null) {
            nextView.setBackgroundResource(R.drawable.bg_banner_indicator_active)
            ValueAnimator.ofInt(nextView.width, activeWidth).apply {
                duration = 280L
                interpolator = AccelerateDecelerateInterpolator()
                addUpdateListener { va ->
                    val lp = nextView.layoutParams
                    lp.width = va.animatedValue as Int
                    nextView.layoutParams = lp
                }
                start()
            }
        }
    }

    private fun startBannerAutoSlide() {
        bannerHandler.removeCallbacks(bannerSlideRunnable)
        bannerHandler.postDelayed(bannerSlideRunnable, bannerAutoSlideInterval)
    }

    private fun stopBannerAutoSlide() {
        bannerHandler.removeCallbacks(bannerSlideRunnable)
    }

    private fun handleBannerClick(banner: HomeBanner) {
        when (banner.action) {
            BannerAction.FIND_DONORS -> navigateToDonorsFragment()
            BannerAction.COMMUNITY -> navigateToAboutFragment()
            BannerAction.URGENT_REQUESTS -> navigateToUrgentRequestsFragment()
            BannerAction.REQUEST_BLOOD -> navigateToRequestBloodFragment()
        }
    }

    // ---------------- 2026 DIRECTORY HUB CARDS ----------------
    private fun setupHubCards() {
        binding.cardNavDonors.setOnClickListener {
            navigateToDonorsFragment()
        }

        binding.cardNavHospitals.setOnClickListener {
            navigateToHospitalsFragment()
        }

        binding.cardNavBloodBanks.setOnClickListener {
            navigateToBloodBanksFragment()
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
                userViewModel.loadUserData()
                loadUrgentRequestsFromFirestore()
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
                    requireActivity().runOnUiThread {
                        loadUrgentRequestsFromFirestore()
                    }
                }

                override fun onLost(network: Network) {
                    networkAvailable = false
                }
            })
        } catch (e: Exception) {
            Timber.tag("HomeFragment").e("Network monitor setup failed: ${e.message}")
        }
    }

    // ---------------- DRAWER NAVIGATION ----------------
    private fun setupNavigationDrawer() {
        binding.ivMenu.setOnClickListener {
            (activity as? MainActivity)?.openDrawer()
        }
    }

    private fun setupNavigationViewHeader() {
        // Managed globally by MainActivity for full-screen edge-to-edge drawer
    }

    // ---------------- CLICK LISTENERS ----------------
    private fun setupClickListeners() {
        binding.ivNotification.setOnClickListener {
            navigateToNotificationFragment()
        }

        // Urgent requests header "View All"
        binding.btnViewAllUrgentRequests.setOnClickListener {
            navigateToUrgentRequestsFragment()
        }
    }

    // ---------------- PRIVACY POLICY ----------------
    private fun checkPrivacyPolicyAcceptance() {
        val pref = requireActivity().getSharedPreferences("app_prefs", 0)
        if (!pref.getBoolean("privacy_policy_accepted", false)) {
            PrivacyPolicyDialogFragment()
                .show(parentFragmentManager, "PrivacyPolicy")
        }
    }

    fun savePrivacyPolicyAccepted() {
        requireActivity().getSharedPreferences("app_prefs", 0).edit {
            putBoolean("privacy_policy_accepted", true)
        }
    }

    // ---------------- URGENT REQUESTS DATA LOADING ----------------
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

                binding.swipeRefreshLayout.isRefreshing = false
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

    // ---------------- NAVIGATION METHODS ----------------
    private fun navigateToDonorsFragment() {
        try {
            findNavController().navigate(R.id.action_homeFragment_to_donorsFragment)
        } catch (_: Exception) {
            try {
                findNavController().navigate(R.id.donorsFragment)
            } catch (e: Exception) {
                Timber.e(e, "Failed to navigate to donors fragment")
            }
        }
    }

    private fun navigateToHospitalsFragment() {
        try {
            findNavController().navigate(R.id.action_homeFragment_to_hospitalsFragment)
        } catch (_: Exception) {
            try {
                findNavController().navigate(R.id.hospitalsFragment)
            } catch (e: Exception) {
                Timber.e(e, "Failed to navigate to hospitals fragment")
            }
        }
    }

    private fun navigateToBloodBanksFragment() {
        try {
            findNavController().navigate(R.id.action_homeFragment_to_bloodBanksFragment)
        } catch (_: Exception) {
            try {
                findNavController().navigate(R.id.bloodBanksFragment)
            } catch (e: Exception) {
                Timber.e(e, "Failed to navigate to blood banks fragment")
            }
        }
    }

    private fun navigateToUrgentRequestsFragment() {
        try {
            findNavController().navigate(R.id.action_homeFragment_to_urgentRequestsFragment)
        } catch (e: Exception) {
            Timber.e(e, "Failed to navigate to urgent requests fragment")
        }
    }

    private fun navigateToRequestBloodFragment() {
        try {
            findNavController().navigate(R.id.action_homeFragment_to_requestBloodFragment)
        } catch (_: Exception) {
            try {
                findNavController().navigate(R.id.requestBloodFragment)
            } catch (e: Exception) {
                toast("Request Blood feature coming soon")
            }
        }
    }

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

    private fun navigateToNotificationFragment() {
        try {
            findNavController().navigate(R.id.action_homeFragment_to_notificationFragment)
        } catch (e: Exception) {
            toast("Notifications feature coming soon")
            Timber.e("Navigation to notification fragment failed: ${e.message}")
        }
    }

    private fun navigateToAboutFragment() {
        try {
            findNavController().navigate(R.id.action_homeFragment_to_aboutFragment)
        } catch (e: Exception) {
            toast("About Us feature coming soon")
            Timber.e("Navigation to about fragment failed: ${e.message}")
        }
    }

    private fun navigateToSettingsFragment() {
        try {
            findNavController().navigate(R.id.action_homeFragment_to_settingsFragment)
        } catch (e: Exception) {
            toast("Settings feature coming soon")
            Timber.e("Navigation to settings fragment failed: ${e.message}")
        }
    }

    private fun showPrivacyPolicyDialog() {
        PrivacyPolicyDialogFragment().show(parentFragmentManager, "PrivacyPolicy")
    }

    // ---------------- ACTIONS & INTENTS ----------------
    private fun makePhoneCall(phone: String?) {
        if (phone.isNullOrEmpty()) {
            toast("Phone number not available")
            return
        }
        val sanitized = phone.replace(" ", "")
        startActivity(Intent(Intent.ACTION_DIAL, "tel:$sanitized".toUri()))
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

    private fun handleShareClick(request: BloodRequest) {
        val shareText = buildString {
            append("EMERGENCY BLOOD REQUEST\n\n")
            append("Blood Group: ${request.bloodGroup}\n")
            if (request.patientName.isNotBlank()) append("Patient: ${request.patientName}\n")
            append("Hospital: ${request.hospital}\n")
            val loc = if (request.district.isNotBlank()) "${request.location}, ${request.district}".trim(',', ' ') else request.location
            if (loc.isNotBlank()) append("Location: $loc\n")
            append("Units Needed: ${request.units}\n")
            if (request.date.isNotBlank()) append("Needed Date: ${request.date} ${request.time}\n")
            if (request.phone.isNotBlank()) append("Contact: ${request.phone}\n")
            append("\nPlease share and help save a life via BloodLink!")
        }
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "Urgent Blood Request - ${request.bloodGroup}")
            putExtra(Intent.EXTRA_TEXT, shareText)
        }
        startActivity(Intent.createChooser(intent, "Share Blood Request"))
    }

    private fun handleDirectionsClick(request: BloodRequest) {
        val destination = when {
            request.hospital.isNotBlank() && request.district.isNotBlank() -> "${request.hospital}, ${request.district}"
            request.hospital.isNotBlank() -> request.hospital
            request.location.isNotBlank() -> request.location
            else -> ""
        }
        if (destination.isBlank()) {
            toast("Hospital location not available")
            return
        }
        try {
            val uri = Uri.parse("geo:0,0?q=${Uri.encode(destination)}")
            val intent = Intent(Intent.ACTION_VIEW, uri)
            startActivity(intent)
        } catch (_: Exception) {
            try {
                val webUri = Uri.parse("https://www.google.com/maps/search/?api=1&query=${Uri.encode(destination)}")
                startActivity(Intent(Intent.ACTION_VIEW, webUri))
            } catch (_: Exception) {
                toast("Unable to open map application")
            }
        }
    }

    private fun showRequestDetailsDialog(request: BloodRequest) {
        if (!isAdded) return
        val currentUserId = FirebaseAuth.getInstance().currentUser?.uid
        val currentUserBloodGroup = userViewModel.userBloodGroup.value.orEmpty()
        BloodRequestDetailsSheet.show(
            context = requireContext(),
            layoutInflater = layoutInflater,
            request = request,
            currentUserBloodGroup = currentUserBloodGroup,
            currentUserId = currentUserId,
            onCallClick = { r ->
                if (r.phone.isNotBlank()) makePhoneCall(r.phone)
                else toast("Requester phone number not available")
            },
            onChatClick = { r -> openChatWithRequester(r) },
            onShareClick = { r -> handleShareClick(r) },
            onDirectionsClick = { r -> handleDirectionsClick(r) },
            onHelpClick = { r -> handleHelpClick(r) }
        )
    }

    private fun performLogout() {
        android.app.AlertDialog.Builder(requireContext())
            .setTitle("Logout")
            .setMessage("Are you sure you want to logout?")
            .setPositiveButton("Yes") { _, _ ->
                (requireActivity() as MainActivity).logoutCurrentUser()
            }
            .setNegativeButton("No", null)
            .show()
    }

    private fun toggleDonorStatus() {
        val currentUser = auth.currentUser ?: return

        firestore.collection(FirebaseUtils.Collections.DONORS)
            .document(currentUser.uid)
            .get()
            .addOnSuccessListener { document ->
                if (document.exists()) {
                    val currentStatus = document.getBoolean("isAvailable") ?: true
                    val newStatus = !currentStatus

                    firestore.collection(FirebaseUtils.Collections.DONORS)
                        .document(currentUser.uid)
                        .update("isAvailable", newStatus)
                        .addOnSuccessListener {
                            val statusText = if (newStatus) "available" else "unavailable"
                            toast("You are now $statusText for donations")
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