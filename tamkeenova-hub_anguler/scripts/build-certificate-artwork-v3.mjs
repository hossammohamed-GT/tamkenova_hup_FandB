// 2026.3: reference-inspired ornamental design. All fixed copy is baked into artwork.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
const encode = (png, quality) => jpeg.encode(PNG.sync.read(png), quality).data;
const root = new URL('../public/certificates/', import.meta.url);
const logo = readFileSync(new URL('brand-mark.png', root)).toString('base64');
const background = readFileSync(new URL('ornate-v3-background.jpg', root)).toString('base64');
const fonts = readdirSync(new URL('fonts/', root))
  .filter((f) => f.endsWith('.ttf'))
  .map((f) => new URL(`fonts/${f}`, root).pathname);
const navy = '#102c40',
  gold = '#9d793d';
const text = (value, x, y, size = 22, color = navy, family = 'Manrope ExtraLight', extra = '') =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="${family}" font-size="${size}" fill="${color}" ${extra}>${value}</text>`;
for (const type of ['training', 'experience'])
  for (const lang of ['ar', 'en'])
    for (const partners of [false, true]) {
      const arabic = lang === 'ar',
        training = type === 'training';
      const label = (en, ar, x, y, size = 15, color = navy) =>
        text(
          arabic ? ar : en,
          arabic ? 1800 - x : x,
          y,
          arabic ? size + 5 : size,
          color,
          arabic ? 'Noto Sans Arabic' : 'Manrope ExtraLight',
          arabic ? '' : 'letter-spacing="2"',
        );
      const qx = arabic ? 418 : 1240;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1273" viewBox="0 0 1800 1273">
    <image href="ornate-v3-background.jpg" width="1800" height="1273" preserveAspectRatio="none"/>
    <image href="data:image/png;base64,${logo}" x="847" y="72" width="106" height="106"/>
    ${text(arabic ? 'تمكينوفا' : 'TAMKEENOVA', 900, 219, arabic ? 45 : 29, navy, arabic ? 'Amiri' : 'Manrope ExtraLight', arabic ? '' : 'letter-spacing="4"')}
    ${label('PEOPLE · POTENTIAL · PROFESSIONAL GROWTH', 'نُمكّن الإنسان ونبني المستقبل', 900, 253, 13, gold)}
    ${arabic ? text(training ? 'شهادة إتمام تدريب' : 'شهادة خبرة', 900, 377, 110, navy, 'Amiri') : `${text('CERTIFICATE', 900, 354, 114, navy, 'Cormorant Garamond Light')}${text(training ? 'OF COMPLETION' : 'OF EXPERIENCE', 900, 407, 45, gold, 'Cormorant Garamond Light', 'letter-spacing="7"')}`}
    ${label('THIS CERTIFIES THAT', 'تشهد تمكينوفا بأن', 900, 451, 17)}
    <path d="M490 605H877 M923 605H1310" stroke="${gold}" stroke-width="2"/>
    <path d="M900 594L909 605L900 616L891 605Z" fill="${gold}"/>
    ${training ? `${label('HAS SUCCESSFULLY COMPLETED THE', 'قد أتم بنجاح البرنامج التدريبي', 900, 641, 16)}${label('In recognition of dedication, practical learning and professional development.', 'تقديرًا للالتزام بالتعلّم والتطبيق العملي وتنمية المهارات المهنية', 900, 780, 15)}` : `${label('HAS GAINED PRACTICAL EXPERIENCE THROUGH', 'قد اكتسب خبرة عملية من خلال', 900, 659, 17)}${text(arabic ? 'التدريب العملي وتنمية المهارات المهنية' : 'Practical Training &amp; Professional Development', 900, 715, arabic ? 37 : 39, navy, arabic ? 'Amiri' : 'Cormorant Garamond Light')}${label('In recognition of commitment, acquired skills and successful participation.', 'تقديرًا للالتزام والمهارات المكتسبة والمشاركة الفاعلة', 900, 775, 15)}`}
    <path d="M${arabic ? 770 : 710} 839V921 M${arabic ? 1090 : 1030} 839V921" stroke="${gold}" opacity=".55"/>
    ${label('ISSUE DATE', 'تاريخ الإصدار', 520, 843, 13, gold)}
    ${label('TRAINING HOURS', 'ساعات التدريب', 870, 843, 13, gold)}
    ${label('CERTIFICATE ID', 'رقم الشهادة', 1255, 843, 13, gold)}
    <path d="M670 1080H1130" stroke="${gold}" stroke-width="1.5"/>
    ${label('AUTHORIZED SIGNATURE', 'التوقيع المعتمد', 900, 1110, 12, gold)}
    <rect x="${qx - 5}" y="944" width="152" height="152" fill="#fffdf8" stroke="${gold}"/>
    ${label('SCAN TO VERIFY', 'امسح للتحقق', 1311, 1116, 10)}
    ${partners ? label('IN COLLABORATION WITH', 'بالشراكة مع', 900, 1141, 10, gold) : text(arabic ? 'نُمكّن اليوم، لنصنع أثر الغد' : 'Empowering people. Shaping tomorrow.', 900, 1184, arabic ? 29 : 29, gold, arabic ? 'Amiri' : 'Cormorant Garamond Light')}
  </svg>`;
      const stem = `${type}-${lang}-v3${partners ? '-partners' : ''}`;
      writeFileSync(new URL(`${stem}.svg`, root), svg);
      const raster = svg.replace(
        'href="ornate-v3-background.jpg"',
        `href="data:image/jpeg;base64,${background}"`,
      );
      writeFileSync(
        new URL(`${stem}.jpg`, root),
        encode(
          new Resvg(raster, {
            font: { fontFiles: fonts, loadSystemFonts: false },
            fitTo: { mode: 'width', value: 3508 },
          })
            .render()
            .asPng(),
          96,
        ),
      );
      if (!partners)
        writeFileSync(
          new URL(`${type}-${lang}-v3-thumb.jpg`, root),
          encode(
            new Resvg(raster, {
              font: { fontFiles: fonts, loadSystemFonts: false },
              fitTo: { mode: 'width', value: 900 },
            })
              .render()
              .asPng(),
            92,
          ),
        );
      console.log(stem);
    }
