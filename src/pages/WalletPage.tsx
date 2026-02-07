import { motion, AnimatePresence } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  Wallet, TrendingUp, Award, Zap, Droplets, Moon, ArrowUpRight, 
  RefreshCw, Copy, Check, ExternalLink, AlertCircle, Shield, 
  Info, ChevronDown, ChevronUp, Sparkles, Lock, Send, Download
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCircleWallet } from "@/hooks/useCircleWallet";
import { useCircleWalletSetId } from "@/hooks/useCircleWalletSetId";
import { CreateWalletDialog, SendTransferDialog, ReceiveDialog } from "@/components/wallet";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { generateUserId } from "@/hooks/useFirebaseUserSync";
import { useFirebaseUserCached, CACHE_KEYS } from "@/hooks/useFirebaseWithCache";
import { updateUserCircleWalletId } from "@/hooks/useFirebase";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/i18n";
import { useApartmentColor } from "@/contexts/ApartmentColorContext";

const achievements = [
  { id: "1", name: "Eco Consciente", icon: "🌱", unlocked: true, description: "Primeros pasos hacia la sostenibilidad" },
  { id: "2", name: "Ahorro Energético", icon: "⚡", unlocked: true, description: "Reducción notable en consumo" },
  { id: "3", name: "Guardián del Agua", icon: "💧", unlocked: true, description: "Uso responsable del recurso" },
  { id: "4", name: "Pionero Solar", icon: "☀️", unlocked: false, description: "Próximo nivel de sostenibilidad" },
];

const sustainabilityScore = 78;

const activityIcons: Record<string, React.ReactNode> = {
  energy: <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent" />,
  water: <Droplets className="w-3.5 h-3.5 md:w-4 md:h-4 text-serenity" />,
  routine: <Moon className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />,
  send: <ArrowUpRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-destructive" />,
  receive: <ArrowUpRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary rotate-180" />,
  swap: <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent" />,
};

function formatRelativeTime(date: Date | string, locale: 'es' | 'en', dateNotAvailable: string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true, locale: locale === 'es' ? es : enUS });
  } catch {
    return dateNotAvailable;
  }
}

function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatBalance(balance: string | undefined): number {
  if (!balance) return 0;
  try {
    return parseFloat(balance);
  } catch {
    return 0;
  }
}

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getExplorerUrl(address: string): string {
  if (address.startsWith('0x')) {
    return `https://amoy.polygonscan.com/address/${address}`;
  }
  return `https://amoy.polygonscan.com/address/${address}`;
}

function getMotivationalMessage(balance: number, hasWallet: boolean, hasRecentActivity: boolean, t: any): { 
  title: string; 
  subtitle: string;
  tip?: string;
} {
  if (!hasWallet) {
    return {
      title: t.wallet.title,
      subtitle: t.wallet.subtitle,
      tip: t.wallet.legal.transparencyDesc
    };
  }
  if (balance === 0) {
    return {
      title: t.wallet.title,
      subtitle: t.wallet.subtitle,
    };
  }
  if (balance < 0.01) {
    return {
      title: t.wallet.title,
      subtitle: t.wallet.subtitle,
    };
  }
  if (balance < 1) {
    return {
      title: t.wallet.title,
      subtitle: t.wallet.subtitle,
    };
  }
  if (hasRecentActivity) {
    return {
      title: t.wallet.title,
      subtitle: t.wallet.subtitle,
    };
  }
  return {
    title: t.wallet.title,
    subtitle: t.wallet.subtitle,
  };
}

function LegalDisclaimer({ t }: { t: any }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-panel p-3 md:p-4 bg-muted/30 border-muted"
    >
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-xs md:text-sm font-medium">{t.wallet.legal.title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-2 text-[10px] md:text-xs text-muted-foreground">
              <p>
                <strong>{t.wallet.legal.entity}:</strong> {t.wallet.legal.entityDesc}
              </p>
              <p>
                <strong>{t.wallet.legal.dataProtection}:</strong> {t.wallet.legal.dataProtectionDesc}
              </p>
              <p>
                <strong>{t.wallet.legal.transparency}:</strong> {t.wallet.legal.transparencyDesc}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function WalletStatusIndicator({ state, environment, t }: { state: string; environment: string; t: any }) {
  const isActive = state === 'LIVE';
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
      <span className="text-[10px] md:text-xs text-muted-foreground">
        {isActive ? t.wallet.status.active : t.wallet.status.configuring}
        {environment === 'sandbox' && ` • ${t.wallet.status.testMode}`}
      </span>
    </div>
  );
}

