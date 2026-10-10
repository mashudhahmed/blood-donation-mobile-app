package com.project.donateblood.utils

import android.util.Log
import com.google.firebase.crashlytics.FirebaseCrashlytics
import timber.log.Timber

/**
 * Timber Tree for Release builds:
 * Drops verbose/debug logs, forwards warnings and errors to Firebase Crashlytics.
 */
class CrashReportingTree : Timber.Tree() {
    override fun log(priority: Int, tag: String?, message: String, t: Throwable?) {
        if (priority == Log.VERBOSE || priority == Log.DEBUG || priority == Log.INFO) {
            return
        }

        val crashlytics = FirebaseCrashlytics.getInstance()
        crashlytics.log("[${tag ?: "App"}] $message")

        if (t != null) {
            crashlytics.recordException(t)
        } else if (priority == Log.ERROR) {
            crashlytics.recordException(Exception(message))
        }
    }
}
