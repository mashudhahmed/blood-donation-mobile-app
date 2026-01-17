package com.project.donateblood.models

import android.os.Parcelable
import kotlinx.parcelize.Parcelize
import java.util.Date

@Parcelize
data class HistoryItem(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val date: Date = Date(),
    val type: String = "", // "requested" or "donated"
    var status: String = "", // "pending", "completed", "cancelled", "processing" - CHANGED TO var
    val patientName: String = "",
    val hospital: String = "",
    val bloodGroup: String = "",
    val units: Int = 0,
    val location: String = ""
) : Parcelable