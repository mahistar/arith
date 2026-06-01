export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string; // Dynamic Category name or ID
  categories?: string[]; // Array of categories to support multiple categories per post!
  tags: string[];
  featuredImage: string;
  coverImage?: string; // Optional cover image (homepage banner / article top banner)
  author: {
    name: string;
    avatar: string;
    bio: string;
    role: string;
  };
  publishDate: string; // Date string
  views: number;
  readTime?: string; // e.g. "৫ মিনিট"
  featured?: boolean;
  popular?: boolean;
  status: "published" | "draft"; // Added for proper draft management
}

export interface Comment {
  id: string;
  postId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  date: string;
}

export interface Category {
  id: string;
  name: string; // in Bengali
  englishName: string; // for URL/slug
  description?: string; // category description
  color?: string; // custom color (hex or class)
  icon?: string; // Lucide icon name
  order: number; // sort order
  enabled: boolean; // active status toggle
  imageUrl?: string; // Optional category image
}

export interface SiteConfig {
  siteName: string; // Text logo e.g. "ARITHMETICA"
  siteTagline: string;
  siteBrandingSymbol: string; // e.g., "Δ" or "Φ" or geometric symbol
  headerTitle: string;
  headerSubtitle: string;
  footerAbout: string;
  footerCopyText: string;
  socialLinks: {
    facebook: string;
    twitter: string;
    github: string;
    youtube: string;
  };
  seoConfig: {
    title: string;
    description: string;
    keywords: string;
  };
  typography: "serif-academic" | "sans-minimal" | "manuscript-classical";
  primaryThemeColor: "gold" | "blue" | "emerald" | "amber" | "slate";
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  category: string; // "Notes", "Assignments", "Books", "Other"
  fileUrl: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadedAt: string;
  downloadCount: number;
  uploader?: string;
}
