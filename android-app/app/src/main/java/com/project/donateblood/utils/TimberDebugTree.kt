package com.project.donateblood.utils

import android.util.Log
import timber.log.Timber

class TimberDebugTree : Timber.DebugTree() {
    override fun log(priority: Int, tag: String?, message: String, t: Throwable?) {
        // Add emoji prefixes based on log level
        val emojiPrefix = when (priority) {
            Log.VERBOSE -> "🔍"
            Log.DEBUG -> "🐛"
            Log.INFO -> "ℹ️"
            Log.WARN -> "⚠️"
            Log.ERROR -> "❌"
            Log.ASSERT -> "🚨"
            else -> "📝"
        }

        val prefixedMessage = "$emojiPrefix $message"
        super.log(priority, tag, prefixedMessage, t)
    }

    override fun createStackElementTag(element: StackTraceElement): String {
        // Add class name to tag for better debugging
        return "${super.createStackElementTag(element)} (${element.fileName}:${element.lineNumber})"
    }
}