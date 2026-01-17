// BottomNavViewModel.kt
package com.project.donateblood.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel

class BottomNavViewModel : ViewModel() {
    private val _selectedItemId = MutableLiveData<Int>()
    val selectedItemId: LiveData<Int> = _selectedItemId

    fun setSelectedItem(itemId: Int) {
        _selectedItemId.value = itemId
    }
}