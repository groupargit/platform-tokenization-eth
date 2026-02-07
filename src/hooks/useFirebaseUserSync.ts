import { useState, useEffect, useCallback } from 'react';
import { ref, get, set, update } from 'firebase/database';
import { database, isFirebaseConfigured } from '@/lib/firebase';
import { User as Auth0User } from '@auth0/auth0-react';

export interface FirebaseUserData {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  documentId?: string;
  role: string;
  state: string;
  buildingId: string;
  primaryApartment?: string;
  canAccessCommonAreas: boolean;
  canAccessOtherApartment: boolean;
  apartments?: Record<string, {
    apartmentId: string;
    accessLevel: string;
    role: string;
  }>;
  devices?: Record<string, any>;
  gamification: {
    level: number;
    points: number;
    progress: number;
    nextLevel: {
      level: number;
      points: number;
    };
  };
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  cybersecurity: {
    lastPasswordChange: string;
    twoFactorAuthEnabled: boolean;
  };
  circleWalletId?: string;
  createdAt?: string;
  lastLogin?: string;
}

export function generateUserId(email: string): string {
  const username = email.split('@')[0];
  return username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function createMinimalUserData(auth0User: Auth0User): FirebaseUserData {
  const email = auth0User.email || '';
  const userId = generateUserId(email);
  const now = new Date().toISOString();

  return {
    userId,
    name: auth0User.name || auth0User.nickname || email.split('@')[0],
    email,
    role: 'pending', // User without assigned apartment
    state: 'active',
    buildingId: 'B001', // Default building
    canAccessCommonAreas: false, // No access until apartment is assigned
    canAccessOtherApartment: false,
    gamification: {
      level: 1,
      points: 0,
      progress: 0,
      nextLevel: {
        level: 2,
        points: 500,
      },
    },
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
    cybersecurity: {
      lastPasswordChange: now,
      twoFactorAuthEnabled: false,
    },
    createdAt: now,
    lastLogin: now,
  };
}

export function useFirebaseUserSync(auth0User: Auth0User | undefined, isAuthenticated: boolean) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  const syncUser = useCallback(async () => {
    if (!isAuthenticated || !auth0User?.email) {
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured || !database) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userId = generateUserId(auth0User.email);
      const userRef = ref(database, `users/${userId}`);
      const now = new Date().toISOString();
      
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const existingUserData = snapshot.val() as FirebaseUserData;
        
        const lastLoginTime = existingUserData.lastLogin ? new Date(existingUserData.lastLogin).getTime() : 0;
        const nowTime = new Date(now).getTime();
        const timeSinceLastLogin = nowTime - lastLoginTime;
        const oneMinute = 60 * 1000;
        
        if (timeSinceLastLogin > oneMinute) {
          await update(userRef, {
            lastLogin: now,
          });
          
          setFirebaseUser({
            ...existingUserData,
            lastLogin: now,
          });
        } else {
          setFirebaseUser(existingUserData);
        }
        setIsNewUser(false);
      } else {
        const newUserData = createMinimalUserData(auth0User);
        await set(userRef, newUserData);
        setFirebaseUser(newUserData);
        setIsNewUser(true);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error syncing user with Firebase:', err);
      setError(err instanceof Error ? err : new Error('Failed to sync user'));
    } finally {
      setLoading(false);
    }
  }, [auth0User, isAuthenticated]);

  useEffect(() => {
    syncUser();
  }, [syncUser]);

  return {
    firebaseUser,
    loading,
    error,
    isNewUser,
    isConfigured: isFirebaseConfigured,
    refetch: syncUser,
  };
}
