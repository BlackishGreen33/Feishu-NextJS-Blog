import { useI18n } from '@/i18n';

const AiLoading = () => {
  const { messages } = useI18n();

  return (
    <div className='flex items-center justify-center gap-3'>
      <div className='h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-neutral-400'></div>
      <div className='animate-pulse dark:text-neutral-400'>
        {messages.commandPalette.aiProcessing}
      </div>
    </div>
  );
};

export default AiLoading;
