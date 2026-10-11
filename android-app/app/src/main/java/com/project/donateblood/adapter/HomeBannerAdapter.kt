package com.project.donateblood.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.project.donateblood.databinding.ItemHomeBannerBinding
import com.project.donateblood.models.HomeBanner

class HomeBannerAdapter(
    private val banners: List<HomeBanner>,
    private val onBannerClick: (HomeBanner) -> Unit
) : RecyclerView.Adapter<HomeBannerAdapter.BannerViewHolder>() {

    companion object {
        const val INFINITE_COUNT = 10000
    }

    inner class BannerViewHolder(
        private val binding: ItemHomeBannerBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(banner: HomeBanner) {
            binding.ivBannerBackground.setImageResource(banner.backgroundResId)
            binding.tvBannerTitle.text = banner.title
            binding.tvBannerSubtitle.text = banner.subtitle

            binding.root.setOnClickListener {
                onBannerClick(banner)
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): BannerViewHolder {
        val binding = ItemHomeBannerBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return BannerViewHolder(binding)
    }

    override fun onBindViewHolder(holder: BannerViewHolder, position: Int) {
        if (banners.isEmpty()) return
        val realPosition = position % banners.size
        holder.bind(banners[realPosition])
    }

    override fun getItemCount(): Int {
        return if (banners.size > 1) INFINITE_COUNT else banners.size
    }
}
