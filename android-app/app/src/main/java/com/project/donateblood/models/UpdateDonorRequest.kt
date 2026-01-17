package com.project.donateblood.models

data class UpdateDonorRequest(
    val bloodGroup: String,
    val district: String,
    val lastDonationDate: String,
    val isAvailable: Boolean,
    val fcmToken: String
)