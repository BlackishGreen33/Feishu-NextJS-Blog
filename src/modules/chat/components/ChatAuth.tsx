import { useState } from 'react';
import clsx from 'clsx';
import { BsGithub as GithubIcon } from 'react-icons/bs';
import { FcGoogle as GoogleIcon } from 'react-icons/fc';

import Button from '@/common/components/elements/Button';
import { useI18n } from '@/i18n';

import {
  GuestbookProviderId,
  useFirebaseGuestbookAuth,
} from '../hooks/useFirebaseGuestbookAuth';

const getAuthErrorMessage = (
  error: unknown,
  authErrors: ReturnType<typeof useI18n>['messages']['guestbook']['authErrors'],
) => {
  const errorCode =
    typeof error === 'object' && error && 'code' in error
      ? String(error.code)
      : '';

  switch (errorCode) {
    case 'auth/operation-not-allowed':
      return authErrors.operationNotAllowed;
    case 'auth/configuration-not-found':
      return authErrors.configurationNotFound;
    case 'auth/unauthorized-domain':
      return authErrors.unauthorizedDomain;
    case 'auth/popup-blocked':
      return authErrors.popupBlocked;
    case 'auth/popup-closed-by-user':
      return authErrors.popupClosed;
    case 'auth/account-exists-with-different-credential':
      return authErrors.accountExistsWithDifferentCredential;
    default:
      return errorCode
        ? authErrors.fallbackWithCode.replace('{{code}}', errorCode)
        : authErrors.fallback;
  }
};

const ChatAuth = ({ isWidget = false }: { isWidget?: boolean }) => {
  const { messages } = useI18n();
  const { isConfigured, isLoading, signInWithProvider } =
    useFirebaseGuestbookAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const providerConfig = [
    {
      id: 'google',
      icon: <GoogleIcon size={18} />,
      bgColor: '!bg-white',
      textColor: 'text-black',
      label: messages.guestbook.signInWithGoogle,
    },
    {
      id: 'github',
      icon: <GithubIcon size={18} />,
      bgColor: '!bg-black',
      textColor: 'text-white',
      label: messages.guestbook.signInWithGithub,
    },
  ];

  const handleSignIn = async (providerId: GuestbookProviderId) => {
    setErrorMessage(null);

    try {
      await signInWithProvider(providerId);
    } catch (error) {
      setErrorMessage(
        getAuthErrorMessage(error, messages.guestbook.authErrors),
      );
    }
  };

  return (
    <div className='flex flex-col border-t border-neutral-300 py-1 dark:border-neutral-900'>
      <div className='mb-1 space-y-5 px-4 py-3 text-center text-neutral-700 dark:text-neutral-400'>
        <p className='text-sm'>{messages.guestbook.pageAuthPrompt}</p>
        <div
          className={clsx(
            'flex flex-col items-center justify-center gap-4 lg:flex-row lg:gap-5',
            isWidget && '!flex-col !gap-4',
          )}
        >
          {isLoading ? (
            <span className='text-sm text-neutral-500 dark:text-neutral-400'>
              {messages.guestbook.checkingAuth}
            </span>
          ) : null}
          {!isConfigured ? (
            <span className='text-sm text-neutral-500 dark:text-neutral-400'>
              {messages.guestbook.authNotConfigured}
            </span>
          ) : null}
          {isConfigured &&
            providerConfig.map((button) => (
              <Button
                key={button.id}
                onClick={() => handleSignIn(button.id as GuestbookProviderId)}
                className={`flex w-full items-center justify-center border ${button.bgColor} py-2.5 shadow-sm transition duration-300 hover:scale-[101%] lg:w-fit ${isWidget && '!w-full'}`}
                data-umami-event={`Sign In to Chat: ${button.label}`}
              >
                {button.icon}
                <span className={button.textColor}>{button.label}</span>
              </Button>
            ))}
        </div>
        {errorMessage ? (
          <p className='text-sm text-red-500'>{errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
};

export default ChatAuth;
