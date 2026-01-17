package com.project.donateblood.utils

object DonationEligibilityUtil {

    private const val MIN_DAYS_GAP = 90L
    private const val MILLIS_IN_DAY = 24 * 60 * 60 * 1000L

    fun isEligible(lastDonationDate: Long?): Boolean {
        if (lastDonationDate == null) return true // never donated
        val daysPassed =
            (System.currentTimeMillis() - lastDonationDate) / MILLIS_IN_DAY
        return daysPassed >= MIN_DAYS_GAP
    }
}
