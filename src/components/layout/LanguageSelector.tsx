import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, type Language } from "@/i18n";
import { cn } from "@/lib/utils";

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇨🇴' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
];

interface LanguageSelectorProps {
  className?: string;
  variant?: 'icon' | 'full';
}

export function LanguageSelector({ className, variant = 'icon' }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useLanguage();
  
  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={variant === 'icon' ? 'icon' : 'sm'}
          className={cn(
            "h-8 w-8 xs:h-9 xs:w-9",
            variant === 'full' && "w-auto px-3 gap-2",
            className
          )}
          title={t.language.title}
        >
          <Globe className="w-4 h-4 xs:w-[18px] xs:h-[18px]" />
          {variant === 'full' && (
            <span className="text-xs xs:text-sm">{currentLang.flag}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={cn(
              "cursor-pointer gap-2",
              language === lang.code && "bg-primary/10 text-primary"
            )}
          >
            <span className="text-base">{lang.flag}</span>
            <span className="text-sm">{lang.label}</span>
            {language === lang.code && (
              <span className="ml-auto text-xs">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
