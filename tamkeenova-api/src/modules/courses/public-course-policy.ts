
export const demoCourseWhere = {
  AND: [
    { slug: { startsWith: 'demo-catalog-v1-' } },

    {
      description_en: { startsWith: '[TAMKEENOVA_DEMO_CATALOG_V1]', not: null },
    },
  ],
};
export const publicCourseWhere = {
  status: 'PUBLISHED' as const,
  NOT: demoCourseWhere,
};


export const publicCategoryWhere = {
  is_active: true,
  OR: [{ parent_id: null }, { parent: { is: { is_active: true, parent_id: null } } }],
};
