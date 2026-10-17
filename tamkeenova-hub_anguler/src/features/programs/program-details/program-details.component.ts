import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { StudentService } from '../../../core/services/student.service';
import { ProgramsService } from '../../../core/services/programs.service';
import { AuthService } from '../../../core/services/auth.service';
import { StudentProgramDetails } from '../../../core/models/student.model';
import { apiErrorKey } from '../../../core/utils/api-error';
import { SeoService } from '../../../core/seo/seo.service';
import {
  BreadcrumbComponent,
  Crumb,
} from '../../../shared/components/breadcrumb/breadcrumb.component';

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

@Component({
  selector: 'app-program-details',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe, BreadcrumbComponent],
  templateUrl: './program-details.component.html',
  styleUrl: './program-details.component.css',
})
export class ProgramDetailsComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private studentService = inject(StudentService);
  private programsService = inject(ProgramsService);
  private authService = inject(AuthService);
  private seo = inject(SeoService);
  private translate = inject(TranslateService);

  isLoading = signal(true);
  notFound = signal(false);
  program = signal<StudentProgramDetails | null>(null);

  isEnrolling = signal(false);
  enrollSuccess = signal(false);
  enrollError = signal<string | null>(null);

  isLoggedIn = this.authService.isLoggedIn;
  isStudent = this.authService.isStudent;

  discountPercent = computed(() => {
    const p = this.program();
    if (!p || !p.discount_price) return 0;
    const price = Number(p.price);
    const discount = Number(p.discount_price);
    if (!price || discount >= price) return 0;
    return Math.round(((price - discount) / price) * 100);
  });

  crumbs = computed<Crumb[]>(() => [
    { labelKey: 'nav.home', route: '/' },
    { labelKey: 'nav.programs', route: '/programs' },
    { label: this.program()?.title ?? '' },
  ]);

  constructor() {
    effect(() => this.pushSeo());

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      this.isLoading.set(false);
      return;
    }

    if (this.authService.isLoggedIn() && this.authService.isStudent()) {
      this.studentService.getProgramDetails(id).subscribe({
        next: (res) => {
          this.program.set(res);
          this.isLoading.set(false);
        },
        error: () => {
          this.notFound.set(true);
          this.isLoading.set(false);
        },
      });
      return;
    }


    this.programsService.getAllPublic().subscribe({
      next: (programs) => {
        const found = (programs ?? []).find((p) => p.id === id);
        if (!found) {
          this.notFound.set(true);
        } else {
          this.program.set({
            id: found.id,
            title: found.title,
            slug: '',
            image_url: found.image_url ?? null,
            short_description: found.short_description ?? null,
            description: found.description ?? null,
            price: String(found.price),
            discount_price: found.discount_price ? String(found.discount_price) : null,
            duration_hours: found.duration_hours ?? null,
            level: found.level,
            enrolled_count: found.enrollments_count ?? 0,
            is_active: found.is_open ?? true,
            trainers: null,
          });
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.isLoading.set(false);
      },
    });
  }

  levelLabelKey(level: string): string {
    return `programs.level.${level.toLowerCase()}`;
  }

  enroll(): void {
    const p = this.program();
    if (!p || this.isEnrolling()) return;

    if (!this.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    if (!this.isStudent()) return;

    this.isEnrolling.set(true);
    this.enrollError.set(null);
    this.enrollSuccess.set(false);

    this.studentService.enroll(p.id).subscribe({
      next: () => {
        this.isEnrolling.set(false);
        this.enrollSuccess.set(true);
      },
      error: (err) => {
        this.isEnrolling.set(false);
        const status = err?.status;
        if (status === 409) {
          this.enrollError.set('program_details.already_enrolled');
        } else if (status === 400) {
          this.enrollError.set('program_details.unavailable');
        } else {
          this.enrollError.set(apiErrorKey(err, 'auth.errors.generic'));
        }
      },
    });
  }

  goToEnrollments(): void {
    this.router.navigate(['/portal/student/enrollments']);
  }

  private pushSeo(): void {
    const p = this.program();
    this.seo.setPageIndexable(!!p);
    if (!p) return;
    this.translate.currentLang();
    const url = this.seo.absoluteUrl(`/programs/${p.id}`);
    const description = p.short_description || p.description || '';
    this.seo.setDynamic({
      title: `${p.title} | TamkeeNova HUB`,
      description,
      image: p.image_url,
      type: 'article',
    });
    this.seo.setBreadcrumbJsonLd([
      { name: this.translate.instant('nav.home'), url: this.seo.absoluteUrl('/') },
      { name: this.translate.instant('nav.programs'), url: this.seo.absoluteUrl('/programs') },
      { name: p.title, url },
    ]);
    this.seo.setJsonLd('page', {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: p.title,
      description,
      ...(p.image_url ? { image: this.seo.absoluteUrl(p.image_url) } : {}),
      provider: {
        '@type': 'EducationalOrganization',
        name: 'TamkeeNova HUB',
        url: this.seo.absoluteUrl('/'),
      },
      ...(p.duration_hours ? { timeRequired: `PT${p.duration_hours}H` } : {}),
      ...(LEVEL_LABEL[p.level] ? { educationalLevel: LEVEL_LABEL[p.level] } : {}),
      offers: {
        '@type': 'Offer',
        price: Number(p.price) || 0,
        priceCurrency: 'EGP',
        availability: p.is_active ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url,
      },
    });
  }
}
