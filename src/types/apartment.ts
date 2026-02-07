export interface Apartment {
  id: string;
  name: string;
  concept: string;
  colorCode: string[];
  price?: number | string;
  type?: 'private' | 'commercial';
  available?: boolean;
  description?: string;
  features?: string[];
  images?: string[];
  psychology?: {
    primary: string;
    secondary: string;
    accent: string;
    overall: string;
  };
  recommendedUse?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
}

export interface ApartmentCardProps {
  apartment: Apartment;
  index: number;
  onClick?: () => void;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: 'admin' | 'resident' | 'guest';
  apartmentId?: string;
}
