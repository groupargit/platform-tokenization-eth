import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { 
  Loader2, Send, AlertCircle, CheckCircle2, 
  ArrowRight, Shield, Info, Wallet
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { z } from 'zod';

const MIN_TRANSFER_AMOUNT = 0.01;
const MAX_TRANSFER_AMOUNT = 10000;

const transferSchema = z.object({
  destinationAddress: z.string()
    .min(1, 'Ingresa la dirección del destinatario')
    .regex(/^0x[a-fA-F0-9]{40}$/, 'La dirección no tiene un formato válido'),
  amount: z.string()
    .min(1, 'Ingresa el monto a enviar')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'El monto debe ser mayor a 0')
    .refine((val) => {
      const num = parseFloat(val);
      return num >= MIN_TRANSFER_AMOUNT;
    }, `El monto mínimo es ${MIN_TRANSFER_AMOUNT} USDC`)
    .refine((val) => {
      const num = parseFloat(val);
      return num <= MAX_TRANSFER_AMOUNT;
    }, `El monto máximo por transacción es ${MAX_TRANSFER_AMOUNT.toLocaleString('es-CO')} USDC`),
});

interface SendTransferDialogProps {
  walletAddress?: string;
  balance: number;
  currency: string;
  onSend: (data: {
    destinationAddress: string;
    amount: string;
    feeLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  }) => Promise<unknown>;
  onValidateAddress?: (address: string) => Promise<{ data: { isValid: boolean } }>;
  isSending?: boolean;
  disabled?: boolean;
}

type Step = 'form' | 'confirm' | 'success';

