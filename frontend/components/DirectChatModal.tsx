'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  api,
  Conversation,
  ChatMessage,
  MOCK_CONVERSATIONS,
} from '@/lib/api';
import {
  X,
  Send,
  MessageSquare,
  Phone,
  MapPin,
  CheckCheck,
  Search,
} from 'lucide-react';
import BloodGroupBadge from './BloodGroupBadge';

interface DirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDonorId?: string;
}

export default function DirectChatModal({ isOpen, onClose, initialDonorId }: DirectChatModalProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [selectedConvId, setSelectedConvId] = useState<string>(MOCK_CONVERSATIONS[0].id);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialDonorId) {
      const found = conversations.find((c) => c.participantId === initialDonorId);
      if (found) setSelectedConvId(found.id);
    }
  }, [initialDonorId, conversations]);

  if (!isOpen) return null;

  const currentConv = conversations.find((c) => c.id === selectedConvId) || conversations[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      isMe: true,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConvId
          ? {
              ...c,
              lastMessage: newMsg.text,
              lastMessageTime: newMsg.timestamp,
              messages: [...c.messages, newMsg],
            }
          : c
      )
    );

    api.sendMessage(selectedConvId, newMsg.text);
    setInputText('');
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.participantBloodGroup.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.participantDistrict.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full h-[620px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scaleUp">
        {/* Top Header */}
        <div className="px-6 py-4 bg-[#0B1528] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#C62828] text-white flex items-center justify-center shadow-md">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                <span>Direct Donor Communications</span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Mobile Sync
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Real-time two-way messaging synchronized with the BloodLink Mobile App
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Left Conversation List, Right Chat Thread */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Conversation List */}
          <div className="w-72 sm:w-80 border-r border-slate-200 flex flex-col bg-slate-50 shrink-0">
            {/* Search Box */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search donor or district..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C62828]"
                />
              </div>
            </div>

            {/* Conversation Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredConversations.map((c) => {
                const isSelected = c.id === selectedConvId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConvId(c.id)}
                    className={`w-full p-3.5 text-left flex items-start space-x-3 transition-colors cursor-pointer ${
                      isSelected ? 'bg-white border-l-4 border-[#C62828] shadow-xs' : 'hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs">
                        {c.participantName.charAt(0)}
                      </div>
                      <span className="absolute -bottom-1 -right-1">
                        <BloodGroupBadge bloodGroup={c.participantBloodGroup} size="sm" />
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {c.participantName}
                        </span>
                        <span className="text-[10px] text-slate-400">{c.lastMessageTime}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate leading-snug">
                        {c.lastMessage}
                      </p>
                      <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-400">
                        <span className="flex items-center">
                          <MapPin className="w-2.5 h-2.5 mr-0.5" />
                          {c.participantDistrict}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Active Chat Thread */}
          <div className="flex-1 flex flex-col bg-white">
            {/* Thread Header */}
            <div className="p-3.5 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs">
                  {currentConv.participantName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-extrabold text-slate-900">{currentConv.participantName}</h4>
                    <BloodGroupBadge bloodGroup={currentConv.participantBloodGroup} size="sm" />
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                    <span>{currentConv.participantPhone}</span>
                    <span>&bull;</span>
                    <span>{currentConv.participantDistrict}</span>
                  </div>
                </div>
              </div>

              <a
                href={`tel:${currentConv.participantPhone}`}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Call Donor</span>
              </a>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
              <div className="text-center my-2">
                <span className="text-[10px] bg-slate-200/80 text-slate-600 px-2.5 py-1 rounded-full font-semibold">
                  End-to-End Encrypted Mobile Transfusion Channel
                </span>
              </div>

              {currentConv.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs shadow-xs ${
                      m.isMe
                        ? 'bg-[#C62828] text-white rounded-br-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                    }`}
                  >
                    <p className="leading-relaxed">{m.text}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1 flex items-center space-x-1">
                    <span>{m.timestamp}</span>
                    {m.isMe && <CheckCheck className="w-3 h-3 text-slate-400" />}
                  </span>
                </div>
              ))}
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 shrink-0">
              <input
                type="text"
                placeholder="Type your message to donor..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C62828]"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 rounded-2xl bg-[#C62828] hover:bg-[#B71C1C] text-white transition-all disabled:opacity-50 cursor-pointer shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
