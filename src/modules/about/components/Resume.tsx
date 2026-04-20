import Link from 'next/link';
import { LuDownload as DownloadIcon } from 'react-icons/lu';

import EmptyState from '@/common/components/elements/EmptyState';
import GoogleDocsEmbed from '@/common/components/elements/GoogleDocsEmbed';
import { SITE_RESUME_EMBED_URL, SITE_RESUME_URL } from '@/common/config/site';
import { useI18n } from '@/i18n';

const Resume = () => {
  const { messages } = useI18n();

  if (!SITE_RESUME_URL && !SITE_RESUME_EMBED_URL) {
    return <EmptyState message={messages.about.resume.empty} />;
  }

  const embedSrc = SITE_RESUME_EMBED_URL || SITE_RESUME_URL;
  const isPdfEmbed = Boolean(embedSrc?.toLowerCase().endsWith('.pdf'));

  return (
    <div className='space-y-5'>
      {SITE_RESUME_URL && (
        <Link
          href={SITE_RESUME_URL}
          target='_blank'
          passHref
          className='flex w-fit items-center gap-2 rounded-lg border border-neutral-400 px-4 py-2.5 text-sm text-neutral-600 transition-all duration-300 hover:gap-3 hover:border-neutral-500 hover:text-neutral-700 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-400 hover:dark:border-neutral-300 hover:dark:text-neutral-300'
          data-umami-event='Download Resume'
        >
          <DownloadIcon />
          <span>{messages.about.resume.view}</span>
        </Link>
      )}

      {embedSrc ? (
        isPdfEmbed ? (
          <iframe
            src={embedSrc}
            title={messages.about.resume.pdfTitle}
            width='100%'
            height='900'
            className='min-h-[70vh] rounded-xl border border-neutral-300 bg-white dark:border-neutral-800'
          />
        ) : (
          <GoogleDocsEmbed src={embedSrc} />
        )
      ) : null}
    </div>
  );
};

export default Resume;
