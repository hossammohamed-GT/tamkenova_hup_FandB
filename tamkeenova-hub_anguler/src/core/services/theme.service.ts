import { Injectable, signal, effect, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type ThemeMode = 'light' | 'dark';
export type Direction = 'ltr' | 'rtl';
export type Language = 'ar' | 'en';

const THEME_KEY = 'tamkeenova-theme';
const LANG_KEY = 'tamkeenova-lang';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private translate = inject(TranslateService);

  theme = signal<ThemeMode>(this.getStoredTheme());
  language = signal<Language>(this.getStoredLanguage());

  constructor() {
    this.translate.addLangs(['ar', 'en']);

    effect(() => {
      const theme = this.theme();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
      }
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(THEME_KEY, theme); } catch {}
      }
    });

    effect(() => {
      const lang = this.language();
      const dir: Direction = lang === 'ar' ? 'rtl' : 'ltr';
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', lang);
        document.documentElement.setAttribute('dir', dir);
      }
      if (typeof localStorage !== 'undefined') {
        try { localStorage.setItem(LANG_KEY, lang); } catch {}
      }
      this.translate.use(lang);
    });
  }

  // -- Toggle the Application Theme --
  toggleTheme(): void {
    this.theme.set(this.theme() === 'light' ? 'dark' : 'light');
  }

  // -- Set the Application Theme --
  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
  }

  // -- Toggle the Application Language --
  toggleLanguage(): void {
    this.language.set(this.language() === 'ar' ? 'en' : 'ar');
  }

  // -- Set the Application Language --
  setLanguage(lang: Language): void {
    this.language.set(lang);
  }

  // -- Resolve the Initial Theme Preference --
  private getStoredTheme(): ThemeMode {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
        if (stored) return stored;
      }
    } catch {}
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } catch {}
    return 'light';
  }

  // -- Resolve the Initial Language Preference --
  private getStoredLanguage(): Language {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(LANG_KEY) as Language | null;
        if (stored) return stored;
      }
    } catch {}
    return 'ar';
  }
}
