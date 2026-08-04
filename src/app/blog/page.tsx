import type { Metadata } from 'next';
import { BLOG_POSTS } from '@/data/blog';
import BlogCard from '@/components/blog/BlogCard';
import Reveal from '@/components/ui/Reveal';

export const metadata: Metadata = {
  title: 'Blog y Guías',
  description:
    'Guías y consejos de nutrición deportiva: proteínas, creatina, suplementos y más. Aprende a elegir y usar tus suplementos NutriFit.',
};

export default function BlogPage() {
  return (
    <div className="container-px py-12">
      <Reveal className="mb-10">
        <p className="section-label">BLOG</p>
        <h1 className="section-title">
          Aprende con <span className="text-accentDeep">NutriFit</span>
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Guías y consejos prácticos para elegir bien tus suplementos y potenciar tu rendimiento.
        </p>
      </Reveal>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BLOG_POSTS.map((post, i) => (
          <Reveal key={post.slug} delay={i * 60}>
            <BlogCard post={post} />
          </Reveal>
        ))}
      </div>
    </div>
  );
}
