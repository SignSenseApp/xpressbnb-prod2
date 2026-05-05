/**
 * Static "Experiences in Rishikesh" cards displayed near the page footer.
 */

export interface RishikeshExperience {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
}

export const RISHIKESH_EXPERIENCES: RishikeshExperience[] = [
  {
    id: 'rafting',
    title: 'White Water Rafting',
    subtitle: 'Starting from ₹1,200 / person',
    imageUrl:
      'https://images.pexels.com/photos/1655329/pexels-photo-1655329.jpeg?auto=compress&w=900',
    imageAlt: 'White water rafting on a river',
  },
  {
    id: 'yoga',
    title: 'Sunrise Yoga by the Ganga',
    subtitle: 'Starting from ₹500 / person',
    imageUrl:
      'https://images.pexels.com/photos/3822621/pexels-photo-3822621.jpeg?auto=compress&w=900',
    imageAlt: 'Sunrise yoga by a river',
  },
  {
    id: 'walks',
    title: 'Guided Nature Walks',
    subtitle: 'Starting from ₹400 / person',
    imageUrl:
      'https://images.pexels.com/photos/235621/pexels-photo-235621.jpeg?auto=compress&w=900',
    imageAlt: 'Guided nature walk in a forest',
  },
  {
    id: 'trekking',
    title: 'Trekking in the Himalayas',
    subtitle: 'Starting from ₹1,500 / person',
    imageUrl:
      'https://images.pexels.com/photos/1271619/pexels-photo-1271619.jpeg?auto=compress&w=900',
    imageAlt: 'Mountain trekking',
  },
  {
    id: 'food',
    title: 'Local Food Trail',
    subtitle: 'Starting from ₹700 / person',
    imageUrl:
      'https://images.pexels.com/photos/958546/pexels-photo-958546.jpeg?auto=compress&w=900',
    imageAlt: 'Local Indian food trail',
  },
];
