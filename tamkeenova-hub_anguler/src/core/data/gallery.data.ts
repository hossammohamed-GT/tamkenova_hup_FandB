import { GalleryImage } from "../../features/gallery-showcase/gallery-showcase.component.js";
const ALL_GALLERY_IMAGES: GalleryImage[] = Array.from({ length: 8 }, (_, i) => {
  const index = i + 1;
  return {
    src: `/images/gallarys/gallary${index}.jpg`,
    alt: `TamkeeNova gallery photo ${index}`,
  };
});

export const GALLERY_HERO_IMAGES: string[] = ALL_GALLERY_IMAGES.map((img) => img.src);

export const GALLERY_PROGRAMS_IMAGES: GalleryImage[] = ALL_GALLERY_IMAGES.slice(0, 4);
export const GALLERY_EVENTS_IMAGES: GalleryImage[] = ALL_GALLERY_IMAGES.slice(4, 8);
