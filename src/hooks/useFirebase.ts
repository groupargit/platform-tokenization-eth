import { useState, useEffect } from 'react';
import { ref, onValue, off, get, set, update, push } from 'firebase/database';

export const USERS_PATH = 'users';
import { database, isFirebaseConfigured } from '@/lib/firebase';

export interface FirebaseApartment {
  apartmentId: string;
  apartmentNumber?: string;
  name: string;
  concept: string;
  description: string;
  colorCode: string[];
  price: number | string;
  type: 'private' | 'commercial';
  available: boolean;
  buildingId: string;
  features: string[];
  images: string[];
  automationRoutines?: {
    enabled: boolean;
    routineId: string;
  }[];
  contractDetails?: {
    monthlyRent: number;
    startDate: string;
    endDate: string;
    paymentMethod: string;
    dayPastDue: number;
  };
}

export interface FirebaseBuilding {
  buildingId: string;
  buildingName: string;
  address: string;
  totalPoints: number;
  totalBadges: string[];
  administrativeArea: {
    manager: string;
    contact: string;
    officeHours: string;
  };
  zones: Record<string, any>;
}

export interface FirebaseAchievement {
  achievementId: string;
  name: string;
  description: string;
  date: string;
}

export function useFirebaseApartments() {
  const [apartments, setApartments] = useState<FirebaseApartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      setLoading(false);
      return;
    }

    const apartmentsRef = ref(database, 'apartments');
    
    const unsubscribe = onValue(
      apartmentsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const apartmentsList = Object.entries(data).map(([id, apt]: [string, any]) => ({
            ...apt,
            apartmentId: apt.apartmentId || id,
          }));
          setApartments(apartmentsList);
        } else {
          setApartments([]);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      off(apartmentsRef);
    };
  }, []);

  return { apartments, loading, error, isConfigured: isFirebaseConfigured };
}

export function useFirebaseBuilding(buildingId: string = 'B001') {
  const [building, setBuilding] = useState<FirebaseBuilding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      setLoading(false);
      return;
    }

    const buildingRef = ref(database, `buildings/${buildingId}`);
    
    const unsubscribe = onValue(
      buildingRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setBuilding(snapshot.val());
        } else {
          setBuilding(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      off(buildingRef);
    };
  }, [buildingId]);

  return { building, loading, error, isConfigured: isFirebaseConfigured };
}

export function useFirebaseAchievements() {
  const [achievements, setAchievements] = useState<FirebaseAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      setLoading(false);
      return;
    }

    const achievementsRef = ref(database, 'achievements/global');
    
    const unsubscribe = onValue(
      achievementsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const achievementsList = Object.values(data) as FirebaseAchievement[];
          setAchievements(achievementsList);
        } else {
          setAchievements([]);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      off(achievementsRef);
    };
  }, []);

  return { achievements, loading, error, isConfigured: isFirebaseConfigured };
}

export function useFirebaseZone(buildingId: string, zoneId: string) {
  const [zone, setZone] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!zoneId) {
      setLoading(false);
      return;
    }

    // If Firebase is not configured, return empty data without error
    if (!isFirebaseConfigured || !database) {
      setLoading(false);
      return;
    }
    
    const zoneRef = ref(database, `buildings/${buildingId}/zones/${zoneId}`);
    
    const unsubscribe = onValue(
      zoneRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setZone(snapshot.val());
        } else {
          setZone(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      off(zoneRef);
    };
  }, [buildingId, zoneId]);

  return { zone, loading, error, isConfigured: isFirebaseConfigured };
}

export interface FirebaseDevice {
  deviceId: string;
  deviceName?: string;
  name?: string;
  type?: string;
  status?: string;
  [key: string]: any;
}

export interface FirebaseUser {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  documentId?: string;
  role: string;
  state: string;
  buildingId: string;
  primaryApartment?: string;
  createdAt?: string;
  lastLogin?: string;
  gamification: {
    level: number;
    points: number;
    nextLevel: {
      level: number;
      points: number;
    };
    progress?: number;
  };
  notifications?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  cybersecurity?: {
    lastPasswordChange: string;
    twoFactorAuthEnabled: boolean;
  };
  apartments?: Record<string, {
    apartmentId: string;
    accessLevel: string;
    role: string;
  }>;
  devices?: Record<string, FirebaseDevice>;
  waitlistApplication?: {
    revisionId: string;
    status: "pending" | "reviewing" | "documents_required" | "approved" | "rejected";
    appliedAt: string;
  };
  circleWalletId?: string;
}

