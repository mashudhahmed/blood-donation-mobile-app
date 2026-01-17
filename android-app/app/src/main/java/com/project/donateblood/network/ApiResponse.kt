package com.project.donateblood.network

import com.google.gson.annotations.SerializedName

data class ApiResponse(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("message")
    val message: String,

    @SerializedName("data")
    val data: Map<String, Any>? = null,

    @SerializedName("userId")
    val userId: String? = null,

    @SerializedName("deviceId")
    val deviceId: String? = null,

    @SerializedName("compoundTokenId")
    val compoundTokenId: String? = null,

    @SerializedName("isLoggedIn")
    val isLoggedIn: Boolean? = null,

    @SerializedName("timestamp")
    val timestamp: String? = null
)