// Every photo on the public website, in one place, so the shop can swap in
// its own pictures without touching the pages.
//
// To use a photo: put the file in `public/photos/` and set `src` below to its
// path (for example "/photos/bench.jpg"). Use your own photos, or free-licence
// stock (Unsplash, Pexels) with no faces and no other shop's name or signs.
// While `src` is null, the page shows a simple drawing instead.

export type SiteImage = {
  /** Path under /public, e.g. "/photos/bench.jpg". null shows the drawing. */
  src: string | null;
  /** Describes the photo for screen readers. */
  alt: string;
};

export const SITE_IMAGES = {
  /** The big blue card beside the headline. A phone on the bench works well. */
  hero: { src: null, alt: "A phone being repaired on the bench" },
  /** Services: chip-level board repair, e.g. a board under the microscope. */
  boardRepair: { src: null, alt: "A phone circuit board being repaired" },
  /** Services: screens and batteries. */
  screens: { src: null, alt: "A phone screen being replaced" },
  /** Services: water damage. */
  waterDamage: { src: null, alt: "A water-damaged phone being cleaned" },
} satisfies Record<string, SiteImage>;
