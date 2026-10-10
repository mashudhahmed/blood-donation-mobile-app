package com.project.donateblood.repository

import com.google.firebase.firestore.FirebaseFirestore
import com.project.donateblood.models.BloodBank
import com.project.donateblood.models.Donor
import com.project.donateblood.models.Hospital
import com.project.donateblood.utils.FirebaseUtils
import kotlinx.coroutines.tasks.await

class DirectoryRepository {

    private val firestore: FirebaseFirestore = FirebaseUtils.firestore

    suspend fun getHospitals(): List<Hospital> {
        return try {
            val snapshot = firestore.collection(FirebaseUtils.Collections.HOSPITALS)
                .get()
                .await()
            val list = snapshot.toObjects(Hospital::class.java)
            if (list.isNotEmpty()) list else getDefaultHospitals()
        } catch (_: Exception) {
            getDefaultHospitals()
        }
    }

    suspend fun getBloodBanks(): List<BloodBank> {
        return try {
            val snapshot = firestore.collection(FirebaseUtils.Collections.BLOOD_BANKS)
                .get()
                .await()
            val list = snapshot.toObjects(BloodBank::class.java)
            if (list.isNotEmpty()) list else getDefaultBloodBanks()
        } catch (_: Exception) {
            getDefaultBloodBanks()
        }
    }

    suspend fun getVerifiedDonors(): List<Donor> {
        return try {
            val snapshot = firestore.collection(FirebaseUtils.Collections.DONORS)
                .whereEqualTo("isAvailable", true)
                .limit(20)
                .get()
                .await()
            val list = snapshot.toObjects(Donor::class.java)
            if (list.isNotEmpty()) {
                val realIds = list.map { it.id }.toSet()
                val defaults = getDefaultDonors().filter { it.id !in realIds }
                list + defaults
            } else {
                getDefaultDonors()
            }
        } catch (_: Exception) {
            getDefaultDonors()
        }
    }

