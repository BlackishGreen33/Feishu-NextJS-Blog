import Breakline from '@/common/components/elements/Breakline';
import { useI18n } from '@/i18n';

import BookACall from './BookACall';
import ContactForm from './ContactForm';
import SocialMediaList from './SocialMediaList';

const Contact = () => {
  const { messages } = useI18n();

  return (
    <section className='space-y-6'>
      <SocialMediaList />
      <Breakline />
      <BookACall />
      <Breakline />
      <div className='space-y-5'>
        <h3 className='text-lg font-medium'>{messages.contact.messageTitle}</h3>
        <ContactForm />
      </div>
    </section>
  );
};

export default Contact;
