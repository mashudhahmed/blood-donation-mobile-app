package com.project.donateblood.fragments

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.net.toUri
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import coil.load
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.ListenerRegistration
import com.project.donateblood.R
import com.project.donateblood.adapter.MessageAdapter
import com.project.donateblood.databinding.FragmentConversationBinding
import com.project.donateblood.repository.ChatRepository
import timber.log.Timber

class ConversationFragment : Fragment() {

    private var _binding: FragmentConversationBinding? = null
    private val binding get() = _binding!!

    private val auth by lazy { FirebaseAuth.getInstance() }
    private val chatRepository by lazy { ChatRepository() }

    private lateinit var messageAdapter: MessageAdapter
    private var messagesListener: ListenerRegistration? = null

    private var recipientId: String = ""
    private var recipientName: String = ""
    private var recipientBloodGroup: String = ""
    private var recipientPhone: String = ""
    private var recipientImage: String = ""
    private var chatId: String = ""

    companion object {
        const val ARG_RECIPIENT_ID = "recipientId"
        const val ARG_RECIPIENT_NAME = "recipientName"
        const val ARG_RECIPIENT_BLOOD_GROUP = "recipientBloodGroup"
        const val ARG_RECIPIENT_PHONE = "recipientPhone"
        const val ARG_RECIPIENT_IMAGE = "recipientImage"

        fun newBundle(
            recipientId: String,
            recipientName: String,
            recipientBloodGroup: String = "",
            recipientPhone: String = "",
            recipientImage: String = ""
        ): Bundle {
            return Bundle().apply {
                putString(ARG_RECIPIENT_ID, recipientId)
                putString(ARG_RECIPIENT_NAME, recipientName)
                putString(ARG_RECIPIENT_BLOOD_GROUP, recipientBloodGroup)
                putString(ARG_RECIPIENT_PHONE, recipientPhone)
                putString(ARG_RECIPIENT_IMAGE, recipientImage)
            }
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentConversationBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val currentUser = auth.currentUser
        if (currentUser == null) {
            Toast.makeText(requireContext(), "Please login to chat", Toast.LENGTH_SHORT).show()
            findNavController().navigateUp()
            return
        }

        recipientId = arguments?.getString(ARG_RECIPIENT_ID) ?: ""
        recipientName = arguments?.getString(ARG_RECIPIENT_NAME) ?: "BloodLink User"
        recipientBloodGroup = arguments?.getString(ARG_RECIPIENT_BLOOD_GROUP) ?: ""
        recipientPhone = arguments?.getString(ARG_RECIPIENT_PHONE) ?: ""
        recipientImage = arguments?.getString(ARG_RECIPIENT_IMAGE) ?: ""

        if (recipientId.isBlank()) {
            Toast.makeText(requireContext(), "Invalid conversation recipient", Toast.LENGTH_SHORT).show()
            findNavController().navigateUp()
            return
        }

        chatId = chatRepository.getConversationId(currentUser.uid, recipientId)

        setupHeader()
        setupRecyclerView(currentUser.uid)
        setupInput(currentUser.uid, currentUser.displayName ?: currentUser.email?.substringBefore("@") ?: "User")
        listenForMessages(currentUser.uid)
    }

    private fun setupHeader() {
        binding.tvHeaderName.text = recipientName

        if (recipientBloodGroup.isNotBlank()) {
            binding.tvHeaderBloodBadge.visibility = View.VISIBLE
            binding.tvHeaderBloodBadge.text = recipientBloodGroup
        } else {
            binding.tvHeaderBloodBadge.visibility = View.GONE
        }

        if (recipientImage.isNotBlank()) {
            binding.ivHeaderAvatar.load(recipientImage) {
                placeholder(R.drawable.ic_user_placeholder)
                error(R.drawable.ic_user_placeholder)
            }
        } else {
            binding.ivHeaderAvatar.setImageResource(R.drawable.ic_user_placeholder)
        }

        binding.btnBack.setOnClickListener {
            findNavController().navigateUp()
        }

        binding.btnHeaderCall.visibility = if (recipientPhone.isNotBlank()) View.VISIBLE else View.GONE
        binding.btnHeaderCall.setOnClickListener {
            if (recipientPhone.isNotBlank()) {
                val sanitized = recipientPhone.replace(" ", "")
                startActivity(Intent(Intent.ACTION_DIAL, "tel:$sanitized".toUri()))
            } else {
                Toast.makeText(requireContext(), "Phone number not available", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun setupRecyclerView(currentUserId: String) {
        messageAdapter = MessageAdapter(currentUserId)
        val layoutManager = LinearLayoutManager(requireContext()).apply {
            stackFromEnd = true
        }
        binding.rvMessages.layoutManager = layoutManager
        binding.rvMessages.adapter = messageAdapter
    }

    private fun setupInput(currentUserId: String, currentUserName: String) {
        binding.btnSendMessage.isEnabled = false
        binding.btnSendMessage.alpha = 0.5f

        binding.etMessageInput.addTextChangedListener { text ->
            val hasText = !text.isNullOrBlank()
            binding.btnSendMessage.isEnabled = hasText
            binding.btnSendMessage.alpha = if (hasText) 1f else 0.5f
        }

        binding.btnSendMessage.setOnClickListener {
            val text = binding.etMessageInput.text?.toString()?.trim() ?: ""
            if (text.isBlank()) return@setOnClickListener

            binding.etMessageInput.setText("")

            val messageId = chatRepository.generateMessageId(chatId)
            val now = System.currentTimeMillis()

            // 1. Optimistic instant UI update
            val optimisticMsg = com.project.donateblood.models.ChatMessage(
                id = messageId,
                senderId = currentUserId,
                senderName = currentUserName,
                receiverId = recipientId,
                receiverName = recipientName,
                message = text,
                timestamp = now,
                isRead = false,
                status = com.project.donateblood.models.ChatMessage.STATUS_PENDING
            )
            val updatedList = ArrayList(messageAdapter.currentList)
            updatedList.add(optimisticMsg)
            binding.layoutEmptyMessages.visibility = View.GONE
            binding.rvMessages.visibility = View.VISIBLE
            messageAdapter.submitList(updatedList) {
                binding.rvMessages.post {
                    binding.rvMessages.scrollToPosition(updatedList.size - 1)
                }
            }

            // 2. Transmit to Firestore
            chatRepository.sendMessage(
                senderId = currentUserId,
                senderName = currentUserName,
                senderBloodGroup = "",
                receiverId = recipientId,
                receiverName = recipientName,
                receiverBloodGroup = recipientBloodGroup,
                receiverPhone = recipientPhone,
                messageText = text,
                messageId = messageId
            ) { success, error ->
                if (!success) {
                    Toast.makeText(requireContext(), "Message failed: ${error?.localizedMessage}", Toast.LENGTH_LONG).show()
                    Timber.e(error, "Failed to send message: ${error?.message}")
                }
            }
        }
    }

    private fun listenForMessages(currentUserId: String) {
        binding.progressBarChat.visibility = View.VISIBLE
        messagesListener?.remove()

        messagesListener = chatRepository.listenToMessages(
            chatId = chatId,
            onSuccess = { messages ->
                if (_binding == null) return@listenToMessages

                binding.progressBarChat.visibility = View.GONE
                if (messages.isEmpty() && messageAdapter.currentList.isEmpty()) {
                    binding.layoutEmptyMessages.visibility = View.VISIBLE
                    binding.rvMessages.visibility = View.GONE
                } else if (messages.isNotEmpty()) {
                    binding.layoutEmptyMessages.visibility = View.GONE
                    binding.rvMessages.visibility = View.VISIBLE
                    messageAdapter.submitList(ArrayList(messages)) {
                        binding.rvMessages.post {
                            binding.rvMessages.scrollToPosition(messages.size - 1)
                        }
                    }
                }

                chatRepository.markConversationAsRead(chatId, currentUserId)
            },
            onError = { error ->
                if (_binding == null) return@listenToMessages
                binding.progressBarChat.visibility = View.GONE
                Timber.e(error, "Failed to load messages: ${error.message}")
                Toast.makeText(requireContext(), "Chat error: ${error.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        )
    }

    override fun onDestroyView() {
        super.onDestroyView()
        messagesListener?.remove()
        messagesListener = null
        _binding = null
    }
}
