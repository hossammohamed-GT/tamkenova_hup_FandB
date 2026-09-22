// Build-time only. The application NEVER draws these fixed elements or words.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
const root = new URL('../public/certificates/', import.meta.url);
const logo = readFileSync(new URL('brand-mark.png', root)).toString('base64');
const fonts = readdirSync(new URL('fonts/', root))
  .filter((f) => f.endsWith('.ttf'))
  .map((f) => new URL(`fonts/${f}`, root).pathname);
const navy = '#004265',
  gold = '#be8a3f',
  muted = '#65757b';
const text = (value, x, y, size = 22, color = navy, family = 'Manrope ExtraLight', extra = '') =>
  `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" fill="${color}" text-anchor="middle" ${extra}>${value}</text>`;
const ar = (value, x, y, size = 24, color = navy) =>
  text(value, x, y, size, color, 'Noto Sans Arabic');
for (const type of ['training', 'volunteer']) {
  const training = type === 'training';
  const ornament = training
    ? `
    <path d="M0 0H112V1273H0Z" fill="${navy}"/>
    <path d="M112 0H128V1273H112Z" fill="${gold}"/>
    <path d="M40 165V48H157 M40 1108V1225H157" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>
    <path d="M1650 56H1744V150 M1650 1217H1744V1123" fill="none" stroke="${gold}" stroke-width="5"/>
    <path d="M0 1010L112 898V1078L0 1190Z" fill="#fff" opacity=".045"/>`
    : `
    <path d="M0 0H1800V35H0Z" fill="${navy}"/><path d="M0 35H1800V41H0Z" fill="${gold}"/>
    <path d="M0 930L343 1273H0Z" fill="${navy}"/><path d="M0 900L373 1273" stroke="${gold}" stroke-width="7"/>
    <g fill="none" stroke="${gold}" opacity=".18"><circle cx="1800" cy="80" r="280"/><circle cx="1800" cy="80" r="305"/><circle cx="1800" cy="80" r="330"/></g>
    <path d="M55 220V85H190" fill="none" stroke="${gold}" stroke-width="3"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1273" viewBox="0 0 1800 1273">
    <rect width="1800" height="1273" fill="#fcfaf5"/>
    <rect x="155" y="64" width="1581" height="1145" fill="none" stroke="${gold}" stroke-opacity=".32"/>
    ${ornament}
    <image href="data:image/png;base64,${logo}" x="212" y="114" width="94" height="92"/>
    ${text('TAMKEENOVA', 479, 150, 31, navy, 'Manrope ExtraLight', 'letter-spacing="4"')}
    ${text('EMPOWERMENT · LEARNING · IMPACT', 480, 186, 13, muted, 'Manrope ExtraLight', 'letter-spacing="1.5"')}
    ${ar('تمكينوفا', 1496, 151, 35)}
    ${ar('تمكين، تعلّم، أثر', 1496, 188, 19, muted)}
    <path d="M212 231H1669" stroke="${gold}" stroke-opacity=".45"/>
    ${ar(training ? 'شهادة إتمام تدريب' : 'شهادة تقدير للتطوع', 945, 312, 46)}
    ${text(training ? 'Certificate of Training' : 'Certificate of Appreciation', 945, 389, training ? 76 : 70, navy, 'Cormorant Garamond Light')}
    ${text(training ? 'PROFESSIONAL DEVELOPMENT' : 'VOLUNTEER RECOGNITION', 945, 430, 15, gold, 'Manrope ExtraLight', 'letter-spacing="5"')}
    ${text('Proudly presented to', 945, 479, 21, muted)}
    ${ar('تُمنح هذه الشهادة إلى', 945, 515, 22, muted)}
    <path d="M485 650H1405" stroke="${gold}" stroke-width="1.5"/>
    <path d="M937 650L945 642L953 650L945 658Z" fill="${gold}"/>
    ${
      training
        ? `${text('For successfully completing the training program', 945, 702, 23, muted)}
      ${ar('تقديرًا لإتمام البرنامج التدريبي بنجاح', 945, 738, 24, muted)}`
        : `${text('In recognition of dedicated service and valuable contributions', 945, 713, 24, muted)}
      ${text('to our community and a lasting, positive impact.', 945, 751, 24, muted)}
      ${ar('تقديرًا للعطاء والمساهمة القيّمة في خدمة المجتمع', 945, 802, 27, muted)}
      ${ar('وصناعة أثر إيجابي مستدام', 945, 845, 27, muted)}`
    }
    <path d="M240 900H1650" stroke="${gold}" stroke-opacity=".45"/>
    <path d="M572 933V1045 M957 933V1045" stroke="${gold}" stroke-opacity=".3"/>
    ${ar(training ? 'ساعات التدريب' : 'ساعات التطوع', 400, 1040, 22, muted)}
    ${text(training ? 'TRAINING HOURS' : 'VOLUNTEER HOURS', 400, 1075, 14, gold, 'Manrope ExtraLight', 'letter-spacing="2"')}
    ${ar('تاريخ الإصدار', 765, 1040, 22, muted)}
    ${text('DATE OF ISSUE', 765, 1075, 14, gold, 'Manrope ExtraLight', 'letter-spacing="2"')}
    ${text('Tamkeenova', 1155, 978, 45, navy, 'Cormorant Garamond Light', 'font-style="italic"')}
    <path d="M1025 995Q1140 980 1275 995 M1018 1008H1292" fill="none" stroke="${gold}"/>
    ${ar('إدارة تمكينوفا', 1155, 1040, 22, muted)}
    ${text('ISSUING ORGANIZATION', 1155, 1075, 13, gold, 'Manrope ExtraLight', 'letter-spacing="1.5"')}
    <rect x="1386" y="921" width="188" height="188" rx="3" fill="white" stroke="${gold}" stroke-opacity=".5"/>
    ${text('SCAN TO VERIFY', 1480, 1142, 13, muted, 'Manrope ExtraLight', 'letter-spacing="1.6"')}
    ${ar('امسح للتحقق', 1480, 1174, 17, muted)}
    ${text('T A M K E E N O V A', 835, 1175, 15, navy)}
    ${ar('نُمكّن اليوم، لنصنع أثر الغد', 835, 1139, 23, gold)}
  </svg>`;
  writeFileSync(new URL(`${type}-v1.svg`, root), svg);
  writeFileSync(
    new URL(`${type}-v1-thumb.png`, root),
    new Resvg(svg, {
      font: { fontFiles: fonts, loadSystemFonts: false },
      fitTo: { mode: 'width', value: 900 },
    })
      .render()
      .asPng(),
  );
  // A4 landscape at approximately 300 dpi. All text is baked into these pixels.
  writeFileSync(
    new URL(`${type}-v1.png`, root),
    new Resvg(svg, {
      font: { fontFiles: fonts, loadSystemFonts: false },
      fitTo: { mode: 'width', value: 3508 },
    })
      .render()
      .asPng(),
  );
}
