import { useI18n } from '@/i18n';
import { getMessages } from '@/i18n';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'http://localhost:3000';
export const SITE_PROFILE_HANDLE = '@BlackishGreen33';
export const SITE_PROFILE_IMAGE =
  'https://avatars.githubusercontent.com/u/103036558?v=4';
export const SITE_GITHUB_URL = 'https://github.com/BlackishGreen33';
export const SITE_CONTACT_EMAIL = 's5460703@gmail.com';
export const SITE_DEFAULT_BLOG_COVER = '/images/blog-cover-personal.svg';
export const SITE_WAKATIME_URL = '';
export const SITE_DEVTO_USERNAME = '';
export const SITE_RESUME_URL = '/documents/blackishgreen-bg-resume.pdf';
export const SITE_RESUME_EMBED_URL = '/documents/blackishgreen-bg-resume.pdf';
export const SITE_BOOK_CALL_URL =
  'https://vcnay0rphntt.feishu.cn/scheduler/5dc709a0aba45373';
export const SITE_GISCUS_REPO = '';
export const SITE_GISCUS_REPO_ID = '';
export const SITE_GISCUS_CATEGORY = '';
export const SITE_GISCUS_CATEGORY_ID = '';

export const getSiteConfig = (locale?: string) => {
  const messages = getMessages(locale);

  return {
    name: messages.site.name,
    title: messages.site.title,
    description: messages.site.description,
    profileName: messages.site.name,
    profileGreeting: messages.site.profileGreeting,
    profileBio: messages.site.profileBio,
    profileFacts: messages.site.profileFacts,
    homeSkillsTitle: messages.site.homeSkillsTitle,
    homeServicesTitle: messages.site.homeServicesTitle,
    homeServicesDescription: messages.site.homeServicesDescription,
    homeServicesCardTitle: messages.site.homeServicesCardTitle,
    homeServicesCardDescription: messages.site.homeServicesCardDescription,
    aboutPageDescription: messages.site.aboutPageDescription,
    contactPageDescription: messages.site.contactPageDescription,
    bookCallTitle: messages.site.bookCallTitle,
    bookCallDescription: messages.site.bookCallDescription,
    bookCallDuration: messages.site.bookCallDuration,
    bookCallTool: messages.site.bookCallTool,
    contactResponseTime: messages.site.contactResponseTime,
    navGroupLabels: messages.site.navGroupLabels,
  };
};

export const useSiteConfig = () => {
  const { locale } = useI18n();

  return getSiteConfig(locale);
};
