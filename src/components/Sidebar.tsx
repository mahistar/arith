import React, { useState } from "react";
import { Post, Category, SiteConfig } from "../types";
import { Flame, BookOpen, Hash, Radio, Mail, BadgeAlert, CheckCircle, Sparkles } from "lucide-react";

interface SidebarProps {
  posts: Post[];
  categories: Category[];
  siteConfig: SiteConfig;
  onPostClick: (post: Post) => void;
  onCategorySelect: (categoryName: string) => void;
  onTagSelect: (tag: string) => void;
  selectedTag: string;
  selectedCategory: string;
}

export default function Sidebar({
  posts,
  categories,
  siteConfig,
  onPostClick,
  onCategorySelect,
  onTagSelect,
  selectedTag,
  selectedCategory,
}: SidebarProps) {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "success" | "error">("idle");

  // Only public published posts are processed for popular/recent rows in the sidebar!
  const publicPosts = posts.filter(post => post.status === "published");

  // Dynamic values calculated from the public posts array
  const sortedByViews = [...publicPosts].sort((a, b) => b.views - a.views).slice(0, 4);

  // Dynamic tags calculation
  const allTags = Array.from(new Set(publicPosts.flatMap((post) => post.tags))).slice(0, 10);

  // Filter only enabled categories for the sidebar list
  const activeCategories = categories
    .filter(cat => cat.enabled)
    .sort((a, b) => a.order - b.order);

  // Count active posts per category dynamically
  const categoryCounts = activeCategories.reduce((acc, cat) => {
    acc[cat.name] = publicPosts.filter(p => {
      const pCats = Array.isArray(p.categories) && p.categories.length > 0 ? p.categories : [p.category].filter(Boolean);
      return pCats.includes(cat.name);
    }).length;
    return acc;
  }, {} as Record<string, number>);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterEmail.includes("@")) {
      setNewsletterStatus("error");
      setTimeout(() => setNewsletterStatus("idle"), 3000);
      return;
    }

    setNewsletterStatus("success");
    setNewsletterEmail("");
  };

  const getThemeColorClass = () => {
    switch (siteConfig.primaryThemeColor) {
      case "gold": return "bg-amber-500";
      case "blue": return "bg-blue-600";
      case "emerald": return "bg-emerald-600";
      case "amber": return "bg-amber-600";
      default: return "bg-slate-900";
    }
  };

  return (
    <aside className="w-full space-y-8 lg:sticky lg:top-24">
      {/* Category List Widget */}
      <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl p-6 transition-colors duration-300">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-800 text-sm uppercase tracking-widest flex items-center gap-2 font-serif">
          <span className={`w-1.5 h-4 ${getThemeColorClass()} rounded-full`}></span> 
          জ্ঞান অন্বেষণ বিভাগসমূহ
        </h3>
        <ul className="space-y-1">
          {/* Cover All posts option */}
          <li>
            <button
              onClick={() => onCategorySelect("প্রচ্ছদ")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded transition-all duration-150 text-left font-serif ${
                selectedCategory === "প্রচ্ছদ"
                  ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 font-bold shadow-sm border border-slate-205 dark:border-slate-700"
                  : "text-slate-650 dark:text-slate-400 hover:text-amber-650 dark:hover:text-amber-400"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${selectedCategory === "প্রচ্ছদ" ? 'bg-amber-500' : 'bg-slate-350 dark:bg-slate-700'}`}></span>
                সব প্রবন্ধ সূচী (All)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono font-bold">
                ({publicPosts.length})
              </span>
            </button>
          </li>

          {activeCategories.map((cat) => {
            const count = categoryCounts[cat.name] || 0;
            const isSelected = selectedCategory === cat.name;

            return (
              <li key={cat.id}>
                <button
                  onClick={() => onCategorySelect(cat.name)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded transition-all duration-150 text-left font-serif ${
                    isSelected
                      ? "bg-white dark:bg-slate-800 text-amber-500 font-extrabold shadow-sm border border-slate-200 dark:border-slate-700"
                      : "text-slate-655 dark:text-slate-400 hover:text-amber-550 dark:hover:text-amber-405"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}></span>
                    {cat.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono font-bold">
                    ({count})
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Popular Posts Widget - reads are sorted securely under-the-hood */}
      <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl p-6 transition-colors duration-300">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-800 text-sm uppercase tracking-widest flex items-center gap-2 font-serif">
          <span className={`w-1.5 h-4 ${getThemeColorClass()} rounded-full`}></span>
          জনপ্রিয় জ্ঞানচর্চা
        </h3>
        <div className="space-y-4">
          {sortedByViews.length === 0 ? (
            <p className="text-xs text-slate-400 italic">কোনো জনপ্রিয় লেখা নেই এখনো।</p>
          ) : (
            sortedByViews.map((post, idx) => (
              <div
                key={post.id}
                onClick={() => onPostClick(post)}
                className="flex items-start gap-3 group cursor-pointer"
              >
                <div className="text-2xl font-serif font-black text-slate-200 dark:text-slate-800 group-hover:text-amber-400 transition-colors w-8 text-center">
                  {String(idx + 1).padStart(2, '0').replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[parseInt(d)])}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold leading-snug group-hover:text-amber-550 dark:group-hover:text-amber-400 transition-colors text-slate-900 dark:text-slate-250">
                    {post.title}
                  </h4>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    {post.views.toLocaleString('bn-BD')} বার পঠিত
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tags Section Widget */}
      <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-xl p-6 transition-colors duration-300">
        <h3 className="font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-800 text-sm uppercase tracking-widest flex items-center gap-2 font-serif">
          <span className={`w-1.5 h-4 ${getThemeColorClass()} rounded-full`}></span>
          যুক্তির ট্যাগসমূহ
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onTagSelect("")}
            className={`text-xs px-2.5 py-1 bg-white dark:bg-slate-850 border rounded font-medium transition-all duration-150 cursor-pointer ${
              selectedTag === ""
                ? `${getThemeColorClass()} border-transparent text-slate-950 font-bold shadow-sm`
                : "border-slate-200 dark:border-slate-800 hover:border-amber-550 hover:text-amber-500 text-slate-600 dark:text-slate-350"
            }`}
          >
            সব ট্যাগ
          </button>
          {allTags.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => onTagSelect(tag)}
                className={`text-xs px-2.5 py-1 bg-white dark:bg-slate-850 border rounded font-medium transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? "bg-amber-550 border-amber-550 text-slate-950 font-black shadow-sm"
                    : "border-slate-200 dark:border-slate-800 hover:border-amber-550 hover:text-amber-500 text-slate-650 dark:text-slate-350"
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Newsletter Email Subscription Widget governed by SiteConfig */}
      <div className="bg-slate-50 dark:bg-slate-905 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <h3 className="font-serif font-bold text-slate-900 dark:text-white mb-2">সাময়িকী মেল নিউজলেটার</h3>
        <p className="text-slate-505 dark:text-slate-400 text-xs mb-4 leading-relaxed">
          আরিথমেটিকার তাত্ত্বিক কলাম ও নতুন জ্যামিতিক আলোচনা সবার আগে সরাসরি আপনার ইমেইল ইনবক্সে পেতে আজই মেল লিস্টে যুক্ত হোন।
        </p>

        {newsletterStatus === "success" ? (
          <div className="bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 rounded p-3 text-center text-xs font-semibold">
            <p>আপনার মেইলে একটি স্বাগত আহ্বান পাঠানো হয়েছে!</p>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="আপনার ইমেইল..."
              className="flex-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-amber-500 placeholder-slate-400 text-slate-900 dark:text-white"
              required
            />
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white dark:text-slate-950 px-4 py-2 rounded text-xs font-bold shadow-sm whitespace-nowrap cursor-pointer border border-transparent dark:border-amber-600"
            >
              নিবন্ধন
            </button>
          </form>
        )}
      </div>
    </aside>
  );
}
