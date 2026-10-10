package com.project.donateblood.utils

/**
 * Standard medical blood compatibility rules for red blood cell donations.
 */
object BloodCompatibility {

    /**
     * Given a donor's blood group, returns all recipient blood groups that can safely receive it.
     */
    fun canDonateTo(donorGroup: String): Set<String> {
        return when (donorGroup.uppercase().trim()) {
            "O-" -> setOf("O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+")
            "O+" -> setOf("O+", "A+", "B+", "AB+")
            "A-" -> setOf("A-", "A+", "AB-", "AB+")
            "A+" -> setOf("A+", "AB+")
            "B-" -> setOf("B-", "B+", "AB-", "AB+")
            "B+" -> setOf("B+", "AB+")
            "AB-" -> setOf("AB-", "AB+")
            "AB+" -> setOf("AB+")
            else -> emptySet()
        }
    }

    /**
     * Given a recipient's blood group, returns all donor blood groups that can safely donate to them.
     */
    fun canReceiveFrom(recipientGroup: String): Set<String> {
        return when (recipientGroup.uppercase().trim()) {
            "AB+" -> setOf("O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+")
            "AB-" -> setOf("O-", "A-", "B-", "AB-")
            "A+" -> setOf("O-", "O+", "A-", "A+")
            "A-" -> setOf("O-", "A-")
            "B+" -> setOf("O-", "O+", "B-", "B+")
            "B-" -> setOf("O-", "B-")
            "O+" -> setOf("O-", "O+")
            "O-" -> setOf("O-")
            else -> emptySet()
        }
    }

    /**
     * Returns true if donor with [donorGroup] can donate to recipient needing [recipientGroup].
     */
    fun isCompatible(donorGroup: String, recipientGroup: String): Boolean {
        if (donorGroup.isBlank() || recipientGroup.isBlank()) return true
        return canDonateTo(donorGroup).contains(recipientGroup.uppercase().trim())
    }
}
