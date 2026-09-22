import { Component, OnDestroy, inject, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '../shared/components/navbar/navbar.component';
import { AiAssistantComponent } from '../shared/components/ai-assistant/ai-assistant.component';
import { BookingModalComponent } from '../shared/components/booking-modal/booking-modal.component';
import { AppLoaderComponent } from '../shared/components/app-loader/app-loader.component';
import { LoaderService } from '../core/services/loader.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, AiAssistantComponent, BookingModalComponent, AppLoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnDestroy {
  protected readonly title = signal('tamkeenova-hub_anguler');

  private loader = inject(LoaderService);
  private router = inject(Router);

  private routerSub: Subscription;

  constructor() {
    // إظهار لودر أولي للبراند ثم إخفاؤه - لا يظهر مرة أخرى عند التنقل لتجنب الوميض الجهنمي
    this.loader.show();
    setTimeout(() => this.loader.hide(), 500);

    this.routerSub = this.router.events.subscribe((event) => {
      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        // Keep the loader hidden after every navigation; never show it on
        // navigation start to avoid flicker.
        this.loader.hide();
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub.unsubscribe();
  }
}
