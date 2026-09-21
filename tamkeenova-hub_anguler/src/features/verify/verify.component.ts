import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { VerificationService } from '../../core/services/verification.service';
import { VerifyCertificateResponse, VerifyUserResponse } from '../../core/models/student.model';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component.js';

type VerifyTab = 'certificate' | 'user';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe, PageHeaderComponent],
  templateUrl: './verify.component.html',
  styleUrl: './verify.component.css',
})
export class VerifyComponent {
  private verificationService = inject(VerificationService);
  private route = inject(ActivatedRoute);

  activeTab = signal<VerifyTab>('certificate');
  code = signal('');
  username = signal('');

  isVerifying = signal(false);
  certResult = signal<VerifyCertificateResponse | null>(null);
  userResult = signal<VerifyUserResponse | null>(null);
  certError = signal(false);
  userError = signal(false);

  constructor() {
    const presetCode = this.route.snapshot.queryParamMap.get('code');
    if (presetCode) {
      this.code.set(presetCode);
      this.verifyCertificate();
    }
  }

  setTab(tab: VerifyTab): void {
    this.activeTab.set(tab);
  }

  verifyCertificate(): void {
    const value = this.code().trim();
    if (!value || this.isVerifying()) return;
    this.isVerifying.set(true);
    this.certResult.set(null);
    this.certError.set(false);

    this.verificationService.verifyCertificate(value).subscribe({
      next: (res) => {
        this.isVerifying.set(false);
        if (res.verified) {
          this.certResult.set(res);
        } else {
          this.certError.set(true);
        }
      },
      error: () => {
        this.isVerifying.set(false);
        this.certError.set(true);
      },
    });
  }

  verifyUser(): void {
    const value = this.username().trim().replace(/^@/, '');
    if (!value || this.isVerifying()) return;
    this.isVerifying.set(true);
    this.userResult.set(null);
    this.userError.set(false);

    this.verificationService.verifyUser(value).subscribe({
      next: (res) => {
        this.isVerifying.set(false);
        if (res.verified) {
          this.userResult.set(res);
        } else {
          this.userError.set(true);
        }
      },
      error: () => {
        this.isVerifying.set(false);
        this.userError.set(true);
      },
    });
  }
}
