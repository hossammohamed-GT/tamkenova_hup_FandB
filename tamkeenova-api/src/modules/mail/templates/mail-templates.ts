const LOGO_URL = 'https://tamkeenova-hub.vercel.app/images/logo.svg';
const APP_URL = 'https://tamkeenova-hub.vercel.app';

type Variant = 'primary' | 'success' | 'danger';

const PALETTE: Record<
  Variant,
  { dark: string; deep: string; glow: string; glowSoft: string }
> = {
  primary: {
    dark: '#004265',
    deep: '#012636',
    glow: '#D9AE6F',
    glowSoft: 'rgba(217,174,111,0.35)',
  },
  success: {
    dark: '#1F5C43',
    deep: '#0E3327',
    glow: '#6FCBA3',
    glowSoft: 'rgba(111,203,163,0.35)',
  },
  danger: {
    dark: '#7A2E27',
    deep: '#3F1613',
    glow: '#E5897E',
    glowSoft: 'rgba(229,137,126,0.35)',
  },
};

const BASE = {
  background: '#EEF1F6',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F7F9',
  border: '#E1E6EA',
  text: '#101E27',
  textMuted: '#5B6B74',
  gold: '#BE8A3F',
  goldLight: '#D9AE6F',
};





// Handle esc
function esc(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}



// Handle spacer
function spacer(height = 14): string {
  return `<div style="height:${height}px; line-height:${height}px; font-size:1px;">&nbsp;</div>`;
}



// Handle section title
function sectionTitle(text: string): string {
  return `<p style="margin:0 0 12px; color:${BASE.text}; font-size:14.5px; font-weight:800;">
    <span style="display:inline-block; vertical-align:middle; width:16px; height:4px; border-radius:2px; background-color:${BASE.gold}; margin:0 0 2px 8px;"></span>${esc(text)}
  </p>`;
}


type Row = {
  label: string;
  value: string;
  ltr?: boolean;
  raw?: boolean;
};


