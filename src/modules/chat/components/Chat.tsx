import { useEffect, useState } from 'react';
import { getDatabase, onValue, ref, remove, set } from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';

import EmptyState from '@/common/components/elements/EmptyState';
import { SITE_PROFILE_IMAGE } from '@/common/config/site';
import { firebase } from '@/common/libs/firebase';
import { MessageProps } from '@/common/types/chat';
import { useI18n } from '@/i18n';

import ChatAuth from './ChatAuth';
import ChatInput from './ChatInput';
import ChatList from './ChatList';
import { useFirebaseGuestbookAuth } from '../hooks/useFirebaseGuestbookAuth';

const Chat = ({ isWidget = false }: { isWidget?: boolean }) => {
  const { messages } = useI18n();
  const { user } = useFirebaseGuestbookAuth();
  const [chatMessages, setChatMessages] = useState<MessageProps[]>([]);
  const databaseChat = process.env.NEXT_PUBLIC_FIREBASE_CHAT_DB as string;
  const database = firebase ? getDatabase(firebase) : null;
  const isChatConfigured = Boolean(database && databaseChat);

  const handleSendMessage = async (message: string) => {
    if (!database || !databaseChat || !user) return;

    const messageId = uuidv4();
    const messageRef = ref(database, `${databaseChat}/${messageId}`);

    await set(messageRef, {
      id: messageId,
      uid: user.uid,
      name: user.displayName || user.email?.split('@')[0] || 'Guest',
      email: user.email || '',
      image: user.photoURL || SITE_PROFILE_IMAGE,
      message,
      created_at: new Date().toISOString(),
      is_show: true,
    });
  };

  const handleDeleteMessage = (id: string) => {
    if (!database || !databaseChat) return;

    const messageRef = ref(database, `${databaseChat}/${id}`);

    if (messageRef) {
      remove(messageRef);
    }
  };

  useEffect(() => {
    if (!database || !databaseChat) return;

    const messagesRef = ref(database, databaseChat);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const messagesData = snapshot.val();
      if (messagesData) {
        const messagesArray = Object.values(messagesData) as MessageProps[];
        const sortedMessage = messagesArray.sort((a, b) => {
          const dateA = new Date(a.created_at);
          const dateB = new Date(b.created_at);
          return dateA.getTime() - dateB.getTime();
        });
        setChatMessages(sortedMessage);
      }
    });
    return () => unsubscribe();
  }, [database, databaseChat]);

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

  return (
    <>
      <ChatList
        isWidget={isWidget}
        messages={chatMessages}
        onDeleteMessage={handleDeleteMessage}
        currentUserUid={user?.uid ?? null}
      />
      {user ? (
        <ChatInput onSendMessage={handleSendMessage} isWidget={isWidget} />
      ) : (
        <ChatAuth isWidget={isWidget} />
      )}
    </>
  );
};

export default Chat;
