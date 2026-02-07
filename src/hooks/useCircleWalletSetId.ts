import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { circleService } from '@/services/circleService';
import { setCircleWalletSetIdInConfig } from '@/hooks/useFirebase';
import { useFirebaseCircleWalletSetIdConfig, CACHE_KEYS } from '@/hooks/useFirebaseWithCache';

export function useCircleWalletSetId() {
  const queryClient = useQueryClient();
  const envRaw = import.meta.env.VITE_CIRCLE_WALLET_SET_ID;
  const fromEnv = typeof envRaw === 'string' ? envRaw.trim() : '';
  const { walletSetId: fromFirebase, loading: loadingFirebase, isConfigured: firebaseConfigured } = useFirebaseCircleWalletSetIdConfig();

  const walletSetId = fromEnv || fromFirebase || null;
  const loading = !fromEnv && loadingFirebase;
  const fromEnvOnly = !!fromEnv;

  const createWalletSetAndSave = useCallback(async (name: string = 'Casa Color'): Promise<string> => {
    if (!circleService.isConfigured()) {
      throw new Error('Circle no está configurado. Configura CIRCLE_API_KEY en .env.');
    }
    if (!firebaseConfigured) {
      throw new Error('Firebase no está configurado. No se puede guardar el Wallet Set ID.');
    }
    const res = await circleService.createWalletSet(name);
    const id = res.data.walletSet.id;
    await setCircleWalletSetIdInConfig(id);
    queryClient.setQueryData(CACHE_KEYS.circleWalletSetId, id);
    return id;
  }, [queryClient, firebaseConfigured]);

  return {
    walletSetId,
    loading,
    fromEnvOnly,
    createWalletSetAndSave: fromEnv ? undefined : createWalletSetAndSave,
  };
}
