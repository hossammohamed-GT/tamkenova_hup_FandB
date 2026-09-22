// 2026.2 edition. Build-time artwork only; no fixed wording is painted at runtime.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
const root = new URL('../public/certificates/', import.meta.url);
const logo = readFileSync(new URL('brand-mark.png', root)).toString('base64');
const fonts = readdirSync(new URL('fonts/', root))
  .filter((f) => f.endsWith('.ttf'))
  .map((f) => new URL(`fonts/${f}`, root).pathname);
const navy = '#004265',
  gold = '#be8a3f',
  ink = '#164358',
  muted = '#61727b',
  paper = '#fcfaf5';
const text = (value, x, y, size = 22, color = ink, family = 'Manrope ExtraLight', extra = '') =>
  `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" fill="${color}" text-anchor="middle" ${extra}>${value}</text>`;
const ar = (value, x, y, size = 24, color = ink, extra = '') =>
  text(value, x, y, size, color, 'Noto Sans Arabic', extra);
const mark = (x, y, size) =>
  `<image href="data:image/png;base64,${logo}" x="${x}" y="${y}" width="${size}" height="${size}"/>`;
const line = (x1, y, x2, color = gold, opacity = '.5') =>
  `<path d="M${x1} ${y}H${x2}" stroke="${color}" opacity="${opacity}"/>`;