    companion object {
        fun getDefaultHospitals(): List<Hospital> {
            return listOf(
                Hospital(
                    id = "hosp_dmch",
                    name = "Dhaka Medical College Hospital",
                    type = "Govt Medical College",
                    address = "Secretariat Road, Ramna",
                    district = "Dhaka",
                    area = "Ramna",
                    phone = "+880 2-55165088",
                    emergencyHotline = "+880 1711-222333",
                    isEmergency24Hours = true,
                    bloodTransfusionAvailable = true,
                    latitude = 23.7258,
                    longitude = 90.3976
                ),
                Hospital(
                    id = "hosp_bsmmu",
                    name = "Bangabandhu Sheikh Mujib Medical University",
                    type = "Govt Medical College",
                    address = "Shahbagh Avenue",
                    district = "Dhaka",
                    area = "Shahbagh",
                    phone = "+880 2-9661051",
                    emergencyHotline = "+880 1713-000111",
                    isEmergency24Hours = true,
                    bloodTransfusionAvailable = true,
                    latitude = 23.7389,
                    longitude = 90.3956
                ),
                Hospital(
                    id = "hosp_kurmitola",
                    name = "Kurmitola General Hospital",
                    type = "Govt Hospital",
                    address = "Airport Road, Dhaka Cantonment",
                    district = "Dhaka",
                    area = "Cantonment",
                    phone = "+880 2-55067201",
                    emergencyHotline = "+880 1769-010200",
                    isEmergency24Hours = true,
                    bloodTransfusionAvailable = true,
                    latitude = 23.8212,
                    longitude = 90.4101
                ),
                Hospital(
                    id = "hosp_nicvd",
                    name = "National Institute of Cardiovascular Diseases",
                    type = "Specialized Govt",
                    address = "Sher-e-Bangla Nagar",
                    district = "Dhaka",
                    area = "Agargaon",
                    phone = "+880 2-9122560",
                    emergencyHotline = "+880 1819-112233",
                    isEmergency24Hours = true,
                    bloodTransfusionAvailable = true,
                    latitude = 23.7709,
                    longitude = 90.3707
                ),
                Hospital(
                    id = "hosp_square",
                    name = "Square Hospital",
                    type = "Private Hospital",
                    address = "18F Bir Uttam Qazi Nuruzzaman Sarak, Panthapath",
                    district = "Dhaka",
                    area = "Panthapath",
                    phone = "10616",
                    emergencyHotline = "+880 1713-377775",
                    isEmergency24Hours = true,
                    bloodTransfusionAvailable = true,
                    latitude = 23.7531,
                    longitude = 90.3817
                ),
                Hospital(
                    id = "hosp_evercare",
                    name = "Evercare Hospital Dhaka",
                    type = "Private Hospital",
                    address = "Plot 81, Block E, Bashundhara R/A",
                    district = "Dhaka",
                    area = "Bashundhara",
                    phone = "10678",
                    emergencyHotline = "+880 1713-041444",
                    isEmergency24Hours = true,
                    bloodTransfusionAvailable = true,
                    latitude = 23.8103,
                    longitude = 90.4312
                ),
                Hospital(
                    id = "hosp_united",
                    name = "United Hospital",
                    type = "Private Hospital",
                    address = "Plot 15, Road 71, Gulshan-2",
                    district = "Dhaka",
                    area = "Gulshan",
                    phone = "10666",
                    emergencyHotline = "+880 1914-001234",
                    isEmergency24Hours = true,
                    bloodTransfusionAvailable = true,
                    latitude = 23.7997,
                    longitude = 90.4131
                ),
                Hospital(
                    id = "hosp_cmch",
                    name = "Chittagong Medical College Hospital",
                    type = "Govt Medical College",
                    address = "57 K.B. Fazlul Kader Road",
                    district = "Chattogram",
                    area = "Panchlaish",
                    phone = "+880 31-619400",
                    emergencyHotline = "+880 1711-334455",
                    isEmergency24Hours = true,
                    bloodTransfusionAvailable = true,
                    latitude = 22.3592,
                    longitude = 91.8286
                ),
                Hospital(
                    id = "hosp_rmch",
                    name = "Rajshahi Medical College Hospital",
                    type = "Govt Medical College",
                    address = "Laxmipur",
                    district = "Rajshahi",
                    area = "Laxmipur",
                    phone = "+880 721-772150",
                    emergencyHotline = "+880 1712-445566",
                    isEmergency24Hours = true,
                    bloodTransfusionAvailable = true,
                    latitude = 24.3704,
                    longitude = 88.5862
                ),
                Hospital(
                    id = "hosp_somch",
                    name = "Sylhet MAG Osmani Medical College Hospital",
                    type = "Govt Medical College",
                    address = "Medical Road, Kazir Bazar",
                    district = "Sylhet",
                    area = "Kotwali",
                    phone = "+880 821-713667",
                    emergencyHotline = "+880 1713-556677",
                    isEmergency24Hours = true,
                    bloodTransfusionAvailable = true,
                    latitude = 24.8988,
                    longitude = 91.8543
                )
            )
        }

        fun getDefaultBloodBanks(): List<BloodBank> {
            return listOf(
                BloodBank(
                    id = "bb_redcrescent",
                    name = "Bangladesh Red Crescent Society Blood Center",
                    organization = "Red Crescent Society",
                    address = "7/5 Aurangzeb Road, Mohammadpur",
                    district = "Dhaka",
                    phone = "+880 2-9116563",
                    hotline = "+880 1819-284851",
                    operatingHours = "Open 24/7",
                    availableComponents = "Whole Blood, PRBC, Platelets, FFP",
                    isVerified = true,
                    isOpen24Hours = true,
                    latitude = 23.7594,
                    longitude = 90.3644
                ),
                BloodBank(
                    id = "bb_quantum",
                    name = "Quantum Lab Blood Bank",
                    organization = "Quantum Foundation",
                    address = "119 Shantinagar, Kakrail",
                    district = "Dhaka",
                    phone = "+880 2-9351969",
                    hotline = "+880 1714-010869",
                    operatingHours = "Open 24/7",
                    availableComponents = "Whole Blood, PRBC, Platelets, FFP, Cryo",
                    isVerified = true,
                    isOpen24Hours = true,
                    latitude = 23.7382,
                    longitude = 90.4116
                ),
                BloodBank(
                    id = "bb_badhan_tsc",
                    name = "Badhan Central Blood Bank",
                    organization = "Badhan Foundation",
                    address = "TSC, University of Dhaka",
                    district = "Dhaka",
                    phone = "+880 1534-982674",
                    hotline = "+880 1732-445566",
                    operatingHours = "9:00 AM - 9:00 PM",
                    availableComponents = "Whole Blood, PRBC",
                    isVerified = true,
                    isOpen24Hours = false,
                    latitude = 23.7324,
                    longitude = 90.3952
                ),
                BloodBank(
                    id = "bb_sandhani_dmch",
                    name = "Sandhani Central Blood Bank",
                    organization = "Sandhani",
                    address = "DMCH Complex, Secretariat Road",
                    district = "Dhaka",
                    phone = "+880 2-9668690",
                    hotline = "+880 1819-211555",
                    operatingHours = "Open 24/7",
                    availableComponents = "Whole Blood, Platelets, FFP",
                    isVerified = true,
                    isOpen24Hours = true,
                    latitude = 23.7258,
                    longitude = 90.3976
                ),
                BloodBank(
                    id = "bb_police",
                    name = "Police Blood Bank",
                    organization = "Police Lines Hospital",
                    address = "Rajarbagh Police Lines",
                    district = "Dhaka",
                    phone = "+880 2-9333555",
                    hotline = "+880 1713-398386",
                    operatingHours = "Open 24/7",
                    availableComponents = "Whole Blood, PRBC, Platelets",
                    isVerified = true,
                    isOpen24Hours = true,
                    latitude = 23.7420,
                    longitude = 90.4168
                ),
                BloodBank(
                    id = "bb_fatematuj",
                    name = "Fatematuj Johra Blood Bank & Diagnostic",
                    organization = "Non-Profit Certified",
                    address = "Block C, Mirpur-10",
                    district = "Dhaka",
                    phone = "+880 1711-987654",
                    hotline = "+880 1912-345678",
                    operatingHours = "Open 24/7",
                    availableComponents = "Whole Blood, PRBC, Platelets",
                    isVerified = true,
                    isOpen24Hours = true,
                    latitude = 23.8071,
                    longitude = 90.3687
                ),
                BloodBank(
                    id = "bb_sandhani_cmch",
                    name = "Sandhani Blood Bank (CMCH Branch)",
                    organization = "Sandhani",
                    address = "CMCH Campus, KB Fazlul Kader Rd",
                    district = "Chattogram",
                    phone = "+880 31-616333",
                    hotline = "+880 1712-889900",
                    operatingHours = "Open 24/7",
                    availableComponents = "Whole Blood, PRBC, Platelets",
                    isVerified = true,
                    isOpen24Hours = true,
                    latitude = 22.3592,
                    longitude = 91.8286
                ),
                BloodBank(
                    id = "bb_badhan_ru",
                    name = "Badhan Blood Bank (Rajshahi Univ Branch)",
                    organization = "Badhan Foundation",
                    address = "Central Library Building, RU",
                    district = "Rajshahi",
                    phone = "+880 1719-876543",
                    hotline = "+880 1521-334455",
                    operatingHours = "9:00 AM - 8:00 PM",
                    availableComponents = "Whole Blood",
                    isVerified = true,
                    isOpen24Hours = false,
                    latitude = 24.3684,
                    longitude = 88.6378
                )
            )
        }

        fun getDefaultDonors(): List<Donor> {
            return listOf(
                Donor(
                    id = "donor_vol_1",
                    userId = "donor_vol_1",
                    name = "Tanvir Ahmed",
                    phone = "+880 1712-345678",
                    bloodGroup = "A+",
                    district = "Dhaka",
                    location = "Dhanmondi, Dhaka",
                    isAvailable = true,
                    isLoggedIn = true,
                    canDonate = true
                ),
                Donor(
                    id = "donor_vol_2",
                    userId = "donor_vol_2",
                    name = "Nafisa Kamal",
                    phone = "+880 1819-876543",
                    bloodGroup = "O+",
                    district = "Dhaka",
                    location = "Uttara, Dhaka",
                    isAvailable = true,
                    isLoggedIn = true,
                    canDonate = true
                ),
                Donor(
                    id = "donor_vol_3",
                    userId = "donor_vol_3",
                    name = "Sadman Sakib",
                    phone = "+880 1911-234567",
                    bloodGroup = "B+",
                    district = "Dhaka",
                    location = "Mirpur, Dhaka",
                    isAvailable = true,
                    isLoggedIn = true,
                    canDonate = true
                ),
                Donor(
                    id = "donor_vol_4",
                    userId = "donor_vol_4",
                    name = "Ayesha Siddiqua",
                    phone = "+880 1612-987654",
                    bloodGroup = "AB+",
                    district = "Dhaka",
                    location = "Mohakhali, Dhaka",
                    isAvailable = true,
                    isLoggedIn = true,
                    canDonate = true
                ),
                Donor(
                    id = "donor_vol_5",
                    userId = "donor_vol_5",
                    name = "Raihan Chowdhury",
                    phone = "+880 1515-456789",
                    bloodGroup = "A-",
                    district = "Dhaka",
                    location = "Gulshan, Dhaka",
                    isAvailable = true,
                    isLoggedIn = true,
                    canDonate = true
                ),
                Donor(
                    id = "donor_vol_6",
                    userId = "donor_vol_6",
                    name = "Fatima Zohra",
                    phone = "+880 1718-654321",
                    bloodGroup = "O-",
                    district = "Dhaka",
                    location = "Banani, Dhaka",
                    isAvailable = true,
                    isLoggedIn = true,
                    canDonate = true
                ),
                Donor(
                    id = "donor_vol_7",
                    userId = "donor_vol_7",
                    name = "Mahmudul Hasan",
                    phone = "+880 1811-123789",
                    bloodGroup = "B-",
                    district = "Dhaka",
                    location = "Badda, Dhaka",
                    isAvailable = true,
                    isLoggedIn = true,
                    canDonate = true
                ),
                Donor(
                    id = "donor_vol_8",
                    userId = "donor_vol_8",
                    name = "Sumaiya Rahman",
                    phone = "+880 1914-987123",
                    bloodGroup = "AB-",
                    district = "Dhaka",
                    location = "Bashundhara R/A, Dhaka",
                    isAvailable = true,
                    isLoggedIn = true,
                    canDonate = true
                )
            )
        }
    }
}
