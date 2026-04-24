import { useCallback, useEffect, useMemo, useState } from 'react';

import EmptyState from '@/common/components/elements/EmptyState';
import {
  GuestbookModerationStatus,
  GuestbookViewer,
  MessageProps,
} from '@/common/types/chat';
import { useI18n } from '@/i18n';
import {
  createGuestbookMessage,
  deleteGuestbookMessage,
  fetchGuestbookMessages,
  moderateGuestbookMessage,
} from '@/services/guestbook';

import ChatAuth from './ChatAuth';
import ChatInput from './ChatInput';
import ChatList from './ChatList';
import { useFirebaseGuestbookAuth } from '../hooks/useFirebaseGuestbookAuth';

const PAGE_SIZE = 20;
const WIDGET_PAGE_SIZE = 10;

const sortMessages = (left: MessageProps, right: MessageProps) => {
  if (left.created_at === right.created_at) {
    return left.id.localeCompare(right.id);
  }

  return left.created_at.localeCompare(right.created_at);
};

const mergeMessages = (messages: MessageProps[]) => {
  const merged = new Map<string, MessageProps>();

  messages.forEach((message) => {
    merged.set(message.id, message);
  });

  return [...merged.values()].sort(sortMessages);
};

const Chat = ({ isWidget = false }: { isWidget?: boolean }) => {
  const { messages } = useI18n();
  const { user } = useFirebaseGuestbookAuth();
  const [chatMessages, setChatMessages] = useState<MessageProps[]>([]);
  const [isChatConfigured, setChatConfigured] = useState(true);
  const [isLoadingMessages, setLoadingMessages] = useState(true);
  const [isLoadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [viewer, setViewer] = useState<GuestbookViewer>({
    canModerate: false,
    isAuthenticated: false,
    uid: null,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pageSize = useMemo(
    () => (isWidget ? WIDGET_PAGE_SIZE : PAGE_SIZE),
    [isWidget],
  );

  const loadMessages = useCallback(
    async (cursor?: string | null) => {
      const isLoadMore = Boolean(cursor);

      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoadingMessages(true);
      }

      try {
        const response = await fetchGuestbookMessages({
          cursor,
          limit: pageSize,
          user,
        });

        setChatConfigured(response.configured);
        setHasMore(response.hasMore);
        setNextCursor(response.nextCursor);
        setViewer(response.viewer);
        setErrorMessage(null);

        if (response.configured) {
          setChatMessages((currentMessages) =>
            cursor
              ? mergeMessages([...response.messages, ...currentMessages])
              : response.messages,
          );
        } else {
          setChatMessages([]);
        }
      } catch {
        setErrorMessage(messages.guestbook.sendFailed);
      } finally {
        setLoadingMessages(false);
        setLoadingMore(false);
      }
    },
    [messages.guestbook.sendFailed, pageSize, user],
  );

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const handleSendMessage = async (message: string) => {
    try {
      const response = await createGuestbookMessage({ message, user });

      if (!response.message) {
        throw new Error('Missing guestbook message payload.');
      }

      setViewer(response.viewer);
      setChatMessages((currentMessages) =>
        mergeMessages([...currentMessages, response.message as MessageProps]),
      );
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : messages.guestbook.sendFailed,
      );
      throw error;
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const response = await deleteGuestbookMessage({ id, user });

      setViewer(response.viewer);
      setChatMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== id),
      );
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : messages.guestbook.deleteFailed,
      );
    }
  };

  const handleModerateMessage = async (
    id: string,
    status: GuestbookModerationStatus,
  ) => {
    try {
      const response = await moderateGuestbookMessage({ id, status, user });

      setViewer(response.viewer);
      setChatMessages((currentMessages) => {
        const nextMessages = currentMessages.map((message) =>
          message.id === id && response.message ? response.message : message,
        );

        return status === 'published'
          ? nextMessages
          : nextMessages.filter((message) => message.id !== id);
      });
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : messages.guestbook.moderationFailed,
      );
    }
  };

  if (!isChatConfigured) {
    return (
      <EmptyState
        message={
          isWidget
            ? messages.guestbook.widgetUnavailable
            : messages.guestbook.pageUnavailable
        }
      />
    );
  }

  if (isLoadingMessages) {
    return <EmptyState message={messages.guestbook.loadingMore} />;
  }

  return (
    <>
      <ChatList
        isWidget={isWidget}
        canModerate={!isWidget && viewer.canModerate}
        emptyMessage={messages.guestbook.empty}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        loadMoreLabel={messages.guestbook.loadMore}
        loadingMoreLabel={messages.guestbook.loadingMore}
        messages={chatMessages}
        onHideMessage={handleModerateMessage}
        onLoadMore={() => loadMessages(nextCursor)}
        onDeleteMessage={handleDeleteMessage}
        currentUserUid={user?.uid ?? null}
      />
      {errorMessage ? (
        <p className='px-4 pb-3 text-sm text-red-500'>{errorMessage}</p>
      ) : null}
      {user ? (
        <ChatInput onSendMessage={handleSendMessage} isWidget={isWidget} />
      ) : (
        <ChatAuth isWidget={isWidget} />
      )}
    </>
  );
};

export default Chat;
