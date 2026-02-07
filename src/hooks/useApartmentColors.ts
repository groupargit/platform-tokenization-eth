import { useMemo, useEffect } from 'react';
import { useFirebaseApartmentsCached } from './useFirebaseWithCache';

/**
  * Hook para obtener los colores de un apartamento desde Firebase
  * Los colores se obtienen en tiempo real de la base de datos
  * 
  * @param apartmentId - ID del apartamento (ej: 'apt_1001')
  * @returns Objeto con los colores del apartamento y funciones de acceso
  */
export function useApartmentColors(apartmentId?: string | null) {
  const { apartments, loading } = useFirebaseApartmentsCached();
  
  const apartment = useMemo(() => {
    if (!apartmentId || !apartments.length) return null;
   
    // Normalizar el ID para comparación (remover prefijo apt_ si existe)
    const normalizedSearchId = apartmentId.replace('apt_', '');
   
    return apartments.find(apt => 
      // Comparar directamente
      apt.apartmentId === apartmentId ||
      // Comparar sin prefijo apt_
      apt.apartmentId === normalizedSearchId ||
      // Comparar agregando prefijo si el apartamento lo tiene
      `apt_${apt.apartmentId}` === apartmentId ||
      // Comparar el apartmentId del apartamento sin su propio prefijo
      apt.apartmentId?.replace('apt_', '') === normalizedSearchId
    );
  }, [apartments, apartmentId]);
 
  // Debug logging (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && apartmentId) {
      console.log('[useApartmentColors] Search:', apartmentId, '| Apartments loaded:', apartments.length, '| Found:', apartment?.apartmentId, '| Colors:', apartment?.colorCode);
    }
  }, [apartmentId, apartment, apartments.length]);
  
  const colors = useMemo(() => {
    // Colores por defecto si no hay apartamento (índigo como fallback)
    const defaultColors = ['#3F51B5', '#81D4FA', '#F5E8C7', '#CFD8DC'];
    
    if (!apartment?.colorCode || !Array.isArray(apartment.colorCode)) {
      return defaultColors;
    }
    
    return apartment.colorCode;
  }, [apartment]);
  
  // Color primario (primer color de la paleta)
  const primaryColor = colors[0];
  
  // Color secundario (segundo color de la paleta)
  const secondaryColor = colors[1] || colors[0];
  
  // Color de acento (tercer color de la paleta)
  const accentColor = colors[2] || colors[0];
  
  // Color de fondo (último color de la paleta)
  const backgroundColor = colors[colors.length - 1] || colors[0];
  
  return {
    /** Array completo de colores del apartamento */
    colors,
    /** Color primario del apartamento (para estados activos/abiertos) */
    primaryColor,
    /** Color secundario del apartamento */
    secondaryColor,
    /** Color de acento del apartamento */
    accentColor,
    /** Color de fondo del apartamento */
    backgroundColor,
    /** Nombre del apartamento */
    name: apartment?.name || null,
    /** Concepto del apartamento */
    concept: apartment?.concept || null,
    /** Si está cargando */
    loading,
    /** Si se encontró el apartamento */
    found: !!apartment,
  };
}

/**
  * Hook para obtener colores por ID de apartamento (versión simplificada)
 * Siempre retorna un color (del apartamento si está disponible, o el default)
  */
export function useApartmentPrimaryColor(apartmentId?: string | null): string {
  const { primaryColor } = useApartmentColors(apartmentId);
  return primaryColor; // Siempre retorna un color (default si no hay apartamento)
}