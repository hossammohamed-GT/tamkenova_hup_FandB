export interface SeoRouteData {
  titleKey: string;
  descriptionKey: string;
  index?: boolean;
  rawTitle?: boolean;
  ogType?: 'website' | 'article' | 'profile';
  ogImage?: string;
}

export interface DynamicSeo {
  title: string;
  description: string;
  image?: string | null;
  type?: 'website' | 'article' | 'profile';
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}
