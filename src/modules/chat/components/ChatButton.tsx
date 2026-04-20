import { PiChatCircleDotsBold as ChatIcon } from 'react-icons/pi';

import useChatStore from '@/common/stores/useChatStore';

import ChatWidget from './ChatWidget';

const ChatButton = () => {
  const { isOpen, toggleChat } = useChatStore();

  return (
    <>
      <button
        onClick={toggleChat}
        className='group fixed right-5 bottom-12 flex hidden items-center gap-1 rounded-full border border-neutral-600 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neutral-600 to-neutral-500 p-2.5 text-white shadow-xl transition-all duration-300 group-hover:!px-4 hover:scale-[103%] lg:flex dark:from-neutral-700 dark:to-neutral-800'
        data-umami-event='Toggle Chat Widget'
      >
        <ChatIcon size={20} />
      </button>
      <ChatWidget isOpen={isOpen} toggleChat={toggleChat} />
    </>
  );
};

export default ChatButton;