function seal(x, y, r) {
  const points = Array.from({ length: 48 }, (_, i) => {
    const a = (Math.PI * i) / 24;
    const radius = i % 2 ? r * 0.94 : r;
    return `${x + Math.cos(a) * radius},${y + Math.sin(a) * radius}`;
  }).join(' ');
  return `<polygon points="${points}" fill="url(#foil)"/><circle cx="${x}" cy="${y}" r="${r * 0.82}" stroke="#765025" fill="none"/><circle cx="${x}" cy="${y}" r="${r * 0.72}" stroke="#fcfaf5" fill="none" opacity=".7"/>${mark(x - r * 0.31, y - r * 0.31, r * 0.62)}`;
}
for (const type of ['training', 'volunteer'])
  for (const lang of ['ar', 'en'])
    for (const partners of [false, true]) {
      const training = type === 'training',
        arabic = lang === 'ar';
      const center = training ? 1035 : 900;
      const label = (en, arabicText, x, y, size = 14, color = muted) =>
        arabic
          ? ar(arabicText, x, y, size + 5, color)
          : text(en, x, y, size, color, 'Manrope ExtraLight', 'letter-spacing="1.8"');
      let decoration;
      if (training)
        decoration = `
    <rect width="290" height="1273" fill="url(#navy)"/>
    <path d="M290 0H300V1273H290Z" fill="url(#foil)"/>
    <g stroke="#ffffff" fill="none" opacity=".055" stroke-width="22"><path d="M-45 540V318H233V540 M22 540V383H170V540"/><path d="M-45 1100V1322H233V1100 M22 1100V1257H170V1100"/></g>
    <rect x="79" y="94" width="132" height="132" rx="2" fill="${paper}"/>${mark(100, 114, 90)}
    ${arabic ? text('تمكينوفا', 145, 273, 38, '#fff', 'Amiri') : text('TAMKEENOVA', 145, 263, 19, '#fff', 'Manrope ExtraLight', 'letter-spacing="2"')}
    ${line(84, 305, 206, gold, '.8')}
    ${arabic ? `${text('نتعلّم.', 145, 478, 48, '#fff', 'Amiri')}${text('نتطوّر.', 145, 552, 48, '#fff', 'Amiri')}${text('نُلهم.', 145, 626, 48, '#dfb779', 'Amiri')}` : `${text('LEARN.', 145, 470, 29, '#fff', 'Manrope ExtraLight', 'letter-spacing="3"')}${text('GROW.', 145, 540, 29, '#fff', 'Manrope ExtraLight', 'letter-spacing="3"')}${text('LEAD.', 145, 610, 29, '#dfb779', 'Manrope ExtraLight', 'letter-spacing="3"')}`}
    ${seal(145, 995, 80)}
    ${label('BUILT ON POTENTIAL', 'نؤمن بالإمكانات', 145, 1132, 11, '#e6c799')}
    <rect x="340" y="66" width="1384" height="1184" fill="none" stroke="${gold}" opacity=".3"/>
    <path d="M395 102H1690V188 M1674 1202H1690V1132" fill="none" stroke="${gold}" stroke-width="2"/>
    ${label('TAMKEENOVA  /  PROFESSIONAL DEVELOPMENT', 'تمكينوفا للتطوير المهني', center, 160, 12)}
  `;
      else
        decoration = `
    <path d="M0 0H1800V16H0Z" fill="${navy}"/>
    <path d="M1570 0H1800V230Z" fill="url(#navy)"/>
    <path d="M1527 0L1800 273 M1551 0L1800 249" stroke="${gold}" fill="none" opacity=".7"/>
    <path d="M0 1060V1273H213Z" fill="${navy}"/><path d="M0 1028L245 1273" stroke="${gold}" fill="none" stroke-width="3"/>
    <rect x="65" y="66" width="1670" height="1140" fill="none" stroke="${gold}" opacity=".4"/>
    ${mark(135, 110, 74)}
    ${arabic ? `${text('تمكينوفا', 373, 143, 42, navy, 'Amiri')}${ar('للعطاء أثر يبقى', 373, 180, 18, muted)}` : `${text('TAMKEENOVA', 373, 141, 28, navy, 'Manrope ExtraLight', 'letter-spacing="3"')}${text('EMPOWERMENT THROUGH IMPACT', 373, 179, 12, muted, 'Manrope ExtraLight', 'letter-spacing="1.5"')}`}
    ${seal(1560, 157, 49)}
    ${line(145, 223, 1655, gold, '.4')}
    <g fill="none" stroke="${gold}" opacity=".06"><circle cx="1810" cy="580" r="350"/><circle cx="1810" cy="580" r="377"/><circle cx="1810" cy="580" r="404"/><circle cx="-190" cy="850" r="400"/><circle cx="-190" cy="850" r="430"/></g>
  `;
      const hx = training ? 555 : 425,
        dx = training ? 905 : 755,
        sx = training ? 1230 : 1080,
        qx = training ? 1465 : 1385;
      let artwork = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1273" viewBox="0 0 1800 1273">
    <defs>
      <linearGradient id="navy" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#004265"/><stop offset="1" stop-color="#092c40"/></linearGradient>
      <linearGradient id="foil"><stop stop-color="#a36b2d"/><stop offset=".28" stop-color="#ead3a3"/><stop offset=".65" stop-color="#be8a3f"/><stop offset="1" stop-color="#d9b478"/></linearGradient>
      <pattern id="paper" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".5" fill="#786e54" opacity=".035"/></pattern>
    </defs>
    <rect width="1800" height="1273" fill="${paper}"/><rect width="1800" height="1273" fill="url(#paper)"/>
    ${decoration}
    ${label(training ? 'LEARNING &amp; DEVELOPMENT' : 'HONOURING SERVICE &amp; IMPACT', training ? 'للتعلّم والنمو المهني' : 'تقديرًا للعطاء والأثر', center, training ? 240 : arabic ? 258 : 278, 15, gold)}
    ${arabic ? text(training ? 'شهادة إتمام تدريب' : 'شهادة تقدير للتطوع', center, 360, training ? 94 : 92, navy, 'Amiri') : text(training ? 'Certificate of Training' : 'Certificate of Appreciation', center, training ? 355 : 385, training ? 88 : 82, navy, 'Cormorant Garamond Light')}
    ${label('PROUDLY PRESENTED TO', 'تُمنح هذه الشهادة بكل تقدير إلى', center, 441, 17, muted)}
    <path d="M${center - 405} 611H${center - 14} M${center + 14} 611H${center + 405}" stroke="${gold}" opacity=".65"/><path d="M${center} 604L${center + 7} 611L${center} 618L${center - 7} 611Z" fill="${gold}"/>
    ${training ? (arabic ? ar('تقديرًا لإتمام البرنامج التدريبي بنجاح', center, 650, 25, muted) : text('For successfully completing the professional training program', center, 650, 22, muted)) : arabic ? `${ar('تقديرًا للتفاني في العمل التطوعي والمساهمة القيّمة', center, 682, 29, muted)}${ar('في خدمة المجتمع وصناعة أثر إيجابي مستدام', center, 730, 29, muted)}` : `${text('In sincere appreciation of your dedication to volunteer service', center, 682, 25, muted)}${text('and the meaningful impact you create in our community.', center, 730, 25, muted)}`}
    ${training ? (arabic ? ar('مع أطيب التمنيات بمزيد من التميّز والنجاح', center, 810, 20, muted) : text('In recognition of commitment, achievement and continued growth.', center, 810, 19, muted)) : ''}
    ${line(training ? 415 : 255, 851, training ? 1655 : 1575, gold, '.4')}
    <path d="M${training ? 720 : 580} 889V992 M${training ? 1085 : 930} 889V992" stroke="${gold}" opacity=".25"/>
    ${label(training ? 'TRAINING HOURS' : 'VOLUNTEER HOURS', training ? 'ساعات التدريب' : 'ساعات التطوع', hx, 995, 13)}
    ${label('DATE OF ISSUE', 'تاريخ الإصدار', dx, 995, 13)}
    ${arabic ? text('إدارة تمكينوفا', sx, 934, 42, navy, 'Amiri') : text('Tamkeenova', sx, 929, 45, navy, 'Cormorant Garamond Light', 'font-style="italic"')}
    <path d="M${sx - 125} 949Q${sx} 936 ${sx + 125} 950 M${sx - 125} 961H${sx + 125}" fill="none" stroke="${gold}" opacity=".8"/>
    ${label('ISSUING ORGANIZATION', 'الجهة المانحة', sx, 995, 11)}
    <rect x="${qx - 7}" y="861" width="178" height="178" fill="white" stroke="${gold}" stroke-opacity=".4"/>
    ${label('SCAN TO VERIFY', 'امسح للتحقق', qx + 82, 1060, 10)}
    ${line(training ? 415 : 255, 1084, training ? 1655 : 1575, gold, '.4')}
    ${partners ? label('IN COLLABORATION WITH', 'بالشراكة مع', center, 1111, 11, gold) : arabic ? text('نُمكّن اليوم، لنصنع أثر الغد', center, 1180, 35, navy, 'Amiri') : text('Empowering people. Shaping tomorrow.', center, 1180, 36, navy, 'Cormorant Garamond Light', 'font-style="italic"')}
    ${label('TAMKEENOVA  ·  LEARNING WITH PURPOSE', 'تمكينوفا، تعلّم يصنع الفارق', center, training ? 1237 : 1246, 10, muted)}
  </svg>`;
      // Arabic is a true RTL composition, not just translated English text.
      // Mirror the geometry, while keeping text and the official logo upright.
      if (arabic) {
        artwork = artwork
          .replace(
            /<text x="([0-9.]+)"/g,
            (_, x) => `<text transform="translate(${Number(x) * 2} 0) scale(-1 1)" x="${x}"`,
          )
          .replace(
            /<image ([^>]*?)x="([0-9.]+)"([^>]*?)width="([0-9.]+)"/g,
            (_, before, x, middle, w) =>
              `<image transform="translate(${Number(x) * 2 + Number(w)} 0) scale(-1 1)" ${before}x="${x}"${middle}width="${w}"`,
          )
          .replace('</defs>', '</defs><g transform="translate(1800 0) scale(-1 1)">')
          .replace('</svg>', '</g></svg>');
      }
      const name = `${type}-${lang}-v2${partners ? '-partners' : ''}`;
      writeFileSync(new URL(`${name}.svg`, root), artwork);
      const render = (width) =>
        new Resvg(artwork, {
          font: { fontFiles: fonts, loadSystemFonts: false },
          fitTo: { mode: 'width', value: width },
        })
          .render()
          .asPng();
      writeFileSync(new URL(`${name}.png`, root), render(3508));
      if (!partners) writeFileSync(new URL(`${name}-thumb.png`, root), render(900));
    }
