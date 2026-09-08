import Link from 'next/link';
import { Clock } from 'lucide-react';
import type { BlogPost } from '@/types';

export default function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col rounded-3xl border border-sport-border bg-sport-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-sport-green hover:shadow-soft"
    >
      <span className="self-start rounded-full bg-sport-surface px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white/50 transition-colors group-hover:bg-sport-green/15 group-hover:text-sport-orange">
        {post.category}
      </span>
      <h3 className="mt-3 font-display text-lg uppercase leading-snug transition-colors group-hover:text-sport-orange">
        {post.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-white/50">{post.excerpt}</p>
      <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-white/50">
        <Clock size={13} /> {post.readTime} de lectura
        <span className="text-sport-surface">·</span>
        {new Date(post.date).toLocaleDateString('es-CL', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
      </div>
    </Link>
  );
}
