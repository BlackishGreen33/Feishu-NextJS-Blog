import {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import dynamic from 'next/dynamic';

interface CommandPaletteContextType {
  isOpen: boolean;
  closePalette: () => void;
  openPalette: () => void;
  preloadPalette: () => void;
  setIsOpen: (open: boolean) => void;
}

const LazyCommandPalette = dynamic(
  () => import('@/common/components/elements/CommandPalette'),
  { ssr: false },
);

export const CommandPaletteContext = createContext<CommandPaletteContextType>({
  closePalette: () => {},
  isOpen: false,
  openPalette: () => {},
  preloadPalette: () => {},
  setIsOpen: () => {},
});

interface CommandPaletteProviderProps {
  children: ReactNode;
}

export const CommandPaletteProvider = ({
  children,
}: CommandPaletteProviderProps) => {
  const [isOpen, setOpen] = useState(false);
  const [shouldRenderPalette, setShouldRenderPalette] = useState(false);

  const preloadPalette = useCallback(() => {
    setShouldRenderPalette(true);
  }, []);

  const openPalette = useCallback(() => {
    preloadPalette();
    setOpen(true);
  }, [preloadPalette]);

  const closePalette = useCallback(() => {
    setOpen(false);
  }, []);

  const setIsOpen = (open: boolean) => {
    if (open) {
      openPalette();
      return;
    }

    closePalette();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        openPalette();
        return;
      }

      if (event.key === 'Escape') {
        closePalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closePalette, openPalette]);

  return (
    <CommandPaletteContext.Provider
      value={{ closePalette, isOpen, openPalette, preloadPalette, setIsOpen }}
    >
      {children}
      {shouldRenderPalette ? <LazyCommandPalette /> : null}
    </CommandPaletteContext.Provider>
  );
};
