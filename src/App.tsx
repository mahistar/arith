import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Post, Comment, Category, SiteConfig, Resource } from "./types";
import { DEFAULT_POSTS, DEFAULT_CATEGORIES } from "./data/defaultPosts";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ArticleCard from "./components/ArticleCard";
import BlogPostView from "./components/BlogPostView";
import AdminDashboard from "./components/AdminDashboard";
import EmailSubscription from "./components/EmailSubscription";
import ArchiveSection from "./components/ArchiveSection";
import DownloadsSection from "./components/DownloadsSection";
import { parsePostDate, getBengaliMonthName, getBengaliYearString } from "./utils/dateParser";
import { 
  ArrowUp, Sparkles, BookOpen, Star, HelpCircle, 
  GraduationCap, FileText, ArrowRight, ShieldAlert, Library,
  Compass, Award
} from "lucide-react";

const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteName: "অ্যারিথমেটিকা",
  siteTagline: "Arithmetica — জ্ঞান ও যুক্তির পথে এক অবিরাম যাত্রা",
  siteBrandingSymbol: "অ",
  headerTitle: "অ্যারিথমেটিকা মুক্তমঞ্চ",
  headerSubtitle: "বিজ্ঞান, দর্শন, গণিত ও মুক্তচিন্তার এক অনন্য অমূল্যায়ন। এখানে যুক্তি এবং নান্দনিকতা পাশাপাশি দাঁড়িয়ে রচনা করে জ্ঞানের নতুন দিগন্ত।",
  footerAbout: "অ্যারিথমেটিকা হলো বিজ্ঞান, দর্শন, গণিত ও মুক্তচিন্তার এক অনন্য ডিজিটাল সাময়িকী। আমরা কোনো প্রকার কুসংস্কার ও অপবিজ্ঞানে প্ররোচিত না হয়ে, সত্য ও বিজ্ঞানের আলো সাধারণের নিকট সাবলীল বাংলা ভাষায় পৌঁছে দেওয়ার প্রত্যয় ব্যক্ত করছি।",
  footerCopyText: "© ২০২৬ অ্যারিথমেটিকা মুক্তমঞ্চ। সর্বস্বত্ব সংরক্ষিত।",
  socialLinks: {
    facebook: "https://facebook.com",
    twitter: "https://twitter.com",
    github: "https://github.com",
    youtube: "https://youtube.com"
  },
  seoConfig: {
    title: "অ্যারিথমেটিকা | বিজ্ঞান ও দর্শন সাময়িকী",
    description: "বিজ্ঞান, দর্শন, গণিত ও মুক্তচিন্তার এক অনন্য বাংলা ডিজিটাল সাময়িকী।",
    keywords: "বিজ্ঞান, গণিত, দর্শন, ইতিহাস, অ্যারিথমেটিকা, লজিক"
  },
  typography: "serif-academic",
  primaryThemeColor: "gold"
};

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to fetch authorization header securely
  const getAuthHeaders = () => {
    const token = localStorage.getItem("arithmetica-jwt-token");
    return {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
  };

  // Study materials / Resources list state
  const [resources, setResources] = useState<Resource[]>([]);

  const handleReloadResources = async () => {
    try {
      const res = await fetch("/api/resources");
      if (res.ok) {
        const data = await res.json();
        setResources(data);
      }
    } catch (e) {
      console.error("Failed to reload academic resources", e);
    }
  };

  // Fetch all database states from the API on boot
  useEffect(() => {
    const loadAllDatabaseStates = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn("Database load request timed out after 10 seconds.");
      }, 10000); // 10s maximum load timeout

      try {
        const [postsRes, categoriesRes, configRes, commentsRes, resourcesRes] = await Promise.all([
          fetch("/api/posts", { signal: controller.signal }),
          fetch("/api/categories", { signal: controller.signal }),
          fetch("/api/site-config", { signal: controller.signal }),
          fetch("/api/comments", { signal: controller.signal }),
          fetch("/api/resources", { signal: controller.signal }).catch(() => null)
        ]);
        clearTimeout(timeoutId);

        if (postsRes && postsRes.ok) {
          const data = await postsRes.json();
          setPosts(data);
        }
        if (categoriesRes && categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(data);
        }
        if (configRes && configRes.ok) {
          const data = await configRes.json();
          setSiteConfig(data);
        }
        if (commentsRes && commentsRes.ok) {
          const data = await commentsRes.json();
          setComments(data);
        }
        if (resourcesRes && resourcesRes.ok) {
          const data = await resourcesRes.json();
          setResources(data);
        }
      } catch (err) {
        console.error("Failed to connect to fullstack REST API backend:", err);
      } finally {
        setIsLoading(false);
        clearTimeout(timeoutId);
      }
    };

    loadAllDatabaseStates();
  }, []);

  // Navigation states
  const [currentView, setCurrentView] = useState<"home" | "article" | "admin">("home");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  
  // Filtering states
  const [selectedCategory, setSelectedCategory] = useState<string>("প্রচ্ছদ");
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedArchiveYear, setSelectedArchiveYear] = useState<number | null>(null);
  const [selectedArchiveMonth, setSelectedArchiveMonth] = useState<number | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const postsPerPage = 4;

  // Dark mode states
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("arithmetica-dark-mode");
    return saved !== null ? saved === "true" : true;
  });

  // Scroll to top visibility state
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Handle dark mode side effects
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("arithmetica-dark-mode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("arithmetica-dark-mode", "false");
    }
  }, [isDarkMode]);

  // Monitor scroll for Scroll-to-Top Button
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // 1. Initial URL Hydration (SEO Friendly URL load parse)
  useEffect(() => {
    if (isLoading || categories.length === 0 || posts.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const catSlug = params.get("category");
    const postSlug = params.get("post");
    const viewParam = params.get("view");

    if (viewParam === "admin") {
      setCurrentView("admin");
      return;
    }

    if (postSlug) {
      const foundPost = posts.find((p) => p.slug === postSlug);
      if (foundPost) {
        setSelectedPost(foundPost);
        setCurrentView("article");
        return;
      }
    }

    if (catSlug) {
      if (catSlug === "all") {
        setSelectedCategory("প্রচ্ছদ");
      } else {
        const foundCat = categories.find((c) => c.englishName === catSlug);
        if (foundCat) {
          setSelectedCategory(foundCat.name);
        }
      }
      setSelectedPost(null);
      setCurrentView("home");
    }
  }, [isLoading, categories, posts]);

  // 2. URL State Writer (Update browser URL as views or active selections change)
  useEffect(() => {
    if (isLoading || categories.length === 0 || posts.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    
    if (currentView === "admin") {
      if (params.get("view") !== "admin") {
        window.history.pushState({ view: "admin" }, "", "/?view=admin");
      }
    } else if (currentView === "article" && selectedPost) {
      if (params.get("post") !== selectedPost.slug) {
        window.history.pushState(
          { view: "article", postSlug: selectedPost.slug },
          "",
          `/?post=${selectedPost.slug}`
        );
      }
    } else if (currentView === "home") {
      if (selectedCategory === "প্রচ্ছদ") {
        if (window.location.search !== "") {
          window.history.pushState({ view: "home", categorySlug: "all" }, "", "/");
        }
      } else {
        const activeCatObj = categories.find((c) => c.name === selectedCategory);
        if (activeCatObj) {
          if (params.get("category") !== activeCatObj.englishName) {
            window.history.pushState(
              { view: "home", categorySlug: activeCatObj.englishName },
              "",
              `/?category=${activeCatObj.englishName}`
            );
          }
        }
      }
    }
  }, [currentView, selectedPost, selectedCategory, isLoading, categories, posts]);

  // 3. Listening to Browser Navigation (Back and Forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const catSlug = params.get("category");
      const postSlug = params.get("post");
      const viewParam = params.get("view");

      if (viewParam === "admin") {
        setCurrentView("admin");
        return;
      }

      if (postSlug) {
        const foundPost = posts.find((p) => p.slug === postSlug);
        if (foundPost) {
          setSelectedPost(foundPost);
          setCurrentView("article");
          return;
        }
      }

      if (catSlug) {
        const foundCat = categories.find((c) => c.englishName === catSlug);
        if (foundCat) {
          setSelectedCategory(foundCat.name);
        } else {
          setSelectedCategory("প্রচ্ছদ");
        }
        setSelectedPost(null);
        setCurrentView("home");
      } else {
        setSelectedCategory("প্রচ্ছদ");
        setSelectedPost(null);
        setCurrentView("home");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [categories, posts]);

  // Helper inside controller to add comments via public API
  const handleAddComment = async (commentData: Omit<Comment, "id" | "date">) => {
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commentData)
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
      } else {
        const err = await res.json();
        console.error("Failed to post comment:", err.error);
      }
    } catch (err) {
      console.error("Error sending comment:", err);
    }
  };

  // Secure Add / Edit / Delete Post Handlers over backend routes
  const handleAddPost = async (postData: Omit<Post, "id" | "views" | "publishDate"> & { id?: string }): Promise<boolean> => {
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(postData)
      });
      if (res.ok) {
        const createdPost = await res.json();
        setPosts((prev) => [createdPost, ...prev]);
        return true;
      } else {
        const err = await res.json();
        alert(`নতুন নিবন্ধ পোস্ট করা সম্ভব হয়নি: ${err.error || "অজ্ঞাত কারণ"}`);
        return false;
      }
    } catch (err) {
      console.error("Error creating post:", err);
      alert("সার্ভারের সাথে যোগাযোগ স্থাপন করা যায়নি। দয়া করে পুনরায় চেষ্টা করুন।");
      return false;
    }
  };

  const handleEditPost = async (editedPost: Post): Promise<boolean> => {
    try {
      const res = await fetch(`/api/posts/${editedPost.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(editedPost)
      });
      if (res.ok) {
        const updated = await res.json();
        setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        // Sync current viewed post if editing it
        if (selectedPost && selectedPost.id === updated.id) {
          setSelectedPost(updated);
        }
        return true;
      } else {
        const err = await res.json();
        alert(`নিবন্ধ পরিবর্তন করা সম্ভব হয়নি: ${err.error || "অজ্ঞাত কারণ"}`);
        return false;
      }
    } catch (err) {
      console.error("Error updating post:", err);
      alert("সার্ভারের সাথে যোগাযোগ স্থাপন করা যায়নি। দয়া করে পুনরায় চেষ্টা করুন।");
      return false;
    }
  };

  const handleDeletePost = async (id: string): Promise<{ success: boolean; error?: string }> => {
    console.log(`[CLIENT DELETE] Initiating delete request for post ID: ${id}`);
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      
      console.log(`[CLIENT DELETE] Post ID: ${id}, Response Status: ${res.status}`);
      
      if (res.ok) {
        const data = await res.json();
        console.log(`[CLIENT DELETE] Success Response:`, data);
        setPosts((prev) => prev.filter((p) => p.id !== id));
        // Clear current selection if deleted
        if (selectedPost && selectedPost.id === id) {
          setSelectedPost(null);
          setCurrentView("home");
        }
        return { success: true };
      } else {
        const err = await res.json();
        console.error(`[CLIENT DELETE] Fail Response:`, err);
        return { success: false, error: err.error || "অজ্ঞাত সমস্যা" };
      }
    } catch (err: any) {
      console.error("[CLIENT DELETE] Exception occurred:", err);
      return { success: false, error: err?.message || "সার্ভার সংযোগ বিচ্ছিন্ন বা নেটওয়ার্ক সংযোগ ত্রুটি।" };
    }
  };

  // Category Configuration Handlers over secure backend routes
  const handleAddCategory = async (cat: Category) => {
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(cat)
      });
      if (res.ok) {
        const createdCat = await res.json();
        setCategories((prev) => [...prev, createdCat]);
      } else {
        const err = await res.json();
        alert(`নতুন বিভাগ তৈরি করা সম্ভব হয়নি: ${err.error || "অজ্ঞাত কারণ"}`);
      }
    } catch (err) {
      console.error("Error writing category:", err);
    }
  };

  const handleEditCategory = async (cat: Category) => {
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(cat)
      });
      if (res.ok) {
        const updatedCat = await res.json();
        setCategories((prev) => prev.map((c) => (c.id === updatedCat.id ? updatedCat : c)));
      } else {
        const err = await res.json();
        alert(`বিভাগ সম্পাদন করা সম্ভব হয়নি: ${err.error || "অজ্ঞাত কারণ"}`);
      }
    } catch (err) {
      console.error("Error updating category:", err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } else {
        const err = await res.json();
        alert(`বিভাগ মুছে ফেলা সম্ভব হয়নি: ${err.error || "অজ্ঞাত কারণ"}`);
      }
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };

  // Site Configuration Update Handler over secure backend route
  const handleUpdateSiteConfig = async (config: SiteConfig) => {
    try {
      const res = await fetch("/api/site-config", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(config)
      });
      if (res.ok) {
        const updatedConfig = await res.json();
        setSiteConfig(updatedConfig);
      } else {
        const err = await res.json();
        alert(`সেটিংস সম্পাদন করা সম্ভব হয়নি: ${err.error || "অজ্ঞাত কারণ"}`);
      }
    } catch (err) {
      console.error("Error updating web layouts:", err);
    }
  };

  const handlePostClick = async (post: Post) => {
    setSelectedPost(post);
    setCurrentView("article");
    scrollToTop();

    // Securely increment post views in backend, visible inside admin analytics real time
    try {
      const token = localStorage.getItem("arithmetica-jwt-token");
      const res = await fetch(`/api/posts/${post.id}/view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const viewData = await res.json();
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === post.id) {
              return { ...p, views: viewData.views };
            }
            return p;
          })
        );
      }
    } catch (err) {
      console.error("Error tracking post views:", err);
    }
  };

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setSelectedTag("");
    setSelectedArchiveYear(null);
    setSelectedArchiveMonth(null);
    setCurrentPage(1);
    setSelectedPost(null);
    setCurrentView("home");
    scrollToTop();
  };

  const handleTagSelect = (tag: string) => {
    setSelectedTag(tag);
    setSelectedArchiveYear(null);
    setSelectedArchiveMonth(null);
    setCurrentPage(1);
    scrollToTop();
  };

  const handleBackToHome = () => {
    setSelectedPost(null);
    setCurrentView("home");
    scrollToTop();
  };

  // Core Filtering Pipeline: Public visitors must ONLY view "published" posts
  const publicPostsOnly = posts.filter(post => post.status === "published" || !post.status);

  const filteredPosts = publicPostsOnly.filter((post) => {
    const postCats = Array.isArray(post.categories) && post.categories.length > 0 
      ? post.categories 
      : (post.category ? [post.category] : []);

    const matchesCategory =
      selectedCategory === "প্রচ্ছদ" || postCats.includes(selectedCategory);
    const matchesTag = !selectedTag || post.tags.includes(selectedTag);
    const matchesSearch =
      !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesArchive = true;
    if (selectedArchiveYear) {
      const dateInfo = parsePostDate(post);
      if (dateInfo.year !== selectedArchiveYear) {
        matchesArchive = false;
      }
      if (selectedArchiveMonth && dateInfo.monthNum !== selectedArchiveMonth) {
        matchesArchive = false;
      }
    }

    return matchesCategory && matchesTag && matchesSearch && matchesArchive;
  });

  // Use a minimalist clean stream of all posts on the home page as requested
  const streamPosts = filteredPosts;

  // Pagination bounds
  const indexOfLastPost = currentPage * postsPerPage;
  const indexOfFirstPost = indexOfLastPost - postsPerPage;
  const displayStream = streamPosts.slice(indexOfFirstPost, indexOfLastPost);
  const totalPages = Math.ceil(streamPosts.length / postsPerPage);

  const getThemeHighlightColor = () => {
    switch (siteConfig.primaryThemeColor) {
      case "gold": return "hover:text-amber-500 dark:hover:text-amber-400";
      case "blue": return "hover:text-blue-500 dark:hover:text-blue-400";
      case "emerald": return "hover:text-emerald-500 dark:hover:text-emerald-400";
      case "amber": return "hover:text-amber-600 dark:hover:text-amber-400";
      default: return "hover:text-cyan-500";
    }
  };

  // Aesthetic parchment overlay classes based on active configuration
  const bgTextureClass = () => {
    if (siteConfig.typography === "manuscript-classical") {
      return "bg-amber-50/5 dark:bg-slate-950/40";
    }
    return "";
  };

  const renderLeftArticleFeed = () => {
    if (filteredPosts.length === 0) {
      return (
        <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center animate-fade-in shadow-sm">
          <Library className="h-14 w-14 text-amber-500/80 mx-auto mb-4 animate-pulse" />
          <h3 className="font-serif font-black text-2xl text-slate-900 dark:text-white mb-3">
            জ্ঞানের মহ্প্রাঙ্গণে আপনাকে স্বাগতম!
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
            অ্যারিথমেটিকা মুক্তমঞ্চের কোনো নিবন্ধ বর্তমানে প্রকাশিত নেই। অ্যাডমিন কন্ট্রোল প্যানেলে প্রবেশ করে আজকের প্রথম প্রবন্ধটি রচনা করুন এবং জ্ঞানের সত্য শিখা প্রজ্জ্বলিত করুন!
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => setCurrentView("admin")}
              className="inline-flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 dark:bg-amber-600 dark:hover:bg-amber-500 text-white dark:text-slate-950 font-serif font-bold text-xs px-5 py-3 rounded shadow transition-all active:scale-95 cursor-pointer border border-transparent dark:border-amber-600"
            >
              আজকের প্রথম কলাম লিখুন
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            {(selectedTag || searchQuery || selectedCategory !== "প্রচ্ছদ") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("প্রচ্ছদ");
                  setSelectedTag("");
                  setCurrentPage(1);
                }}
                className="px-5 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 rounded cursor-pointer transition-colors"
              >
                ফিল্টারসমূহ রিসেট করুন
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Dynamic vertical stream list of cards */}
        {displayStream.map((post) => (
          <ArticleCard
            key={post.id}
            post={post}
            onClick={() => handlePostClick(post)}
          />
        ))}

        {/* Pagination Controls Section - Minimal Numeric Style from Mockup */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 pt-6 justify-center border-t border-slate-100 dark:border-slate-850">
            {Array.from({ length: totalPages }).map((_, index) => {
              const pageNum = index + 1;
              const isActive = currentPage === pageNum;
              return (
                <span 
                  key={pageNum}
                  onClick={() => {
                    setCurrentPage(pageNum);
                    scrollToTop();
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold cursor-pointer transition-all ${
                    isActive
                      ? "bg-slate-950 text-white dark:bg-amber-600 dark:text-slate-950"
                      : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  {pageNum.toLocaleString('bn-BD')}
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
          <p className="font-serif text-slate-800 dark:text-slate-200 text-sm">
            অ্যারিথমেটিকা মুক্তমঞ্চ লোড হচ্ছে...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950 transition-colors duration-300 ${bgTextureClass()}`}>
      
      {/* 0. Custom typography and color config tags injected programmatically inside document */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Cinzel:wght@400;700;900&family=Inter:wght@300;400;650;700&family=Noto+Serif+Bengali:wght@300;450;600;700;900&display=swap');
        
        :root {
          --primary-selected: ${
            siteConfig.primaryThemeColor === "gold" ? "#D4AF37" :
            siteConfig.primaryThemeColor === "blue" ? "#3B82F6" :
            siteConfig.primaryThemeColor === "emerald" ? "#10B981" :
            siteConfig.primaryThemeColor === "amber" ? "#F59E0B" : "#64748B"
          };
        }

        body {
          font-family: ${
            siteConfig.typography === "sans-minimal" ? "'Inter', sans-serif" :
            siteConfig.typography === "manuscript-classical" ? "'Noto Serif Bengali', 'Cinzel', 'Playfair Display', serif" :
            "'Noto Serif Bengali', 'Playfair Display', 'Georgia', serif"
          };
        }
        
        h1, h2, h3, h4, h5, h6, .brand-font-serif {
          font-family: ${
            siteConfig.typography === "sans-minimal" ? "'Inter', sans-serif" :
            siteConfig.typography === "manuscript-classical" ? "'Cinzel', 'Noto Serif Bengali', serif" :
            "'Noto Serif Bengali', 'Playfair Display', serif"
          };
          font-weight: 950;
        }

        .article-content h2, .article-content h3 {
          font-family: 'Noto Serif Bengali', 'Playfair Display', serif;
          font-weight: 700;
          color: var(--primary-selected);
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .article-content p {
          line-height: 1.85;
          margin-bottom: 1.25rem;
          font-size: 0.95rem;
          color: #374151;
        }

        .dark .article-content p {
          color: #D1D5DB;
        }

        .article-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1.5rem auto;
          display: block;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }

        .article-content blockquote {
          border-left: 4px solid var(--primary-selected);
          padding-left: 1.25rem;
          font-style: italic;
          margin: 1.5rem 0;
          color: #4B5563;
        }

        .dark .article-content blockquote {
          color: #9CA3AF;
        }

        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      ` }} />

      {/* 1. Header Navbar */}
      <Navbar
        categories={categories}
        siteConfig={siteConfig}
        currentCategory={selectedCategory}
        onCategorySelected={handleCategorySelect}
        currentView={currentView}
        onViewChanged={setCurrentView}
        searchQuery={searchQuery}
        onSearchQueryChanged={(q) => {
          setSearchQuery(q);
          setSelectedArchiveYear(null);
          setSelectedArchiveMonth(null);
          setCurrentPage(1);
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        onPostSelect={handlePostClick}
      />

      {/* 2. Primary Page Layout Container */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {currentView === "home" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* DESKTOP ACADEMIC SIDEBAR / ACCESSIBLE CATEGORIES */}
            <aside className="hidden lg:col-span-3 lg:block sticky top-24 space-y-6 self-start">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-sm transition-colors duration-300">
                <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 mb-4">
                  <Library className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                  <h3 className="font-serif font-black text-xs text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                    জ্ঞান অন্বেষণ বিভাগসূচী
                  </h3>
                </div>

                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-serif leading-relaxed mb-4">
                  গণিত, ইতিহাস, বিজ্ঞান ও দর্শনের সুনির্দিষ্ট শাখাসমূহের সমৃদ্ধ প্রবন্ধ সম্ভার অন্বেষণ করুন।
                </p>

                <nav className="space-y-1" aria-label="নিবন্ধ ক্যাটাগরি সূচী">
                  {/* All Categories Indicator */}
                  <motion.button
                    whileHover={{ x: 2, backgroundColor: "rgba(245, 158, 11, 0.03)" }}
                    onClick={() => handleCategorySelect("প্রচ্ছদ")}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded transition-all duration-200 text-left cursor-pointer group ${
                      selectedCategory === "প্রচ্ছদ"
                        ? "bg-amber-50/70 text-amber-600 font-bold border-l-2 border-amber-500 dark:bg-amber-500/5 dark:text-amber-400 dark:border-amber-400 shadow-sm"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Compass className={`h-3.5 w-3.5 shrink-0 ${selectedCategory === "প্রচ্ছদ" ? "text-amber-500" : "text-slate-400"}`} />
                      <span className="truncate font-serif">সব প্রবন্ধ সূচী (All)</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 transition-colors ${
                      selectedCategory === "প্রচ্ছদ"
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}>
                      {(posts.filter(p => p.status === "published" || !p.status).length).toLocaleString('bn-BD')}
                    </span>
                  </motion.button>

                  {/* Dynamic Category List */}
                  {categories
                    .filter((cat) => cat.enabled)
                    .sort((a, b) => a.order - b.order)
                    .map((cat) => {
                      const postsInCat = posts.filter(p => {
                        const isPub = p.status === "published" || !p.status;
                        const pCats = Array.isArray(p.categories) && p.categories.length > 0
                          ? p.categories
                          : [p.category].filter(Boolean);
                        return isPub && pCats.includes(cat.name);
                      }).length;

                      const isSelected = selectedCategory === cat.name;

                      return (
                        <motion.button
                          key={cat.id}
                          whileHover={{ x: 2, backgroundColor: "rgba(245, 158, 11, 0.03)" }}
                          onClick={() => handleCategorySelect(cat.name)}
                          className={`w-full flex flex-col px-3 py-2 rounded transition-all duration-200 text-left cursor-pointer ${
                            isSelected
                              ? "bg-amber-50/70 text-amber-600 font-bold border-l-2 border-amber-500 dark:bg-amber-500/5 dark:text-amber-400 dark:border-amber-400 shadow-sm"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-205"
                          }`}
                        >
                          <div className="w-full flex items-center justify-between min-w-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`text-[10px] w-2.5 h-2.5 flex items-center justify-center font-bold ${isSelected ? "text-amber-500" : "text-slate-400"}`}>⬡</span>
                              <span className="truncate font-serif text-xs font-semibold">{cat.name}</span>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 transition-colors ${
                              isSelected
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                            }`}>
                              {postsInCat.toLocaleString('bn-BD')}
                            </span>
                          </div>
                          {cat.description && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 pl-5 line-clamp-1 font-serif font-light leading-relaxed">
                              {cat.description}
                            </p>
                          )}
                        </motion.button>
                      );
                    })}
                </nav>
              </div>
            </aside>

            {/* MAIN PORTAL AREA */}
            <div className="col-span-1 lg:col-span-9 space-y-6">

              {/* MOBILE HORIZONTAL SCROLLABLE CATEGORIES Track (Visible on tablets and mobile devices) */}
              <div className="block lg:hidden w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm transition-colors duration-300">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-850 pb-2">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                    <Library className="h-4 w-4 text-amber-500" />
                    <span className="font-serif font-bold text-[12px] uppercase tracking-wider">বিষয়শ্রেণী অন্বেষণ</span>
                  </div>
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-mono uppercase tracking-widest font-black bg-amber-500/10 px-2 py-0.5 rounded">
                    {selectedCategory}
                  </span>
                </div>

                {/* Ribbon flow */}
                <div className="w-full relative overflow-hidden">
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleCategorySelect("প্রচ্ছদ")}
                      className={`px-4 py-3 text-xs font-serif rounded-sm whitespace-nowrap border shrink-0 transition-all font-semibold cursor-pointer select-none min-h-[44px] flex items-center justify-center ${
                        selectedCategory === "প্রচ্ছদ"
                          ? "bg-slate-900 text-white border-transparent dark:bg-amber-500 dark:text-slate-950 shadow-md font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-300"
                      }`}
                    >
                      সব নিবন্ধ সূচী (All)
                    </motion.button>

                    {categories
                      .filter((cat) => cat.enabled)
                      .sort((a, b) => a.order - b.order)
                      .map((cat) => {
                        const isSelected = selectedCategory === cat.name;
                        const postsInCat = posts.filter(p => {
                          const isPub = p.status === "published" || !p.status;
                          const pCats = Array.isArray(p.categories) && p.categories.length > 0
                            ? p.categories
                            : [p.category].filter(Boolean);
                          return isPub && pCats.includes(cat.name);
                        }).length;

                        return (
                          <motion.button
                            key={cat.id}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleCategorySelect(cat.name)}
                            className={`px-4 py-3 text-xs font-serif rounded-sm whitespace-nowrap border shrink-0 transition-all font-semibold cursor-pointer select-none min-h-[44px] flex items-center justify-center ${
                              isSelected
                                ? "bg-slate-900 text-white border-transparent dark:bg-amber-500 dark:text-slate-950 shadow-md font-bold"
                                : "bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {cat.name} ({postsInCat.toLocaleString('bn-BD')})
                          </motion.button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Active filters heading banner */}
              {(selectedTag || searchQuery || selectedCategory !== "প্রচ্ছদ" || selectedArchiveYear) && (() => {
                const activeCategoryObj = categories.find(c => c.name === selectedCategory);
                return (
                  <div className="space-y-4 mb-2">
                    {activeCategoryObj?.imageUrl && (
                      <div className="relative h-40 rounded overflow-hidden shadow-sm border border-slate-200 dark:border-slate-850 animate-fade-in leading-none">
                        <img src={activeCategoryObj.imageUrl} alt={activeCategoryObj.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent flex flex-col justify-end p-5">
                          <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-bold uppercase tracking-wider mb-1.5 w-max leading-normal">
                            বিভাগ নির্দেশিকা
                          </span>
                          <h3 className="font-serif font-black text-xl md:text-2xl text-white tracking-wide">
                            {activeCategoryObj.name}
                          </h3>
                          {activeCategoryObj.description && (
                            <p className="text-white/80 text-[11px] max-w-xl mt-1 leading-relaxed font-serif">
                              {activeCategoryObj.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded border border-slate-100 dark:border-slate-850 flex items-center justify-between flex-wrap gap-2">
                      <div className="text-xs sm:text-sm">
                        <span className="text-slate-400 font-medium">সক্রিয় ফিল্টার: </span>
                        {selectedCategory !== "প্রচ্ছদ" && (
                          <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded ml-1 text-xs">
                            ক্যাটাগরি: {selectedCategory}
                          </span>
                        )}
                        {selectedTag && (
                          <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded ml-1 text-xs">
                            ট্যাগ: #{selectedTag}
                          </span>
                        )}
                        {searchQuery && (
                          <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 bg-amber-500/10 px-2 py-0.5 rounded ml-1 text-xs">
                            খুঁজছেন: "{searchQuery}"
                          </span>
                        )}
                        {selectedArchiveYear && (
                          <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded ml-1 text-xs">
                            আর্কাইভ: {selectedArchiveMonth ? `${getBengaliMonthName(selectedArchiveMonth)} ` : ""}{getBengaliYearString(selectedArchiveYear)}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 ml-3 font-mono font-medium">
                          ({filteredPosts.length.toLocaleString('bn-BD')} টি নিবন্ধ পাওয়া গেছে)
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCategory("প্রচ্ছদ");
                          setSelectedTag("");
                          setSearchQuery("");
                          setSelectedArchiveYear(null);
                          setSelectedArchiveMonth(null);
                          setCurrentPage(1);
                        }}
                        className="text-xs bg-slate-900 dark:bg-slate-850 text-white font-mono font-bold py-1 px-3 rounded hover:bg-slate-800 cursor-pointer"
                      >
                        সব মুছুন [Clear]
                      </button>
                    </div>
                  </div>
                );
              })()}


              {/* Centered Posts Feed Column */}
              <div className="space-y-6">
                {renderLeftArticleFeed()}
              </div>


              {/* Archive Section to filter posts by Year and Month */}
              <ArchiveSection
                posts={posts}
                selectedArchiveYear={selectedArchiveYear}
                selectedArchiveMonth={selectedArchiveMonth}
                onSelectArchive={(year, month) => {
                  setSelectedArchiveYear(year);
                  setSelectedArchiveMonth(month);
                  setSelectedCategory("প্রচ্ছদ");
                  setSelectedTag("");
                  setSearchQuery("");
                  setCurrentPage(1);
                  scrollToTop();
                }}
              />

              {/* Academic Resources / Downloads Section */}
              <DownloadsSection 
                resources={resources} 
                onDownloadIncrement={handleReloadResources} 
              />

              {/* Email Subscription at the bottom of homepage ONLY as requested */}
              <EmailSubscription />
            </div>
          </div>
        )}

        {currentView === "article" && selectedPost && (
          <BlogPostView
            post={selectedPost}
            posts={posts}
            comments={comments}
            categoryList={categories}
            onCategorySelect={handleCategorySelect}
            onAddComment={handleAddComment}
            onPostClick={handlePostClick}
            onBackClick={handleBackToHome}
          />
        )}

        {currentView === "admin" && (
          <AdminDashboard
            posts={posts}
            categories={categories}
            siteConfig={siteConfig}
            onAddPost={handleAddPost}
            onDeletePost={handleDeletePost}
            onEditPost={handleEditPost}
            onAddCategory={handleAddCategory}
            onEditCategory={handleEditCategory}
            onDeleteCategory={handleDeleteCategory}
            onUpdateSiteConfig={handleUpdateSiteConfig}
            onBackToHome={handleBackToHome}
            resources={resources}
            onReloadResources={handleReloadResources}
          />
        )}
      </main>

      {/* 3. Magazine elegant footer */}
      <footer className="w-full bg-white dark:bg-slate-950 px-8 py-8 border-t border-slate-100 dark:border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6 text-[11px] text-slate-400 transition-colors duration-300 max-w-7xl mx-auto">
        <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left max-w-xl">
          <span className="font-serif font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider">{siteConfig.siteName}</span>
          <p className="text-[10px] text-slate-500 dark:text-slate-450 leading-relaxed">{siteConfig.footerAbout || siteConfig.siteTagline}</p>
          <span className="mt-1 block font-medium">{siteConfig.footerCopyText}</span>
        </div>
        <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
          <div className="flex gap-4">
            {siteConfig.socialLinks.facebook && <a href={siteConfig.socialLinks.facebook} target="_blank" rel="noreferrer" className={`hover:text-amber-500 font-bold transition-all`}>FB</a>}
            {siteConfig.socialLinks.twitter && <a href={siteConfig.socialLinks.twitter} target="_blank" rel="noreferrer" className={`hover:text-amber-500 font-bold transition-all`}>X</a>}
            {siteConfig.socialLinks.github && <a href={siteConfig.socialLinks.github} target="_blank" rel="noreferrer" className={`hover:text-amber-500 font-bold transition-all`}>GH</a>}
            {siteConfig.socialLinks.youtube && <a href={siteConfig.socialLinks.youtube} target="_blank" rel="noreferrer" className={`hover:text-amber-500 font-bold transition-all`}>YT</a>}
          </div>
          <span 
            onClick={scrollToTop}
            className="bg-slate-950 dark:bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-white hover:text-amber-400 px-3 py-1 rounded cursor-pointer transition-all select-none font-semibold text-[10px] uppercase font-mono"
          >
            উপরে উঠুন ↑
          </span>
        </div>
      </footer>
    </div>
  );
}
