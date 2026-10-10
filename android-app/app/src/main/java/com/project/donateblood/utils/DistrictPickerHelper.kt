package com.project.donateblood.utils

import android.app.AlertDialog
import android.content.Context
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.project.donateblood.R
import com.project.donateblood.databinding.BottomSheetDistrictPickerBinding
import com.project.donateblood.databinding.ItemDistrictPickerBinding

object DistrictPickerHelper {

    val BANGLADESH_DISTRICTS = arrayOf(
        "Bagerhat", "Bandarban", "Barguna", "Barisal", "Bhola", "Bogra",
        "Brahmanbaria", "Chandpur", "Chapai Nawabganj", "Chattogram",
        "Chuadanga", "Comilla", "Cox's Bazar", "Cumilla", "Dhaka", "Dinajpur",
        "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj",
        "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah",
        "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram",
        "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur", "Magura",
        "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", "Mymensingh",
        "Naogaon", "Narail", "Narayanganj", "Narsingdi", "Natore",
        "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh",
        "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati",
        "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj",
        "Sunamganj", "Sylhet", "Tangail", "Thakurgaon"
    )

    val BLOOD_GROUPS = arrayOf(
        "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
    )

    fun showDistrictPicker(
        context: Context,
        layoutInflater: LayoutInflater,
        selectedDistrict: String,
        onSelected: (String) -> Unit
    ) {
        val dialog = BottomSheetDialog(
            context,
            R.style.Theme_BloodLink_BottomSheetDialog
        )
        val dialogBinding = BottomSheetDistrictPickerBinding.inflate(layoutInflater)
        dialog.setContentView(dialogBinding.root)

        val allList = BANGLADESH_DISTRICTS.toList()
        var currentList = allList

        val adapter = DistrictAdapter(currentList, selectedDistrict.trim()) { clickedDistrict ->
            onSelected(clickedDistrict)
            dialog.dismiss()
        }

        dialogBinding.rvDistricts.layoutManager = LinearLayoutManager(context)
        dialogBinding.rvDistricts.adapter = adapter

        dialogBinding.etDistrictSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                val query = s?.toString()?.trim() ?: ""
                currentList = if (query.isEmpty()) {
                    allList
                } else {
                    allList.filter { it.contains(query, ignoreCase = true) }
                }
                adapter.updateList(currentList)
                dialogBinding.tvNoDistrictFound.isVisible = currentList.isEmpty()
                dialogBinding.rvDistricts.isVisible = currentList.isNotEmpty()
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        dialogBinding.ivCloseDistrictPicker.setOnClickListener {
            dialog.dismiss()
        }

        dialog.show()
    }

    fun showBloodGroupPicker(
        context: Context,
        selectedBloodGroup: String,
        onSelected: (String) -> Unit
    ) {
        var checkedItem = BLOOD_GROUPS.indexOfFirst { it.equals(selectedBloodGroup.trim(), ignoreCase = true) }
        if (checkedItem < 0) checkedItem = -1

        AlertDialog.Builder(context)
            .setTitle("Select Blood Group")
            .setIcon(R.drawable.ic_blood_drop)
            .setSingleChoiceItems(BLOOD_GROUPS, checkedItem) { dialog, which ->
                onSelected(BLOOD_GROUPS[which])
                dialog.dismiss()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private class DistrictAdapter(
        private var list: List<String>,
        private val selected: String,
        private val onItemClick: (String) -> Unit
    ) : RecyclerView.Adapter<DistrictAdapter.DistrictViewHolder>() {

        fun updateList(newList: List<String>) {
            list = newList
            notifyDataSetChanged()
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DistrictViewHolder {
            val itemBinding = ItemDistrictPickerBinding.inflate(
                LayoutInflater.from(parent.context), parent, false
            )
            return DistrictViewHolder(itemBinding)
        }

        override fun onBindViewHolder(holder: DistrictViewHolder, position: Int) {
            val item = list[position]
            holder.binding.tvDistrictName.text = item
            val isCurrent = item.equals(selected, ignoreCase = true)
            holder.binding.ivSelectedCheck.isVisible = isCurrent
            if (isCurrent) {
                holder.binding.tvDistrictName.setTextColor(
                    ContextCompat.getColor(holder.itemView.context, R.color.primary_red)
                )
            } else {
                holder.binding.tvDistrictName.setTextColor(
                    ContextCompat.getColor(holder.itemView.context, R.color.text_primary)
                )
            }
            holder.itemView.setOnClickListener { onItemClick(item) }
        }

        override fun getItemCount(): Int = list.size

        class DistrictViewHolder(val binding: ItemDistrictPickerBinding) :
            RecyclerView.ViewHolder(binding.root)
    }
}
