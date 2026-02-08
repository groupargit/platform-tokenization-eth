import { useMemo, useCallback } from 'react';
import apartmentsData from '@/data/apartments.json';
import colorPalettes from '@/data/color-palettes.json';
import type { Apartment } from '@/types/apartment';

const DEFAULT_COLORS = ['#3F51B5', '#81D4FA', '#F5E8C7', '#CFD8DC'];

export function useApartments() {
  const apartments = useMemo<Apartment[]>(() => {
    const palettes = colorPalettes.colorPalettes as Record<string, any>;
    return Object.entries(apartmentsData).map(([id, data]: [string, any]) => {
      const palette = palettes[id];
      return {
        id,
        name: data.name,
        concept: data.concept,
        colorCode: data.colorCode,
        psychology: palette?.psychology,
        recommendedUse: palette?.recommendedUse,
      };
    });
  }, []);

  const getApartmentById = useCallback(
    (id: string): Apartment | undefined => apartments.find((apt) => apt.id === id),
    [apartments]
  );

  const getApartmentColors = useCallback(
    (id: string): string[] => {
      const apt = apartments.find((a) => a.id === id);
      return apt?.colorCode || DEFAULT_COLORS;
    },
    [apartments]
  );

  return {
    apartments,
    getApartmentById,
    getApartmentColors,
  };
}
