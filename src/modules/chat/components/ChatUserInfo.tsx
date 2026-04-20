import clsx from 'clsx';
import { HiOutlineLogout as SignOutIcon } from 'react-icons/hi';

import { useI18n } from '@/i18n';

import { useFirebaseGuestbookAuth } from '../hooks/useFirebaseGuestbookAuth';

const ChatUserInfo = ({ isWidget = false }: { isWidget?: boolean }) => {
  const { messages } = useI18n();
  const { user, signOutUser } = useFirebaseGuestbookAuth();

  const userName = user?.displayName ?? user?.email ?? null;
  const userEmail = user?.email ?? null;

  return user ? (
    <div
      className={clsx(
        'flex flex-col items-start gap-2 px-4 pb-3 text-sm md:flex-row md:items-center',
        isWidget && 'text-xs',
      )}
    >
      <div className='flex flex-wrap gap-1 text-neutral-500'>
        <p>{messages.guestbook.loggedInAs}</p>
        <p className='font-medium'>{userName}</p>
        <p>({userEmail})</p>
      </div>
      {!isWidget && (
        <>
          <div className='hidden text-neutral-500 md:block'>•</div>
          <div
            onClick={() => signOutUser()}
            className='flex cursor-pointer items-center gap-1 font-medium text-red-500'
            data-umami-event='Sign Out from Chat Page'
          >
            <SignOutIcon size={16} className='cursor-pointer text-red-500' />
            <span>{messages.guestbook.signOut}</span>
          </div>
        </>
      )}
    </div>
  ) : null;
};

export default ChatUserInfo;
