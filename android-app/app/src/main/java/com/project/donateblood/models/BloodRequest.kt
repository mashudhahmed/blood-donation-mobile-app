package com.project.donateblood.models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.PropertyName
import com.google.gson.annotations.SerializedName

data class BloodRequest(
    @SerializedName("id")
    @PropertyName("id")
    val id: String = "",

    @SerializedName("patientName")
    @PropertyName("patientName")
    val patientName: String = "",

    @SerializedName("hospital")
    @PropertyName("hospital")
    val hospital: String = "",

    @SerializedName("phone")
    @PropertyName("phone")
    val phone: String = "",

    @SerializedName("units")
    @PropertyName("units")
    val units: Int = 1,

    @SerializedName("bloodGroup")
    @PropertyName("bloodGroup")
    val bloodGroup: String = "",

    @SerializedName("date")
    @PropertyName("date")
    val date: String = "",

    @SerializedName("time")
    @PropertyName("time")
    val time: String = "",

    @SerializedName("district")
    @PropertyName("district")
    val district: String = "",

    @SerializedName("location")
    @PropertyName("location")
    val location: String = "",

    @SerializedName("requesterId")
    @PropertyName("requesterId")
    val requesterId: String = "",

    @SerializedName("urgency")
    @PropertyName("urgency")
    val urgency: String = "normal",

    @SerializedName("status")
    @PropertyName("status")
    val status: String = "pending",

    @SerializedName("createdAt")
    @PropertyName("createdAt")
    val createdAt: Timestamp = Timestamp.now(),

    @SerializedName("updatedAt")
    @PropertyName("updatedAt")
    val updatedAt: Timestamp = Timestamp.now()
)