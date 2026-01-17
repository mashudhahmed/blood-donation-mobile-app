package com.project.donateblood

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.project.donateblood.viewmodels.UserViewModel
import timber.log.Timber

abstract class BaseActivity : AppCompatActivity() {

    // Protected so child activities can access it
    protected lateinit var userViewModel: UserViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize UserViewModel - shared across the activity's lifecycle
        userViewModel = ViewModelProvider(this)[UserViewModel::class.java]

        // Load initial user data
        userViewModel.loadUserData()

        Timber.d("🔄 BaseActivity initialized with UserViewModel")
    }

}