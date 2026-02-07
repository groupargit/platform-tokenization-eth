import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { ref, onValue, off, get } from 'firebase/database';
import { database, isFirebaseConfigured } from '@/lib/firebase';
import type { 
  FirebaseApartment, 
  FirebaseBuilding, 
  FirebaseUser,
  FirebaseCommunityPost,
  FirebaseCommunityStats
} from './useFirebase';

export const CACHE_KEYS = {
  apartments: ['firebase', 'apartments'],
  building: (id: string) => ['firebase', 'building', id],
  user: (id: string) => ['firebase', 'user', id],
  communityPosts: (buildingId: string) => ['firebase', 'community', 'posts', buildingId],
  communityStats: (buildingId: string) => ['firebase', 'community', 'stats', buildingId],
  circleWalletSetId: ['firebase', 'config', 'circleWalletSetId'],
} as const;

const activeSubscriptions = new Map<string, boolean>();

export function useFirebaseApartmentsCached() {
  const queryClient = useQueryClient();
  const subscriptionKey = 'apartments';
  
  useEffect(() => {
    if (!isFirebaseConfigured || !database) return;
    if (activeSubscriptions.get(subscriptionKey)) return;
    
    activeSubscriptions.set(subscriptionKey, true);
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
          queryClient.setQueryData(CACHE_KEYS.apartments, apartmentsList);
        } else {
          queryClient.setQueryData(CACHE_KEYS.apartments, []);
        }
      }
    );

    return () => {
      activeSubscriptions.delete(subscriptionKey);
      off(apartmentsRef);
    };
  }, [queryClient]);

  const query = useQuery({
    queryKey: CACHE_KEYS.apartments,
    queryFn: () => [] as FirebaseApartment[],
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    apartments: query.data || [],
    loading: !query.data && query.isLoading,
    error: query.error as Error | null,
    isConfigured: isFirebaseConfigured,
  };
}

export function useFirebaseBuildingCached(buildingId: string = 'B001') {
  const queryClient = useQueryClient();
  const subscriptionKey = `building-${buildingId}`;
  
  useEffect(() => {
    if (!isFirebaseConfigured || !database) return;
    if (activeSubscriptions.get(subscriptionKey)) return;
    
    activeSubscriptions.set(subscriptionKey, true);
    const buildingRef = ref(database, `buildings/${buildingId}`);
    
    const unsubscribe = onValue(
      buildingRef,
      (snapshot) => {
        if (snapshot.exists()) {
          queryClient.setQueryData(CACHE_KEYS.building(buildingId), snapshot.val());
        } else {
          queryClient.setQueryData(CACHE_KEYS.building(buildingId), null);
        }
      }
    );

    return () => {
      activeSubscriptions.delete(subscriptionKey);
      off(buildingRef);
    };
  }, [buildingId, queryClient]);

  const query = useQuery({
    queryKey: CACHE_KEYS.building(buildingId),
    queryFn: () => null as FirebaseBuilding | null,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    building: query.data || null,
    loading: query.data === undefined && query.isLoading,
    error: query.error as Error | null,
    isConfigured: isFirebaseConfigured,
  };
}

export function useFirebaseUserCached(userId?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    if (!isFirebaseConfigured || !database) {
      queryClient.setQueryData(CACHE_KEYS.user(userId), null);
      return;
    }

    const userRef = ref(database, `users/${userId}`);
    let cancelled = false;

    get(userRef).then(
      (snapshot) => {
        if (cancelled) return;
        const data = snapshot.exists() ? snapshot.val() : null;
        queryClient.setQueryData(CACHE_KEYS.user(userId), data);
      },
      (err) => {
        if (cancelled) return;
        console.error('[useFirebaseUserCached] get', err);
        queryClient.setQueryData(CACHE_KEYS.user(userId), null);
      }
    );

    const unsubscribe = onValue(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          queryClient.setQueryData(CACHE_KEYS.user(userId), snapshot.val());
        } else {
          queryClient.setQueryData(CACHE_KEYS.user(userId), null);
        }
      },
      (err) => {
        console.error('[useFirebaseUserCached] onValue', err);
        queryClient.setQueryData(CACHE_KEYS.user(userId), null);
      }
    );

    return () => {
      cancelled = true;
      off(userRef);
    };
  }, [userId, queryClient]);

  const query = useQuery({
    queryKey: CACHE_KEYS.user(userId || ''),
    queryFn: () => null as FirebaseUser | null,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: false,
  });

  const hasReceivedData = query.data !== undefined;
  const loading = !!userId && !hasReceivedData;

  return {
    user: query.data ?? null,
    loading,
    error: query.error as Error | null,
    isConfigured: isFirebaseConfigured,
  };
}

