import {
  Wifi, Tv, Car, Coffee, Waves, Wind, Flame, Dumbbell,
  Home, Shield, Baby, Accessibility, Music, Laptop,
  Utensils, Wine, Mountain, Trees, Shirt, WashingMachine,
  Sparkles, Cigarette, Dog, Camera, Lock, AlarmSmoke,
  Snowflake, Fan, Heater, Bath, BedDouble, Sofa,
  UtensilsCrossed, Refrigerator, Microwave, Droplets,
  MapPin, Palmtree, Building, DoorOpen, Eye
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface AmenityCategory {
  name: string;
  amenities: {
    name: string;
    icon: LucideIcon;
  }[];
}

export const AMENITY_CATEGORIES: AmenityCategory[] = [
  {
    name: 'Essentials',
    amenities: [
      { name: 'WiFi', icon: Wifi },
      { name: 'TV', icon: Tv },
      { name: 'Kitchen', icon: Coffee },
      { name: 'Washer', icon: WashingMachine },
      { name: 'Dryer', icon: Shirt },
      { name: 'Air conditioning', icon: Wind },
      { name: 'Heating', icon: Heater },
      { name: 'Dedicated workspace', icon: Laptop },
    ],
  },
  {
    name: 'Features',
    amenities: [
      { name: 'Pool', icon: Waves },
      { name: 'Hot tub', icon: Bath },
      { name: 'Patio', icon: DoorOpen },
      { name: 'BBQ grill', icon: Flame },
      { name: 'Fire pit', icon: Flame },
      { name: 'Pool table', icon: Home },
      { name: 'Indoor fireplace', icon: Flame },
      { name: 'Piano', icon: Music },
      { name: 'Exercise equipment', icon: Dumbbell },
      { name: 'Lake access', icon: Waves },
      { name: 'Beach access', icon: Palmtree },
      { name: 'Ski-in/Ski-out', icon: Mountain },
    ],
  },
  {
    name: 'Location',
    amenities: [
      { name: 'Waterfront', icon: Waves },
      { name: 'Beachfront', icon: Palmtree },
      { name: 'Mountain view', icon: Mountain },
      { name: 'Garden view', icon: Trees },
      { name: 'City view', icon: Building },
      { name: 'Balcony', icon: Eye },
    ],
  },
  {
    name: 'Safety',
    amenities: [
      { name: 'Smoke alarm', icon: AlarmSmoke },
      { name: 'Carbon monoxide alarm', icon: Shield },
      { name: 'Fire extinguisher', icon: Flame },
      { name: 'First aid kit', icon: Shield },
      { name: 'Security cameras', icon: Camera },
      { name: 'Lock on bedroom door', icon: Lock },
    ],
  },
  {
    name: 'Parking',
    amenities: [
      { name: 'Free parking', icon: Car },
      { name: 'Paid parking', icon: Car },
      { name: 'Street parking', icon: MapPin },
      { name: 'EV charger', icon: Car },
    ],
  },
  {
    name: 'Kitchen & Dining',
    amenities: [
      { name: 'Refrigerator', icon: Refrigerator },
      { name: 'Microwave', icon: Microwave },
      { name: 'Cooking basics', icon: UtensilsCrossed },
      { name: 'Dishes and silverware', icon: Utensils },
      { name: 'Dishwasher', icon: Droplets },
      { name: 'Coffee maker', icon: Coffee },
      { name: 'Wine glasses', icon: Wine },
      { name: 'Dining table', icon: Utensils },
    ],
  },
  {
    name: 'Bedroom & Laundry',
    amenities: [
      { name: 'Bed linens', icon: BedDouble },
      { name: 'Extra pillows and blankets', icon: BedDouble },
      { name: 'Hangers', icon: Shirt },
      { name: 'Iron', icon: Shirt },
      { name: 'Hair dryer', icon: Wind },
      { name: 'Cleaning products', icon: Sparkles },
    ],
  },
  {
    name: 'Bathroom',
    amenities: [
      { name: 'Shampoo', icon: Bath },
      { name: 'Conditioner', icon: Bath },
      { name: 'Body soap', icon: Bath },
      { name: 'Hot water', icon: Droplets },
      { name: 'Shower gel', icon: Bath },
    ],
  },
  {
    name: 'Entertainment',
    amenities: [
      { name: 'Cable TV', icon: Tv },
      { name: 'Netflix', icon: Tv },
      { name: 'Amazon Prime', icon: Tv },
      { name: 'Sound system', icon: Music },
      { name: 'Game console', icon: Tv },
      { name: 'Books and reading material', icon: Home },
    ],
  },
  {
    name: 'Family',
    amenities: [
      { name: 'Crib', icon: Baby },
      { name: 'High chair', icon: Baby },
      { name: 'Baby bath', icon: Baby },
      { name: 'Baby monitor', icon: Baby },
      { name: 'Babysitter recommendations', icon: Baby },
      { name: 'Children\'s books and toys', icon: Baby },
      { name: 'Children\'s dinnerware', icon: Baby },
    ],
  },
  {
    name: 'Cooling & Heating',
    amenities: [
      { name: 'Central air conditioning', icon: Snowflake },
      { name: 'Portable fans', icon: Fan },
      { name: 'Central heating', icon: Heater },
      { name: 'Space heater', icon: Heater },
    ],
  },
  {
    name: 'Outdoor',
    amenities: [
      { name: 'Private backyard', icon: Trees },
      { name: 'Outdoor furniture', icon: Sofa },
      { name: 'Outdoor dining area', icon: Utensils },
      { name: 'Sun loungers', icon: Palmtree },
      { name: 'Hammock', icon: Trees },
      { name: 'Garden', icon: Trees },
    ],
  },
  {
    name: 'Accessibility',
    amenities: [
      { name: 'Step-free access', icon: Accessibility },
      { name: 'Wide doorway', icon: Accessibility },
      { name: 'Accessible bathroom', icon: Accessibility },
      { name: 'Elevator', icon: Accessibility },
    ],
  },
  {
    name: 'Services',
    amenities: [
      { name: 'Breakfast', icon: Coffee },
      { name: 'Cleaning available', icon: Sparkles },
      { name: 'Long term stays allowed', icon: Home },
      { name: 'Luggage dropoff allowed', icon: Home },
    ],
  },
  {
    name: 'House Rules',
    amenities: [
      { name: 'Pets allowed', icon: Dog },
      { name: 'Smoking allowed', icon: Cigarette },
      { name: 'Events allowed', icon: Sparkles },
    ],
  },
];

export function getAllAmenities(): string[] {
  const allAmenities: string[] = [];
  AMENITY_CATEGORIES.forEach(category => {
    category.amenities.forEach(amenity => {
      allAmenities.push(amenity.name);
    });
  });
  return allAmenities;
}

export function getAmenityIcon(amenityName: string) {
  for (const category of AMENITY_CATEGORIES) {
    const amenity = category.amenities.find(a => a.name === amenityName);
    if (amenity) return amenity.icon;
  }
  return Home;
}
