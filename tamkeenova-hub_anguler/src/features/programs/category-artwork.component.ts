import { Component, computed, input } from '@angular/core';



export const CATEGORY_SHAPES: Readonly<Record<string, string>> = {
  'business-professional-skills': 'M20 104 L157 24 Q175 14 193 26 L333 111 Q350 120 350 141 L350 234 Q350 253 332 264 L186 325 Q164 336 144 325 L16 253 Q4 246 4 226 L4 130 Q4 113 20 104Z',
  'technology-innovation': 'M22 85 L169 4 Q184 -3 199 7 L334 89 Q352 101 352 121 L348 233 Q346 248 331 259 L174 335 Q158 342 142 331 L12 251 Q3 244 3 228 L7 111 Q8 95 22 85Z',
  'arts-design-media': 'M26 92 L160 12 Q179 0 200 13 L333 94 Q353 106 353 128 L347 234 Q346 254 327 266 L189 328 Q169 339 148 329 L24 262 Q5 252 5 231 L5 126 Q4 105 26 92Z',
  wellbeing: 'M27 88 L163 14 Q183 2 205 16 L329 91 Q352 104 353 127 L350 226 Q350 249 329 263 L195 325 Q170 339 148 327 L25 263 Q4 251 4 229 L5 126 Q4 102 27 88Z',
  'education-academics': 'M18 111 L150 27 Q167 17 186 25 L332 103 Q350 112 350 130 L356 218 Q357 234 343 245 L312 263 L195 333 Q178 344 160 334 L21 264 Q4 255 4 235 L4 137 Q4 121 18 111Z',
  lifestyle: 'M25 83 L157 14 Q178 4 199 15 L337 91 Q356 102 356 125 L350 223 Q350 245 330 259 L194 322 Q176 333 157 323 L23 252 Q6 243 6 222 L4 114 Q4 94 25 83Z',
};
export const CATEGORY_FRONTS: Readonly<Record<string, string>> = {
  'business-professional-skills': 'M0 112Q23 88 59 112L221 193Q247 208 277 191L360 143V340H0Z',
  'technology-innovation': 'M0 103Q17 78 49 96L229 180Q258 197 286 179L360 133V340H0Z',
  'arts-design-media': 'M0 105Q24 79 58 106L225 183C258 199 275 192 301 173L360 151V340H0Z',
  wellbeing: 'M0 108C21 77 47 99 80 116L224 182C257 199 276 198 302 178L360 145V340H0Z',
  'education-academics': 'M0 121Q23 94 53 111L225 188Q254 204 285 185L360 153V340H0Z',
  lifestyle: 'M0 101Q28 79 60 103L223 179Q256 193 284 175L360 138V340H0Z',
};
const DEFAULT_SHAPE = CATEGORY_SHAPES['business-professional-skills'];

@Component({
  selector: 'app-category-artwork',
  standalone: true,
  templateUrl: './category-artwork.component.html',
  styleUrl: './category-artwork.component.css',
})
export class CategoryArtworkComponent {
  readonly slug = input.required<string>();
  readonly image = input<string | null>(null);
  readonly outline = computed(() => CATEGORY_SHAPES[this.slug()] ?? DEFAULT_SHAPE);
  readonly front = computed(() => CATEGORY_FRONTS[this.slug()] ?? CATEGORY_FRONTS['business-professional-skills']);

  readonly uid = computed(() => 'category-art-' + Array.from(this.slug()).map(c => c.codePointAt(0)!.toString(16)).join('-'));
  ref(name: string): string { return `url(#${this.uid()}-${name})`; }
}
