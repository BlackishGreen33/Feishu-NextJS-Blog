import Link from 'next/link';
import { FiSearch } from 'react-icons/fi';

import { useI18n } from '@/i18n';

const SearchBox = () => {
  const { messages } = useI18n();

  return (
    <Link href='/blog'>
      <div className='flex items-center gap-3 rounded-lg border-[1.8px] border-neutral-300 bg-neutral-100 px-3 py-2 text-neutral-500 backdrop-blur transition-all duration-300 hover:border-teal-400 hover:text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:text-neutral-200'>
        <FiSearch size={20} />
        <span className='w-full text-[15px]'>
          {messages.common.searchArticles}
        </span>
      </div>
    </Link>
  );
};

export default SearchBox;
