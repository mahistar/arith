import React from "react";
import { Post } from "../types";
import { Clock, Eye, ChevronRight } from "lucide-react";

interface ArticleCardProps {
  post: Post;
  onClick: () => void;
  key?: string;
}

export default function ArticleCard({ post, onClick }: ArticleCardProps) {
  return (
    <article 
      className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 pb-8 transition-colors duration-300 group flex flex-col md:flex-row gap-6"
      id={`article-card-${post.id}`}
    >
      {/* Featured Image Section */}
      <div className="relative w-full md:w-48 h-48 md:h-32 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
        <img
          src={post.featuredImage}
          alt={post.title}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/20 to-transparent"></div>
        {/* Category floating badge - bottom left as in mockup */}
        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 max-w-[90%] pointer-events-none">
          {(Array.isArray(post.categories) && post.categories.length > 0 ? post.categories : [post.category].filter(Boolean)).map((cat, idx) => (
            <span key={idx} className="bg-cyan-500 text-[9px] text-white px-1.5 py-0.5 rounded font-bold uppercase tracking-wide shadow-sm">
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* Content Meta Section */}
      <div className="flex flex-col justify-between flex-1">
        <div>
          {/* Metadata Row */}
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mb-2">
            <span className="font-bold text-slate-600 dark:text-slate-300">{post.author.name}</span>
            <span>•</span>
            <span>{post.publishDate}</span>
          </div>

          {/* Title with styled font */}
          <h2 className="text-xl sm:text-2xl font-bold leading-tight text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors duration-200 mb-2 cursor-pointer">
            <a onClick={onClick}>{post.title}</a>
          </h2>

          {/* Article Excerpt */}
          <p className="text-slate-500 dark:text-slate-450 text-sm leading-relaxed line-clamp-2">
            {post.excerpt}
          </p>
        </div>

        {/* Read More button as in mockup */}
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={onClick}
            className="inline-flex items-center text-cyan-600 hover:text-cyan-750 dark:text-cyan-400 dark:hover:text-cyan-300 font-bold text-xs uppercase tracking-wider cursor-pointer group/btn"
            id={`read-btn-${post.id}`}
          >
            আরও পড়ুন
            <ChevronRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover/btn:translate-x-1" />
          </button>
        </div>
      </div>
    </article>
  );
}
