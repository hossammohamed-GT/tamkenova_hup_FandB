import { GalleryImage } from "../../features/gallery-showcase/gallery-showcase.component.js";

/* Real event/training photography, stored locally (no external links).
   Programs = trainings & workshops (12). Events = conferences, ceremonies
   & large gatherings (11). Two uploaded files were deliberately excluded:
   a 206px thumbnail (unusable) and an AI-fabricated Red Crescent scene. */
const PROGRAM_SHOTS: GalleryImage[] = [
  { src: '/images/gallery/gallery-01.jpg', alt: 'TamkeeNova Hub training session with branded rollup' },
  { src: '/images/gallery/gallery-02.jpg', alt: 'Android development trainees group photo' },
  { src: '/images/gallery/gallery-03.jpg', alt: 'Trainees group photo in computer lab' },
  { src: '/images/gallery/gallery-04.jpg', alt: 'Workshop group photo with training flipcharts' },
  { src: '/images/gallery/gallery-05.jpg', alt: 'Classroom training group photo' },
  { src: '/images/gallery/gallery-06.jpg', alt: 'Online training session over video call' },
  { src: '/images/gallery/gallery-07.jpg', alt: 'Trainer presenting at youth center' },
  { src: '/images/gallery/gallery-08.jpg', alt: 'Community awareness session' },
  { src: '/images/gallery/gallery-09.jpg', alt: 'Training with Sudanese community association' },
  { src: '/images/gallery/gallery-10.jpg', alt: 'YLE program participants group photo' },
  { src: '/images/gallery/gallery-11.jpg', alt: 'Red Crescent training room session' },
  { src: '/images/gallery/gallery-12.jpg', alt: 'Red Crescent volunteer training session' },
];

const EVENT_SHOTS: GalleryImage[] = [
  { src: '/images/gallery/gallery-13.jpg', alt: 'IOM Fayoum outdoor youth event' },
  { src: '/images/gallery/gallery-14.jpg', alt: 'TamkeeNova large networking event hall' },
  { src: '/images/gallery/gallery-15.jpg', alt: 'Roundtable discussion between participants' },
  { src: '/images/gallery/gallery-16.jpg', alt: 'Graduation ceremony holding certificates' },
  { src: '/images/gallery/gallery-17.jpg', alt: 'Conference audience in red-seat hall' },
  { src: '/images/gallery/gallery-18.jpg', alt: 'Participant speaking into microphone' },
  { src: '/images/gallery/gallery-19.jpg', alt: 'Speaker addressing conference audience' },
  { src: '/images/gallery/gallery-20.jpg', alt: 'Fayoum program group photo' },
  { src: '/images/gallery/gallery-21.jpg', alt: 'Outdoor team activity under tree' },
  { src: '/images/gallery/gallery-22.jpg', alt: 'Participants networking meeting' },
  { src: '/images/gallery/gallery-23.jpg', alt: 'Speaker on stage at partner event' },
];

export const GALLERY_PROGRAMS_IMAGES: GalleryImage[] = PROGRAM_SHOTS;
export const GALLERY_EVENTS_IMAGES: GalleryImage[] = EVENT_SHOTS;

export const GALLERY_HERO_IMAGES: string[] = [...PROGRAM_SHOTS, ...EVENT_SHOTS].map((img) => img.src);
