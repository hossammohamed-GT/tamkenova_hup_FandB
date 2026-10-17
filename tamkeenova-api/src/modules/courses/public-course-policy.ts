/** Negate the conjunction, never each marker separately: preserve real prefix collisions. */
export const demoCourseWhere = {
  AND: [
    { slug: { startsWith: 'demo-catalog-v1-' } },
    // Explicit non-null keeps SQL three-valued logic from excluding real NULL descriptions.
    {
      description_en: { startsWith: '[TAMKEENOVA_DEMO_CATALOG_V1]', not: null },
    },
  ],
};
export const publicCourseWhere = {
  status: 'PUBLISHED' as const,
  NOT: demoCourseWhere,
};
