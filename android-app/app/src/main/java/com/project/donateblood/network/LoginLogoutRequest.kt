package com.project.donateblood.network

import com.google.gson.annotations.SerializedName

data class LoginLogoutRequest(
    @SerializedName("userId")
    val userId: String,

    @SerializedName("deviceId")
    val deviceId: String? = null
)