export function useFirebaseCircleWalletSetIdConfig() {
  const queryClient = useQueryClient();
  const subscriptionKey = 'config-circleWalletSetId';

  useEffect(() => {
    if (!isFirebaseConfigured || !database) return;
    if (activeSubscriptions.get(subscriptionKey)) return;
    activeSubscriptions.set(subscriptionKey, true);
    const configRef = ref(database, 'config/circleWalletSetId');
    get(configRef).then(
      (snapshot) => {
        const val = snapshot.exists() ? snapshot.val() : null;
        queryClient.setQueryData(CACHE_KEYS.circleWalletSetId, typeof val === 'string' ? val : null);
      },
      () => {
        queryClient.setQueryData(CACHE_KEYS.circleWalletSetId, null);
      }
    );
    const unsubscribe = onValue(configRef, (snapshot) => {
      const val = snapshot.exists() ? snapshot.val() : null;
      queryClient.setQueryData(CACHE_KEYS.circleWalletSetId, typeof val === 'string' ? val : null);
    });
    return () => {
      activeSubscriptions.delete(subscriptionKey);
      off(configRef);
    };
  }, [queryClient]);

  const query = useQuery({
    queryKey: CACHE_KEYS.circleWalletSetId,
    queryFn: () => null as string | null,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    walletSetId: query.data ?? null,
    loading: query.data === undefined && query.isLoading,
    isConfigured: isFirebaseConfigured,
  };
}

export function useFirebaseCommunityPostsCached(buildingId: string = 'B001') {
  const queryClient = useQueryClient();
  const subscriptionKey = `posts-${buildingId}`;
  
  useEffect(() => {
    if (!isFirebaseConfigured || !database) return;
    if (activeSubscriptions.get(subscriptionKey)) return;
    
    activeSubscriptions.set(subscriptionKey, true);
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
          queryClient.setQueryData(CACHE_KEYS.communityPosts(buildingId), postsList);
        } else {
          queryClient.setQueryData(CACHE_KEYS.communityPosts(buildingId), []);
        }
      }
    );

    return () => {
      activeSubscriptions.delete(subscriptionKey);
      off(postsRef);
    };
  }, [buildingId, queryClient]);

  const query = useQuery({
    queryKey: CACHE_KEYS.communityPosts(buildingId),
    queryFn: () => [] as FirebaseCommunityPost[],
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    posts: query.data || [],
    loading: !query.data && query.isLoading,
    error: query.error as Error | null,
    isConfigured: isFirebaseConfigured,
  };
}

export function useFirebaseCommunityStatsCached(buildingId: string = 'B001') {
  const queryClient = useQueryClient();
  const subscriptionKey = `stats-${buildingId}`;
  
  useEffect(() => {
    if (!isFirebaseConfigured || !database) return;
    if (activeSubscriptions.get(subscriptionKey)) return;
    
    activeSubscriptions.set(subscriptionKey, true);
    const statsRef = ref(database, `community/${buildingId}/stats`);
    
    const unsubscribe = onValue(
      statsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          queryClient.setQueryData(CACHE_KEYS.communityStats(buildingId), snapshot.val());
        } else {
          queryClient.setQueryData(CACHE_KEYS.communityStats(buildingId), null);
        }
      }
    );

    return () => {
      activeSubscriptions.delete(subscriptionKey);
      off(statsRef);
    };
  }, [buildingId, queryClient]);

  const query = useQuery({
    queryKey: CACHE_KEYS.communityStats(buildingId),
    queryFn: () => null as FirebaseCommunityStats | null,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    stats: query.data || null,
    loading: query.data === undefined && query.isLoading,
    error: query.error as Error | null,
    isConfigured: isFirebaseConfigured,
  };
}

export function useInvalidateFirebaseCache() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['firebase'] });
  }, [queryClient]);
}

export function clearUserDataOnLogout(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.removeQueries({ queryKey: ['firebase'] });
  queryClient.removeQueries({ queryKey: ['circle-wallets'] });
  queryClient.removeQueries({ queryKey: ['circle-balance'] });
  queryClient.removeQueries({ queryKey: ['circle-transactions'] });
}
