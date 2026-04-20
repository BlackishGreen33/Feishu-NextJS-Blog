import { BiRocket as ContactIcon } from 'react-icons/bi';
import {
  BsEnvelopeAtFill as EmailIcon,
  BsGithub as GithubIcon,
} from 'react-icons/bs';
import {
  FiBookOpen as LearnIcon,
  FiCoffee as ProjectIcon,
  FiCpu as DashboardIcon,
  FiPocket as HomeIcon,
  FiRss as BlogIcon,
  FiUser as ProfileIcon,
} from 'react-icons/fi';
import { PiChatCircleDotsBold as ChatIcon } from 'react-icons/pi';
import { SiJavascript } from 'react-icons/si';

import { SITE_CONTACT_EMAIL, SITE_GITHUB_URL } from '@/common/config/site';
import type { MenuItemProps } from '@/common/types/menu';
import { useI18n } from '@/i18n';

const iconSize = 20;

export const useMenuData = () => {
  const { messages } = useI18n();

  const menuItems: MenuItemProps[] = [
    {
      title: messages.nav.home,
      href: '/',
      icon: <HomeIcon size={iconSize} />,
      isShow: true,
      isExternal: false,
      eventName: 'Pages: Home',
      type: 'Pages',
    },
    {
      title: messages.nav.dashboard,
      href: '/dashboard',
      icon: <DashboardIcon size={iconSize} />,
      isShow: true,
      isExternal: false,
      eventName: 'Pages: Dashboard',
      type: 'Pages',
    },
    {
      title: messages.nav.projects,
      href: '/projects',
      icon: <ProjectIcon size={iconSize} />,
      isShow: true,
      isExternal: false,
      eventName: 'Pages: Projects',
      type: 'Pages',
    },
    {
      title: messages.nav.blog,
      href: '/blog',
      icon: <BlogIcon size={iconSize} />,
      isShow: true,
      isExternal: false,
      eventName: 'Pages: Blog',
      type: 'Pages',
    },
    {
      title: messages.nav.learn,
      href: '/learn',
      icon: <LearnIcon size={iconSize} />,
      isShow: true,
      isExternal: false,
      eventName: 'Pages: Learn',
      type: 'Pages',
    },
    {
      title: messages.nav.about,
      href: '/about',
      icon: <ProfileIcon size={iconSize} />,
      isShow: true,
      isExternal: false,
      eventName: 'Pages: About',
      type: 'Pages',
    },
    {
      title: messages.nav.contact,
      href: '/contact',
      icon: <ContactIcon size={iconSize} />,
      isShow: true,
      isExternal: false,
      eventName: 'Pages: Contact',
      type: 'Pages',
    },
    {
      title: messages.nav.guestbook,
      href: '/guestbook',
      icon: <ChatIcon size={iconSize} />,
      isShow: true,
      isExternal: false,
      eventName: 'Pages: Guestbook',
      type: 'Pages',
    },
  ];

  const appItems: MenuItemProps[] = [
    {
      title: messages.nav.playground,
      href: '/playground',
      icon: <SiJavascript size={iconSize} />,
      isShow: true,
      isExternal: false,
      eventName: 'Pages: Playground',
      type: 'Pages',
    },
  ];

  const socialMedia: MenuItemProps[] = [
    ...(SITE_CONTACT_EMAIL
      ? [
          {
            title: messages.nav.email,
            href: `mailto:${SITE_CONTACT_EMAIL}`,
            icon: <EmailIcon size={iconSize} />,
            isShow: true,
            isExternal: true,
            eventName: 'Contact: Email',
            className: '!bg-green-600 border border dark:border-neutral-700',
            type: 'Link' as const,
          },
        ]
      : []),
    {
      title: messages.nav.github,
      href: SITE_GITHUB_URL,
      icon: <GithubIcon size={iconSize} />,
      isShow: true,
      isExternal: true,
      eventName: 'Social: Github',
      className: '!bg-black border border dark:border-neutral-700',
      type: 'Link',
    },
  ];

  const externalLinks: MenuItemProps[] = [
    {
      title: messages.site.navGroupLabels.apps,
      href: '/playground',
      icon: <SiJavascript size={iconSize} />,
      isShow: false,
      isExternal: false,
      eventName: 'External Link: Playground',
      type: 'Pages',
    },
  ];

  return {
    menuItems,
    appItems,
    socialMedia,
    externalLinks,
  };
};
