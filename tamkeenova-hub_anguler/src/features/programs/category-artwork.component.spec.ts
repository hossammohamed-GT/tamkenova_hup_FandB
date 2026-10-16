import { TestBed } from '@angular/core/testing';
import { CategoryArtworkComponent, CATEGORY_FRONTS, CATEGORY_SHAPES } from './category-artwork.component';

describe('Category sculptural artwork', () => {
  it('uses a distinct outline and curved front panel for each reference category', () => {
    expect(Object.keys(CATEGORY_SHAPES)).toHaveLength(6);
    expect(new Set(Object.values(CATEGORY_SHAPES)).size).toBe(6);
    expect(new Set(Object.values(CATEGORY_FRONTS)).size).toBe(6);
    for (const path of Object.values(CATEGORY_SHAPES)) {
      expect(path).toMatch(/^M/);
      expect(path).toContain('Q');
      expect(path).toMatch(/Z$/);
    }
  });

  it('updates its shape and scoped SVG IDs when an API category changes', async () => {
    await TestBed.configureTestingModule({ imports: [CategoryArtworkComponent] }).compileComponents();
    const fixture = TestBed.createComponent(CategoryArtworkComponent);
    fixture.componentRef.setInput('slug', 'technology-innovation');
    fixture.componentRef.setInput('image', '/assets/course-categories/technology-innovation.jpg');
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const firstId = component.uid();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.sculpture-rim')?.getAttribute('d')).toBe(CATEGORY_SHAPES['technology-innovation']);
    expect(el.querySelector('.sculpture-photo')?.getAttribute('href')).toContain('technology-innovation.jpg');
    expect(el.querySelectorAll('.category-setting use').length).toBeGreaterThan(3);
    fixture.componentRef.setInput('slug', 'wellbeing');
    fixture.detectChanges();
    expect(component.uid()).not.toBe(firstId);
    expect(el.querySelector('.sculpture-rim')?.getAttribute('d')).toBe(CATEGORY_SHAPES['wellbeing']);
    expect(el.querySelector('clipPath')?.id).toBe(component.uid() + '-outline');
  });

  it('provides artwork for new categories without requiring a seeded photo', async () => {
    await TestBed.configureTestingModule({ imports: [CategoryArtworkComponent] }).compileComponents();
    const fixture = TestBed.createComponent(CategoryArtworkComponent);
    fixture.componentRef.setInput('slug', 'new-category');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sculpture-photo')).toBeNull();
    expect(fixture.componentInstance.outline()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.category-setting')).toBeTruthy();
  });
});
