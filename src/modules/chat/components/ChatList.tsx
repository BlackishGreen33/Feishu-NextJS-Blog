import { useEffect, useRef, useState } from 'react';

import { ChatListProps, GuestbookModerationStatus } from '@/common/types/chat';
import { useI18n } from '@/i18n';

import ChatItem from './ChatItem';

interface ChatListPropsNew extends ChatListProps {
  canModerate?: boolean;
  emptyMessage: string;
  hasMore: boolean;
  isWidget?: boolean;
  isLoadingMore?: boolean;
  onDeleteMessage: (id: string) => void;
  onHideMessage: (id: string, status: GuestbookModerationStatus) => void;
  onLoadMore: () => void;
  currentUserUid?: string | null;
  loadMoreLabel: string;
  loadingMoreLabel: string;
}

const ChatList = ({
  canModerate = false,
  emptyMessage,
  hasMore,
  isLoadingMore = false,
  messages,
  isWidget = false,
  onDeleteMessage,
  onHideMessage,
  onLoadMore,
  currentUserUid,
  loadMoreLabel,
  loadingMoreLabel,
}: ChatListPropsNew) => {
  const { messages: localeMessages } = useI18n();
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const [hasScrolledUp, setHasScrolledUp] = useState(false);
  const [chatListHeight, setChatListHeight] = useState('500px');

  useEffect(() => {
    const handleScroll = () => {
      if (chatListRef.current) {
        const isScrolledToBottom =
          chatListRef.current.scrollHeight - chatListRef.current.clientHeight <=
          chatListRef.current.scrollTop + 5;

        if (isScrolledToBottom) {
          setHasScrolledUp(false);
        } else {
          setHasScrolledUp(true);
        }
      }
    };

    chatListRef.current?.addEventListener('scroll', handleScroll);

    const currentChatListRef = chatListRef.current;

    return () => {
      currentChatListRef?.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (chatListRef.current && !hasScrolledUp) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages, hasScrolledUp]);

  useEffect(() => {
    const handleResize = () => {
      const newHeight = isWidget ? '500px' : `${window.innerHeight - 360}px`;
      setChatListHeight(newHeight);
    };

    handleResize();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isWidget]);

  return (
    <div className='rounded-lg px-1'>
      {hasMore ? (
        <div className='px-3 pt-3'>
          <button
            type='button'
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className='rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300'
          >
            {isLoadingMore ? loadingMoreLabel : loadMoreLabel}
          </button>
        </div>
      ) : null}
      <div
        ref={chatListRef}
        className='space-y-5 overflow-y-auto py-4'
        style={{ height: chatListHeight }}
      >
        {messages.length > 0 ? (
          messages.map((chat) => (
            <ChatItem
              key={chat.id}
              canModerate={canModerate}
              currentUserUid={currentUserUid}
              onDelete={onDeleteMessage}
              onModerate={onHideMessage}
              {...chat}
            />
          ))
        ) : (
          <div className='px-3 text-sm text-neutral-500'>
            {emptyMessage || localeMessages.guestbook.empty}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
