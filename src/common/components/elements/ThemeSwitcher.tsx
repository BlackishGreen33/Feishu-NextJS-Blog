import { Fragment, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Listbox, Transition } from '@headlessui/react';
import clsx from 'clsx';
import { LuChevronsUpDown } from 'react-icons/lu';
import { MdDarkMode, MdLightMode } from 'react-icons/md';

import { useI18n } from '@/i18n';

interface ThemeSwitcherProps {
  compact?: boolean;
}

const ThemeSwitcher = ({ compact = false }: ThemeSwitcherProps) => {
  const { resolvedTheme, setTheme } = useTheme();
  const { messages } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={compact ? 'h-10 w-10' : 'h-10.5 w-full'} />;
  }

  const isDarkMode = resolvedTheme === 'dark';
  const nextTheme = isDarkMode ? 'light' : 'dark';

  if (compact) {
    return (
      <button
        type='button'
        onClick={() => setTheme(nextTheme)}
        aria-label={messages.theme.toggleLabel}
        title={
          isDarkMode
            ? messages.theme.switchToLight
            : messages.theme.switchToDark
        }
        className='inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-neutral-100 text-neutral-700 transition-colors duration-200 hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:text-neutral-100'
        data-umami-event={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
      >
        {isDarkMode ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
      </button>
    );
  }

  return (
    <Listbox value={resolvedTheme} onChange={(value) => setTheme(value)}>
      <div className='relative mt-1'>
        <Listbox.Button className='group relative w-full cursor-pointer rounded-lg border-[1.8px] bg-white py-2 pr-10 pl-4 text-left text-neutral-600 focus:outline-none focus-visible:border-neutral-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-200 sm:text-[15px] dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:focus-visible:border-neutral-600 dark:focus-visible:ring-offset-neutral-950'>
          <span className='flex items-center gap-2 truncate'>
            {isDarkMode ? (
              <>
                <MdDarkMode size={20} />
                <span>{messages.theme.dark}</span>
              </>
            ) : (
              <>
                <MdLightMode size={20} />
                <span>{messages.theme.light}</span>
              </>
            )}
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
            className='z-50 mt-2 max-h-60 w-(--button-width) overflow-auto rounded-md border border-neutral-200 bg-white py-1 text-base ring-1 ring-black/5 [--anchor-gap:8px] focus:outline-none sm:text-sm dark:border-neutral-800 dark:bg-neutral-900'
          >
            {[
              {
                icon: <MdLightMode size={20} />,
                label: messages.theme.light,
                value: 'light',
              },
              {
                icon: <MdDarkMode size={20} />,
                label: messages.theme.dark,
                value: 'dark',
              },
            ].map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value}
                className={({ active, selected }) =>
                  clsx(
                    'relative cursor-pointer py-1.5 pr-4 pl-11 transition-colors duration-150 select-none',
                    active
                      ? 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100'
                      : 'text-neutral-600 dark:text-neutral-400',
                    selected ? 'font-medium' : 'font-normal',
                  )
                }
              >
                <div className='block truncate'>{option.label}</div>
                <span className='absolute inset-y-0 left-0 flex items-center pl-4'>
                  {option.icon}
                </span>
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
};

export default ThemeSwitcher;
