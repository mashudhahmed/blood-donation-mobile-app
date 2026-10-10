package com.project.donateblood.models

import android.os.Parcelable
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.IgnoreExtraProperties
import kotlinx.parcelize.Parcelize
import java.io.Serializable

@IgnoreExtraProperties
@Parcelize
data class Hospital(
    @DocumentId
    var id: String = "",
    var name: String = "",
    var type: String = "Govt Medical College", // Govt Medical College, Private Hospital, Specialized, Tertiary Care
    var address: String = "",
    var district: String = "Dhaka",
    var area: String = "",
    var phone: String = "",
    var emergencyHotline: String = "",
    var isEmergency24Hours: Boolean = true,
    var bloodTransfusionAvailable: Boolean = true,
    var latitude: Double = 0.0,
    var longitude: Double = 0.0,
    var website: String = "",
    var bedsAvailable: Int = 0
) : Parcelable, Serializable