// Handle info card
function infoCard(rows: Row[], accent?: Variant): string {
  const accentColor = accent ? PALETTE[accent].dark : BASE.gold;
  const rowsHtml = rows
    .map(
      (r, i) => `
                <tr>
                  <td style="padding:15px 20px; ${i > 0 ? `border-top:1px solid ${BASE.border};` : ''}">
                    <p style="margin:0 0 4px; color:${BASE.textMuted}; font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase;">${esc(r.label)}</p>
                    <p style="margin:0; color:${BASE.text}; font-size:15px; font-weight:600; line-height:1.75; ${r.ltr ? 'direction:ltr; text-align:right;' : ''}">${r.raw ? r.value : esc(r.value)}</p>
                  </td>
                </tr>`,
    )
    .join('');

  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BASE.surfaceAlt}; border:1px solid ${BASE.border}; border-radius:14px; border-inline-start:4px solid ${accentColor}; overflow:hidden;">
                ${rowsHtml}
              </table>`;
}



// Handle quote
function quote(text: string): string {
  return `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BASE.surface}; border:1.5px dashed ${BASE.border}; border-radius:12px;">
                <tr>
                  <td style="padding:14px 18px; color:${BASE.textMuted}; font-size:13.5px; line-height:1.9;">${esc(text)}</td>
                </tr>
              </table>`;
}



// Handle cta button
function ctaButton(text: string, url: string): string {
  return `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg, ${BASE.goldLight} 0%, ${BASE.gold} 100%); border-radius:999px; box-shadow:0 8px 18px rgba(190,138,63,0.35);">
                    <a href="${url}" target="_blank" style="display:inline-block; padding:13px 36px; color:#012636; font-size:14px; font-weight:800; text-decoration:none; border-radius:999px;">${esc(text)}</a>
                  </td>
                </tr>
              </table>`;
}



// Handle note
function note(text: string): string {
  return `<p style="margin:18px 0 0; color:${BASE.textMuted}; font-size:12.5px; line-height:1.9; text-align:center;">${esc(text)}</p>`;
}



// Handle chips
function chips(items: string[]): string {
  return items
    .map(
      (c) => `<span style="display:inline-block; background-color:${BASE.surface}; border:1px solid ${BASE.border}; border-radius:999px; padding:6px 14px; margin:0 0 8px 6px; color:${BASE.text}; font-size:12.5px; font-weight:600;">${esc(c)}</span>`,
    )
    .join('');
}


const PRIORITY_META: Record<
  string,
  { label: string; bg: string; fg: string }
> = {
  LOW: { label: 'منخفضة', bg: '#E7F1EC', fg: '#1F5C43' },
  MEDIUM: { label: 'متوسطة', bg: '#E8F0FA', fg: '#1D4E89' },
  HIGH: { label: 'عالية', bg: '#FCF0E3', fg: '#9A5B12' },
  URGENT: { label: 'عاجلة', bg: '#FBEAE8', fg: '#7A2E27' },
};


// Handle priority badge
function priorityBadge(priority?: string): string {
  const key = (priority || 'MEDIUM').toUpperCase();
  const meta = PRIORITY_META[key] || PRIORITY_META.MEDIUM;
  return `<span style="display:inline-block; padding:4px 16px; border-radius:999px; background-color:${meta.bg}; color:${meta.fg}; font-size:12.5px; font-weight:800;">${meta.label}</span>`;
}





// Handle hero section
function heroSection(
  variant: Variant,
  eyebrow: string,
  title: string,
  subtitle: string,
): string {
  const p = PALETTE[variant];
  return `
          <tr>
            <td align="center" bgcolor="${p.dark}" style="background: linear-gradient(135deg, ${p.dark} 0%, ${p.deep} 100%); padding: 44px 32px 40px;">

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 22px;">
                <tr>
                  <td align="center" bgcolor="#FFFFFF" style="width:92px; height:92px; border-radius:50%; background-color:#FFFFFF; box-shadow: 0 0 0 6px ${p.glowSoft}, 0 0 34px 6px ${p.glowSoft};">
                    <table role="presentation" width="92" height="92" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" valign="middle" style="width:92px; height:92px;">
                          <img src="${LOGO_URL}" alt="TamkeeNova" width="52" style="width:52px; height:auto;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 10px; color:${p.glow}; font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase;">
                ${esc(eyebrow)}
              </p>

              <h1 style="margin:0 0 12px; color:#FFFFFF; font-size:24px; font-weight:800; line-height:1.4;">
                ${esc(title)}
              </h1>

              <p style="margin:0; color:rgba(255,255,255,0.75); font-size:14px; line-height:1.9; max-width:340px; display:inline-block;">
                ${esc(subtitle)}
              </p>
            </td>
          </tr>`;
}



// Handle wrap email
function wrapEmail(
  variant: Variant,
  heroHtml: string,
  bodyContent: string,
): string {
  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>TamkeeNova HUB</title>
  <style>
    body, table, td { font-family: 'Tahoma', 'Segoe UI', Arial, sans-serif; }
    body { margin: 0; padding: 0; background-color: ${BASE.background}; }
    img { border: 0; display: block; }
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; }
      .email-padding { padding-left: 22px !important; padding-right: 22px !important; }
      .otp-digits { font-size: 30px !important; letter-spacing: 8px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${BASE.background};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BASE.background}; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-container" width="480" cellpadding="0" cellspacing="0" style="width:480px; max-width:100%; background-color:${BASE.surface}; border-radius:22px; overflow:hidden; box-shadow: 0 18px 46px rgba(0,20,35,0.16);">

          ${heroHtml}

          ${bodyContent}

          <tr>
            <td style="padding: 8px 24px 30px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BASE.border};">
                <tr>
                  <td align="center" style="padding-top:24px;">
                    <img src="${LOGO_URL}" alt="TamkeeNova" width="38" style="width:38px; height:auto; margin:0 auto; opacity:0.9;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top:12px; color:${BASE.textMuted}; font-size:11px; line-height:1.9; letter-spacing:0.3px;">
                    منصة تمكينوفا هب لتدريب وتأهيل الكوادر البشرية والحلول المؤسسية في صعيد مصر
                    <br />
                    جميع الحقوق محفوظة &copy; ${new Date().getFullYear()} TamkeeNova HUB
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}





// Handle get otp email template
export function getOtpEmailTemplate(otp: string): string {
  const p = PALETTE.primary;

  const hero = heroSection(
    'primary',
    'TAMKEENOVA HUB',
    'تأكيد البريد الإلكتروني',
    'استخدم الكود ده عشان تكمل عملية التحقق من حسابك',
  );

  const body = `
          <tr>
            <td align="center" class="email-padding" style="padding: 34px 40px 8px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; background: linear-gradient(180deg, ${BASE.surfaceAlt} 0%, ${BASE.surface} 100%); border:1.5px solid ${p.dark}22; border-radius:16px;">
                <tr>
                  <td align="center" style="padding: 26px 16px;">
                    <span class="otp-digits" style="display:inline-block; font-size:38px; font-weight:800; letter-spacing:14px; color:${p.dark}; direction:ltr; font-family:'Courier New', monospace; text-shadow: 0 0 18px ${BASE.gold}55;">
                      ${esc(otp)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 18px 40px 34px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:${BASE.surfaceAlt}; border-radius:999px;">
                <tr>
                  <td style="padding:8px 18px; color:${BASE.textMuted}; font-size:12.5px; font-weight:600;">
                    ⏱ الكود هينتهي خلال 10 دقايق
                  </td>
                </tr>
              </table>
              <p style="margin: 18px 0 0; color:${BASE.textMuted}; font-size:12px; line-height:1.8;">
                لو مطلبتش الكود ده، تجاهل الإيميل وحسابك هيفضل آمن.
              </p>
            </td>
          </tr>`;

  return wrapEmail('primary', hero, body);
}



// Handle get trainer request email template
export function getTrainerRequestEmailTemplate(
  trainerName: string,
  trainerEmail: string,
): string {
  const hero = heroSection(
    'primary',
    'TAMKEENOVA HUB',
    'طلب انضمام مدرب جديد',
    'في طلب جديد محتاج مراجعة واعتماد من لوحة التحكم',
  );

  const body = `
          <tr>
            <td class="email-padding" style="padding: 30px 40px 10px;">
              ${sectionTitle('بيانات المدرب')}
              ${infoCard(
                [
                  { label: 'الاسم', value: trainerName },
                  { label: 'البريد الإلكتروني', value: trainerEmail, ltr: true },
                ],
                'primary',
              )}
            </td>
          </tr>

          <tr>
            <td align="center" class="email-padding" style="padding: 26px 40px 0;">
              ${ctaButton('مراجعة الطلب', `${APP_URL}/admin/trainers`)}
              ${note('راجع الطلب واعتمده أو ارفضه من لوحة تحكم المدربين')}
            </td>
          </tr>

          <tr><td style="padding-bottom:24px;"></td></tr>`;

  return wrapEmail('primary', hero, body);
}



// Handle get trainer approved email template
export function getTrainerApprovedEmailTemplate(trainerName?: string): string {
  const hero = heroSection(
    'success',
    'TAMKEENOVA HUB',
    'تهانينا، تم اعتماد حسابك 🎉',
    trainerName
      ? `أهلاً ${trainerName}، حسابك كمدرب اتفعّل بنجاح`
      : 'حسابك كمدرب اتفعّل بنجاح',
  );

  const body = `
          <tr>
            <td align="center" class="email-padding" style="padding: 30px 40px 0;">
              <p style="margin:0 0 22px; color:${BASE.textMuted}; font-size:13.5px; line-height:1.9;">
                تقدر دلوقتي تسجّل دخولك وتبدأ تستقبل طلبات الحجز والاستشارات من المتدربين على المنصة.
              </p>
              ${ctaButton('تسجيل الدخول', `${APP_URL}/login`)}
            </td>
          </tr>

          <tr><td style="padding-bottom:24px;"></td></tr>`;

  return wrapEmail('success', hero, body);
}



// Handle get trainer rejected email template
export function getTrainerRejectedEmailTemplate(reason: string): string {
  const hero = heroSection(
    'danger',
    'TAMKEENOVA HUB',
    'تم رفض طلب الانضمام',
    'للأسف مش قدرنا نكمل معاك الخطوة دي حالياً',
  );

  const body = `
          <tr>
            <td class="email-padding" style="padding: 30px 40px 10px;">
              ${sectionTitle('سبب الرفض')}
              ${infoCard([{ label: 'السبب', value: reason }], 'danger')}
            </td>
          </tr>

          <tr>
            <td align="center" class="email-padding" style="padding: 26px 40px 0;">
              ${note('لو حابب تستفسر أو تعدّل بياناتك، تواصل معانا وهنساعدك')}
            </td>
          </tr>

          <tr><td style="padding-bottom:24px;"></td></tr>`;

  return wrapEmail('danger', hero, body);
}



// Handle get consultation request email template
export function getConsultationRequestEmailTemplate(args: {
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  whatsapp?: string;
  bio?: string;
  consultationTitle: string;
  consultationDescription: string;
  preferredDate?: string;
  preferredTime?: string;
  certificates?: string[];
}): string {
  const hero = heroSection(
    'primary',
    'TAMKEENOVA HUB',
    'طلب استشارة جديد',
    'وصل طلب استشارة جديد من أحد المتدربين على المنصة',
  );

  const consultRows: Row[] = [
    { label: 'عنوان الاستشارة', value: args.consultationTitle },
  ];
  if (args.preferredDate) {
    consultRows.push({ label: 'التاريخ المفضل', value: args.preferredDate });
  }
  if (args.preferredTime) {
    consultRows.push({ label: 'الوقت المفضل', value: args.preferredTime });
  }

  const studentRows: Row[] = [
    { label: 'الاسم', value: args.studentName },
    { label: 'البريد الإلكتروني', value: args.studentEmail, ltr: true },
    {
      label: 'الهاتف',
      value: args.studentPhone || 'غير متوفر',
      ltr: !!args.studentPhone,
    },
  ];
  if (args.whatsapp) {
    studentRows.push({ label: 'واتساب', value: args.whatsapp, ltr: true });
  }
  if (args.bio) {
    studentRows.push({ label: 'نبذة', value: args.bio });
  }

  const certsSection =
    args.certificates && args.certificates.length > 0
      ? `
          <tr>
            <td class="email-padding" style="padding: 10px 40px 0;">
              ${sectionTitle('شهادات المتدرب')}
              <div>${chips(args.certificates)}</div>
            </td>
          </tr>`
      : '';

  const body = `
          <tr>
            <td class="email-padding" style="padding: 30px 40px 10px;">
              ${sectionTitle('تفاصيل الاستشارة')}
              ${infoCard(consultRows, 'primary')}
              ${spacer(12)}
              ${quote(args.consultationDescription)}
            </td>
          </tr>

          <tr>
            <td class="email-padding" style="padding: 18px 40px 10px;">
              ${sectionTitle('بيانات المتدرب')}
              ${infoCard(studentRows)}
            </td>
          </tr>

          ${certsSection}

          <tr>
            <td align="center" class="email-padding" style="padding: 26px 40px 0;">
              ${ctaButton('مراجعة الطلب', `${APP_URL}/trainer/consultations`)}
              ${note('روح للوحة التحكم عشان تقبل الطلب أو تحدد موعد مناسب')}
            </td>
          </tr>

          <tr><td style="padding-bottom:24px;"></td></tr>`;

  return wrapEmail('primary', hero, body);
}



// Handle get corporate request admin email template
export function getCorporateRequestAdminEmailTemplate(
  companyName: string,
  serviceType: string,
): string {
  const hero = heroSection(
    'primary',
    'TAMKEENOVA HUB',
    'طلب شركة جديد',
    'تم استلام طلب خدمات مؤسسية (B2B) جديد محتاج مراجعة',
  );

  const body = `
          <tr>
            <td class="email-padding" style="padding: 30px 40px 10px;">
              ${sectionTitle('بيانات الطلب')}
              ${infoCard(
                [
                  { label: 'الشركة', value: companyName },
                  { label: 'نوع الخدمة', value: serviceType },
                ],
                'primary',
              )}
            </td>
          </tr>

          <tr>
            <td align="center" class="email-padding" style="padding: 26px 40px 0;">
              ${ctaButton('مراجعة الطلب', `${APP_URL}/admin/corporate-requests`)}
              ${note('راجع تفاصيل الطلب وحوّله لموظف أو اتخذ قرارك من لوحة التحكم')}
            </td>
          </tr>

          <tr><td style="padding-bottom:24px;"></td></tr>`;

  return wrapEmail('primary', hero, body);
}



// Handle get volunteer request email template
export function getVolunteerRequestEmailTemplate(
  volunteerName: string,
  volunteerEmail: string,
): string {
  const hero = heroSection(
    'primary',
    'TAMKEENOVA HUB',
    'طلب انضمام متطوع جديد',
    'في طلب تطوع جديد محتاج مراجعة من لوحة التحكم',
  );

  const body = `
          <tr>
            <td class="email-padding" style="padding: 30px 40px 10px;">
              ${sectionTitle('بيانات المتطوع')}
              ${infoCard(
                [
                  { label: 'الاسم', value: volunteerName },
                  { label: 'البريد الإلكتروني', value: volunteerEmail, ltr: true },
                ],
                'primary',
              )}
            </td>
          </tr>

          <tr>
            <td align="center" class="email-padding" style="padding: 26px 40px 0;">
              ${ctaButton('مراجعة الطلب', `${APP_URL}/admin/volunteers`)}
              ${note('راجع الطلب واقبله أو ارفضه من لوحة تحكم المتطوعين')}
            </td>
          </tr>

          <tr><td style="padding-bottom:24px;"></td></tr>`;

  return wrapEmail('primary', hero, body);
}



// Handle get volunteer approved email template
export function getVolunteerApprovedEmailTemplate(
  volunteerName?: string,
): string {
  const hero = heroSection(
    'success',
    'TAMKEENOVA HUB',
    'مبروك! تم قبول طلب التطوع 🎉',
    volunteerName
      ? `أهلاً ${volunteerName}، أهلًا بيك في فريق TamkeeNova HUB`
      : 'أهلًا بيك في فريق TamkeeNova HUB',
  );

  const body = `
          <tr>
            <td align="center" class="email-padding" style="padding: 30px 40px 0;">
              <p style="margin:0 0 22px; color:${BASE.textMuted}; font-size:13.5px; line-height:1.9;">
                تقدر دلوقتي تستقبل المهام وتتابع ساعات التطوع والتقييمات والشهادات من حسابك.
              </p>
              ${ctaButton('تسجيل الدخول', `${APP_URL}/login`)}
            </td>
          </tr>

          <tr><td style="padding-bottom:24px;"></td></tr>`;

  return wrapEmail('success', hero, body);
}



// Handle get volunteer rejected email template
export function getVolunteerRejectedEmailTemplate(reason: string): string {
  const hero = heroSection(
    'danger',
    'TAMKEENOVA HUB',
    'نعتذر، تم رفض طلب التطوع',
    'شكراً لاهتمامك بالانضمام لنا',
  );

  const body = `
          <tr>
            <td class="email-padding" style="padding: 30px 40px 10px;">
              ${sectionTitle('سبب الرفض')}
              ${infoCard([{ label: 'السبب', value: reason }], 'danger')}
            </td>
          </tr>

          <tr>
            <td align="center" class="email-padding" style="padding: 26px 40px 0;">
              ${note('لو عندك أي استفسار، تواصل معانا وهنرد عليك في أقرب وقت')}
            </td>
          </tr>

          <tr><td style="padding-bottom:24px;"></td></tr>`;

  return wrapEmail('danger', hero, body);
}



// Handle get task assigned email template
export function getTaskAssignedEmailTemplate(args: {
  assigneeName: string;
  taskTitle: string;
  deadline?: string;
  priority?: string;
}): string {
  const hero = heroSection(
    'primary',
    'TAMKEENOVA HUB',
    'New Task Assigned',
    `تم إسناد مهمة جديدة إليك${
      args.assigneeName ? ` يا ${args.assigneeName}` : ''
    }`,
  );

  const rows: Row[] = [
    { label: 'المهمة', value: args.taskTitle },
    {
      label: 'الأولوية',
      value: priorityBadge(args.priority),
      raw: true,
    },
  ];
  if (args.deadline) {
    rows.push({ label: 'الموعد النهائي', value: args.deadline, ltr: true });
  }

  const body = `
          <tr>
            <td class="email-padding" style="padding: 30px 40px 10px;">
              ${sectionTitle('تفاصيل المهمة')}
              ${infoCard(rows, 'primary')}
            </td>
          </tr>

          <tr>
            <td align="center" class="email-padding" style="padding: 26px 40px 0;">
              ${ctaButton('فتح المهمة', `${APP_URL}/tasks`)}
              ${note('افتح المنصة للاطلاع على التفاصيل الكاملة والبدء في التنفيذ')}
            </td>
          </tr>

          <tr><td style="padding-bottom:24px;"></td></tr>`;

  return wrapEmail('primary', hero, body);
}



// Handle get task submitted admin email template
export function getTaskSubmittedAdminEmailTemplate(
  assigneeName: string,
  taskTitle: string,
): string {
  const hero = heroSection(
    'primary',
    'TAMKEENOVA HUB',
    'تسليم مهمة جديد',
    'في تسليم جديد محتاج مراجعة واتخاذ قرار',
  );

  const body = `
          <tr>
            <td class="email-padding" style="padding: 30px 40px 10px;">
              ${sectionTitle('تفاصيل التسليم')}
              ${infoCard(
                [
                  { label: 'المهمة', value: taskTitle },
                  { label: 'المنفذ', value: assigneeName },
                ],
                'primary',
              )}
            </td>
          </tr>

          <tr>
            <td align="center" class="email-padding" style="padding: 26px 40px 0;">
              ${ctaButton('مراجعة التسليم', `${APP_URL}/admin/tasks`)}
              ${note('راجع التسليم وامنح التقييم أو اطلب إعادة التنفيذ')}
            </td>
          </tr>

          <tr><td style="padding-bottom:24px;"></td></tr>`;

  return wrapEmail('primary', hero, body);
}



// Handle get certificate issued email template
export function getCertificateIssuedEmailTemplate(
  holderName: string,
  certificateTitle: string,
  verificationCode?: string,
): string {
  const hero = heroSection(
    'success',
    'TAMKEENOVA HUB',
    'شهادة جديدة 🎉',
    `تهانينا ${holderName}! تم إصدار شهادة جديدة باسمك`,
  );

  const rows: Row[] = [
    { label: 'الاسم', value: holderName },
    { label: 'الشهادة', value: certificateTitle },
  ];
  if (verificationCode) {
    rows.push({
      label: 'رمز التحقق',
      value: verificationCode,
      ltr: true,
    });
  }

  const verifyUrl = verificationCode
    ? `${APP_URL}/verify/${verificationCode}`
    : APP_URL;

  const body = `
          <tr>
            <td class="email-padding" style="padding: 30px 40px 10px;">
              ${sectionTitle('تفاصيل الشهادة')}
              ${infoCard(rows, 'success')}
            </td>
          </tr>

          <tr>
            <td align="center" class="email-padding" style="padding: 26px 40px 0;">
              ${ctaButton('التحقق من الشهادة', verifyUrl)}
              ${note(
                'الشهادة متاحة في حسابك ويمكن التحقق من صحتها في أي وقت عبر رمز التحقق',
              )}
            </td>
          </tr>

          <tr><td style="padding-bottom:24px;"></td></tr>`;

  return wrapEmail('success', hero, body);
}
