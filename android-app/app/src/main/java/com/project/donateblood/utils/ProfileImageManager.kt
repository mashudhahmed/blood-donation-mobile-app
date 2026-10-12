package com.project.donateblood.utils

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import android.view.LayoutInflater
import android.view.View
import android.widget.ImageView
import androidx.activity.result.ActivityResultLauncher
import androidx.fragment.app.Fragment
import coil.load
import coil.transform.CircleCropTransformation
import com.github.dhaval2404.imagepicker.ImagePicker
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.UserProfileChangeRequest
import com.google.firebase.firestore.FirebaseFirestore
import com.project.donateblood.R
import com.project.donateblood.databinding.DialogBottomSheetAvatarOptionsBinding
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import timber.log.Timber
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream

object ProfileImageManager {

    /**
     * Display a modern Material BottomSheet with Take Photo, Choose Gallery, and Remove Photo options.
     */
    fun showAvatarOptionsDialog(
        context: Context,
        hasExistingPhoto: Boolean,
        onTakePhoto: () -> Unit,
        onChooseGallery: () -> Unit,
        onRemovePhoto: () -> Unit
    ) {
        val dialog = BottomSheetDialog(context, R.style.Theme_BloodLink_BottomSheetDialog)
        val binding = DialogBottomSheetAvatarOptionsBinding.inflate(LayoutInflater.from(context))
        dialog.setContentView(binding.root)

        // Show/hide remove photo option
        binding.optionRemovePhoto.visibility = if (hasExistingPhoto) View.VISIBLE else View.GONE

        binding.ivCloseAvatarSheet.setOnClickListener {
            dialog.dismiss()
        }

        binding.optionTakePhoto.setOnClickListener {
            dialog.dismiss()
            onTakePhoto()
        }

        binding.optionChooseGallery.setOnClickListener {
            dialog.dismiss()
            onChooseGallery()
        }

        binding.optionRemovePhoto.setOnClickListener {
            dialog.dismiss()
            MaterialAlertDialogBuilder(context)
                .setTitle("Remove Profile Photo")
                .setMessage("Are you sure you want to remove your profile photo? Your avatar will revert to default.")
                .setPositiveButton("Remove") { _, _ ->
                    onRemovePhoto()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        dialog.show()
    }

    /**
     * Launch Camera with 1:1 Square Crop and client-side compression via ImagePicker.
     */
    fun launchCamera(fragment: Fragment, launcher: ActivityResultLauncher<Intent>) {
        ImagePicker.with(fragment)
            .cameraOnly()
            .cropSquare()
            .compress(512) // Pre-compress file
            .maxResultSize(1080, 1080)
            .createIntent { intent ->
                launcher.launch(intent)
            }
    }

    /**
     * Launch Gallery with 1:1 Square Crop and client-side compression via ImagePicker.
     */
    fun launchGallery(fragment: Fragment, launcher: ActivityResultLauncher<Intent>) {
        ImagePicker.with(fragment)
            .galleryOnly()
            .cropSquare()
            .compress(512) // Pre-compress file
            .maxResultSize(1080, 1080)
            .createIntent { intent ->
                launcher.launch(intent)
            }
    }

    /**
     * Synchronously compress and format an image into a crisp 256x256 Base64 JPEG data URL.
     * Safe to call from Dispatchers.IO or background threads.
     */
    fun processAndCompressImage(
        context: Context,
        imageUri: Uri,
        targetDimension: Int = 256,
        quality: Int = 75
    ): String? {
        return try {
            val inputStream = try {
                context.contentResolver.openInputStream(imageUri)
            } catch (e: Exception) {
                null
            } ?: if (imageUri.scheme == "file" && imageUri.path != null) {
                FileInputStream(File(imageUri.path!!))
            } else null

            if (inputStream == null) return null
            val originalBitmap = BitmapFactory.decodeStream(inputStream)
            inputStream.close()
            if (originalBitmap == null) return null

            val scaledBitmap = Bitmap.createScaledBitmap(
                originalBitmap,
                targetDimension,
                targetDimension,
                true
            )

            val outputStream = ByteArrayOutputStream()
            scaledBitmap.compress(Bitmap.CompressFormat.JPEG, quality, outputStream)
            val imageBytes = outputStream.toByteArray()
            outputStream.close()

            if (originalBitmap != scaledBitmap) {
                originalBitmap.recycle()
            }
            scaledBitmap.recycle()

            val base64Data = Base64.encodeToString(imageBytes, Base64.NO_WRAP)
            "data:image/jpeg;base64,$base64Data"
        } catch (e: Exception) {
            Timber.e(e, "Failed to compress image to Base64")
            null
        }
    }

    /**
     * Optimize cropped image and save directly to Cloud Firestore.
     * 100% Free on Spark plan, requires zero credit card or billing.
     * Generates a crisp 256x256 JPEG (~15KB) Base64 data URL.
     */
    fun uploadProfileImage(
        userId: String,
        imageUri: Uri,
        onProgress: (Int) -> Unit,
        onSuccess: (String) -> Unit,
        onFailure: (Exception) -> Unit
    ) {
        val context = FirebaseApp.getInstance().applicationContext
        onProgress(20)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val inputStream = try {
                    context.contentResolver.openInputStream(imageUri)
                } catch (e: Exception) {
                    null
                } ?: if (imageUri.scheme == "file" && imageUri.path != null) {
                    FileInputStream(File(imageUri.path!!))
                } else null

                if (inputStream == null) {
                    withContext(Dispatchers.Main) {
                        onFailure(Exception("Could not read image file"))
                    }
                    return@launch
                }

                val originalBitmap = BitmapFactory.decodeStream(inputStream)
                inputStream.close()

                if (originalBitmap == null) {
                    withContext(Dispatchers.Main) {
                        onFailure(Exception("Failed to decode image"))
                    }
                    return@launch
                }

                withContext(Dispatchers.Main) { onProgress(50) }

                // Scale to crisp 256x256 square avatar
                val targetDimension = 256
                val scaledBitmap = Bitmap.createScaledBitmap(
                    originalBitmap,
                    targetDimension,
                    targetDimension,
                    true
                )

                // Compress to JPEG with 75% quality (~15-18 KB total size)
                val outputStream = ByteArrayOutputStream()
                scaledBitmap.compress(Bitmap.CompressFormat.JPEG, 75, outputStream)
                val imageBytes = outputStream.toByteArray()
                outputStream.close()

                if (originalBitmap != scaledBitmap) {
                    originalBitmap.recycle()
                }
                scaledBitmap.recycle()

                val base64Data = Base64.encodeToString(imageBytes, Base64.NO_WRAP)
                val dataUrl = "data:image/jpeg;base64,$base64Data"

                withContext(Dispatchers.Main) {
                    onProgress(80)
                    syncProfileImageToFirestore(
                        userId = userId,
                        imageUrl = dataUrl,
                        onSuccess = {
                            onProgress(100)
                            onSuccess(dataUrl)
                        },
                        onFailure = { e ->
                            onFailure(e)
                        }
                    )
                }
            } catch (e: Exception) {
                Timber.e(e, "Error optimizing and uploading profile image")
                withContext(Dispatchers.Main) {
                    onFailure(e)
                }
            }
        }
    }

