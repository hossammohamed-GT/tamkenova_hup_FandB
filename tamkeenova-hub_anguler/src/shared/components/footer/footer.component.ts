import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

interface FooterLink {
  labelKey: string;
  route: string;
}

interface SocialLink {
  icon: string;
  href: string;
  label: string;
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  quickLinks: FooterLink[] = [
    { labelKey: 'nav.home', route: '/' },
    { labelKey: 'nav.programs', route: '/programs' },
    { labelKey: 'nav.portal', route: '/portal' },
    { labelKey: 'nav.consulting', route: '/consulting' },
    { labelKey: 'nav.team', route: '/team' },
    { labelKey: 'nav.gallery', route: '/gallery' }
  ];

  socialLinks: SocialLink[] = [
    {
      icon: 'fa-brands fa-facebook-f',
      href: 'https://www.facebook.com/share/1Ro5wdyHB4/',
      label: 'Facebook'
    },
    {
      icon: 'fa-brands fa-whatsapp',
      href: 'https://api.whatsapp.com/send/?phone=201013494727&text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B+TamkeeNova+HUB+%D8%A8%D8%AE%D8%B5%D9%88%D8%B5...&type=phone_number&app_absent=0',
      label: 'WhatsApp'
    }
  ];
}