export function useFirebaseUser(userId?: string | null) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // If Firebase is not configured, return empty data without error
    if (!isFirebaseConfigured || !database) {
      setLoading(false);
      return;
    }

    const userRef = ref(database, `users/${userId}`);
    
    const unsubscribe = onValue(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setUser(snapshot.val());
        } else {
          setUser(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      off(userRef);
    };
  }, [userId]);

  return { user, loading, error, isConfigured: isFirebaseConfigured };
}

export async function updateUserCircleWalletId(userId: string, walletId: string): Promise<void> {
  if (!isFirebaseConfigured || !database) {
    const msg = 'Firebase no configurado (isConfigured=' + isFirebaseConfigured + ', database=' + !!database + ')';
    console.error('[Firebase] updateUserCircleWalletId:', msg);
    throw new Error(msg);
  }
  const path = `${USERS_PATH}/${userId}`;
  const userRef = ref(database, path);
  console.log('[Firebase] Escribiendo circleWalletId', { path, walletId });
  await update(userRef, { circleWalletId: walletId });
  console.log('[Firebase] circleWalletId guardado en', path);
}

export async function setCircleWalletSetIdInConfig(walletSetId: string): Promise<void> {
  if (!isFirebaseConfigured || !database) {
    throw new Error('Firebase no configurado');
  }
  const configRef = ref(database, 'config/circleWalletSetId');
  await set(configRef, walletSetId.trim());
}

export interface FirebaseCommunityPost {
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  apartmentId: string;
  apartmentName: string;
  content: string;
  type: string;
  icon: string;
  timestamp: number;
  likesCount: number;
  commentsCount: number;
  likes?: Record<string, boolean>;
  status: string;
  moderationStatus: string;
  needsModeration?: boolean;
}

export interface FirebaseCommunityStats {
  activeUsers: number;
  communityScore: number;
  lastUpdated: number;
  totalComments: number;
  totalLikes: number;
  totalPosts: number;
}

export interface FirebaseActiveUser {
  userId: string;
  apartmentId: string;
  apartmentName: string;
  lastSeen: number;
  status: string;
}

export function useFirebaseCommunityPosts(buildingId: string = 'B001') {
  const [posts, setPosts] = useState<FirebaseCommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      setLoading(false);
      return;
    }

    const postsRef = ref(database, `community/${buildingId}/posts`);
    
    const unsubscribe = onValue(
      postsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const postsList = Object.entries(data)
            .map(([id, post]: [string, any]) => ({
              ...post,
              postId: post.postId || id,
            }))
            .filter((post: FirebaseCommunityPost) => 
              post.status === 'active' && 
              post.moderationStatus === 'approved'
            )
            .sort((a: FirebaseCommunityPost, b: FirebaseCommunityPost) => 
              b.timestamp - a.timestamp
            );
          setPosts(postsList);
        } else {
          setPosts([]);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      off(postsRef);
    };
  }, [buildingId]);

  return { posts, loading, error, isConfigured: isFirebaseConfigured };
}

export function useFirebaseCommunityStats(buildingId: string = 'B001') {
  const [stats, setStats] = useState<FirebaseCommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      setLoading(false);
      return;
    }

    const statsRef = ref(database, `community/${buildingId}/stats`);
    
    const unsubscribe = onValue(
      statsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setStats(snapshot.val());
        } else {
          setStats(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      off(statsRef);
    };
  }, [buildingId]);

  return { stats, loading, error, isConfigured: isFirebaseConfigured };
}

