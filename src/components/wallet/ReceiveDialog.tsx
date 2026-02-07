import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Download, Copy, Check, QrCode, 
  Shield, Info, Share2, ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface ReceiveDialogProps {
  walletAddress?: string;
  blockchain?: string;
  disabled?: boolean;
}

export function ReceiveDialog({
  walletAddress,
  blockchain = 'Polygon (Amoy)',
  disabled = false,
}: ReceiveDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast({
        title: 'Dirección copiada',
        description: 'Tu dirección está lista para compartir',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (walletAddress && navigator.share) {
      try {
        await navigator.share({
          title: 'Mi dirección de billetera',
          text: `Mi dirección para recibir fondos: ${walletAddress}`,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  const qrCodeUrl = walletAddress 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(walletAddress)}&bgcolor=ffffff&color=000000`
    : '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled || !walletAddress}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Recibir
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Recibir fondos
          </DialogTitle>
          <DialogDescription>
            Comparte tu dirección para recibir transferencias de forma segura.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <div className="p-4 bg-white rounded-xl shadow-sm border">
              {qrCodeUrl ? (
                <img 
                  src={qrCodeUrl} 
                  alt="Código QR de tu dirección"
                  className="w-[180px] h-[180px]"
                />
              ) : (
                <div className="w-[180px] h-[180px] flex items-center justify-center bg-muted rounded-lg">
                  <QrCode className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <QrCode className="w-3 h-3" />
              Escanea para enviar a esta dirección
            </p>
          </motion.div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Tu dirección
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px]">
                    <p className="text-xs">
                      Esta es tu dirección única en la blockchain. 
                      Compártela para recibir fondos de forma segura.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Badge variant="secondary" className="text-[10px]">
                {blockchain}
              </Badge>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="font-mono text-xs break-all select-all">
                {walletAddress}
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 gap-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    Copiada
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 gap-2"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
                Compartir
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Cómo recibir fondos</p>
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-[10px] font-bold">1</span>
                <span>Comparte tu dirección o código QR con quien te enviará fondos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-[10px] font-bold">2</span>
                <span>El remitente ingresa tu dirección y el monto a enviar</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-[10px] font-bold">3</span>
                <span>Los fondos llegarán a tu billetera en minutos</span>
              </li>
            </ol>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-primary mb-1">Tu dirección es pública</p>
              <p className="text-muted-foreground">
                Puedes compartirla con confianza. Solo sirve para recibir fondos, 
                nadie puede acceder a tu billetera con esta información.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs gap-2"
            onClick={() => {
              if (walletAddress) {
                window.open(`https://amoy.polygonscan.com/address/${walletAddress}`, '_blank');
              }
            }}
          >
            <ExternalLink className="w-3 h-3" />
            Ver en el explorador de blockchain
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Label({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label 
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ''}`}
      {...props}
    >
      {children}
    </label>
  );
}
