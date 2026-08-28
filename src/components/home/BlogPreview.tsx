import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BLOG_POSTS } from '@/data/blog';
import BlogCard from '@/components/blog/BlogCard';
import Reveal from '@/components/ui/Reveal';

export default function BlogPreview() {
  return (
    <section className="container-px py-14 lg:py-[100px]">
      <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">BLOG</p>
          <h2 className="section-title">
            Aprende con <span className="text-accentDeep">NutriFit</span>
          </h2>
          <p className="mt-2 text-sm text-muted">
            Guías y consejos para potenciar tu rendimiento.
          </p>
        </div>
        <Link
          href="/blog"
          className="flex items-center gap-1.5 text-sm font-bold text-accentDeep underline underline-offset-4"
        >
          Ver todas <ArrowRight size={14} />
        </Link>
      </Reveal>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BLOG_POSTS.map((post, i) => (
          <Reveal key={post.slug} delay={i * 60}>
            <BlogCard post={post} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
