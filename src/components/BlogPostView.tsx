import React, { useState, useEffect, useMemo } from "react";
import { Post, Comment } from "../types";
import TableOfContents, { TOCItem } from "./TableOfContents";
import { 
  ArrowLeft, Clock, Eye, Copy, Check, MessageSquare, 
  Send, User, Clock9, Sparkles, UserCheck, Share2 
} from "lucide-react";

interface BlogPostViewProps {
  post: Post;
  posts: Post[];
  comments: Comment[];
  categoryList?: any[];
  onCategorySelect?: (categoryName: string) => void;
  onAddComment: (comment: Omit<Comment, "id" | "date">) => void;
  onPostClick: (post: Post) => void;
  onBackClick: () => void;
}

export default function BlogPostView({
  post,
  posts,
  comments,
  categoryList = [],
  onCategorySelect,
  onAddComment,
  onPostClick,
  onBackClick,
}: BlogPostViewProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [commentName, setCommentName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [commentText, setCommentText] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [commentSubmitted, setCommentSubmitted] = useState(false);
  const [activeId, setActiveId] = useState<string>("");

  // Process HTML and compile the Table of Contents dynamically
  const { tocItems, processedHtml } = useMemo(() => {
    if (typeof window === "undefined" || !post.content) {
      return { tocItems: [] as TOCItem[], processedHtml: post.content };
    }
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(post.content, "text/html");
      const headings = Array.from(doc.querySelectorAll("h2, h3"));
      const items: TOCItem[] = [];
      
      let h2Count = 0;
      let h3Count = 0;
      
      headings.forEach((heading, index) => {
        let id = heading.getAttribute("id");
        if (!id) {
          const rawText = heading.textContent?.trim() || "";
          const cleanText = rawText
            .toLowerCase()
            .replace(/[^\w\s\u0980-\u09ff-]/g, "") // Bengali characters support
            .replace(/\s+/g, "-")
            .substring(0, 45);
            
          id = cleanText || `sec-${index}`;
          
          let uniqueId = id;
          let suffix = 1;
          while (doc.getElementById(uniqueId)) {
            uniqueId = `${id}-${suffix}`;
            suffix++;
          }
          id = uniqueId;
          heading.setAttribute("id", id);
        }
        
        const level = heading.tagName.toLowerCase() === "h2" ? 2 : 3;
        let numbering = "";
        if (level === 2) {
          h2Count++;
          h3Count = 0;
          numbering = `${h2Count}.`;
        } else {
          h3Count++;
          if (h2Count > 0) {
            numbering = `${h2Count}.${h3Count}`;
          } else {
            numbering = `${h3Count}`;
          }
        }
        
        items.push({
          id,
          text: heading.textContent?.trim() || "",
          level,
          numbering,
        });
      });
      
      return {
        tocItems: items,
        processedHtml: doc.body.innerHTML,
      };
    } catch (e) {
      console.error("Failed to generate article TOC:", e);
      return { tocItems: [], processedHtml: post.content };
    }
  }, [post.id, post.content]);

  // Track active section as reader scrolls down
  useEffect(() => {
    if (tocItems.length === 0) return;

    const handleScroll = () => {
      const elements = tocItems
        .map((item) => document.getElementById(item.id))
        .filter((el): el is HTMLElement => el !== null);

      if (elements.length === 0) return;

      const scrollPosition = window.scrollY + 120; // top offset
      let currentActiveId = "";

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.offsetTop <= scrollPosition) {
          currentActiveId = el.id;
        } else {
          break;
        }
      }

      if (!currentActiveId && elements.length > 0) {
        currentActiveId = elements[0].id;
      }

      setActiveId(currentActiveId);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [tocItems]);

  const handleTocClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      setActiveId(id);
    }
  };

  // Monitor reading scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [post.id]);

  // Extract up to 3 related posts based on matching category
  const postCats = Array.isArray(post.categories) && post.categories.length > 0 
    ? post.categories 
    : (post.category ? [post.category] : []);

  const relatedPosts = posts
    .filter((p) => {
      if (p.id === post.id) return false;
      const pCats = Array.isArray(p.categories) && p.categories.length > 0 
        ? p.categories 
        : (p.category ? [p.category] : []);
      return pCats.some(cat => postCats.includes(cat));
    })
    .slice(0, 3);

  // If we can't find related from same category, grab latest from other categories
  const displayRelated = relatedPosts.length > 0 
    ? relatedPosts 
    : posts.filter((p) => p.id !== post.id).slice(0, 3);

  const handleCopyLink = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName.trim() || !commentEmail.trim() || !commentText.trim()) return;

    onAddComment({
      postId: post.id,
      authorName: commentName,
      authorEmail: commentEmail,
      content: commentText,
    });

    setCommentText("");
    setCommentName("");
    setCommentEmail("");
    setCommentSubmitted(true);
    setTimeout(() => setCommentSubmitted(false), 5000);
  };

  // Filter current post comments
  const postComments = comments.filter((c) => c.postId === post.id);

  return (
    <article className="min-h-screen pb-16 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-150 transition-colors duration-300">
      {/* Absolute Reading Progress Bar */}
      <div 
        className="fixed top-0 left-0 w-full h-1 bg-slate-200 dark:bg-slate-800 z-50 pointer-events-none"
        id="reading-progress-container"
      >
        <div 
          className="h-full bg-cyan-500 transition-all duration-75"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Back To Home Button row */}
        <button
          onClick={onBackClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-900 transition-all duration-200 mb-8 cursor-pointer"
          id="btn-back-home"
        >
          <ArrowLeft className="h-4 w-4" />
          ফিরে যান প্রচ্ছদে
        </button>

        {/* Responsive Grid Split Layout for Article Body vs sidebar TOC */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main article stream column (8 cols wide on lg) */}
          <div className="lg:col-span-8">
            {/* Article Breadcrumbs and Category Badge */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex flex-wrap gap-1.5">
            {postCats.map((cat, idx) => (
              <span
                key={idx}
                onClick={() => onCategorySelect && onCategorySelect(cat)}
                className={`font-sans font-bold text-xs uppercase text-cyan-600 dark:text-cyan-400 tracking-wider bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded shadow-sm ${
                  onCategorySelect ? "cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" : ""
                }`}
              >
                {cat}
              </span>
            ))}
          </div>
          <span className="text-gray-300 dark:text-slate-700">|</span>
          <span className="flex items-center gap-1 text-xs text-slate-400 font-sans">
            <Eye className="h-3.5 w-3.5 text-amber-500" />
            {post.views.toLocaleString('bn-BD')} বার পঠিত
          </span>
        </div>

        {/* Article Header Title */}
        <h1 className="font-serif font-black text-3xl sm:text-4xl md:text-5xl text-gray-900 dark:text-white leading-tight mb-6">
          {post.title}
        </h1>

        {/* Author Bio Simple Header */}
        <div className="flex items-center gap-4 py-5 mb-8 border-y border-gray-100 dark:border-slate-900">
          <img
            src={post.author.avatar}
            alt={post.author.name}
            className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-slate-800"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-base text-gray-950 dark:text-white">
                {post.author.name}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 rounded-full font-mono">
                {post.author.role}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 font-sans">
              প্রকাশকাল: {post.publishDate} &bull; {post.views.toLocaleString('bn-BD')} বার পঠিত
            </p>
          </div>
        </div>

        {/* Featured Banner Cover */}
        <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden mb-10 shadow-sm border border-gray-100 dark:border-slate-900">
          <img
            src={post.coverImage || post.featuredImage}
            alt={post.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

            {/* Mobile/Tablet Table of Contents - collapsible accordion, visible only when h2/h3 headings exist */}
            {tocItems.length > 0 && (
              <div className="block lg:hidden mb-8">
                <TableOfContents 
                  items={tocItems} 
                  activeId={activeId} 
                  onItemClick={handleTocClick} 
                />
              </div>
            )}

            {/* Rich Article body Content */}
            <div 
              className="article-content text-gray-800 dark:text-slate-200"
              dangerouslySetInnerHTML={{ __html: processedHtml }}
            />

        {/* Interaction Buttons - Tags and Social Shares */}
        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-slate-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          {/* Post tags pills */}
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span 
                key={tag}
                className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-slate-900 text-gray-600 dark:text-slate-400 rounded-lg hover:text-gray-900 dark:hover:text-white"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Share links */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-400 flex items-center gap-1">
              <Share2 className="h-4 w-4" />
              শেয়ার করুন:
            </span>
            
            <button
              onClick={handleCopyLink}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors duration-150 text-slate-600 dark:text-slate-450 flex items-center gap-1 hover:text-cyan-600"
              title="লিংক কপি করুন"
            >
              {copySuccess ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-emerald-500 font-semibold font-mono">লিংক কপিড!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span className="text-xs">কপি লিংক</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Extended Author BIO Card */}
        <div className="mt-12 p-6 bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-850 flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <img
            src={post.author.avatar}
            alt={post.author.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"
          />
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h4 className="font-serif font-black text-lg text-slate-950 dark:text-white">
                {post.author.name}
              </h4>
              <span className="text-xs px-2.5 py-0.5 bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-300 rounded font-bold">
                {post.author.role}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-355 mt-2 leading-relaxed">
              {post.author.bio}
            </p>
          </div>
        </div>

        {/* Comment Thread Section */}
        <section className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-900" id="comments-section">
          <h3 className="font-bold text-2xl text-slate-950 dark:text-white mb-8 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-cyan-600 dark:text-cyan-500" />
            মন্তব্যসমূহ ({postComments.length.toLocaleString('bn-BD')})
          </h3>

          {/* List of Previous Comments */}
          <div className="space-y-6 mb-12">
            {postComments.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-slate-500 italic bg-gray-50 dark:bg-slate-900 rounded-xl border border-dotted border-gray-200 dark:border-slate-800">
                কোনো মন্তব্য করা হয়নি এখনো। প্রথম মন্তব্যকারী আপনি হোন!
              </div>
            ) : (
              postComments.map((comment) => (
                <div 
                  key={comment.id}
                  className="p-5 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-850"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-cyan-400 rounded-full">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="font-serif font-bold text-sm text-gray-950 dark:text-white">
                        {comment.authorName}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock9 className="h-3 w-3" />
                      {comment.date}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed pl-10">
                    {comment.content}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Leave a Comment Form */}
          <div className="bg-gray-50 dark:bg-slate-900 p-6 rounded-2xl border border-gray-150 dark:border-slate-850">
            <h4 className="font-serif font-bold text-lg text-gray-950 dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
              আপনার মন্তব্য লিখুন
            </h4>

            {commentSubmitted ? (
              <div className="bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-center text-sm animate-bounce">
                মন্তব্যটি সফলভাবে যুক্ত হয়েছে! মূল মডারেটরের রিভিউ সাপেক্ষে এটি প্রকাশিত হবে।
              </div>
            ) : (
              <form onSubmit={handleSubmitComment} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                      আপনার নাম *
                    </label>
                    <input
                      type="text"
                      required
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      placeholder="নাম লিখুন..."
                      className="w-full px-3 py-2.5 text-xs bg-white dark:bg-slate-850 placeholder-slate-400 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-cyan-500 focus:outline-none rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                      আপনার ইমেইল *
                    </label>
                    <input
                      type="email"
                      required
                      value={commentEmail}
                      onChange={(e) => setCommentEmail(e.target.value)}
                      placeholder="ইমেইল@ঠিকানা.কম..."
                      className="w-full px-3 py-2.5 text-xs bg-white dark:bg-slate-850 placeholder-slate-400 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-cyan-500 focus:outline-none rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                    মন্তব্যের বিবরণ *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="আপনার মূল্যবান মন্তব্যটি লিখুন যা আমাদের সাহিত্য সভাকে আলোকিত করবে..."
                    className="w-full px-3 py-2.5 text-xs bg-white dark:bg-slate-850 placeholder-slate-400 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-cyan-500 focus:outline-none rounded"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white font-bold py-2 px-5 rounded text-xs float-right active:scale-95 transition-all cursor-pointer"
                  id="btn-comment-submit"
                >
                  <Send className="h-4 w-4" />
                  মন্তব্যটি পাঠান
                </button>
                <div className="clear-both" />
              </form>
            )}
          </div>
        </section>

        {/* Related Articles Widget Grid */}
        <section className="mt-16 pt-12 border-t border-gray-150 dark:border-slate-900">
          <h3 className="font-serif font-extrabold text-2xl text-gray-900 dark:text-white mb-6">
            সম্পর্কিত অন্যান্য আলোচনা
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {displayRelated.map((relPost) => (
              <div 
                key={relPost.id}
                onClick={() => onPostClick(relPost)}
                className="group cursor-pointer flex flex-col bg-gray-50 dark:bg-slate-900 rounded-xl overflow-hidden border border-gray-100 dark:border-slate-850 shadow-sm hover:shadow-md transition-all"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={relPost.featuredImage}
                    alt={relPost.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="p-4 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {(Array.isArray(relPost.categories) && relPost.categories.length > 0 ? relPost.categories : [relPost.category].filter(Boolean)).map((cat, idx) => (
                        <span key={idx} className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 font-mono tracking-wider uppercase bg-cyan-50 dark:bg-cyan-950/20 px-1 py-0.5 rounded">
                          {cat}
                        </span>
                      ))}
                    </div>
                    <h4 className="font-serif font-bold text-sm text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {relPost.title}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-500 mt-3 border-t border-gray-100 dark:border-slate-800 pt-2 font-mono">
                    <span>{relPost.author.name}</span>
                    <span>{relPost.views.toLocaleString('bn-BD')} বার পঠিত</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
          </div>

          {/* Right Column: Sticky Table of Contents Sidebar on Wide screens */}
          {tocItems.length > 0 && (
            <div className="hidden lg:block lg:col-span-4 sticky top-24 self-start pb-8">
              <TableOfContents 
                items={tocItems} 
                activeId={activeId} 
                onItemClick={handleTocClick} 
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
