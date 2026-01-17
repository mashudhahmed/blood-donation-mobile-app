package com.project.donateblood.fragments

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.view.isVisible
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.*
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import com.project.donateblood.R
import com.project.donateblood.adapter.NotificationAdapter
import com.project.donateblood.models.NotificationItem
import com.project.donateblood.databinding.FragmentNotificationBinding
import com.project.donateblood.viewmodels.BottomNavViewModel
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.*
import kotlin.collections.ArrayList

class NotificationFragment : Fragment() {

    private var _binding: FragmentNotificationBinding? = null
    private val binding get() = _binding!!

    private lateinit var notificationAdapter: NotificationAdapter
    private var isLoading = false
    private var hasLoadedInitialData = false // ✅ Track initial load

    private val auth = FirebaseAuth.getInstance()
    private val firestore: FirebaseFirestore = Firebase.firestore

    private var notificationListener: ListenerRegistration? = null
    private val notificationsList = ArrayList<NotificationItem>()

    private lateinit var bottomNavViewModel: BottomNavViewModel

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentNotificationBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Timber.d("onViewCreated")

        bottomNavViewModel = ViewModelProvider(requireActivity())[BottomNavViewModel::class.java]

        setupToolbar()
        setupRecyclerView()
        setupSwipeRefresh()
        setupEmptyState()

