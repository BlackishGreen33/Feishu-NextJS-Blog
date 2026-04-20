import { useState } from 'react';
import axios from 'axios';
import clsx from 'clsx';
import { FiClock as ClockIcon } from 'react-icons/fi';

import Button from '@/common/components/elements/Button';
import { useSiteConfig } from '@/common/config/site';
import { useI18n } from '@/i18n';

interface FormDataProps {
  name: string;
  email: string;
  message: string;
}

const formInitialState: FormDataProps = {
  name: '',
  email: '',
  message: '',
};

const ContactForm = () => {
  const { messages } = useI18n();
  const site = useSiteConfig();
  const [formData, setFormData] = useState<FormDataProps>(formInitialState);

  const [formErrors, setFormErrors] = useState<Partial<FormDataProps>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setFormErrors({
      ...formErrors,
      [name]: value
        ? undefined
        : messages.contact.form.required[name as keyof FormDataProps],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasErrors = Object.values(formErrors).some((error) => error);

    if (!hasErrors) {
      setIsLoading(true);
      try {
        const response = await axios.post('/api/contact', { formData });
        if (response.status === 200) {
          alert(messages.contact.form.success);
          setFormData(formInitialState);
        }
      } catch (error) {
        void error;
        alert(messages.contact.form.failed);
      }
      setIsLoading(false);
    } else {
      alert(messages.contact.form.invalid);
    }
  };

  const isSubmitDisabled = Object.values(formErrors).some((error) => error);

  return (
    <form onSubmit={handleSubmit}>
      <div className='flex flex-grow flex-col gap-5'>
        <div className='flex flex-col gap-5 md:flex-row'>
          <input
            className='w-full rounded-md border border-neutral-200 px-3 py-2 focus:outline-none dark:border-neutral-700'
            type='text'
            placeholder={messages.contact.form.namePlaceholder}
            name='name'
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            className='w-full rounded-md border border-neutral-200 px-3 py-2 focus:outline-none dark:border-neutral-700'
            type='email'
            placeholder={messages.contact.form.emailPlaceholder}
            name='email'
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <textarea
          className='w-full rounded-md border border-neutral-200 px-3 py-2 focus:outline-none dark:border-neutral-700'
          rows={5}
          placeholder={messages.contact.form.messagePlaceholder}
          name='message'
          value={formData.message}
          onChange={handleChange}
          required
        />
        <Button
          className={clsx(
            'flex justify-center bg-neutral-800 py-2.5 hover:scale-[101%] hover:bg-neutral-900 dark:bg-neutral-50 dark:text-neutral-950 hover:dark:bg-neutral-50',
          )}
          type='submit'
          icon={<></>}
          data-umami-event='Send Contact Message'
          disabled={isSubmitDisabled}
        >
          {isLoading ? messages.contact.form.sending : messages.contact.form.send}
        </Button>
      </div>

      <div className='my-5 flex items-center gap-2 dark:text-neutral-400'>
        <ClockIcon />
        <div className='text-sm'>
          <span className='font-medium'>{messages.contact.averageResponseTime}</span>
          {site.contactResponseTime}
        </div>
      </div>
    </form>
  );
};

export default ContactForm;
