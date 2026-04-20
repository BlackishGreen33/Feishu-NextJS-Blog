import Link from 'next/link';
import { useRouter } from 'next/router';
import { FiArrowLeftCircle as BackButtonIcon } from 'react-icons/fi';

type BackButtonProps = {
  url?: string;
};

const BackButton = ({ url }: BackButtonProps) => {
  const router = useRouter();

  const handleOnClick = () => {
    if (url) {
      window.location.href = url;
    } else {
      router.back();
    }
  };

  const className =
    'flex gap-2 w-max hover:gap-3 items-center mb-6 transition-all duration-300 font-medium text-neutral-600 dark:text-neutral-400 cursor-pointer';

  return (
    <div className='w-fit'>
      {url ? (
        <Link href={url} passHref>
          <div className={className}>
            <BackButtonIcon size={20} data-testid='back-icon' />
            <span>返回</span>
          </div>
        </Link>
      ) : (
        <div className={className} onClick={handleOnClick}>
          <BackButtonIcon size={20} data-testid='back-icon' />
          <span>返回</span>
        </div>
      )}
    </div>
  );
};

export default BackButton;
