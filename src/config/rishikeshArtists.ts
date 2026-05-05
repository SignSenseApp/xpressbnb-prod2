/**
 * Live artists/experiences shown on the Rishikesh stays page.
 * Each card opens a WhatsApp deep-link to the central XpressBnB line.
 */

export interface RishikeshArtist {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
  priceInr: number;
  durationLabel: string;
  whatsappPrefill: string;
}

export const RISHIKESH_ARTISTS: RishikeshArtist[] = [
  {
    id: 'guitarist',
    title: 'Guitarist – Acoustic Vibes',
    subtitle: 'Perfect for evenings by the Ganga',
    imageUrl:
      'https://images.pexels.com/photos/1370545/pexels-photo-1370545.jpeg?auto=compress&w=900',
    imageAlt: 'Acoustic guitarist performing live',
    priceInr: 1500,
    durationLabel: '60 mins',
    whatsappPrefill:
      'Hi — I want to book a Guitarist (Acoustic Vibes) for my Rishikesh stay. Please share availability.',
  },
  {
    id: 'yoga',
    title: 'Yoga Instructor',
    subtitle: 'Private yoga & meditation sessions',
    imageUrl:
      'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&w=900',
    imageAlt: 'Yoga instructor in a peaceful setting',
    priceInr: 1200,
    durationLabel: '60 mins',
    whatsappPrefill:
      'Hi — I want to book a private Yoga Instructor for my Rishikesh stay. Please share availability.',
  },
  {
    id: 'storyteller',
    title: 'Storyteller / Performer',
    subtitle: 'Local tales, culture & traditions',
    imageUrl:
      'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&w=900',
    imageAlt: 'Storyteller performing for an audience',
    priceInr: 1800,
    durationLabel: '60 mins',
    whatsappPrefill:
      'Hi — I want to book a Storyteller / Performer for my Rishikesh stay. Please share availability.',
  },
];
