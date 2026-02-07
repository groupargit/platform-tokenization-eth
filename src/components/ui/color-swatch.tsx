import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ColorSwatchProps {
  color: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

export function ColorSwatch({ 
  color, 
  label, 
  size = 'md', 
  className,
  showTooltip = true 
}: ColorSwatchProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const swatch = (
    <div
      className={cn(
        sizeClasses[size],
        "rounded-full border-2 border-border/30 shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl cursor-pointer",
        className
      )}
      style={{ backgroundColor: color }}
      aria-label={label || color}
    />
  );

  if (!showTooltip) return swatch;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {swatch}
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-mono text-xs">{color}</p>
        {label && <p className="text-xs text-muted-foreground">{label}</p>}
      </TooltipContent>
    </Tooltip>
  );
}
