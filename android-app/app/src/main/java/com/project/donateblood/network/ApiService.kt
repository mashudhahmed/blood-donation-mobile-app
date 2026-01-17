package com.project.donateblood.network

import com.project.donateblood.models.UpdateDonorRequest
import retrofit2.Call
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.PUT

interface ApiService {

    // ✅ Donor update (coroutine version) - KEEP THIS
    @PUT("donor/update")
    suspend fun updateDonor(
        @Body request: UpdateDonorRequest
    ): Response<Unit>

    // ✅ Donor update (callback version) - KEEP THIS
    @PUT("donor/update")
    fun updateDonorCall(
        @Body request: UpdateDonorRequest
    ): Call<Unit>

    // ✅ REMOVED: Blood request API calls since you're using Firebase now
    // All blood request functionality moved to NotificationApi
}