import { useState } from 'react';
import dynamic from 'next/dynamic';
import { PiChatCircleDotsBold as ChatIcon } from 'react-icons/pi';

import useChatStore from '@/common/stores/useChatStore';

const ChatWidget = dynamic(() => import('./ChatWidget'), { ssr: false });

const ChatButton = () => {
  const { isOpen, toggleChat } = useChatStore();
  const [shouldRenderWidget, setShouldRenderWidget] = useState(false);

  const handleToggleChat = () => {
    setShouldRenderWidget(true);
    toggleChat();
  };

  return (
    <>
      <button
        onClick={handleToggleChat}
        className='group fixed right-5 bottom-12 flex hidden items-center gap-1 rounded-full border border-neutral-600 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neutral-600 to-neutral-500 p-2.5 text-neutral-700 shadow-xl transition-all duration-300 group-hover:!px-4 hover:scale-[103%] lg:flex dark:from-neutral-700 dark:to-neutral-800 dark:text-white'
        data-umami-event='Toggle Chat Widget'
      >
        <ChatIcon size={20} />
      </button>
      {shouldRenderWidget ? (
        <ChatWidget isOpen={isOpen} toggleChat={toggleChat} />
      ) : null}
    </>
  );
};

export default ChatButton;
