import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const kurslarCollection = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: "./src/content/kurslar" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.string().optional(),
    canonical: z.string().optional(),
    badge: z.string(),
    heroTitle: z.string(),
    heroTitleHighlight: z.string(),
    heroDesc: z.string(),
    image: z.string(),
    videoPreview: z.string().optional(),
    
    // Info Cards
    duration: z.string(),
    frequency: z.string(),
    level: z.string(),
    certificate: z.string(),
    
    // Details
    leadText: z.string(),
    
    // Level cards
    levels: z.object({
      beginner: z.object({ title: z.string(), desc: z.string() }),
      intermediate: z.object({ title: z.string(), desc: z.string() }),
      advanced: z.object({ title: z.string(), desc: z.string() }),
    }),
    
    // Gallery
    gallery: z.array(z.string()),
    
    // Curriculum
    curriculum: z.array(z.object({
      period: z.string(),
      title: z.string(),
      items: z.array(z.string())
    })),
    
    // Teacher (optional - removed from display)
    teacher: z.object({
      name: z.string(),
      specialty: z.string(),
      image: z.string(),
      bio1: z.string(),
      bio2: z.string().optional(),
      tags: z.array(z.string())
    }).optional(),
    
    // FAQ
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string()
    }))
  })
});

export const collections = {
  'kurslar': kurslarCollection,
};
