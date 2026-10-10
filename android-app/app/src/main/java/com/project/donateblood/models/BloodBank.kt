package com.project.donateblood.models

import android.os.Parcelable
import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.IgnoreExtraProperties
import kotlinx.parcelize.Parcelize
import java.io.Serializable

@IgnoreExtraProperties
@Parcelize
data class BloodBank(
    @DocumentId
    var id: String = "",
    var name: String = "",
    var organization: String = "Red Crescent Society", // Red Crescent, Quantum Foundation, Badhan, Sandhani, Hospital-Based
    var address: String = "",
    var district: String = "Dhaka",
    var phone: String = "",
    var hotline: String = "",
    var operatingHours: String = "Open 24/7",
    var availableComponents: String = "Whole Blood, PRBC, Platelets, FFP",
    var isVerified: Boolean = true,
    var isOpen24Hours: Boolean = true,
    var latitude: Double = 0.0,
    var longitude: Double = 0.0
) : Parcelable, Serializable
