import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  circleService,
  type CircleWallet,
  type CircleBalance,
  type CircleTransaction,
} from '@/services/circleService';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { getAutoCreateAttemptedKey } from './walletSessionStorage';

export { clearWalletSessionStorage } from './walletSessionStorage';

export interface WalletMetadataUser {
  name?: string;
  refId?: string;
}

interface UseCircleWalletOptions {
  autoCreateWallet?: boolean;
  walletSetId?: string;
  userWalletId?: string | null;
  userWalletIdLoading?: boolean;
  onSaveWalletId?: (walletId: string) => Promise<void>;
  walletMetadata?: WalletMetadataUser;
}

export function useCircleWallet(options: UseCircleWalletOptions = {}) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [currentWallet, setCurrentWallet] = useState<CircleWallet | null>(null);

  const { autoCreateWallet = false, walletSetId, userWalletId, userWalletIdLoading = false, onSaveWalletId, walletMetadata } = options;

  const onSaveWalletIdRef = useRef(onSaveWalletId);
  onSaveWalletIdRef.current = onSaveWalletId;

  const isPerUserMode = onSaveWalletId != null;
  const autoCreateAttemptedRef = useRef(false);
  const saveWalletIdGuardKeyRef = useRef<string | null>(null);
  if (walletMetadata?.refId && typeof walletMetadata.refId === 'string') {
    saveWalletIdGuardKeyRef.current = getAutoCreateAttemptedKey(walletMetadata.refId);
  } else {
    saveWalletIdGuardKeyRef.current = null;
  }

  const {
    data: singleWalletData,
    isLoading: isLoadingSingleWallet,
    error: singleWalletError,
    refetch: refetchSingleWallet,
  } = useQuery({
    queryKey: ['circle-wallets', 'single', userWalletId],
    queryFn: async () => {
      if (!userWalletId) throw new Error('userWalletId required');
      const res = await circleService.getWallet(userWalletId);
      return { data: [res.data] };
    },
    enabled: isAuthenticated && circleService.isConfigured() && !!userWalletId,
    retry: 2,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: listWalletsData,
    isLoading: isLoadingListWallets,
    error: listWalletsError,
    refetch: refetchListWallets,
  } = useQuery({
    queryKey: ['circle-wallets', walletSetId],
    queryFn: async () => circleService.listWallets({ pageSize: 50 }),
    enabled:
      isAuthenticated &&
      circleService.isConfigured() &&
      !userWalletId &&
      !isPerUserMode,
    retry: 2,
    staleTime: 1000 * 60 * 5,
  });

  const walletsData = userWalletId ? singleWalletData : listWalletsData;
  const isLoadingWallets = userWalletId ? isLoadingSingleWallet : isLoadingListWallets;
  const walletsError = userWalletId ? singleWalletError : listWalletsError;
  const refetchWallets = userWalletId ? refetchSingleWallet : refetchListWallets;

  const {
    data: balanceData,
    isLoading: isLoadingBalance,
    error: balanceError,
    refetch: refetchBalance,
  } = useQuery({
    queryKey: ['circle-balance', currentWallet?.id],
    queryFn: async () => {
      if (!currentWallet?.id) {
        throw new Error('Wallet ID is required');
      }
      return circleService.getBalance(currentWallet.id);
    },
    enabled: !!currentWallet?.id && circleService.isConfigured(),
    retry: 2,
    refetchInterval: 30000,
  });

  const {
    data: transactionsData,
    isLoading: isLoadingTransactions,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ['circle-transactions', currentWallet?.id],
    queryFn: async () => {
      if (!currentWallet?.id) {
        throw new Error('Wallet ID is required');
      }
      return circleService.listTransactions(currentWallet.id, {
        pageSize: 20,
      });
    },
    enabled: !!currentWallet?.id && circleService.isConfigured(),
    retry: 2,
    staleTime: 1000 * 60,
  });

  const createWalletMutation = useMutation({
    mutationFn: async (data?: {
      blockchains?: string[];
      walletSetId?: string;
      count?: number;
      metadata?: { name?: string; refId?: string }[];
    }) => {
      if (isPerUserMode && userWalletId) {
        throw new Error('Este usuario ya tiene una wallet. Solo se permite una wallet por usuario.');
      }
      const rawSetId = data?.walletSetId ?? walletSetId;
      const setId = typeof rawSetId === 'string' ? rawSetId.trim() : rawSetId;
      if (!setId) {
        throw new Error('walletSetId es requerido. Configura VITE_CIRCLE_WALLET_SET_ID en .env (UUID del Wallet Set en Circle Console).');
      }
      const defaultMeta = walletMetadata
        ? [{ name: walletMetadata.name, refId: walletMetadata.refId }]
        : undefined;
      const result = await circleService.createWallet({
        blockchains: data?.blockchains ?? ['MATIC-AMOY'],
        walletSetId: setId as string,
        count: data?.count ?? 1,
        metadata: data?.metadata ?? defaultMeta,
      });
      const wallets = Array.isArray(result.data) ? result.data : [result.data];
      return wallets;
    },
    onSuccess: async (newWallets) => {
      const first = newWallets[0];
      if (first) setCurrentWallet(first);
      queryClient.invalidateQueries({ queryKey: ['circle-wallets'] });
      const saveCb = onSaveWalletIdRef.current;
      if (first?.id) {
        if (saveCb) {
          try {
            console.log('[Circle Wallet] Guardando walletId en Firebase:', first.id);
            await saveCb(first.id);
            console.log('[Circle Wallet] WalletId guardado en Firebase correctamente');
          } catch (err) {
            console.error('[Circle Wallet] Error guardando wallet en Firebase:', err);
            autoCreateAttemptedRef.current = false;
            const gk = saveWalletIdGuardKeyRef.current;
            if (gk) {
              try {
                sessionStorage.removeItem(gk);
              } catch (_) {}
            }
            toast({
              title: 'Wallet creada',
              description: 'No se pudo vincular al usuario. Refresca la página.',
              variant: 'destructive',
            });
          }
        } else {
          console.warn('[Circle Wallet] No hay onSaveWalletId: no se guardará circleWalletId en Firebase');
        }
      }
      const msg =
        newWallets.length > 1
          ? `${newWallets.length} wallets creadas`
          : first?.address
            ? `Wallet ${first.address.slice(0, 6)}...${first.address.slice(-4)} creada`
            : first?.id
              ? `Wallet ${first.id.slice(0, 8)}... creada`
              : 'Wallet creada';
      toast({
        title: 'Wallet(s) creada(s)',
        description: msg,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al crear wallet',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: async (data: {
      destinationAddress: string;
      amount: string;
      tokenId?: string;
      blockchain?: string;
      feeLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    }) => {
      if (!currentWallet?.id) {
        throw new Error('No hay wallet seleccionada');
      }
      const result = await circleService.createTransfer({
        idempotencyKey: crypto.randomUUID(),
        walletId: currentWallet.id,
        destinationAddress: data.destinationAddress,
        amounts: [data.amount],
        tokenId: data.tokenId,
        blockchain: data.blockchain || 'MATIC-AMOY',
        feeLevel: data.feeLevel || 'MEDIUM',
      });
      return result.data;
    },
    onSuccess: (transaction) => {
      queryClient.invalidateQueries({ queryKey: ['circle-transactions', currentWallet?.id] });
      queryClient.invalidateQueries({ queryKey: ['circle-balance', currentWallet?.id] });
      toast({
        title: 'Transferencia iniciada',
        description: `Tu envío está siendo procesado. ID: ${transaction.id.slice(0, 8)}...`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error al enviar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createWallet = useCallback(
    async (data?: {
      blockchains?: string[];
      walletSetId?: string;
      count?: number;
      metadata?: { name?: string; refId?: string }[];
    }) => {
      if (!isAuthenticated) {
        throw new Error('User must be authenticated');
      }
      return createWalletMutation.mutateAsync(data);
    },
    [isAuthenticated, createWalletMutation]
  );

  const createTransfer = useCallback(
    async (data: {
      destinationAddress: string;
      amount: string;
      tokenId?: string;
      blockchain?: string;
      feeLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    }) => {
      return createTransferMutation.mutateAsync(data);
    },
    [createTransferMutation]
  );

  const validateAddress = useCallback(
    async (address: string, blockchain: string = 'MATIC-AMOY') => {
      return circleService.validateAddress({ address, blockchain });
    },
    []
  );

  const estimateFee = useCallback(
    async (destinationAddress: string, amount: string) => {
      if (!currentWallet?.id) {
        throw new Error('No hay wallet seleccionada');
      }
      return circleService.estimateFee({
        amounts: [amount],
        destinationAddress,
        walletId: currentWallet.id,
        blockchain: 'MATIC-AMOY',
      });
    },
    [currentWallet?.id]
  );

  const selectWallet = useCallback(
    (wallet: CircleWallet | null) => {
      setCurrentWallet(wallet);
      if (wallet) {
        queryClient.invalidateQueries({ queryKey: ['circle-balance', wallet.id] });
        queryClient.invalidateQueries({ queryKey: ['circle-transactions', wallet.id] });
      }
    },
    [queryClient]
  );

  useEffect(() => {
    if (walletsData?.data && walletsData.data.length > 0 && !currentWallet) {
      const liveWallet = walletsData.data.find((w) => w.state === 'LIVE');
      setCurrentWallet(liveWallet || walletsData.data[0]);
    }
  }, [walletsData, currentWallet]);

  // Auto-create solo cuando Firebase ya cargó y el usuario no tiene wallet (evita duplicados).
  // Requiere onSaveWalletId (para registrar en Firebase) y guard en sessionStorage para no repetir en refrescos.
  useEffect(() => {
    const validWalletSetId = typeof walletSetId === 'string' ? walletSetId.trim() : walletSetId;
    const guardKey = saveWalletIdGuardKeyRef.current;
    const alreadyAttemptedThisSession = guardKey ? sessionStorage.getItem(guardKey) === '1' : false;

    // Solo auto-crear si podemos guardar en Firebase (onSaveWalletId) y tenemos userId para el guard.
    if (
      isPerUserMode &&
      autoCreateWallet &&
      isAuthenticated &&
      guardKey != null &&
      !userWalletIdLoading &&
      !userWalletId &&
      validWalletSetId &&
      circleService.isConfigured() &&
      !createWalletMutation.isPending &&
      !createWalletMutation.isSuccess &&
      !autoCreateAttemptedRef.current &&
      !alreadyAttemptedThisSession
    ) {
      autoCreateAttemptedRef.current = true;
      // Marcar intento ANTES de crear para no repetir POST aunque falle el guardado en Firebase.
      try {
        sessionStorage.setItem(guardKey, '1');
      } catch (_) {}
      const meta = walletMetadata
        ? [{ name: walletMetadata.name, refId: walletMetadata.refId }]
        : undefined;
      createWallet({ blockchains: ['MATIC-AMOY'], count: 1, walletSetId: validWalletSetId, metadata: meta });
    }
  }, [
    isPerUserMode,
    autoCreateWallet,
    isAuthenticated,
    userWalletIdLoading,
    userWalletId,
    walletSetId,
    walletMetadata,
    createWalletMutation.isPending,
    createWalletMutation.isSuccess,
  ]);

  useEffect(() => {
    if (
      !isPerUserMode &&
      autoCreateWallet &&
      isAuthenticated &&
      walletsData?.data &&
      walletsData.data.length === 0 &&
      !createWalletMutation.isPending &&
      !createWalletMutation.isSuccess &&
      !autoCreateAttemptedRef.current &&
      circleService.isConfigured()
    ) {
      autoCreateAttemptedRef.current = true;
      createWallet();
    }
  }, [
    isPerUserMode,
    autoCreateWallet,
    isAuthenticated,
    walletsData,
    createWalletMutation.isPending,
    createWalletMutation.isSuccess,
  ]);

  const refresh = useCallback(() => {
    refetchWallets();
    if (currentWallet) {
      refetchBalance();
      refetchTransactions();
    }
  }, [refetchWallets, refetchBalance, refetchTransactions, currentWallet]);

  const balanceList = Array.isArray(balanceData?.data) ? balanceData.data : [];
  const totalBalance = balanceList.reduce((acc, balance) => acc + parseFloat(balance.amount || '0'), 0);
  const usdcBalance = balanceList.find((b) => b.currency === 'USDC')?.amount || '0';

  const transactionsList = Array.isArray(transactionsData?.data) ? transactionsData.data : [];
  const walletsList = Array.isArray(walletsData?.data) ? walletsData.data : [];

  return {
    currentWallet,
    wallets: walletsList,
    balances: balanceList,
    transactions: transactionsList,
    totalBalance,
    usdcBalance,
    isLoadingWallets,
    isLoadingBalance,
    isLoadingTransactions,
    isCreatingWallet: createWalletMutation.isPending,
    isCreatingTransfer: createTransferMutation.isPending,
    walletsError,
    balanceError,
    transactionsError,
    createWallet,
    createTransfer,
    validateAddress,
    estimateFee,
    selectWallet,
    refresh,
    isConfigured: circleService.isConfigured(),
    hasWallet: !!currentWallet,
    environment: circleService.getEnvironment(),
  };
}
