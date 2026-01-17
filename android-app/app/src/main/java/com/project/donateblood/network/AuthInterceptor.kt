package com.project.donateblood.network

import com.google.android.gms.tasks.Tasks
import com.google.firebase.auth.FirebaseAuth
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val user = FirebaseAuth.getInstance().currentUser
        val token = user?.let {
            Tasks.await(it.getIdToken(false)).token
        }

        val request = chain.request().newBuilder().apply {
            // Add Authorization header if token exists
            if (!token.isNullOrEmpty()) {
                addHeader("Authorization", "Bearer $token")
            }
            // Add common headers
            addHeader("Content-Type", "application/json")
            addHeader("Accept", "application/json")
            addHeader("X-Client-Type", "android-app")
        }.build()

        return chain.proceed(request)
    }
}