        // ✅ Load notifications when fragment is created
        loadNotifications()
    }

    override fun onResume() {
        super.onResume()
        Timber.d("onResume - Checking login status")

        // Check if user is logged in
        val currentUser = auth.currentUser
        if (currentUser != null && !hasLoadedInitialData) {
            // User is logged in but we haven't loaded initial data yet
            Timber.d("User logged in, loading notifications...")
            loadNotifications()
        } else if (currentUser == null) {
            // User is not logged in
            showErrorState("Please log in to view notifications")
        }
    }

    override fun onPause() {
        super.onPause()
        Timber.d("onPause")
        removeRealtimeListener()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        removeRealtimeListener()
        _binding = null
        hasLoadedInitialData = false // Reset flag
        Timber.d("onDestroyView")
    }

    private fun setupToolbar() {
        binding.toolbar.title = "Notifications"
        binding.toolbar.setNavigationOnClickListener {
            try {
                findNavController().navigateUp()
            } catch (e: Exception) {
                Timber.e("Navigate up error: ${e.message}")
            }
        }
    }

    private fun setupRecyclerView() {
        binding.rvNotifications.layoutManager = LinearLayoutManager(requireContext())
        binding.rvNotifications.setHasFixedSize(true)
        notificationAdapter = NotificationAdapter(notificationsList) { notification ->
            markNotificationAsRead(notification)
        }
        binding.rvNotifications.adapter = notificationAdapter
    }

    private fun markNotificationAsRead(notification: NotificationItem) {
        val currentUser = auth.currentUser ?: return

        val position = notificationsList.indexOfFirst { it.id == notification.id }
        if (position != -1) {
            notificationsList[position] = notification.copy(isRead = true)
            notificationAdapter.updateNotifications(notificationsList)
        }

        // ✅ FIXED: Correct field name is "isRead" not "read"
        firestore.collection("notifications")
            .document(currentUser.uid)
            .collection("items")
            .document(notification.id)
            .update("isRead", true, "readAt", FieldValue.serverTimestamp())
            .addOnSuccessListener {
                Timber.d("Marked notification as read")
                Toast.makeText(requireContext(), "Marked as read", Toast.LENGTH_SHORT).show()
            }
            .addOnFailureListener { e ->
                Timber.e("Error marking as read: ${e.message}")
            }
    }

    private fun markAllAsRead() {
        val currentUser = auth.currentUser ?: return

        val batch = firestore.batch()
        val unreadNotifications = notificationsList.filter { !it.isRead }

        if (unreadNotifications.isEmpty()) {
            Toast.makeText(requireContext(), "No unread notifications", Toast.LENGTH_SHORT).show()
            return
        }

        unreadNotifications.forEach { notification ->
            val ref = firestore.collection("notifications")
                .document(currentUser.uid)
                .collection("items")
                .document(notification.id)
            batch.update(ref,
                mapOf(
                    "isRead" to true,
                    "readAt" to FieldValue.serverTimestamp()
                )
            )
        }

        batch.commit()
            .addOnSuccessListener {
                notificationsList.forEach { it.isRead = true }
                notificationAdapter.updateNotifications(notificationsList)
                Toast.makeText(requireContext(), "All notifications marked as read", Toast.LENGTH_SHORT).show()
            }
            .addOnFailureListener { e ->
                Toast.makeText(requireContext(), "Failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefreshLayout.setOnRefreshListener {
            if (!isLoading) {
                refreshNotifications()
            } else {
                binding.swipeRefreshLayout.isRefreshing = false
            }
        }

        binding.swipeRefreshLayout.setColorSchemeResources(
            R.color.primary_red,
            R.color.primary_red_dark
        )
    }

    private fun setupEmptyState() {
        binding.emptyStateLayout.isVisible = false
        binding.btnRetry.setOnClickListener {
            loadNotifications()
        }
    }

    private fun setupRealtimeListener() {
        val currentUser = auth.currentUser ?: return

        removeRealtimeListener()

        val userId = currentUser.uid

        notificationListener = firestore.collection("notifications")
            .document(userId)
            .collection("items")
            .orderBy("createdAt", Query.Direction.DESCENDING) // ✅ Use createdAt instead of timestamp
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Timber.e("Listener error: ${error.message}")
                    showErrorState("Error loading notifications")
                    return@addSnapshotListener
                }

                if (snapshot != null && !snapshot.isEmpty) {
                    val newNotifications = ArrayList<NotificationItem>()

                    for (document in snapshot.documents) {
                        try {
                            val notification = parseNotificationDocument(document)
                            newNotifications.add(notification)
                        } catch (e: Exception) {
                            Timber.e("Error parsing document: ${e.message}")
                        }
                    }

                    notificationsList.clear()
                    notificationsList.addAll(newNotifications)
                    notificationAdapter.updateNotifications(newNotifications)

                    showContent()
                    Timber.d("✅ Real-time update: Loaded ${newNotifications.size} notifications")
                } else if (snapshot != null && snapshot.isEmpty) {
                    showEmptyState()
                }
            }
    }

    private fun parseNotificationDocument(document: DocumentSnapshot): NotificationItem {
        return NotificationItem(
            id = document.id,
            message = document.getString("message") ?: document.getString("body") ?: "",
            time = formatTime(document.getDate("timestamp") ?: document.getDate("createdAt")),
            timestamp = document.getDate("timestamp")?.time
                ?: document.getDate("createdAt")?.time
                ?: System.currentTimeMillis(),
            isRead = document.getBoolean("isRead") ?: false,
            title = document.getString("title") ?: "Notification",
            type = document.getString("type") ?: "notification",
            bloodGroup = document.getString("bloodGroup") ?: "",
            hospital = document.getString("hospital") ?: "",
            district = document.getString("district") ?: "",
            urgency = document.getString("urgency") ?: "normal",
            requestId = document.getString("requestId") ?: "",
            notificationId = document.getString("notificationId") ?: "",
            createdAt = document.getDate("createdAt")?.time ?: System.currentTimeMillis()
        )
    }

    private fun removeRealtimeListener() {
        notificationListener?.remove()
        notificationListener = null
    }

    private fun loadNotifications() {
        if (isLoading) return

        val currentUser = auth.currentUser
        if (currentUser == null) {
            showErrorState("Please log in to view notifications")
            return
        }

        isLoading = true
        binding.progressBar.isVisible = true
        binding.rvNotifications.isVisible = false
        binding.emptyStateLayout.isVisible = false

        val userId = currentUser.uid

        Timber.d("📥 Loading notifications for user: $userId")
        Timber.d("🔍 Querying: notifications/$userId/items")

        // ✅ STEP 1: FIRST LOAD ALL EXISTING NOTIFICATIONS (CATCH-UP)
        firestore.collection("notifications")
            .document(userId)
            .collection("items")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .get()
            .addOnSuccessListener { snapshot ->
                Timber.d("✅ Initial load complete: ${snapshot.size()} notifications found")

                if (!snapshot.isEmpty) {
                    val initialNotifications = ArrayList<NotificationItem>()

                    for (document in snapshot.documents) {
                        try {
                            val notification = parseNotificationDocument(document)
                            initialNotifications.add(notification)
                            Timber.d("📄 Loaded notification: ${document.id}")
                        } catch (e: Exception) {
                            Timber.e("Error parsing document: ${e.message}")
                        }
                    }

                    notificationsList.clear()
                    notificationsList.addAll(initialNotifications)
                    notificationAdapter.updateNotifications(initialNotifications)

                    showContent()
                    hasLoadedInitialData = true

                    Timber.d("📊 Initial notifications loaded: ${initialNotifications.size}")
                    Timber.d("   - Unread: ${initialNotifications.count { !it.isRead }}")
                    Timber.d("   - Read: ${initialNotifications.count { it.isRead }}")
                } else {
                    Timber.d("📭 No stored notifications found for user")
                    showEmptyState()
                    hasLoadedInitialData = true
                }

                // ✅ STEP 2: SETUP REAL-TIME LISTENER AFTER INITIAL LOAD
                setupRealtimeListener()

                isLoading = false
                binding.progressBar.isVisible = false
            }
            .addOnFailureListener { e ->
                Timber.e("❌ Initial load failed: ${e.message}")
                showErrorState("Failed to load notifications: ${e.message}")
                isLoading = false
                binding.progressBar.isVisible = false
            }
    }

    private fun refreshNotifications() {
        if (isLoading) {
            binding.swipeRefreshLayout.isRefreshing = false
            return
        }

        isLoading = true

        val currentUser = auth.currentUser
        if (currentUser == null) {
            showErrorState("Please log in to view notifications")
            binding.swipeRefreshLayout.isRefreshing = false
            isLoading = false
            return
        }

        val userId = currentUser.uid

        firestore.collection("notifications")
            .document(userId)
            .collection("items")
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .get()
            .addOnSuccessListener { snapshot ->
                if (!snapshot.isEmpty) {
                    val refreshedNotifications = ArrayList<NotificationItem>()

                    for (document in snapshot.documents) {
                        try {
                            val notification = parseNotificationDocument(document)
                            refreshedNotifications.add(notification)
                        } catch (e: Exception) {
                            Timber.e("Error parsing document: ${e.message}")
                        }
                    }

                    notificationsList.clear()
                    notificationsList.addAll(refreshedNotifications)
                    notificationAdapter.updateNotifications(refreshedNotifications)

                    showContent()
                    Timber.d("🔄 Refreshed ${refreshedNotifications.size} notifications")
                } else {
                    showEmptyState()
                }

                binding.swipeRefreshLayout.isRefreshing = false
                isLoading = false
            }
            .addOnFailureListener { e ->
                Timber.e("Refresh failed: ${e.message}")
                showErrorState("Refresh failed: ${e.message}")
                binding.swipeRefreshLayout.isRefreshing = false
                isLoading = false
            }
    }

    private fun formatTime(date: Date?): String {
        if (date == null) return "Just now"

        val now = System.currentTimeMillis()
        val diff = now - date.time

        return when {
            diff < 60000 -> "Just now"
            diff < 3600000 -> "${diff / 60000} min ago"
            diff < 86400000 -> "${diff / 3600000} hours ago"
            diff < 604800000 -> "${diff / 86400000} days ago"
            else -> SimpleDateFormat("dd/MM/yyyy", Locale.getDefault()).format(date)
        }
    }

    private fun showContent() {
        binding.progressBar.isVisible = false
        binding.emptyStateLayout.isVisible = false
        binding.rvNotifications.isVisible = true
    }

    @SuppressLint("SetTextI18n")
    private fun showEmptyState() {
        binding.progressBar.isVisible = false
        binding.rvNotifications.isVisible = false
        binding.emptyStateLayout.isVisible = true
        binding.btnRetry.isVisible = false
        binding.tvEmptyState.text = "No notifications yet"
    }

    private fun showErrorState(errorMessage: String) {
        binding.progressBar.isVisible = false
        binding.rvNotifications.isVisible = false
        binding.emptyStateLayout.isVisible = true
        binding.btnRetry.isVisible = true
        binding.tvEmptyState.text = errorMessage
    }
}