function BalanceCard({ 
  balance, 
  currency, 
  copValue, 
  isLoading,
  t
}: { 
  balance: number; 
  currency: string; 
  copValue: number; 
  isLoading: boolean;
  t: any;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-panel p-4 md:p-6"
    >
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-xs md:text-sm text-muted-foreground">
              {t.wallet.balance}
            </p>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px]">
                <p className="text-xs">
                  {t.wallet.balance}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {isLoading ? (
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <p className="font-display text-2xl md:text-3xl font-bold">
                  {balance.toFixed(2)}
                </p>
                <span className="text-sm text-muted-foreground">{currency}</span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {t.wallet.equivalent}: {formatCOP(copValue)}
              </p>
            </>
          )}
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] md:text-xs">
          <Shield className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1" />
          {t.wallet.protected}
        </Badge>
      </div>
      <p className="text-[10px] md:text-xs text-muted-foreground">
        {t.wallet.exchangeRate}: 1 USDC ≈ $4.200 COP
      </p>
    </motion.div>
  );
}

function SecurityTokenCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-panel p-4 md:p-6 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center z-10">
        <div className="text-center">
          <Lock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground">Próximamente</p>
        </div>
      </div>
      
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-xs md:text-sm text-muted-foreground">
              Participación en proyecto
            </p>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3 h-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px]">
                <p className="text-xs">
                  Tokens de seguridad que representan participación 
                  en proyectos inmobiliarios. Regulado por la SFC.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="font-display text-2xl md:text-3xl font-bold">0.00</p>
        </div>
        <Badge variant="secondary" className="text-[10px] md:text-xs">
          Requiere verificación
        </Badge>
      </div>
      <p className="text-[10px] md:text-xs text-muted-foreground">
        Inversión tokenizada conforme al Decreto 1981 de 2023
      </p>
    </motion.div>
  );
}

