import { useContext } from 'react';
import { BiCommand as CommandIcon } from 'react-icons/bi';
import { FiSearch } from 'react-icons/fi';

import { CommandPaletteContext } from '@/common/context/CommandPaletteContext';
import { useI18n } from '@/i18n';

const SearchBox = () => {
  const { setIsOpen } = useContext(CommandPaletteContext);
  const { messages } = useI18n();

  return (
    <button
      type='button'
      aria-label={messages.common.searchArticles}
      onClick={() => setIsOpen(true)}
      className='flex w-full items-center gap-3 rounded-lg border-[1.8px] border-neutral-300 bg-neutral-100 px-3 py-2 text-neutral-500 backdrop-blur transition-all duration-300 hover:border-teal-400 hover:text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:text-neutral-200'
    >
      <FiSearch size={20} />
      <span className='flex-1 text-left text-[15px]'>
        {messages.common.searchArticles}
      </span>
      <span className='hidden items-center gap-0.5 rounded bg-neutral-200 px-1 py-0.5 text-xs text-neutral-500 sm:flex dark:bg-neutral-800'>
        <CommandIcon className='text-[11px]' />
        <span>K</span>
      </span>
    </button>
  );
};

export default SearchBox;
