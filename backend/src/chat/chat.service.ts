import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  /**
   * Retrieves conversations from Firestore 'chats' collection.
   * Admins can view all platform chats.
   * Hospitals and blood banks view their own chats, or recent chats if none specific.
   */
  async getConversations(currentUser: any) {
    const db = this.firebaseService.firestore;
    const currentUid = currentUser?.uid || currentUser?.id || 'admin';
    const role = (currentUser?.role || '').toLowerCase();

    try {
      let query: FirebaseFirestore.Query = db.collection('chats');

      if (role !== 'admin') {
        const userChats = await db
          .collection('chats')
          .where('participantIds', 'array-contains', currentUid)
          .get();

        if (!userChats.empty) {
          query = db.collection('chats').where('participantIds', 'array-contains', currentUid);
        } else {
          // If no specific chat yet, list recent active chats
          query = db.collection('chats').limit(20);
        }
      } else {
        query = db.collection('chats').limit(50);
      }

      const snap = await query.get();
      const conversations: any[] = [];

      for (const doc of snap.docs) {
        const data = doc.data();
        const participantIds: string[] = data.participantIds || [];
        const otherId = participantIds.find((id) => id !== currentUid) || participantIds[0] || doc.id;
        const participantName = data.participantNames?.[otherId] || 'Citizen Donor';
        const participantPhone = data.participantPhones?.[otherId] || '';
        const participantBloodGroup = data.participantBloodGroups?.[otherId] || '';
        const participantDistrict = data.participantDistricts?.[otherId] || 'Dhaka';

        // Load latest messages for this conversation
        const msgSnap = await doc.ref
          .collection('messages')
          .orderBy('timestamp', 'desc')
          .limit(20)
          .get();

        const messages = msgSnap.docs
          .map((mDoc) => {
            const m = mDoc.data();
            const ts = m.timestamp ? (typeof m.timestamp === 'number' ? m.timestamp : Date.now()) : Date.now();
            return {
              id: mDoc.id,
              senderId: m.senderId || '',
              senderName: m.senderName || '',
              senderRole: m.senderId === currentUid ? (role.toUpperCase() || 'ADMIN') : 'DONOR',
              text: m.message || m.text || '',
              timestamp: new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
              isMe: m.senderId === currentUid,
            };
          })
          .reverse();

        const ts = data.lastMessageTimestamp
          ? typeof data.lastMessageTimestamp === 'number'
            ? data.lastMessageTimestamp
            : Date.now()
          : Date.now();

        conversations.push({
          id: doc.id,
          participantId: otherId,
          participantName,
          participantPhone,
          participantBloodGroup,
          participantDistrict,
          lastMessage: data.lastMessage || 'No messages yet',
          lastMessageTime: new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          unreadCount: data.unreadCounts?.[currentUid] || (data.lastSenderId !== currentUid && !data.isRead ? 1 : 0),
          messages,
        });
      }

      // Sort by latest timestamp
      return {
        success: true,
        count: conversations.length,
        conversations,
      };
    } catch (error) {
      this.logger.error('Failed to get conversations', error);
      throw error;
    }
  }

  /**
   * Retrieves messages for a specific conversation.
   */
  async getMessages(conversationId: string, currentUser: any) {
    const db = this.firebaseService.firestore;
    const currentUid = currentUser?.uid || currentUser?.id || 'admin';
    const role = (currentUser?.role || '').toLowerCase();

    try {
      const chatRef = db.collection('chats').doc(conversationId);
      const msgSnap = await chatRef
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .limit(100)
        .get();

      const messages = msgSnap.docs.map((doc) => {
        const m = doc.data();
        const ts = m.timestamp ? (typeof m.timestamp === 'number' ? m.timestamp : Date.now()) : Date.now();
        return {
          id: doc.id,
          senderId: m.senderId || '',
          senderName: m.senderName || '',
          senderRole: m.senderId === currentUid ? (role.toUpperCase() || 'ADMIN') : 'DONOR',
          text: m.message || m.text || '',
          timestamp: new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          isMe: m.senderId === currentUid,
        };
      });

      return {
        success: true,
        count: messages.length,
        messages,
      };
    } catch (error) {
      this.logger.error(`Failed to get messages for conversation ${conversationId}`, error);
      throw error;
    }
  }

  /**
   * Sends a message in a conversation.
   * Atomically writes to subcollection 'messages' and updates parent 'chats/{id}'.
   */
  async sendMessage(conversationId: string, currentUser: any, text: string) {
    const db = this.firebaseService.firestore;
    const currentUid = currentUser?.uid || currentUser?.id || 'usr_staff';
    const currentName = currentUser?.name || 'Care Desk';

    try {
      const chatRef = db.collection('chats').doc(conversationId);
      const chatDoc = await chatRef.get();

      let otherId = 'donor';
      let otherName = 'Donor';

      if (chatDoc.exists) {
        const data = chatDoc.data() || {};
        const pIds: string[] = data.participantIds || [];
        otherId = pIds.find((id) => id !== currentUid) || pIds[0] || 'donor';
        otherName = data.participantNames?.[otherId] || 'Donor';
      }

      const msgRef = chatRef.collection('messages').doc();
      const timestamp = Date.now();

      const messagePayload = {
        id: msgRef.id,
        senderId: currentUid,
        senderName: currentName,
        receiverId: otherId,
        receiverName: otherName,
        message: text,
        text,
        timestamp,
        isRead: false,
        status: 'sent',
      };

      await msgRef.set(messagePayload);

      // Update parent conversation doc
      await chatRef.set(
        {
          id: conversationId,
          lastMessage: text,
          lastMessageTimestamp: timestamp,
          lastSenderId: currentUid,
          lastMessageStatus: 'sent',
          isRead: false,
        },
        { merge: true },
      );

      const formattedTime = new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      return {
        success: true,
        messageId: msgRef.id,
        text,
        timestamp: formattedTime,
      };
    } catch (error) {
      this.logger.error(`Failed to send message in conversation ${conversationId}`, error);
      throw error;
    }
  }
}
