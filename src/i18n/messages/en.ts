import type { Messages } from './base';

const enMessages: Messages = {
  site: {
    name: 'BlackishGreen B.G.',
    title: 'BlackishGreen B.G. Personal Site',
    description:
      'A personal website and notes hub by BlackishGreen B.G., with articles synced and published from a Feishu knowledge base.',
    profileGreeting: 'Hi, I am BlackishGreen B.G. 👋',
    profileBio:
      'I study Software Engineering at Central China Normal University. My work focuses on modern web development and AI engineering, with a strong interest in large-scale system design, maintainability, and engineering effectiveness.',
    profileFacts: ['🇹🇼 Taoyuan, Taiwan ＆ 🇨🇳 Yuhang, Hangzhou'],
    homeSkillsTitle: 'Tools I Use',
    homeServicesTitle: 'What I Am Focused On',
    homeServicesDescription:
      'My current focus is balancing school and internships while continuing to learn AI Agent technologies and contributing to open-source communities.',
    homeServicesCardTitle: 'Let’s Work Together',
    homeServicesCardDescription:
      'I am open to collaborations and development work. Feel free to reach out by email and let’s see how we can work together.',
    aboutPageDescription:
      'An overview of who I am, my resume, experience, and education.',
    contactPageDescription:
      'Ways to reach me, booking links, and a direct contact form.',
    bookCallTitle: 'Book a Feishu Meeting',
    bookCallDescription:
      'If you want to collaborate, talk about engineering, or discuss a project, you can book time with me through Feishu Meetings.',
    bookCallDuration: 'UTC+8 Daily 14:00 - 21:00',
    bookCallTool: 'Feishu Meetings',
    contactResponseTime: 'within half a day',
    navGroupLabels: {
      apps: 'Apps',
      theme: 'Theme',
      language: 'Language',
    },
  },
  nav: {
    home: 'Home',
    dashboard: 'Dashboard',
    projects: 'Projects',
    blog: 'Blog',
    learn: 'Learn',
    about: 'About',
    contact: 'Contact',
    guestbook: 'Guestbook',
    playground: 'JS Playground',
    email: 'Email',
    github: 'GitHub',
  },
  pages: {
    aboutTitle: 'About',
    contactTitle: 'Contact',
    blogTitle: 'Blog',
    dashboardTitle: 'Dashboard',
    guestbookTitle: 'Guestbook',
    guestbookDescription: 'Leave a note, say hi, or share feedback here.',
    learnTitle: 'Learning Notes',
    learnDescription:
      'A collection of learning materials, notes, and topics I keep refining.',
    projectsTitle: 'Projects',
    projectsDescription:
      'A curated list of projects, experiments, and longer-running work.',
    playgroundTitle: 'JavaScript Playground',
    notFoundDescription:
      'This page does not exist or has already been removed.',
  },
  common: {
    loading: 'Loading',
    loadingEllipsis: 'Loading...',
    noData: 'No data',
    back: 'Back',
    searchArticles: 'Search articles',
    viewDetails: 'View details',
    hideDetails: 'Hide details',
    present: 'Present',
  },
  locale: {
    switcherAriaLabel: 'Switch language',
    options: {
      'zh-TW': { label: '🇹🇼 繁體中文', shortLabel: '繁中' },
      'zh-CN': { label: '🇨🇳 简体中文', shortLabel: '简中' },
      en: { label: '🇺🇸 English', shortLabel: 'EN' },
    },
  },
  theme: {
    toggleLabel: 'Toggle theme',
    light: 'Light mode',
    dark: 'Dark mode',
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
  },
  home: {
    contactButton: 'Go to contact page',
    viewAllArticles: 'View all articles',
  },
  about: {
    tabs: {
      story: 'Story',
      resume: 'Resume',
      career: 'Experience',
      education: 'Education',
    },
    storyHtml: `
<p>Hello, and thanks for visiting my website.</p>
<p>I am BlackishGreen B.G., currently studying Software Engineering at Central China Normal University. My research and practice revolve around software engineering methods and complex system design.</p>
<p>I started from modern web technologies like React and Next.js, then gradually built a stronger engineering mindset around framework internals, data flow, module boundaries, and long-term maintainability.</p>
<p>Over the past year, I have been focusing more on AI engineering, exploring how large-model applications and agent systems can be turned into reliable, production-ready systems.</p>
<p>During school, internships, and team projects, I have continued to sharpen my engineering skills. I have worked on complex business systems at ByteDance, including Feishu and Douyin Life Services, where I gained experience in large-scale product engineering and architecture optimization.</p>
<p>I care deeply about communication, collaboration, and solving complex problems through practical engineering work.</p>
<p>Going forward, I want to keep working at the intersection of software engineering and intelligent systems, especially on how large models can power complex, evolvable software systems.</p>
`,
    education: {
      empty: 'No education entries yet.',
      items: [
        {
          school: 'Central China Normal University (CCNU)',
          major: 'Software Engineering, School of Computer Science',
          logo: '/api/logo?key=ccnu',
          location: '',
          degree: '',
          start_year: 2022,
          end_year: 2026,
          link: 'https://www.ccnu.edu.cn/',
          highlights: [
            'First Prize, Hong Kong-Macao-Taiwan Scholarship, 2024',
            'Second Prize, Hong Kong-Macao-Taiwan Scholarship, 2025',
            'Head of Network Technology, i Huada Network Culture Studio (2024.06 - 2025.09)',
          ],
        },
      ],
    },
    career: {
      empty: 'No experience entries yet.',
      items: [
        {
          position: 'Frontend Engineering Intern',
          company: 'Industrial Securities (XYZQ)',
          company_legal_name: 'FinTech Department',
          logo: '/api/logo?key=xyzq',
          location: '',
          location_type: '',
          type: 'Internship',
          start_date: '2024-07-01',
          end_date: '2024-07-31',
          industry: '',
          link: 'https://www.xyzq.com.cn/',
          responsibilities: ['Description kept as a placeholder for now.'],
        },
        {
          position: 'Frontend Engineering Intern',
          company: 'ByteDance',
          company_legal_name: 'Feishu Core Client Engineering',
          logo: 'BYTEDANCE_LOGO',
          location: '',
          location_type: '',
          type: 'Internship',
          start_date: '2024-08-01',
          end_date: '2025-10-31',
          industry: '',
          link: 'https://www.bytedance.com/zh/',
          responsibilities: ['Description kept as a placeholder for now.'],
        },
        {
          position: 'Frontend Engineering Intern',
          company: 'ByteDance',
          company_legal_name: 'Douyin Life Services, Commerce Team',
          logo: 'BYTEDANCE_LOGO',
          location: '',
          location_type: '',
          type: 'Internship',
          start_date: '2025-11-01',
          end_date: '2026-01-31',
          industry: '',
          link: 'https://www.bytedance.com/zh/',
          responsibilities: ['Description kept as a placeholder for now.'],
        },
      ],
    },
    resume: {
      empty: 'No resume link is available yet.',
      view: 'View resume',
      pdfTitle: 'Resume PDF',
    },
  },
  contact: {
    socialTitle: 'Socials and Contact',
    scheduleTitle: 'Schedule a Chat',
    messageTitle: 'Or send me a direct message',
    noScheduleLink: 'No booking link is available yet.',
    averageResponseTime: 'Average response time:',
    form: {
      namePlaceholder: 'Name*',
      emailPlaceholder: 'Email*',
      messagePlaceholder: 'Message*',
      send: 'Send message',
      sending: 'Sending...',
      success: 'Message sent!',
      failed: 'Failed to send the message. Please try again later.',
      invalid: 'Please complete the required fields first.',
      required: {
        name: 'Name is required',
        email: 'Email is required',
        message: 'Message is required',
      },
    },
  },
  blog: {
    latestArticles: 'Latest articles',
    featuredArticle: 'Featured article',
    previousFeatured: 'Previous featured article',
    nextFeatured: 'Next featured article',
    searchKeyword: 'Search keyword:',
    loadingFailed: 'Failed to load articles',
    noMatchingPosts: 'No articles match the current filters.',
    tags: 'Tags',
    publishedAt: 'Published on',
    updatedAt: 'Updated on',
    readingTime: 'Reading time',
    minutesRead: 'min read',
  },
  dashboard: {
    pageDescription:
      'A snapshot of coding activity, GitHub contributions, and a few personal stats.',
    weeklyStats: 'Weekly stats',
    weeklyStatsDescription: 'Coding activity over the last 7 days.',
    source: 'Source:',
    lastUpdated: 'Last updated:',
    wakatimeUnavailable: 'WakaTime stats are temporarily unavailable.',
    wakatimeNotConfigured:
      'WakaTime API credentials are not configured yet, so coding stats cannot be shown.',
    githubContributions: 'GitHub contributions',
    githubDescription:
      'A summary of my GitHub contribution activity over the past year.',
    githubUnavailable: 'GitHub contribution data is temporarily unavailable.',
    githubNotConfigured:
      'A GitHub read token is not configured yet, so the contribution heatmap cannot be shown.',
  },
  guestbook: {
    widgetTitle: 'Guestbook',
    pageAuthPrompt:
      'Please sign in before leaving a message. Your profile is only used to identify your posts.',
    widgetUnavailable: 'The guestbook widget is not configured yet.',
    pageUnavailable:
      'Firebase is not configured for the guestbook yet, so the page is not available.',
    inputPlaceholder: 'Write a message...',
    signInWithGoogle: 'Continue with Google',
    signInWithGithub: 'Continue with GitHub',
    checkingAuth: 'Checking sign-in status...',
    authNotConfigured: 'Firebase Auth is not configured yet.',
    loggedInAs: 'Signed in as',
    signOut: 'Sign out',
    authorBadge: 'Owner',
    authErrors: {
      operationNotAllowed:
        'This sign-in provider is not enabled in Firebase Console.',
      configurationNotFound:
        'Firebase Auth is not fully configured for this provider yet.',
      unauthorizedDomain:
        'The current domain is not listed as an authorized Firebase Auth domain.',
      popupBlocked:
        'The sign-in popup was blocked by your browser. Please allow popups and try again.',
      popupClosed: 'The sign-in flow was canceled.',
      accountExistsWithDifferentCredential:
        'This email is still treated as a single-provider account in Firebase. Please verify the Console settings are saved and active.',
      fallback: 'Sign-in failed. Please try again later.',
      fallbackWithCode: 'Sign-in failed: {{code}}',
    },
  },
  commandPalette: {
    placeholders: [
      'Search or ask anything...',
      'Press Cmd + K to open the command palette anytime',
    ],
    groups: {
      pages: 'Pages',
      socials: 'Socials',
      externalLinks: 'External links',
      appearance: 'Appearance',
    },
    currentPage: 'You are here',
    noResultIntro: 'No result found for',
    noResultOutro: 'on this website.',
    askAiAssistant: 'Ask AI assistant',
    findInGoogle: 'Search on Google',
    closeWindowHint: 'Press `ESC` to close this window',
    aiProcessing: 'AI is processing...',
    aiFallback: {
      title: 'Oops, the AI seems to be lost.',
      body: 'Looks like it wandered off into the land of confusion. Please try again a bit later.',
      retry: 'Please try again later.',
    },
  },
  projects: {
    featured: 'Featured',
    viewProject: 'View project',
    noData: 'No data',
  },
  learn: {
    empty: 'No learning notes are available yet.',
    newLabel: 'New',
    viewLessons: 'View lessons',
    lessonSingular: 'Lesson',
    lessonPlural: 'Lessons',
  },
};

export default enMessages;
