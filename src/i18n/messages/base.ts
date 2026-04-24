import type { CareerProps } from '@/common/types/careers';
import type { EducationProps } from '@/common/types/education';

export type AppLocale = 'zh-TW' | 'zh-CN' | 'en';

export type Messages = {
  site: {
    name: string;
    title: string;
    description: string;
    profileGreeting: string;
    profileBio: string;
    profileFacts: string[];
    homeSkillsTitle: string;
    homeServicesTitle: string;
    homeServicesDescription: string;
    homeServicesCardTitle: string;
    homeServicesCardDescription: string;
    aboutPageDescription: string;
    contactPageDescription: string;
    bookCallTitle: string;
    bookCallDescription: string;
    bookCallDuration: string;
    bookCallTool: string;
    contactResponseTime: string;
    navGroupLabels: {
      apps: string;
      theme: string;
      language: string;
    };
  };
  nav: {
    home: string;
    dashboard: string;
    projects: string;
    blog: string;
    learn: string;
    about: string;
    contact: string;
    guestbook: string;
    playground: string;
    email: string;
    github: string;
  };
  pages: {
    aboutTitle: string;
    contactTitle: string;
    blogTitle: string;
    dashboardTitle: string;
    guestbookTitle: string;
    guestbookDescription: string;
    learnTitle: string;
    learnDescription: string;
    projectsTitle: string;
    projectsDescription: string;
    playgroundTitle: string;
    notFoundDescription: string;
  };
  common: {
    loading: string;
    loadingEllipsis: string;
    noData: string;
    back: string;
    searchArticles: string;
    viewDetails: string;
    hideDetails: string;
    present: string;
  };
  locale: {
    switcherAriaLabel: string;
    options: Record<
      AppLocale,
      {
        label: string;
        shortLabel: string;
      }
    >;
  };
  theme: {
    toggleLabel: string;
    light: string;
    dark: string;
    switchToLight: string;
    switchToDark: string;
  };
  home: {
    contactButton: string;
    viewAllArticles: string;
  };
  about: {
    tabs: {
      story: string;
      resume: string;
      career: string;
      education: string;
    };
    storyHtml: string;
    education: {
      empty: string;
      items: EducationProps[];
    };
    career: {
      empty: string;
      items: CareerProps[];
    };
    resume: {
      empty: string;
      view: string;
      pdfTitle: string;
    };
  };
  contact: {
    socialTitle: string;
    scheduleTitle: string;
    messageTitle: string;
    noScheduleLink: string;
    averageResponseTime: string;
    form: {
      namePlaceholder: string;
      emailPlaceholder: string;
      messagePlaceholder: string;
      send: string;
      sending: string;
      success: string;
      failed: string;
      invalid: string;
      required: Record<'name' | 'email' | 'message', string>;
    };
  };
  blog: {
    latestArticles: string;
    featuredArticle: string;
    previousFeatured: string;
    nextFeatured: string;
    searchKeyword: string;
    loadingFailed: string;
    noMatchingPosts: string;
    tags: string;
    publishedAt: string;
    updatedAt: string;
    readingTime: string;
    minutesRead: string;
  };
  dashboard: {
    pageDescription: string;
    weeklyStats: string;
    weeklyStatsDescription: string;
    source: string;
    lastUpdated: string;
    wakatimeUnavailable: string;
    wakatimeNotConfigured: string;
    githubContributions: string;
    githubDescription: string;
    githubUnavailable: string;
    githubNotConfigured: string;
  };
  guestbook: {
    widgetTitle: string;
    empty: string;
    pageAuthPrompt: string;
    widgetUnavailable: string;
    pageUnavailable: string;
    inputPlaceholder: string;
    hideAction: string;
    deleteAction: string;
    loadMore: string;
    loadingMore: string;
    sendFailed: string;
    deleteFailed: string;
    moderationFailed: string;
    signInWithGoogle: string;
    signInWithGithub: string;
    checkingAuth: string;
    authNotConfigured: string;
    loggedInAs: string;
    signOut: string;
    authorBadge: string;
    authErrors: {
      operationNotAllowed: string;
      configurationNotFound: string;
      unauthorizedDomain: string;
      popupBlocked: string;
      popupClosed: string;
      accountExistsWithDifferentCredential: string;
      fallback: string;
      fallbackWithCode: string;
    };
  };
  commandPalette: {
    placeholders: string[];
    groups: {
      articles: string;
      pages: string;
      socials: string;
      externalLinks: string;
      appearance: string;
    };
    currentPage: string;
    noResultIntro: string;
    noResultOutro: string;
    askAiAssistant: string;
    findInGoogle: string;
    closeWindowHint: string;
    aiProcessing: string;
    aiFallback: {
      title: string;
      body: string;
      retry: string;
    };
  };
  projects: {
    featured: string;
    viewProject: string;
    noData: string;
  };
  learn: {
    empty: string;
    newLabel: string;
    viewLessons: string;
    lessonSingular: string;
    lessonPlural: string;
  };
};
