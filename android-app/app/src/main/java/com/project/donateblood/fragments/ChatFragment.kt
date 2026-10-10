package com.project.donateblood.fragments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.ListenerRegistration
import com.project.donateblood.R
import com.project.donateblood.adapter.ConversationAdapter
import com.project.donateblood.databinding.FragmentChatBinding
import com.project.donateblood.models.ChatConversation
import com.project.donateblood.repository.ChatRepository
import timber.log.Timber

class ChatFragment : Fragment() {

    private var _binding: FragmentChatBinding? = null
    private val binding get() = _binding!!

    private val auth by lazy { FirebaseAuth.getInstance() }
    private val chatRepository by lazy { ChatRepository() }

    private lateinit var conversationAdapter: ConversationAdapter
    private var conversationsListener: ListenerRegistration? = null
    private var allConversations: List<ChatConversation> = emptyList()
    private var currentSearchQuery: String = ""

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentChatBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val currentUser = auth.currentUser
        if (currentUser == null) {
            showUnauthenticatedState()
            return
        }

        setupRecyclerView(currentUser.uid)
        setupSearch()
        setupListeners()
        listenToConversations(currentUser.uid)
    }

    private fun setupRecyclerView(currentUserId: String) {
        conversationAdapter = ConversationAdapter(
            currentUserId = currentUserId,
            onConversationClick = { conversation ->
                openConversation(conversation, currentUserId)
            }
        )

        binding.rvConversations.layoutManager = LinearLayoutManager(requireContext())
        binding.rvConversations.adapter = conversationAdapter
    }

    private fun setupSearch() {
        binding.etSearchChat.addTextChangedListener { editable ->
            currentSearchQuery = editable?.toString()?.trim() ?: ""
            filterConversations(currentSearchQuery)
        }
    }

    private fun setupListeners() {
        binding.btnFindDonorsChat.setOnClickListener {
            val navOptions = androidx.navigation.NavOptions.Builder()
                .setPopUpTo(R.id.homeFragment, false)
                .setLaunchSingleTop(true)
                .build()
            findNavController().navigate(R.id.homeFragment, null, navOptions)
        }
    }

    private fun listenToConversations(currentUserId: String) {
        binding.progressBarChat.visibility = View.VISIBLE
        conversationsListener?.remove()

        conversationsListener = chatRepository.listenToConversations(
            currentUserId = currentUserId,
            onSuccess = { conversations ->
                if (_binding == null) return@listenToConversations

                binding.progressBarChat.visibility = View.GONE
                allConversations = conversations
                filterConversations(currentSearchQuery)

                conversations.forEach { conv ->
                    if (conv.lastSenderId != currentUserId && conv.lastMessageStatus == com.project.donateblood.models.ChatMessage.STATUS_SENT) {
                        chatRepository.markMessagesAsDelivered(conv.id, currentUserId)
                    }
                }
            },
            onError = { error ->
                if (_binding == null) return@listenToConversations
                binding.progressBarChat.visibility = View.GONE
                Timber.e(error, "Error loading conversations")
            }
        )
    }

    private fun filterConversations(query: String) {
        val currentUserId = auth.currentUser?.uid ?: return
        val filtered = if (query.isBlank()) {
            allConversations
        } else {
            allConversations.filter { conversation ->
                val otherName = conversation.getOtherParticipantName(currentUserId)
                otherName.contains(query, ignoreCase = true) ||
                        conversation.lastMessage.contains(query, ignoreCase = true)
            }
        }

        conversationAdapter.submitList(filtered)

        if (filtered.isEmpty()) {
            binding.layoutEmptyChat.visibility = View.VISIBLE
            binding.rvConversations.visibility = View.GONE
        } else {
            binding.layoutEmptyChat.visibility = View.GONE
            binding.rvConversations.visibility = View.VISIBLE
        }
    }

    private fun openConversation(conversation: ChatConversation, currentUserId: String) {
        val otherId = conversation.getOtherParticipantId(currentUserId)
        val otherName = conversation.getOtherParticipantName(currentUserId)
        val otherBlood = conversation.getOtherParticipantBloodGroup(currentUserId)
        val otherPhone = conversation.getOtherParticipantPhone(currentUserId)
        val otherImage = conversation.getOtherParticipantImage(currentUserId)

        val bundle = ConversationFragment.newBundle(
            recipientId = otherId,
            recipientName = otherName,
            recipientBloodGroup = otherBlood,
            recipientPhone = otherPhone,
            recipientImage = otherImage
        )

        try {
            findNavController().navigate(R.id.action_chatFragment_to_conversationFragment, bundle)
        } catch (e: Exception) {
            Timber.e(e, "Failed to navigate to conversation")
            Toast.makeText(requireContext(), "Could not open chat", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showUnauthenticatedState() {
        binding.progressBarChat.visibility = View.GONE
        binding.rvConversations.visibility = View.GONE
        binding.layoutEmptyChat.visibility = View.VISIBLE
        binding.btnFindDonorsChat.text = "Sign In"
        binding.btnFindDonorsChat.setOnClickListener {
            findNavController().navigate(R.id.loginFragment)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        conversationsListener?.remove()
        conversationsListener = null
        _binding = null
    }
}
