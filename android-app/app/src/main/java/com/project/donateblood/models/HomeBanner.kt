package com.project.donateblood.models

import androidx.annotation.DrawableRes

enum class BannerAction {
    FIND_DONORS,
    COMMUNITY,
    URGENT_REQUESTS,
    REQUEST_BLOOD
}

data class HomeBanner(
    val id: Int,
    val title: String,
    val subtitle: String,
    @field:DrawableRes val backgroundResId: Int,
    val action: BannerAction
)
