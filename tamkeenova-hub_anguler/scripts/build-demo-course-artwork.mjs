
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import jpeg from 'jpeg-js';
const root = new URL('../', import.meta.url);
const courses = JSON.parse(await readFile(new URL('../../tamkeenova-api/prisma/demo-catalog/courses.json', import.meta.url), 'utf8'));
const target = new URL('public/assets/demo-courses/', root);
await mkdir(target, { recursive: true });
const extra = [1, 2, 3].map(position => ({ category: 'business-professional-skills', position, cover: `/assets/demo-courses/generic-${position}.jpg` }));
for (const course of [...courses, ...extra]) {
  const photo = await readFile(new URL(`public/assets/course-categories/${course.category}.jpg`, root));
  const x = ['-50', '0', '-110'][course.position - 1];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
    <defs><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#002d3c" stop-opacity="0"/><stop offset="1" stop-color="#002d3c" stop-opacity=".9"/></linearGradient></defs>
    <image href="data:image/jpeg;base64,${photo.toString('base64')}" x="${x}" y="0" width="760" height="420" preserveAspectRatio="xMidYMid slice"/>
    <rect width="640" height="360" fill="url(#shade)"/>
    <path d="M480 0 640 95v70L420 0M640 220 420 360h80l140-92" fill="#dfac55" opacity=".23"/>
    <rect x="28" y="26" width="146" height="29" rx="14" fill="#fff8e9"/>
    <text x="43" y="46" font-size="15" font-family="sans-serif" fill="#73511d">DEMO COURSE 0${course.position}</text>
    <text x="28" y="323" font-size="22" font-family="sans-serif" fill="#ffffff">TamkeeNova Learning</text>
    <path d="M28 283h56" stroke="#e2b562" stroke-width="3"/>
  </svg>`;
  const png = new Resvg(svg).render();
  const rgba = { data: png.pixels, width: png.width, height: png.height };
  await writeFile(new URL(course.cover.split('/').pop(), target), jpeg.encode(rgba, 85).data);
}
console.log(`Generated ${courses.length + extra.length} local demo covers.`);