    /**
     * Remove profile image: clears URL in Firestore and FirebaseAuth.
     */
    fun removeProfileImage(
        userId: String,
        onSuccess: () -> Unit,
        onFailure: (Exception) -> Unit
    ) {
        syncProfileImageToFirestore(
            userId = userId,
            imageUrl = "",
            onSuccess = onSuccess,
            onFailure = onFailure
        )
    }

    /**
     * Update Firestore users & donors collections, and Firebase Auth profile photo.
     */
    private fun syncProfileImageToFirestore(
        userId: String,
        imageUrl: String,
        onSuccess: () -> Unit,
        onFailure: (Exception) -> Unit
    ) {
        val firestore = FirebaseFirestore.getInstance()

        // 1. Update users collection
        firestore.collection(FirebaseUtils.Collections.USERS)
            .document(userId)
            .update(FirebaseUtils.UserFields.PROFILE_IMAGE, imageUrl)
            .addOnSuccessListener {
                // 2. Also update donors collection if document exists
                firestore.collection(FirebaseUtils.Collections.DONORS)
                    .document(userId)
                    .get()
                    .addOnSuccessListener { donorDoc ->
                        if (donorDoc.exists()) {
                            firestore.collection(FirebaseUtils.Collections.DONORS)
                                .document(userId)
                                .update(
                                    mapOf(
                                        "imageUrl" to imageUrl,
                                        FirebaseUtils.UserFields.PROFILE_IMAGE to imageUrl,
                                        "updatedAt" to System.currentTimeMillis()
                                    )
                                )
                        }
                    }

                // 3. Also update all active chat conversations where user is a participant
                firestore.collection(FirebaseUtils.Collections.CHATS)
                    .whereArrayContains("participantIds", userId)
                    .get()
                    .addOnSuccessListener { chatDocs ->
                        for (chatDoc in chatDocs.documents) {
                            chatDoc.reference.update("participantImages.$userId", imageUrl)
                        }
                    }

                // 4. Update FirebaseAuth currentUser profile (only if not a data URI)
                val currentUser = FirebaseAuth.getInstance().currentUser
                if (currentUser != null && !imageUrl.startsWith("data:")) {
                    val profileUpdates = UserProfileChangeRequest.Builder()
                        .setPhotoUri(if (imageUrl.isNotBlank()) Uri.parse(imageUrl) else null)
                        .build()
                    currentUser.updateProfile(profileUpdates)
                }

                onSuccess()
            }
            .addOnFailureListener { e ->
                Timber.e(e, "Failed to update profile image in users collection")
                onFailure(e)
            }
    }

    /**
     * High-performance Coil avatar loader supporting both Base64 data URLs and standard URLs.
     */
    fun loadAvatar(imageView: ImageView, imageUrl: String?) {
        val cleanUrl = imageUrl?.trim()
        if (cleanUrl.isNullOrEmpty()) {
            imageView.setImageResource(R.drawable.ic_user_placeholder)
            return
        }

        // 1. Data URI with base64
        if (cleanUrl.startsWith("data:image") || cleanUrl.contains("base64,")) {
            try {
                val base64Data = cleanUrl.substringAfter("base64,")
                val imageBytes = Base64.decode(base64Data, Base64.DEFAULT)
                val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                if (bitmap != null) {
                    imageView.setImageBitmap(bitmap)
                    return
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to decode base64 avatar")
            }
            imageView.setImageResource(R.drawable.ic_user_placeholder)
            return
        }

        // 2. Raw base64 string without data: URI scheme
        if (cleanUrl.length > 200 && !cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://") && !cleanUrl.startsWith("/")) {
            try {
                val imageBytes = Base64.decode(cleanUrl, Base64.DEFAULT)
                val bitmap = BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
                if (bitmap != null) {
                    imageView.setImageBitmap(bitmap)
                    return
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to decode raw base64 avatar")
            }
            imageView.setImageResource(R.drawable.ic_user_placeholder)
            return
        }

        // 3. HTTP URL or local file URI via Coil
        imageView.load(cleanUrl) {
            crossfade(true)
            placeholder(R.drawable.ic_user_placeholder)
            error(R.drawable.ic_user_placeholder)
            transformations(CircleCropTransformation())
        }
    }
}