export function SendTransferDialog({
  walletAddress,
  balance,
  currency,
  onSend,
  onValidateAddress,
  isSending = false,
  disabled = false,
}: SendTransferDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [feeLevel, setFeeLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [errors, setErrors] = useState<{ destinationAddress?: string; amount?: string }>({});
  const [isValidating, setIsValidating] = useState(false);
  const [addressValid, setAddressValid] = useState<boolean | null>(null);

  const validateForm = useCallback(() => {
    const result = transferSchema.safeParse({ destinationAddress, amount });
    if (!result.success) {
      const fieldErrors: { destinationAddress?: string; amount?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'destinationAddress') fieldErrors.destinationAddress = err.message;
        if (err.path[0] === 'amount') fieldErrors.amount = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }

    if (walletAddress && destinationAddress.toLowerCase() === walletAddress.toLowerCase()) {
      setErrors({ destinationAddress: 'No puedes enviarte fondos a ti mismo' });
      return false;
    }
    
    const numAmount = parseFloat(amount);
    if (numAmount > balance) {
      const deficit = (numAmount - balance).toFixed(2);
      setErrors({ 
        amount: `Fondos insuficientes. Te faltan ${deficit} ${currency}. Disponible: ${balance.toFixed(2)} ${currency}` 
      });
      return false;
    }

    const remainingBalance = balance - numAmount;
    if (remainingBalance < 0.001 && remainingBalance > 0) {
      setErrors({ 
        amount: `Debes mantener al menos 0.001 ${currency} para costos de red. Máximo envío: ${(balance - 0.001).toFixed(4)} ${currency}` 
      });
      return false;
    }
    
    setErrors({});
    return true;
  }, [destinationAddress, amount, balance, currency, walletAddress]);

  const handleAddressChange = async (value: string) => {
    setDestinationAddress(value);
    setAddressValid(null);
    
    if (/^0x[a-fA-F0-9]{40}$/.test(value) && onValidateAddress) {
      setIsValidating(true);
      try {
        const result = await onValidateAddress(value);
        setAddressValid(result.data.isValid);
        if (!result.data.isValid) {
          setErrors((prev) => ({ ...prev, destinationAddress: 'Esta dirección no es válida en la red seleccionada' }));
        } else {
          setErrors((prev) => ({ ...prev, destinationAddress: undefined }));
        }
      } catch {
        setAddressValid(null);
      } finally {
        setIsValidating(false);
      }
    }
  };

  const handleContinue = () => {
    if (validateForm()) {
      setStep('confirm');
    }
  };

  const handleSend = async () => {
    try {
      await onSend({
        destinationAddress,
        amount,
        feeLevel,
      });
      setStep('success');
    } catch {
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setStep('form');
      setDestinationAddress('');
      setAmount('');
      setErrors({});
      setAddressValid(null);
    }, 200);
  };

  const formatCOP = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value * 4200);
  };

  const feeLevels = [
    { value: 'LOW' as const, label: 'Económico', description: 'Más lento, menor costo' },
    { value: 'MEDIUM' as const, label: 'Estándar', description: 'Balance óptimo' },
    { value: 'HIGH' as const, label: 'Rápido', description: 'Mayor velocidad' },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => v ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          size="sm" 
          disabled={disabled}
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          Enviar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  Enviar fondos
                </DialogTitle>
                <DialogDescription>
                  Transfiere fondos de forma segura a otra dirección. 
                  Verifica los datos antes de continuar.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="destination" className="flex items-center gap-1.5">
                    Dirección del destinatario
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px]">
                        <p className="text-xs">
                          Dirección blockchain del destinatario. 
                          Verifica que sea correcta, las transferencias son irreversibles.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="relative">
                    <Input
                      id="destination"
                      placeholder="0x..."
                      value={destinationAddress}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      className={`font-mono text-sm pr-10 ${errors.destinationAddress ? 'border-destructive' : ''}`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isValidating && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {!isValidating && addressValid === true && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {!isValidating && addressValid === false && <AlertCircle className="w-4 h-4 text-destructive" />}
                    </div>
                  </div>
                  {errors.destinationAddress && (
                    <p className="text-xs text-destructive">{errors.destinationAddress}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="amount" className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      Monto a enviar
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px]">
                          <p className="text-xs">
                            Cantidad que deseas transferir. 
                            Se descontará de tu saldo disponible.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </span>
                    <span className={`text-xs ${balance <= 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      Disponible: {balance.toFixed(2)} {currency}
                      {balance <= 0 && ' (sin fondos)'}
                    </span>
                  </Label>
                  {balance <= 0 && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                      <p className="text-xs text-destructive">
                        No tienes fondos disponibles para enviar. Primero debes recibir una transferencia.
                      </p>
                    </div>
                  )}
                  <div className="relative">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      max={balance}
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={`pr-16 ${errors.amount ? 'border-destructive' : ''}`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {currency}
                    </div>
                  </div>
                  {amount && !errors.amount && (
                    <p className="text-xs text-muted-foreground">
                      Equivalente: {formatCOP(parseFloat(amount) || 0)}
                    </p>
                  )}
                  {errors.amount && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.amount}
                    </p>
                  )}
                  {amount && parseFloat(amount) > 0 && balance > 0 && !errors.amount && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Porcentaje del saldo</span>
                        <span>{Math.min(100, ((parseFloat(amount) / balance) * 100)).toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            (parseFloat(amount) / balance) > 0.9 ? 'bg-amber-500' : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(100, (parseFloat(amount) / balance) * 100)}%` }}
                        />
                      </div>
                      {(parseFloat(amount) / balance) > 0.9 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          ⚠️ Estás enviando más del 90% de tu saldo
                        </p>
                      )}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-fit text-xs"
                    onClick={() => setAmount((balance - 0.001).toFixed(4))}
                    disabled={balance <= 0.001}
                  >
                    Enviar todo
                  </Button>
                </div>

                <div className="grid gap-2">
                  <Label className="flex items-center gap-1.5">
                    Velocidad de la operación
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px]">
                        <p className="text-xs">
                          Determina la prioridad de tu transacción en la red. 
                          Mayor velocidad implica mayor costo de red.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {feeLevels.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setFeeLevel(level.value)}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          feeLevel === level.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <p className="text-xs font-medium">{level.label}</p>
                        <p className="text-[10px] text-muted-foreground">{level.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button onClick={handleContinue} disabled={!destinationAddress || !amount}>
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Confirmar envío
                </DialogTitle>
                <DialogDescription>
                  Revisa los detalles de tu transferencia antes de confirmar. 
                  Esta operación no puede deshacerse.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Envías</span>
                    <span className="font-bold text-lg">
                      {parseFloat(amount).toFixed(2)} {currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Equivalente</span>
                    <span className="text-sm">{formatCOP(parseFloat(amount))}</span>
                  </div>
                  <div className="border-t pt-3">
                    <p className="text-xs text-muted-foreground mb-1">Desde</p>
                    <p className="font-mono text-xs truncate">{walletAddress}</p>
                  </div>
                  <div className="flex items-center justify-center py-2">
                    <ArrowRight className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Hacia</p>
                    <p className="font-mono text-xs truncate">{destinationAddress}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700 dark:text-amber-400">
                    <p className="font-medium mb-1">Importante</p>
                    <p>
                      Las transferencias blockchain son irreversibles. 
                      Verifica que la dirección del destinatario sea correcta.
                    </p>
                  </div>
                </div>

                <Badge variant="secondary" className="w-full justify-center py-2">
                  <Shield className="w-3 h-3 mr-1" />
                  Operación protegida con cifrado de extremo a extremo
                </Badge>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setStep('form')} disabled={isSending}>
                  Modificar
                </Button>
                <Button onClick={handleSend} disabled={isSending} className="gap-2">
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Confirmar envío
                    </>
                  )}
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </motion.div>
              
              <DialogTitle className="mb-2">¡Envío en proceso!</DialogTitle>
              <DialogDescription className="mb-4">
                Tu transferencia de {parseFloat(amount).toFixed(2)} {currency} está siendo procesada. 
                Recibirás una confirmación cuando se complete.
              </DialogDescription>

              <div className="p-3 rounded-lg bg-muted/50 mb-4">
                <p className="text-xs text-muted-foreground mb-1">Destinatario</p>
                <p className="font-mono text-xs truncate">{destinationAddress}</p>
              </div>

              <Button onClick={handleClose} className="w-full">
                <Wallet className="w-4 h-4 mr-2" />
                Volver a mi billetera
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
