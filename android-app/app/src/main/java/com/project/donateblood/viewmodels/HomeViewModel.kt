package com.project.donateblood.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.project.donateblood.R
import com.project.donateblood.models.BannerAction
import com.project.donateblood.models.HomeBanner

class HomeViewModel : ViewModel() {

    private val _banners = MutableLiveData<List<HomeBanner>>()
    val banners: LiveData<List<HomeBanner>> = _banners

    init {
        loadBanners()
    }

    private fun loadBanners() {
        _banners.value = listOf(
            HomeBanner(
                id = 1,
                title = "Donate Blood Today",
                subtitle = "Your blood type could be someone’s hope",
                backgroundResId = R.drawable.bg_banner_svg_1,
                action = BannerAction.FIND_DONORS
            ),
            HomeBanner(
                id = 2,
                title = "Together We Save",
                subtitle = "Join thousands of donors\nmaking a difference every day",
                backgroundResId = R.drawable.bg_banner_svg_2,
                action = BannerAction.COMMUNITY
            ),
            HomeBanner(
                id = 3,
                title = "Urgent Requests",
                subtitle = "Help patients who need blood now",
                backgroundResId = R.drawable.bg_banner_svg_3,
                action = BannerAction.URGENT_REQUESTS
            ),
            HomeBanner(
                id = 4,
                title = "Be Someone’s Hero",
                subtitle = "Donate blood. Change a life today.",
                backgroundResId = R.drawable.bg_banner_svg_4,
                action = BannerAction.REQUEST_BLOOD
            ),
            HomeBanner(
                id = 5,
                title = "Every Drop Counts",
                subtitle = "1 donation can save up to 3 lives",
                backgroundResId = R.drawable.bg_banner_svg_5,
                action = BannerAction.REQUEST_BLOOD
            )
        )
    }
}