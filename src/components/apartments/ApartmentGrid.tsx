import { motion } from "framer-motion";
import { ApartmentCard } from "./ApartmentCard";
import type { Apartment } from "@/types/apartment";

interface ApartmentGridProps {
  apartments: Apartment[];
  onApartmentClick?: (apartment: Apartment) => void;
}

export function ApartmentGrid({ apartments, onApartmentClick }: ApartmentGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
    >
      {apartments.map((apartment, index) => (
        <ApartmentCard
          key={apartment.id}
          apartment={apartment}
          index={index}
          onClick={() => onApartmentClick?.(apartment)}
        />
      ))}
    </motion.div>
  );
}
