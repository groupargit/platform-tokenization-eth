 import { createContext, useContext, useMemo, ReactNode } from 'react';
 import { useAuth } from '@/hooks/useAuth';
 import { generateUserId } from '@/hooks/useFirebaseUserSync';
 import { useFirebaseUserCached, useFirebaseApartmentsCached } from '@/hooks/useFirebaseWithCache';
 
 interface ApartmentColorContextValue {
   /** Color primario del apartamento (para estados activos/destacados) */
   primaryColor: string;
   /** Color secundario del apartamento */
   secondaryColor: string;
   /** Color de acento del apartamento */
   accentColor: string;
   /** Color de fondo del apartamento */
   backgroundColor: string;
   /** Todos los colores de la paleta */
   colors: string[];
   /** Nombre del apartamento */
   apartmentName: string | null;
   /** Concepto del apartamento */
   apartmentConcept: string | null;
   /** ID del apartamento */
   apartmentId: string | null;
   /** Si está cargando */
   loading: boolean;
   /** Si el usuario tiene apartamento asignado */
   hasApartment: boolean;
 }
 
 // Colores por defecto (índigo) cuando no hay apartamento
 const DEFAULT_COLORS = ['#3F51B5', '#81D4FA', '#FFFFFF', '#F5E8C7', '#CFD8DC'];
 
 const ApartmentColorContext = createContext<ApartmentColorContextValue>({
   primaryColor: DEFAULT_COLORS[0],
   secondaryColor: DEFAULT_COLORS[1],
   accentColor: DEFAULT_COLORS[2],
   backgroundColor: DEFAULT_COLORS[4],
   colors: DEFAULT_COLORS,
   apartmentName: null,
   apartmentConcept: null,
   apartmentId: null,
   loading: true,
   hasApartment: false,
 });
 
 export function ApartmentColorProvider({ children }: { children: ReactNode }) {
   const { user, isAuthenticated } = useAuth();
   const userId = user?.email ? generateUserId(user.email) : null;
   const { user: firebaseUser, loading: userLoading } = useFirebaseUserCached(userId);
   const { apartments, loading: apartmentsLoading } = useFirebaseApartmentsCached();
   
   const value = useMemo<ApartmentColorContextValue>(() => {
     // Obtener el apartmentId del usuario
     let apartmentId: string | null = null;
     
     if (firebaseUser?.primaryApartment) {
       apartmentId = firebaseUser.primaryApartment;
     } else if (firebaseUser?.apartments && typeof firebaseUser.apartments === 'object') {
       const aptKeys = Object.keys(firebaseUser.apartments);
       apartmentId = aptKeys.find(key => key.startsWith('apt_') || key.match(/^[A-Z]?\d+$/)) || null;
       
       if (!apartmentId) {
         for (const key of aptKeys) {
           const apt = (firebaseUser.apartments as Record<string, any>)[key];
           if (apt?.apartmentId) {
             apartmentId = apt.apartmentId;
             break;
           }
         }
       }
     }
     
     // Buscar el apartamento en la lista
     let apartment = null;
     if (apartmentId && apartments.length > 0) {
       const normalizedSearchId = apartmentId.replace('apt_', '');
       apartment = apartments.find(apt => 
         apt.apartmentId === apartmentId ||
         apt.apartmentId === normalizedSearchId ||
         `apt_${apt.apartmentId}` === apartmentId ||
         apt.apartmentId?.replace('apt_', '') === normalizedSearchId
       );
     }
     
     // Extraer colores
     const colors = apartment?.colorCode && Array.isArray(apartment.colorCode) && apartment.colorCode.length > 0
       ? apartment.colorCode
       : DEFAULT_COLORS;
     
     return {
       primaryColor: colors[0] || DEFAULT_COLORS[0],
       secondaryColor: colors[1] || colors[0] || DEFAULT_COLORS[1],
       accentColor: colors[2] || colors[0] || DEFAULT_COLORS[2],
       backgroundColor: colors[colors.length - 1] || DEFAULT_COLORS[4],
       colors,
       apartmentName: apartment?.name || null,
       apartmentConcept: apartment?.concept || null,
       apartmentId,
       loading: isAuthenticated && (userLoading || apartmentsLoading),
       hasApartment: !!apartment,
     };
   }, [firebaseUser, apartments, isAuthenticated, userLoading, apartmentsLoading]);
   
   return (
     <ApartmentColorContext.Provider value={value}>
       {children}
     </ApartmentColorContext.Provider>
   );
 }
 
 /**
  * Hook para acceder al color del apartamento del usuario actual
  * Retorna colores dinámicos basados en la paleta del apartamento asignado
  */
 export function useApartmentColor() {
   return useContext(ApartmentColorContext);
 }
 
 /**
  * Hook simplificado para obtener solo el color primario
  */
 export function usePrimaryApartmentColor(): string {
   const { primaryColor } = useApartmentColor();
   return primaryColor;
 }