import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Program, ProgramLevel } from '../../core/models/program.model';
import { ProgramsService } from '../../core/services/programs.service';

@Component({
  selector: 'app-programs',
  standalone: true,
  imports: [CommonModule, TranslatePipe, FormsModule, RouterLink],
  templateUrl: './programs.component.html',
  styleUrl: './programs.component.css',
})
export class ProgramsComponent {
  private programsService = inject(ProgramsService);
  private translate = inject(TranslateService);

  isLoading = signal(true);
  allPrograms = signal<Program[]>([]);

  searchTerm = signal('');
  selectedCategory = signal<string>('all');
  selectedLevel = signal<ProgramLevel | 'all'>('all');

  readonly levels: Array<{ value: ProgramLevel | 'all'; labelKey: string }> = [
    { value: 'all', labelKey: 'programs.filter.all_levels' },
    { value: 'BEGINNER', labelKey: 'programs.level.beginner' },
    { value: 'INTERMEDIATE', labelKey: 'programs.level.intermediate' },
    { value: 'ADVANCED', labelKey: 'programs.level.advanced' },
  ];

  // -- Derive Available Program Categories --
  categories = computed(() => {
    const programs = this.allPrograms();

    if (!Array.isArray(programs) || programs.length === 0) {
      return ['all'];
    }

    const unique = new Set(
      programs.map((p) => p?.category).filter((c): c is string => !!c && c !== ''),
    );

    return ['all', ...Array.from(unique)];
  });

  // -- Filter Programs by Search and Selected Criteria --
  filteredPrograms = computed(() => {
    const programs = this.allPrograms();
    if (!Array.isArray(programs)) return [];

    const term = this.searchTerm().trim().toLowerCase();
    const category = this.selectedCategory();
    const level = this.selectedLevel();

    return programs.filter((program) => {
      if (!program) return false;

      const matchesTerm =
        !term ||
        (program.title?.toLowerCase().includes(term) ?? false) ||
        (program.trainer?.name?.toLowerCase().includes(term) ?? false) ||
        (program.short_description?.toLowerCase().includes(term) ?? false);

      const matchesCategory = category === 'all' || program.category === category;
      const matchesLevel = level === 'all' || program.level === level;

      return matchesTerm && matchesCategory && matchesLevel;
    });
  });

  hasAnyPrograms = computed(() => {
    const programs = this.allPrograms();
    return Array.isArray(programs) && programs.length > 0;
  });

  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.selectedCategory() !== 'all') count++;
    if (this.selectedLevel() !== 'all') count++;
    return count;
  });

  currentLang = computed(() => this.translate.currentLang);

  constructor() {
    this.load();
  }

  // -- Load Public Programs --
  load(): void {
    this.isLoading.set(true);

    this.programsService.getAllPublic().subscribe({
      next: (response) => {
        console.log('📦 Programs loaded:', response);

        // -- Normalize the API Response Shape --
        let programsArray: Program[] = [];

        if (Array.isArray(response)) {
          programsArray = response;
        } else if (response && typeof response === 'object') {
          programsArray = (response as any).data ?? [];
        }

        this.allPrograms.set(programsArray);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ Failed to load programs:', err);
        this.allPrograms.set([]);
        this.isLoading.set(false);
      },
    });
  }

  // -- Clear All Program Filters --
  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('all');
    this.selectedLevel.set('all');
  }

  // -- Set the Active Program Category --
  setCategory(cat: string): void {
    console.log('🔽 Category selected:', cat);
    this.selectedCategory.set(cat);
  }

  // -- Set the Active Program Level --
  setLevel(level: ProgramLevel | 'all'): void {
    console.log('🔽 Level selected:', level);
    this.selectedLevel.set(level);
  }

  levelLabelKey(level: ProgramLevel): string {
    return `programs.level.${level.toLowerCase()}`;
  }
}