function TransactionItem({ 
  transaction, 
  currentWalletId,
  t,
  language
}: { 
  transaction: {
    id: string;
    type: string;
    createDate: string;
    transactionHash?: string;
    destination: { type: string; id?: string };
    source: { type: string; id?: string };
    amount: { amount: string; currency: string };
    state: string;
  };
  currentWalletId?: string;
  t: any;
  language: 'es' | 'en';
}) {
  const isIncoming = transaction.destination.type === 'wallet' && transaction.destination.id === currentWalletId;
  
  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      'TRANSFER': isIncoming ? t.wallet.transactions.received : t.wallet.transactions.sent,
      'MINT': t.wallet.transactions.benefitReceived,
      'BURN': t.wallet.transactions.redeemed,
      'APPROVAL': t.wallet.transactions.authorization,
    };
    return labels[type] || t.wallet.transactions.movement;
  };
  
  const getStateLabel = (state: string) => {
    const labels: Record<string, { text: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      'COMPLETED': { text: t.wallet.transactions.confirmed, variant: 'default' },
      'PENDING': { text: t.wallet.transactions.pending, variant: 'secondary' },
      'FAILED': { text: t.wallet.transactions.failed, variant: 'destructive' },
    };
    return labels[state] || { text: state, variant: 'secondary' };
  };
  
  const stateInfo = getStateLabel(transaction.state);
  
  return (
    <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className={`p-1.5 md:p-2 rounded-lg ${isIncoming ? 'bg-emerald-500/10' : 'bg-background'}`}>
        {activityIcons[transaction.type.toLowerCase()] || (
          <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-sm font-medium">
          {getTransactionLabel(transaction.type)}
        </p>
        <p className="text-[10px] md:text-xs text-muted-foreground">
          {formatRelativeTime(transaction.createDate, language, t.common.dateNotAvailable)}
          {transaction.transactionHash && (
            <span className="ml-2 font-mono opacity-70">
              Ref: {formatAddress(transaction.transactionHash)}
            </span>
          )}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs md:text-sm font-medium flex items-center gap-0.5 md:gap-1 ${
          isIncoming ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
        }`}>
          {isIncoming ? '+' : '-'}
          {formatBalance(transaction.amount.amount).toFixed(2)} {transaction.amount.currency}
        </p>
        <Badge variant={stateInfo.variant} className="text-[9px] mt-1">
          {stateInfo.text}
        </Badge>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { user, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const [copiedAddress, setCopiedAddress] = useState(false);
  const userId = user?.email ? generateUserId(user.email) : null;
  const queryClient = useQueryClient();
  const { user: firebaseUser, loading: firebaseUserLoading } = useFirebaseUserCached(userId);
  const { toast } = useToast();
  const { primaryColor: apartmentColor } = useApartmentColor();
  const {
    walletSetId,
    loading: loadingWalletSetId,
    createWalletSetAndSave,
  } = useCircleWalletSetId();
  const [creatingWalletSet, setCreatingWalletSet] = useState(false);

  const walletUserDataReady = !!userId && !firebaseUserLoading && firebaseUser != null;

  const {
    currentWallet,
    wallets: _wallets,
    balances,
    transactions,
    usdcBalance,
    totalBalance,
    isLoadingWallets,
    isLoadingBalance,
    isLoadingTransactions,
    isCreatingWallet,
    isCreatingTransfer,
    createWallet,
    createTransfer,
    validateAddress,
    refresh,
    hasWallet,
    isConfigured,
    environment,
    walletsError,
  } = useCircleWallet({
    autoCreateWallet: true,
    walletSetId: walletSetId ?? undefined,
    userWalletId: firebaseUser?.circleWalletId ?? undefined,
    userWalletIdLoading: !walletUserDataReady,
    onSaveWalletId: userId
      ? async (walletId) => {
          await updateUserCircleWalletId(userId, walletId);
          queryClient.setQueryData(CACHE_KEYS.user(userId), (prev: { circleWalletId?: string } | undefined) =>
            prev ? { ...prev, circleWalletId: walletId } : { circleWalletId: walletId }
          );
        }
      : undefined,
    walletMetadata:
      userId
        ? {
            name: firebaseUser?.name || user?.displayName || (user?.email ? user.email.split('@')[0] : '') || 'Usuario',
            refId: userId,
          }
        : undefined,
  });

  const handleCreateWalletSet = async () => {
    if (!createWalletSetAndSave) return;
    setCreatingWalletSet(true);
    try {
      await createWalletSetAndSave('Casa Color');
      toast({
        title: 'Configuración completada',
        description: 'El sistema de billeteras está listo para los usuarios.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo completar la configuración';
      toast({
        title: 'Error de configuración',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setCreatingWalletSet(false);
    }
  };

  const primaryBalance = balances.find((b) => b.currency === 'USDC') || balances[0];
  const balanceValue = formatBalance(primaryBalance?.amount || usdcBalance);
  const copValue = balanceValue * 4200;
  const hasRecentActivity = transactions.length > 0;
  const message = useMemo(() => getMotivationalMessage(balanceValue, hasWallet, hasRecentActivity, t), [balanceValue, hasWallet, hasRecentActivity, t]);
  const defaultWalletMetadata =
    userId
      ? {
          name: firebaseUser?.name || user?.displayName || (user?.email ? user.email.split('@')[0] : '') || 'Usuario',
          refId: userId,
        }
      : undefined;

  const handleCopyAddress = async () => {
    if (currentWallet?.address) {
      await navigator.clipboard.writeText(currentWallet.address);
      setCopiedAddress(true);
      toast({
        title: 'Dirección copiada',
        description: 'La dirección de tu billetera está en el portapapeles',
      });
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleOpenExplorer = () => {
    if (currentWallet?.address) {
      const url = getExplorerUrl(currentWallet.address);
      window.open(url, '_blank');
    }
  };

  const hasWalletIdButLoadFailed =
    !!firebaseUser?.circleWalletId && !hasWallet && !isLoadingWallets && !!walletsError;

  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Acceso seguro requerido</CardTitle>
              <CardDescription>
                Inicia sesión para acceder a tu billetera digital de forma protegida
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!isConfigured) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <Settings2 className="w-6 h-6 text-amber-500" />
              </div>
              <CardTitle>Configuración en proceso</CardTitle>
              <CardDescription>
                El servicio de billetera está siendo configurado. 
                Por favor, intenta nuevamente en unos minutos.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!walletSetId && !loadingWalletSetId && createWalletSetAndSave) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                Configuración inicial
              </CardTitle>
              <CardDescription>
                Activa el sistema de billeteras digitales para la comunidad. 
                Este paso solo se realiza una vez.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleCreateWalletSet}
                disabled={creatingWalletSet}
                className="w-full md:w-auto"
              >
                {creatingWalletSet ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Configurando...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Activar billeteras
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!walletSetId && loadingWalletSetId) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-12 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando tu información...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-3 xs:space-y-4 md:space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-3 xs:p-4 md:p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 xs:gap-3 min-w-0">
              <div className="p-1.5 xs:p-2 rounded-lg xs:rounded-xl bg-primary/20 shrink-0">
                <Wallet className="w-4 h-4 xs:w-5 xs:h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-sm xs:text-base md:text-lg lg:text-xl font-bold truncate">{message.title}</h1>
                <p className="text-[10px] xs:text-xs md:text-sm text-muted-foreground truncate">{message.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={refresh}
                disabled={isLoadingWallets || isLoadingBalance || isLoadingTransactions}
                className="h-7 w-7 xs:h-8 xs:w-8 p-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 xs:w-4 xs:h-4 ${(isLoadingWallets || isLoadingBalance || isLoadingTransactions) ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          {message.tip && (
            <div className="flex items-center gap-1.5 xs:gap-2 mt-2 xs:mt-3 p-1.5 xs:p-2 rounded-lg bg-background/50">
              <Sparkles className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-accent shrink-0" />
              <p className="text-[9px] xs:text-[10px] md:text-xs text-muted-foreground line-clamp-2">{message.tip}</p>
            </div>
          )}
        </motion.div>

        {hasWallet && currentWallet ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-4 md:p-6"
          >
            <div className="flex items-start justify-between mb-3 md:mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-xs md:text-sm text-muted-foreground">{t.wallet.walletId}</p>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[200px]">
                      <p className="text-xs">
                        {t.wallet.walletIdTooltip}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {currentWallet.address ? (
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm md:text-base font-medium">
                      {formatAddress(currentWallet.address)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleCopyAddress}
                    >
                      {copiedAddress ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={handleOpenExplorer}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <p className="text-sm">{t.wallet.addressPending}</p>
                  </div>
                )}
                <WalletStatusIndicator state={currentWallet.state} environment={environment} t={t} />
              </div>
              <Badge 
                className="text-[10px] md:text-xs"
                style={{ backgroundColor: `${apartmentColor}20`, color: apartmentColor }}
              >
                <Shield className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1" />
                {t.wallet.protected}
              </Badge>
            </div>
            
            <div className="flex gap-2 pt-2 border-t">
              <SendTransferDialog
                walletAddress={currentWallet.address || ''}
                balance={balanceValue}
                currency={primaryBalance?.currency || 'USDC'}
                onSend={createTransfer}
                onValidateAddress={validateAddress}
                isSending={isCreatingTransfer}
                disabled={!currentWallet.address}
              />
              <ReceiveDialog
                walletAddress={currentWallet.address}
                blockchain="Polygon (Amoy)"
                disabled={!currentWallet.address}
              />
            </div>
          </motion.div>
        ) : hasWalletIdButLoadFailed ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-4 md:p-6 border-amber-500/30"
          >
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
              <h3 className="font-semibold mb-2">Conexión temporal interrumpida</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tu billetera existe pero no pudimos conectar con el servicio. 
                Tus fondos están seguros.
              </p>
              <Button onClick={() => refresh()} disabled={isLoadingWallets} variant="outline">
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingWallets ? 'animate-spin' : ''}`} />
                Reintentar conexión
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-panel p-4 md:p-6"
          >
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Wallet className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Activa tu billetera digital</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Crea tu billetera para recibir beneficios por tu consumo 
                responsable y gestionar tus activos digitales.
              </p>
              <CreateWalletDialog
                onWalletCreated={refresh}
                walletSetId={walletSetId}
                createWallet={createWallet}
                isCreatingWallet={isCreatingWallet}
                isConfigured={isConfigured}
                defaultWalletMetadata={defaultWalletMetadata}
                hasExistingWallet={hasWallet}
              />
            </div>
          </motion.div>
        )}

        {hasWallet && (
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 xs:gap-3 md:gap-4">
            <BalanceCard
              balance={balanceValue}
              currency={primaryBalance?.currency || 'USDC'}
              copValue={copValue}
              isLoading={isLoadingBalance}
              t={t}
            />
            <SecurityTokenCard />
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-panel p-4 md:p-6"
        >
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold text-sm md:text-base">
                Índice de eficiencia
              </h2>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px]">
                  <p className="text-xs">
                    Mide qué tan eficiente es tu consumo de recursos. 
                    Un mayor índice significa más beneficios para ti.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="font-display text-xl md:text-2xl font-bold text-primary">
              {sustainabilityScore}%
            </span>
          </div>
          <Progress value={sustainabilityScore} className="h-2 md:h-3 mb-2" />
          <p className="text-[10px] md:text-xs text-muted-foreground">
            Tu hogar opera de forma eficiente. Sigue así para maximizar tus beneficios.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel p-3 xs:p-4 md:p-6"
        >
          <div className="flex items-center gap-1.5 xs:gap-2 mb-2 xs:mb-3 md:mb-4">
            <Award className="w-3.5 h-3.5 xs:w-4 xs:h-4 md:w-5 md:h-5 text-accent" />
            <h2 className="font-display font-semibold text-xs xs:text-sm md:text-base">Reconocimientos</h2>
          </div>
          <div className="grid grid-cols-4 gap-1.5 xs:gap-2 md:gap-3">
            {achievements.map((achievement) => (
              <Tooltip key={achievement.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`p-1.5 xs:p-2 md:p-3 rounded-lg md:rounded-xl text-center transition-all cursor-pointer ${
                      achievement.unlocked
                        ? "bg-primary/10 border border-primary/20 hover:bg-primary/20"
                        : "bg-muted/50 opacity-50"
                    }`}
                  >
                    <span className="text-base xs:text-lg md:text-2xl">{achievement.icon}</span>
                    <p className="text-[8px] xs:text-[9px] md:text-xs font-medium mt-0.5 xs:mt-1 line-clamp-1">
                      {achievement.name}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{achievement.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-panel p-4 md:p-6"
        >
          <h2 className="font-display font-semibold text-sm md:text-base mb-3 md:mb-4">
            {hasWallet ? 'Historial de movimientos' : 'Actividad reciente'}
          </h2>
          <div className="space-y-2 md:space-y-3">
            {hasWallet ? (
              isLoadingTransactions ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Consultando movimientos...</p>
                </div>
              ) : transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    currentWalletId={currentWallet?.id}
                    t={t}
                    language={language}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Wallet className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium mb-1">Sin movimientos aún</p>
                  <p className="text-xs text-muted-foreground">
                    Tus transacciones aparecerán aquí
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  Activa tu billetera para ver tus movimientos
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {hasWallet && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-2 xs:gap-3 md:gap-4"
          >
            <div className="glass-panel p-2.5 xs:p-3 md:p-4 text-center">
              <p className="font-display text-lg xs:text-xl md:text-2xl font-bold text-primary">
                {totalBalance.toFixed(2)}
              </p>
              <p className="text-[9px] xs:text-[10px] md:text-xs text-muted-foreground">Saldo total</p>
            </div>
            <div className="glass-panel p-2.5 xs:p-3 md:p-4 text-center">
              <p className="font-display text-lg xs:text-xl md:text-2xl font-bold">
                {transactions.length}
              </p>
              <p className="text-[9px] xs:text-[10px] md:text-xs text-muted-foreground">Movimientos</p>
            </div>
          </motion.div>
        )}

        <LegalDisclaimer t={t} />
      </div>
    </DashboardLayout>
  );
}
