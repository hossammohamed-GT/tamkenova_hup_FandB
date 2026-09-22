import { GalleryImage } from "../../features/gallery-showcase/gallery-showcase.component.js";

/* Real event/training photography, stored locally (no external links).
   Files are ordered by quality (largest/highest-resolution first):
   gallery-01..04 feed the home hero rotation; the full set feeds the
   gallery marquee + the two sections below (even half/half split). */
const PROGRAM_SHOTS = [
  'gallery-01',
  'gallery-02',
  'gallery-03',
  'gallery-04',
  'gallery-05',
  'gallery-06',
  'gallery-07',
  'gallery-08',
  'gallery-09',
  'gallery-10',
  'gallery-11',
  'gallery-12',
];

const EVENT_SHOTS = [
  'gallery-13',
  'gallery-14',
  'gallery-15',
  'gallery-16',
  'gallery-17',
  'gallery-18',
  'gallery-19',
  'gallery-20',
  'gallery-21',
  'gallery-22',
  'gallery-23',
  'gallery-24',
];

const toImage = (name: string, section: string): GalleryImage => ({
  src: `/images/gallery/${name}.jpg`,
  alt: `TamkeeNova ${section} photo`,
});

export const GALLERY_PROGRAMS_IMAGES: GalleryImage[] = PROGRAM_SHOTS.map((n) => toImage(n, 'training program'));
export const GALLERY_EVENTS_IMAGES: GalleryImage[] = EVENT_SHOTS.map((n) => toImage(n, 'event'));

export const GALLERY_HERO_IMAGES: string[] = [...GALLERY_PROGRAMS_IMAGES, ...GALLERY_EVENTS_IMAGES].map(
  (img) => img.src,
);
