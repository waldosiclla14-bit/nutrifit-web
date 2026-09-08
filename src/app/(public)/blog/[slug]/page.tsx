import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock } from 'lucide-react';
import { BLOG_POSTS } from '@/data/blog';
import { BRAND } from '@/data/seed';

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const blogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    inLanguage: 'es-CL',
    mainEntityOfPage: `${BRAND.url}/blog/${post.slug}`,
    author: { '@type': 'Organization', '@id': `${BRAND.url}/#organization`, name: BRAND.name },
    publisher: { '@type': 'Organization', '@id': `${BRAND.url}/#organization`, name: BRAND.name },
  };

  return (
    <article className="container-px py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <Link
        href="/blog"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-accentDeep underline underline-offset-4"
      >
        <ArrowLeft size={14} /> Volver al blog
      </Link>

      <div className="mx-auto max-w-2xl">
        <span className="rounded-full bg-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">
          {post.category}
        </span>
        <h1 className="mt-4 font-display text-3xl uppercase leading-tight sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted">
          <Clock size={13} /> {post.readTime} de lectura
          <span className="text-soft2">·</span>
          {new Date(post.date).toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </div>

        <div className="mt-8 space-y-6">
          {post.blocks.map((block, i) => {
            if (block.type === 'h2')
              return (
                <h2 key={i} className="pt-2 font-display text-xl uppercase tracking-wide">
                  {block.text}
                </h2>
              );
            if (block.type === 'ul')
              return (
                <ul key={i} className="space-y-2">
                  {block.items.map((item, j) => (
                    <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-ink/80">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accentDeep" />
                      {item}
                    </li>
                  ))}
                </ul>
              );
            return (
              <p key={i} className="text-sm leading-relaxed text-ink/80">
                {block.text}
              </p>
            );
          })}
        </div>
      </div>
    </article>
  );
}
