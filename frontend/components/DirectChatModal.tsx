'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, Conversation, ChatMessage } from '@/lib/api';
import { X, Send, MessageSquare, Phone, MapPin, CheckCheck, Search, Loader2 } from 'lucide-react';
import BloodGroupBadge from './BloodGroupBadge';

interface DirectChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDonorId?: string;
}

export default function DirectChatModal({ isOpen, onClose, initialDonorId }: DirectChatModalProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoading(true);

    api
      .getConversations()
      .then((res) => {
        if (!isMounted) return;
        setIsLoading(false);
        const convList = res.conversations || [];
        setConversations(convList);
        if (initialDonorId) {
          const found = convList.find((c) => c.participantId === initialDonorId);
          if (found) {
            setSelectedConvId(found.id);
            return;
          }
        }
        if (convList.length > 0) setSelectedConvId(convList[0].id);
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialDonorId]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const currentConv = conversations.find((c) => c.id === selectedConvId) || conversations[0] || null;
  const messageCount = currentConv?.messages.length ?? 0;

  // Keep the newest message in view
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messageCount, currentConv?.id]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentConv) return;

    const messageText = inputText.trim();
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: user?.id || 'portal_user',
      senderName: user?.name || 'Authorized Portal',
      senderRole: user?.role || 'staff',
      text: messageText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
      isMe: true,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConv.id
          ? { ...c, lastMessage: newMsg.text, lastMessageTime: newMsg.timestamp, messages: [...c.messages, newMsg] }
          : c
      )
    );
    setInputText('');

    try {
      await api.sendMessage(currentConv.id, messageText);
    } catch (err) {
      console.warn('Failed to send live message', err);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c?.participantName || '').toLowerCase().includes(q) ||
      (c?.participantBloodGroup || '').toLowerCase().includes(q) ||
      (c?.participantDistrict || '').toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1528]/60 p-3 backdrop-blur-sm animate-in fade-in duration-150 sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="direct-chat-title"
        className="flex h-[640px] max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_32px_64px_-16px_rgba(11,21,40,0.5)] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between bg-[#0B1528] px-5 py-4 text-white sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C62828] shadow-md shadow-[#C62828]/30">
              <MessageSquare className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h3 id="direct-chat-title" className="flex items-center gap-2 text-base font-extrabold tracking-tight">
                <span className="truncate">Donor messages</span>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
                  Live
                </span>
              </h3>
              <p className="truncate text-xs text-slate-400">Two-way chat, synced with the BloodLink mobile app</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close messages"
            className="cursor-pointer rounded-xl p-2 text-slate-400 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#EF5350]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-500">
            <Loader2 className="mb-3 h-7 w-7 animate-spin text-[#C62828]" aria-hidden />
            <p className="text-sm font-semibold">Loading conversations…</p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            {/* Conversation list */}
            <div className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50 sm:w-80">
              <div className="border-b border-slate-200 bg-white p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    type="search"
                    aria-label="Search conversations"
                    placeholder="Search name, blood group or district"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs outline-none transition focus:border-[#C62828] focus:bg-white focus:ring-2 focus:ring-[#C62828]/20"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    {searchQuery ? 'No conversations match your search' : 'No donor conversations yet'}
                  </div>
                ) : (
                  filteredConversations.map((c) => {
                    const isSelected = currentConv?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedConvId(c.id)}
                        aria-current={isSelected ? 'true' : undefined}
                        className={`relative flex w-full cursor-pointer items-start gap-3 border-b border-slate-100 p-3.5 text-left outline-none transition-colors focus-visible:bg-white ${
                          isSelected ? 'bg-white' : 'hover:bg-slate-100/70'
                        }`}
                      >
                        {isSelected && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[#C62828]" />}
                        <div className="relative shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                            {c.participantName.charAt(0)}
                          </div>
                          <span className="absolute -bottom-1.5 -right-1.5">
                            <BloodGroupBadge bloodGroup={c.participantBloodGroup} size="sm" className="!h-6 !w-6 !rounded-lg !text-[10px]" />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex items-center justify-between gap-2">
                            <span className="truncate text-[13px] font-bold text-slate-900">{c.participantName}</span>
                            <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{c.lastMessageTime}</span>
                          </div>
                          <p className="truncate text-xs leading-snug text-slate-500">{c.lastMessage}</p>
                          <div className="mt-1 flex items-center text-[11px] text-slate-400">
                            <MapPin className="mr-0.5 h-3 w-3" aria-hidden />
                            {c.participantDistrict}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Thread */}
            {currentConv ? (
              <div className="flex min-w-0 flex-1 flex-col bg-white">
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                      {currentConv.participantName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-sm font-extrabold text-slate-900">{currentConv.participantName}</h4>
                        <BloodGroupBadge bloodGroup={currentConv.participantBloodGroup} size="sm" variant="pill" />
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        {currentConv.participantPhone && <span className="tabular-nums">{currentConv.participantPhone}</span>}
                        {currentConv.participantPhone && currentConv.participantDistrict && <span aria-hidden>&bull;</span>}
                        <span className="truncate">{currentConv.participantDistrict}</span>
                      </div>
                    </div>
                  </div>

                  {currentConv.participantPhone && (
                    <a
                      href={`tel:${currentConv.participantPhone}`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 outline-none transition-colors hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <Phone className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                      Call donor
                    </a>
                  )}
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto bg-[#F8FAFC] p-5" aria-live="polite">
                  {currentConv.messages.length === 0 && (
                    <p className="py-10 text-center text-xs text-slate-400">
                      No messages yet. Say hello to start the conversation.
                    </p>
                  )}

                  {currentConv.messages.map((m) => (
                    <div key={m.id} className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                          m.isMe
                            ? 'rounded-br-md bg-[#C62828] text-white shadow-sm shadow-[#C62828]/20'
                            : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-2xs'
                        }`}
                      >
                        {m.text}
                      </div>
                      <span className="mt-1 flex items-center gap-1 px-1 text-[11px] tabular-nums text-slate-400">
                        {m.timestamp}
                        {m.isMe && <CheckCheck className="h-3 w-3" aria-label="Sent" />}
                      </span>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white p-3"
                >
                  <input
                    type="text"
                    aria-label="Message"
                    placeholder="Write a message to the donor"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] outline-none transition focus:border-[#C62828] focus:bg-white focus:ring-2 focus:ring-[#C62828]/20"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    aria-label="Send message"
                    className="cursor-pointer rounded-2xl bg-[#C62828] p-2.5 text-white shadow-md shadow-[#C62828]/25 outline-none transition-all hover:bg-[#B71C1C] focus-visible:ring-2 focus-visible:ring-[#C62828] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center bg-white p-8 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <MessageSquare className="h-6 w-6 text-slate-400" aria-hidden />
                </div>
                <p className="text-sm font-semibold text-slate-700">Select a conversation</p>
                <p className="mt-1 text-xs text-slate-400">Pick a donor from the list to start messaging.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
