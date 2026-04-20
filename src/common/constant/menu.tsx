import { BiRocket as ContactIcon } from 'react-icons/bi';
import {
  BsEnvelopeAtFill as EmailIcon,
  BsGithub as GithubIcon,
} from 'react-icons/bs';
import {
  FiBookOpen as LearnIcon,
  FiPocket as HomeIcon,
  FiRss as BlogIcon,
  FiUser as ProfileIcon,
} from 'react-icons/fi';
import { SiJavascript } from 'react-icons/si';

import {
  SITE_CONTACT_EMAIL,
  SITE_NAV_GROUP_LABELS,
} from '@/common/config/site';

import { MenuItemProps } from '../types/menu';

const iconSize = 20;

export const MENU_ITEMS: MenuItemProps[] = [
  {
    title: '首頁',
    href: '/',
    icon: <HomeIcon size={iconSize} />,
    isShow: true,
    isExternal: false,
    eventName: 'Pages: Home',
    type: 'Pages',
  },
  {
    title: '部落格',
    href: '/blog',
    icon: <BlogIcon size={iconSize} />,
    isShow: true,
    isExternal: false,
    eventName: 'Pages: Blog',
    type: 'Pages',
  },
  {
    title: '學習筆記',
    href: '/learn',
    icon: <LearnIcon size={iconSize} />,
    isShow: true,
    isExternal: false,
    eventName: 'Pages: Learn',
    type: 'Pages',
  },
  {
    title: '關於',
    href: '/about',
    icon: <ProfileIcon size={iconSize} />,
    isShow: true,
    isExternal: false,
    eventName: 'Pages: About',
    type: 'Pages',
  },
  {
    title: '聯絡',
    href: '/contact',
    icon: <ContactIcon size={iconSize} />,
    isShow: true,
    isExternal: false,
    eventName: 'Pages: Contact',
    type: 'Pages',
  },
];

export const MENU_APPS: MenuItemProps[] = [
  {
    title: 'JS Playground',
    href: '/playground',
    icon: <SiJavascript size={iconSize} />,
    isShow: true,
    isExternal: false,
    eventName: 'Pages: Playground',
    type: 'Pages',
  },
];

export const SOCIAL_MEDIA: MenuItemProps[] = [
  {
    title: '電子郵件',
    href: `mailto:${SITE_CONTACT_EMAIL}`,
    icon: <EmailIcon size={iconSize} />,
    isShow: true,
    isExternal: true,
    eventName: 'Contact: Email',
    className: '!bg-green-600 border border dark:border-neutral-700',
    type: 'Link',
  },
  {
    title: 'GitHub',
    href: 'https://github.com',
    icon: <GithubIcon size={iconSize} />,
    isShow: true,
    isExternal: true,
    eventName: 'Social: Github',
    className: '!bg-black border border dark:border-neutral-700',
    type: 'Link',
  },
];

export const EXTERNAL_LINKS: MenuItemProps[] = [
  {
    title: SITE_NAV_GROUP_LABELS.apps,
    href: '/playground',
    icon: <SiJavascript size={iconSize} />,
    isShow: false,
    isExternal: false,
    eventName: 'External Link: Playground',
    type: 'Pages',
  },
];
