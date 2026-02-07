import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Wallet, Plus } from 'lucide-react';

interface CreateWalletDialogProps {
  onWalletCreated?: () => void;
  walletSetId?: string | null;
  createWallet: (opts?: {
    walletSetId?: string;
    blockchains?: string[];
    count?: number;
    metadata?: { name?: string; refId?: string }[];
  }) => Promise<unknown>;
  isCreatingWallet?: boolean;
  isConfigured?: boolean;
  defaultWalletMetadata?: { name?: string; refId?: string };
  /** Si true, no mostrar botón crear (un usuario solo puede tener una wallet). */
  hasExistingWallet?: boolean;
}

export function CreateWalletDialog({
  onWalletCreated,
  walletSetId,
  createWallet,
  isCreatingWallet = false,
  isConfigured = true,
  defaultWalletMetadata,
  hasExistingWallet = false,
}: CreateWalletDialogProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');

  const handleCreateWallet = async () => {
    if (!walletSetId?.trim()) {
      console.error('walletSetId no configurado. Añade VITE_CIRCLE_WALLET_SET_ID en .env');
      return;
    }
    const metadata =
      description.trim()
        ? [{ name: defaultWalletMetadata?.name, refId: description.trim() }]
        : undefined;
    try {
      await createWallet({
        walletSetId: walletSetId.trim(),
        blockchains: ['MATIC-AMOY'],
        count: 1,
        metadata,
      });
      setDescription('');
      setOpen(false);
      onWalletCreated?.();
    } catch (error) {
      console.error('Error creating wallet:', error);
    }
  };

  const missingWalletSetId = !walletSetId || (typeof walletSetId === 'string' && !walletSetId.trim());
  if (!isConfigured || missingWalletSetId) {
    return (
      <Button disabled variant="outline" size="sm">
        <Wallet className="w-4 h-4 mr-2" />
        {missingWalletSetId ? 'Configura VITE_CIRCLE_WALLET_SET_ID' : 'Circle no configurado'}
      </Button>
    );
  }

  if (hasExistingWallet) {
    return (
      <Button disabled variant="outline" size="sm">
        <Wallet className="w-4 h-4 mr-2" />
        Ya tienes una wallet
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Crear Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear nueva wallet</DialogTitle>
          <DialogDescription>
            Crea una nueva wallet de Circle para gestionar USDC y realizar transacciones.
            Circle soporta múltiples blockchains automáticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="description">Ref ID / descripción (opcional)</Label>
            <Input
              id="description"
              placeholder="Ej: mi_wallet_principal"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Una descripción opcional para identificar esta wallet
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isCreatingWallet}>
            Cancelar
          </Button>
          <Button onClick={handleCreateWallet} disabled={isCreatingWallet}>
            {isCreatingWallet ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Crear Wallet
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
