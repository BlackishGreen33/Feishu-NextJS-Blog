import { Fragment } from 'react';
import { useRouter } from 'next/router';
import { Listbox, Transition } from '@headlessui/react';
import clsx from 'clsx';
import { LuChevronsUpDown } from 'react-icons/lu';

import { useI18n } from '@/i18n';
import type { AppLocale } from '@/i18n/messages/base';

interface LanguageSwitcherProps {
  compact?: boolean;
}

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

const LanguageSwitcher = ({ compact = false }: LanguageSwitcherProps) => {
  const router = useRouter();
  const { locale, locales, messages } = useI18n();
  const { pathname, query, asPath } = router;
  const localeOptions = locales.map((option) => ({
    label: messages.locale.options[option].label,
    shortLabel: messages.locale.options[option].shortLabel,
    value: option,
  }));

  const handleSwitchLocale = async (nextLocale: AppLocale) => {
    if (nextLocale === locale) {
      return;
    }

    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`;

    await router.push({ pathname, query }, asPath, { locale: nextLocale });
  };

  if (compact) {
    return (
      <div
        className='flex flex-wrap items-center gap-1.5'
        aria-label={messages.locale.switcherAriaLabel}
      >
        {localeOptions.map((option) => (
          <button
            key={option.value}
            type='button'
            onClick={() => handleSwitchLocale(option.value)}
            aria-pressed={option.value === locale}
            className={clsx(
              'inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:outline-none dark:focus-visible:ring-neutral-700',
              option.value === locale
                ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50'
                : 'border-neutral-300 bg-transparent text-neutral-600 hover:border-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-100',
            )}
          >
            {option.shortLabel}
          </button>
        ))}
      </div>
    );
  }

  return (
    <Listbox
      value={locale}
      onChange={(value) => void handleSwitchLocale(value)}
    >
      <div className='relative mt-1'>
        <Listbox.Button className='group relative w-full cursor-pointer rounded-lg border-[1.8px] bg-white py-2 pr-10 pl-4 text-left text-neutral-600 focus:outline-none focus-visible:border-neutral-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-200 sm:text-[15px] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:focus-visible:border-neutral-600 dark:focus-visible:ring-offset-neutral-950'>
          <span className='flex items-center gap-2 truncate'>
            <span>
              {localeOptions.find((option) => option.value === locale)?.label}
            </span>
          </span>
          <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5'>
            <LuChevronsUpDown
              className='h-5 w-5 text-neutral-500 transition-all duration-300 group-hover:text-neutral-600 group-hover:dark:text-neutral-400'
              aria-hidden='true'
            />
          </span>
        </Listbox.Button>

        <Transition
          as={Fragment}
          leave='transition duration-100 ease-in'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <Listbox.Options
            anchor='bottom start'
            portal
            className='z-50 mt-2 max-h-60 w-[var(--button-width)] overflow-auto rounded-md border border-neutral-200 bg-white py-1 text-base ring-1 ring-black/5 [--anchor-gap:8px] focus:outline-none sm:text-sm dark:border-neutral-800 dark:bg-neutral-900'
          >
            {localeOptions.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value}
                className={({ active, selected }) =>
                  clsx(
                    'relative cursor-pointer py-1.5 pr-4 pl-4 transition-colors duration-150 select-none',
                    active
                      ? 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100'
                      : 'text-neutral-600 dark:text-neutral-400',
                    selected ? 'font-medium' : 'font-normal',
                  )
                }
              >
                <div className='block truncate'>{option.label}</div>
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
};

export default LanguageSwitcher;
