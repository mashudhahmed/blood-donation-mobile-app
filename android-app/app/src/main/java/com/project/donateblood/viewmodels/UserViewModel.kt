package com.project.donateblood.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestore
import com.project.donateblood.utils.FirebaseUtils
import timber.log.Timber

class UserViewModel : ViewModel() {
    private val _currentUser = MutableLiveData<FirebaseUser?>()
    val currentUser: LiveData<FirebaseUser?> = _currentUser

    private val _userName = MutableLiveData<String>()
    val userName: LiveData<String> = _userName

    private val _userEmail = MutableLiveData<String>()
    val userEmail: LiveData<String> = _userEmail

    private val _userProfileImage = MutableLiveData<String?>()
    val userProfileImage: LiveData<String?> = _userProfileImage

    private val auth = FirebaseAuth.getInstance()
    private val firestore = FirebaseFirestore.getInstance()

    init {
        // Initialize with current user
        _currentUser.value = auth.currentUser
        loadUserData()

        // Listen for auth state changes
        setupAuthListener()
    }

    private fun setupAuthListener() {
        auth.addAuthStateListener { firebaseAuth ->
            val user = firebaseAuth.currentUser
            _currentUser.value = user
            if (user != null) {
                loadUserData()
            } else {
                _userName.value = "Guest"
                _userEmail.value = "Not logged in"
                _userProfileImage.value = null
            }
        }
    }

    fun loadUserData() {
        val user = auth.currentUser ?: return

        // Set basic info from Firebase Auth
        _userName.value = user.displayName ?: user.email?.substringBefore("@") ?: "User"
        _userEmail.value = user.email ?: "No email"

        // Load additional info from Firestore
        firestore.collection(FirebaseUtils.Collections.USERS)
            .document(user.uid)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Timber.tag("UserViewModel").e("Error loading user data: ${error.message}")
                    return@addSnapshotListener
                }

                snapshot?.let { doc ->
                    if (doc.exists()) {
                        // Update name if available in Firestore
                        doc.getString(FirebaseUtils.UserFields.NAME)?.let { name ->
                            if (name.isNotEmpty()) {
                                _userName.value = name
                            }
                        }

                        // Update profile image
                        doc.getString(FirebaseUtils.UserFields.PROFILE_IMAGE)?.let { imageUrl ->
                            _userProfileImage.value = imageUrl
                        }
                    }
                }
            }
    }

    fun updateUserName(newName: String) {
        _userName.value = newName
    }

    fun updateUserEmail(newEmail: String) {
        _userEmail.value = newEmail
    }

    fun updateProfileImage(imageUrl: String) {
        _userProfileImage.value = imageUrl
    }

    fun logout() {
        auth.signOut()
    }

    override fun onCleared() {
        super.onCleared()
        // Clean up if needed
    }
}