export function useFirebaseActiveUsers(buildingId: string = 'B001') {
  const [activeUsers, setActiveUsers] = useState<FirebaseActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured || !database) {
      setLoading(false);
      return;
    }

    const activeUsersRef = ref(database, `community/${buildingId}/activeUsers`);
    
    const unsubscribe = onValue(
      activeUsersRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const now = Date.now();
          const ACTIVE_THRESHOLD = 5 * 60 * 1000; 
          
          const usersList = Object.values(data)
            .filter((user: any) => {
              if (!user || !user.userId) return false;
              
              let lastSeen = 0;
              if (typeof user.lastSeen === 'number') {
                lastSeen = user.lastSeen;
              } else if (typeof user.lastSeen === 'string') {
                lastSeen = parseInt(user.lastSeen, 10) || 0;
              }
              
              const isOnline = user.status === 'online';
              const isRecent = lastSeen > 0 && (now - lastSeen) < ACTIVE_THRESHOLD;
              const isActive = isOnline && isRecent;
              
              return isActive;
            }) as FirebaseActiveUser[];
          
          setActiveUsers(usersList);
        } else {
          setActiveUsers([]);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      off(activeUsersRef);
    };
  }, [buildingId]);

  return { activeUsers, loading, error, isConfigured: isFirebaseConfigured };
}

export async function updateUserActiveStatus(
  buildingId: string,
  userId: string,
  apartmentId: string,
  apartmentName: string,
  isActive: boolean = true
): Promise<void> {
  if (!isFirebaseConfigured || !database || !userId) {
    return;
  }

  try {
    const activeUserRef = ref(database, `community/${buildingId}/activeUsers/${userId}`);
    
    if (isActive) {
      await set(activeUserRef, {
        userId,
        apartmentId,
        apartmentName,
        lastSeen: Date.now(),
        status: 'online',
      });
    } else {
      await set(activeUserRef, null);
    }
  } catch (error) {
    console.error('Error updating user active status:', error);
  }
}

export function getUserIdFromEmail(email?: string | null): string | null {
  if (!email) return null;
  const username = email.split('@')[0];
  return username ? username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : null;
}

function getColombiaDateTime(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const second = parts.find(p => p.type === 'second')?.value;
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
  
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${milliseconds}-05:00`;
}

export async function syncUserToFirebase(
  authUser: { email?: string | null; name?: string | null; picture?: string | null }
): Promise<void> {
  if (!authUser.email) return;
  
  const userId = getUserIdFromEmail(authUser.email);
  if (!userId) return;

  if (!isFirebaseConfigured || !database) {
    console.warn('Firebase not configured, skipping user sync');
    return;
  }

  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    const now = getColombiaDateTime();
    const userData = {
      userId,
      email: authUser.email,
      name: authUser.name || authUser.email.split('@')[0],
    };

    if (snapshot.exists()) {
      await update(userRef, {
        lastLogin: now,
      });
    } else {
      await set(userRef, {
        ...userData,
        role: 'resident',
        state: 'inactive',
        buildingId: 'B001',
        createdAt: now,
        lastLogin: now,
        gamification: {
          level: 1,
          points: 0,
          nextLevel: {
            level: 2,
            points: 500,
          },
          progress: 0,
        },
        notifications: {
          email: true,
          push: false,
          sms: false,
        },
        cybersecurity: {
          lastPasswordChange: now,
          twoFactorAuthEnabled: false,
        },
        canAccessCommonAreas: false,
        canAccessOtherApartment: false,
      });
    }
  } catch (error) {
    console.error('Error syncing user to Firebase:', error);
  }
}

export async function createCommunityPost(
  buildingId: string,
  postData: {
    userId: string;
    userName: string;
    userAvatar?: string;
    apartmentId: string;
    apartmentName: string;
    content: string;
    icon?: string;
    type?: string;
  }
): Promise<string | null> {
  if (!isFirebaseConfigured || !database) {
    console.warn('Firebase not configured, cannot create post');
    return null;
  }

  try {
    const timestamp = Date.now();
    const postId = `post_${timestamp}`;
    
    const newPost: FirebaseCommunityPost = {
      postId,
      userId: postData.userId,
      userName: postData.userName,
      userAvatar: postData.userAvatar || '👤',
      apartmentId: postData.apartmentId,
      apartmentName: postData.apartmentName,
      content: postData.content,
      icon: postData.icon || '💬',
      type: postData.type || 'post',
      timestamp,
      likesCount: 0,
      commentsCount: 0,
      likes: {},
      status: 'active',
      moderationStatus: 'pending',
      needsModeration: true,
    };

    const postRef = ref(database, `community/${buildingId}/posts/${postId}`);
    await set(postRef, newPost);

    return postId;
  } catch (error) {
    console.error('Error creating community post:', error);
    throw error;
  }
}
