export interface TranslationKeys {
  common: {
    loading: string;
    error: string;
    success: string;
    save: string;
    cancel: string;
    confirm: string;
    delete: string;
    edit: string;
    back: string;
    next: string;
    close: string;
    search: string;
    filter: string;
    refresh: string;
    viewAll: string;
    noData: string;
    yes: string;
    no: string;
    or: string;
    and: string;
    dateNotAvailable: string;
    backToHome: string;
    actionSuccessDesc: string;
  };

  nav: {
    home: string;
    dashboard: string;
    community: string;
    devices: string;
    wallet: string;
    profile: string;
    settings: string;
    logout: string;
    login: string;
  };

  auth: {
    login: string;
    logout: string;
    signUp: string;
    email: string;
    password: string;
    forgotPassword: string;
    noAccount: string;
    hasAccount: string;
    accessRequired: string;
    loginToManage: string;
    welcomeTitle: string;
    welcomeDesc: string;
    logoutSuccessTitle: string;
    logoutSuccessDesc: string;
    pendingSpaceTitle: string;
    pendingSpaceDesc: string;
  };

  greetings: {
    morning: string;
    afternoon: string;
    evening: string;
  };

  landing: {
    title: string;
    subtitle: string;
    getStarted: string;
    viewApartments: string;
    features: {
      title: string;
      subtitle: string;
      security: { title: string; description: string };
      iot: { title: string; description: string };
      design: { title: string; description: string };
      energy: { title: string; description: string };
    };
    footer: {
      productBy: string;
      copyright: string;
    };
  };

  home: {
    title: string;
    spaces: string;
    available: string;
    points: string;
    myPoints: string;
    totalPoints: string;
    level: string;
    myLevel: string;
    badges: string;
    refresh: string;
    yourSpaces: string;
    yourSpace: string;
    collapse: string;
    configPending: string;
    someFeatureDisabled: string;
    connectionError: string;
    assignedSpaces: string;
    availableSpaces: string;
    exploreSpaces: string;
    noSpaces: string;
    noSpacesDesc: string;
    waitlistBanner: {
      title: string;
      description: string;
      cta: string;
    };
    waitlistPending: {
      title: string;
      description: string;
      status: string;
    };
  };

  devices: {
    title: string;
    subtitle: string;
    connectedHome: string;
    total: string;
    active: string;
    controllable: string;
    controllers: string;
    esp32Online: string;
    quickAccess: string;
    quickAccessSubtitle: string;
    controlEntries: string;
    mySpace: string;
    commonAreas: string;
    noDevices: string;
    noDevicesDesc: string;
    goToDashboard: string;
    noAssignedSpace: string;
    noAccessConfigured: string;
    needAssignedSpace: string;
    mainEntrance: string;
    doorOpened: string;
    doorOpenedDesc: string;
    doorClosed: string;
    doorClosedDesc: string;
    connectionError: string;
    connectionErrorDesc: string;
    tapToManage: string;
    categories: {
      lighting: string;
      security: string;
      climate: string;
      water: string;
      sensors: string;
      other: string;
    };
    status: {
      active: string;
      inactive: string;
      online: string;
      offline: string;
      open: string;
      closed: string;
      opening: string;
      closing: string;
    };
    actions: {
      activate: string;
      deactivate: string;
      readOnly: string;
      open: string;
      close: string;
    };
    esp32Tooltip: string;
    accessControl: string;
    yaleLock: string;
    connecting: string;
    accessGranted: string;
    securityActivated: string;
    securityMode: string;
    securityEnabled: string;
    securityDisabled: string;
    lockLabel: string;
    locked: string;
    unlocked: string;
    securityProtected: string;
    accessControllers: string;
    connected: string;
    disconnected: string;
    commonAreasEmptyDesc: string;
    lockedSafe: string;
    openShort: string;
    reconnecting: string;
    parking: string;
    gateOpen: string;
    gateClosed: string;
    parkingActivated: string;
    secure: string;
    quickActions: string;
    iotDevices: string;
    onLabel: string;
    offLabel: string;
  };

  community: {
    title: string;
    subtitle: string;
    activeUsers: string;
    newPost: string;
    noPosts: string;
    beFirst: string;
    createPost: {
      title: string;
      description: string;
      icon: string;
      content: string;
      placeholder: string;
      publish: string;
      publishing: string;
    };
    errors: {
      emptyContent: string;
      userInfo: string;
      createFailed: string;
    };
    success: {
      created: string;
      createdDesc: string;
    };
  };

  profile: {
    title: string;
    personalInfo: string;
    name: string;
    email: string;
    phone: string;
    document: string;
    notRegistered: string;
    status: {
      active: string;
      inactive: string;
    };
    roles: {
      owner: string;
      resident: string;
      user: string;
    };
    apartment: {
      title: string;
      monthlyRent: string;
      paymentMethod: string;
      startDate: string;
      endDate: string;
    };
    devices: {
      title: string;
      count: string;
      activeInAccount: string;
      manage: string;
    };
    notifications: {
      title: string;
      email: string;
      emailDesc: string;
      push: string;
      pushDesc: string;
      sms: string;
      smsDesc: string;
    };
    security: {
      title: string;
      twoFactor: string;
      twoFactorDesc: string;
      lastPasswordChange: string;
    };
    gamification: {
      level: string;
      points: string;
      pointsToNext: string;
    };
  };

  wallet: {
    title: string;
    subtitle: string;
    balance: string;
    equivalent: string;
    protected: string;
    exchangeRate: string;
    walletId: string;
    walletIdTooltip: string;
    addressPending: string;
    actions: {
      send: string;
      receive: string;
      refresh: string;
    };
    sustainability: {
      title: string;
      score: string;
    };
    achievements: {
      title: string;
      unlocked: string;
      locked: string;
    };
    activity: {
      title: string;
      noActivity: string;
      viewMore: string;
    };
    legal: {
      title: string;
      entity: string;
      entityDesc: string;
      dataProtection: string;
      dataProtectionDesc: string;
      transparency: string;
      transparencyDesc: string;
    };
    status: {
      active: string;
      configuring: string;
      testMode: string;
    };
    transactions: {
      received: string;
      sent: string;
      benefitReceived: string;
      redeemed: string;
      authorization: string;
      movement: string;
      confirmed: string;
      pending: string;
      failed: string;
    };
  };

  waitlist: {
    title: string;
    form: {
      name: string;
      email: string;
      phone: string;
      message: string;
      submit: string;
      submitting: string;
    };
    status: {
      pending: { title: string; description: string };
      reviewing: { title: string; description: string };
      documentsRequired: { title: string; description: string };
      approved: { title: string; description: string };
      rejected: { title: string; description: string };
    };
    progress: string;
    applicationDate: string;
    applicationId: string;
    uploadDocuments: string;
    documentsNeeded: string;
    documentsNeededDesc: string;
    newHomeAwaits: string;
    newHomeAwaitsDesc: string;
    questions: string;
    call: string;
    write: string;
  };

  language: {
    title: string;
    spanish: string;
    english: string;
    auto: string;
  };

  errors: {
    generic: string;
    networkError: string;
    tryAgain: string;
    notFound: string;
    notFoundPage: string;
    unauthorized: string;
    forbidden: string;
    actionFailed: string;
    configError: string;
    configErrorDesc: string;
    connectionError: string;
  };

  time: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
  };
}

export type Language = 'es' | 'en';
