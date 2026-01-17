package com.project.donateblood.network

import com.google.gson.annotations.SerializedName

data class SaveTokenRequest(
    @SerializedName("userId")
    val userId: String,

    @SerializedName("fcmToken")
    val fcmToken: String,

    @SerializedName("userType")
    val userType: String = "donor",

    @SerializedName("deviceId")
    val deviceId: String? = null,

    @SerializedName("deviceType")
    val deviceType: String? = "android",

    @SerializedName("appVersion")
    val appVersion: String? = null,

    @SerializedName("isLoggedIn")
    val isLoggedIn: Boolean = true
)