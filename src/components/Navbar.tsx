import React, { useState } from "react";
import { Category, SiteConfig } from "../types";
import { Sun, Moon, Sparkles, LayoutDashboard, Search, Menu, X, Globe, Star } from "lucide-react";

interface NavbarProps {
  categories: Category[];
  siteConfig: SiteConfig;
  currentCategory: string;
  onCategorySelected: (categoryName: string) => void;
  currentView: string;
  onViewChanged: (view: string) => void;
  searchQuery: string;
  onSearchQueryChanged: (query: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onPostSelect?: (post: any) => void;
}

export default function Navbar({
  categories,
  siteConfig,
  currentCategory,
  onCategorySelected,
  currentView,
  onViewChanged,
  searchQuery,
  onSearchQueryChanged,
  isDarkMode,
  onToggleDarkMode,
  onPostSelect,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Real-time Autocomplete States
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Sync with outer searchQuery if cleared/changed externally
  React.useEffect(() => {
    setLocalQuery(searchQuery);
    if (!searchQuery) {
      setSuggestions([]);
      setShowDropdown(false);
    }
  }, [searchQuery]);

  // Click outside listener to auto-close suggestions dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounced endpoint querying & parent state synchronization
  React.useEffect(() => {
    // If empty text is typed, clear suggestions, close dropdown, and reset parent filter
    if (!localQuery.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      onSearchQueryChanged("");
      return;
    }

    const delayDebounceSelector = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(localQuery)}`);
        if (response.ok) {
          const matchedResults = await response.json();
          setSuggestions(matchedResults);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Failed to query autocomplete suggestions:", err);
      } finally {
        setIsSearching(false);
      }

      // Smooth parent update after typing ceases to filter stream performance-safely
      onSearchQueryChanged(localQuery);
      if (currentView !== "home") {
        onViewChanged("home");
      }
    }, 350); // 350ms optimized delay for immediate responsive suggestions

    return () => clearTimeout(delayDebounceSelector);
  }, [localQuery]);

  const activeCategories = categories
    .filter(cat => cat.enabled)
    .sort((a, b) => a.order - b.order);

  const handleCategoryClick = (categoryName: string) => {
    onCategorySelected(categoryName);
    onViewChanged("home");
    setMobileMenuOpen(false);
  };

  // Decide branding color based on theme
  const getThemeColorClass = () => {
    switch (siteConfig.primaryThemeColor) {
      case "gold": return "bg-amber-500 text-slate-950";
      case "blue": return "bg-blue-600 text-white";
      case "emerald": return "bg-emerald-600 text-white";
      case "amber": return "bg-amber-600 text-white";
      default: return "bg-slate-900 text-white";
    }
  };

  const borderThemeClass = () => {
    switch (siteConfig.primaryThemeColor) {
      case "gold": return "border-amber-500/20";
      default: return "border-slate-100 dark:border-slate-800";
    }
  };

  const textThemeClass = () => {
    switch (siteConfig.primaryThemeColor) {
      case "gold": return "text-amber-500";
      case "blue": return "text-blue-500";
      case "emerald": return "text-emerald-500";
      case "amber": return "text-amber-600 dark:text-amber-400";
      default: return "text-cyan-500";
    }
  };

  return (
    <header className="w-full bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 transition-colors duration-300">
      {/* Top Brand Branding Bar featuring Ancient Geometry accents */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4 flex flex-col md:flex-row items-center md:items-end justify-between gap-4">
        {/* Logo, tagline and geometric icon */}
        <div 
          className="flex flex-col items-center md:items-start cursor-pointer group"
          onClick={() => {
            onCategorySelected("প্রচ্ছদ");
            onViewChanged("home");
            onSearchQueryChanged("");
          }}
        >
          <div className="flex items-center gap-2">
            <span className={`${getThemeColorClass()} px-2.5 py-0.5 rounded shadow-sm font-serif font-bold text-2xl group-hover:scale-105 transition-transform duration-200`}>
              {siteConfig.siteBrandingSymbol || "অ"}
            </span>
            <h1 className="text-3xl font-black text-slate-950 dark:text-white tracking-tight uppercase font-serif">
              {siteConfig.siteName || "অ্যারিথমেটিকা"}
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 font-semibold tracking-wide uppercase font-mono max-w-md text-center md:text-left">
            {siteConfig.siteTagline || "Arithmetica — জ্ঞান ও যুক্তির পথে এক অবিরাম যাত্রা"}
          </p>
        </div>

        {/* Action Controls (Search, Dark Mode, Admin Controls) */}
        <div className="flex items-center flex-wrap justify-center gap-3 w-full md:w-auto mt-2 md:mt-0">
          {/* Search bar inside header */}
          <div className="relative w-full max-w-xs sm:w-64" ref={dropdownRef}>
            <input
              type="text"
              value={localQuery}
              onChange={(e) => {
                setLocalQuery(e.target.value);
              }}
              onFocus={() => {
                if (localQuery.trim() && suggestions.length > 0) {
                  setShowDropdown(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setShowDropdown(false);
                }
              }}
              placeholder="নিবন্ধ খুঁজুন..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded outline-none focus:ring-1 focus:ring-amber-500/50 transition-all duration-300 font-medium"
            />
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            {localQuery && (
              <button 
                onClick={() => {
                  setLocalQuery("");
                  setSuggestions([]);
                  setShowDropdown(false);
                  onSearchQueryChanged("");
                }}
                className="absolute right-2.5 top-2 py-0.5 px-1 text-[10px] text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            )}

            {/* Google-style Autocomplete Dropdown suggestions list */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1.5 w-full bg-white dark:bg-slate-905 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-2xl z-[100] max-h-80 overflow-y-auto overflow-x-hidden animate-fade-in text-left">
                {isSearching ? (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>খোঁজা হচ্ছে...</span>
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 dark:text-slate-500 font-serif italic">
                    কোনো নিবন্ধ পাওয়া যায়নি
                  </div>
                ) : (
                  <div className="py-1">
                    <div className="px-3 py-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-850">
                      পরামর্শসমূহ ({suggestions.length})
                    </div>
                    {suggestions.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => {
                          if (onPostSelect) {
                            onPostSelect(post);
                          }
                          setLocalQuery("");
                          setSuggestions([]);
                          setShowDropdown(false);
                        }}
                        className="px-3 py-2 hover:bg-amber-500/10 dark:hover:bg-amber-500/15 cursor-pointer transition-colors border-b last:border-0 border-slate-100 dark:border-slate-850 flex items-start gap-2 group text-left"
                      >
                        <div className="flex-1 min-w-0 select-none">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1 font-serif text-left">
                            {post.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 font-sans text-left">
                            {post.excerpt || (post.content ? post.content.replace(/<[^>]*>/g, '').substring(0, 60) + "..." : "")}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold font-serif self-center">
                          {post.category}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dark Mode Toggle */}
          <div
            onClick={onToggleDarkMode}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-850 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer select-none border border-transparent dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
            title="ডার্ক মোড পরিবর্তন করুন"
            id="theme-toggle-btn"
          >
            <div className={`w-2.5 h-2.5 rounded-full transition-all ${isDarkMode ? textThemeClass() : 'bg-slate-900'}`}></div>
            <span className="text-slate-700 dark:text-slate-300 pr-0.5">{isDarkMode ? "লাইট মোড" : "ডার্ক মোড"}</span>
          </div>

          {/* Admin Dashboard Entry Button */}
          <button
            onClick={() => onViewChanged(currentView === "admin" ? "home" : "admin")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded transition-all border ${
              currentView === "admin"
                ? "bg-amber-500 border-amber-500 text-slate-950 font-black shadow"
                : "bg-slate-950 border-slate-950 text-white hover:bg-slate-850 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-850"
            }`}
            id="admin-dashboard-toggle"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>কনট্রোল প্যানেল</span>
          </button>
          
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-300 rounded border border-transparent dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Dynamic Sticky horizontal navbar */}
      <nav id="sticky-navbar" className="sticky top-0 z-40 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hidden md:flex flex-wrap items-center justify-between">
            <ul className="flex flex-wrap gap-5 text-[13px] font-bold items-center py-2">
              <li 
                onClick={() => handleCategoryClick("প্রচ্ছদ")}
                className={`cursor-pointer pb-0.5 transition-colors font-bold ${
                  currentCategory === "প্রচ্ছদ"
                    ? `text-amber-400 border-b-2 border-amber-400`
                    : "text-gray-350 hover:text-amber-400"
                }`}
              >
                প্রচ্ছদ (Home)
              </li>

              {activeCategories.map((category) => {
                const isActive = currentCategory === category.name;
                return (
                  <li 
                    key={category.id}
                    onClick={() => handleCategoryClick(category.name)}
                    className={`cursor-pointer pb-0.5 transition-colors font-bold ${
                      isActive
                        ? "text-amber-400 border-b-2 border-amber-400"
                        : "text-gray-350 hover:text-amber-400"
                    }`}
                  >
                    {category.name}
                  </li>
                );
              })}
            </ul>
            
            <div className="flex items-center text-[10.5px] text-slate-400 gap-1.5 font-mono">
              <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
              <span>{new Date().toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation List */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-850 bg-slate-950 px-4 py-3 flex flex-col gap-1">
            <div className="text-[11px] font-bold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">
              নিবন্ধ বিভাগসমূহ:
            </div>
            
            <button
              onClick={() => handleCategoryClick("প্রচ্ছদ")}
              className={`w-full text-left px-3 py-2 rounded text-xs font-bold transition-all duration-150 ${
                currentCategory === "প্রচ্ছদ"
                  ? "text-amber-400 bg-slate-900 pl-4 border-l-2 border-amber-400"
                  : "text-gray-350 hover:text-amber-400"
              }`}
            >
              প্রচ্ছদ (Home Page)
            </button>

            {activeCategories.map((category) => {
              const isActive = currentCategory === category.name;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.name)}
                  className={`w-full text-left px-3 py-2 rounded text-xs font-bold transition-all duration-150 ${
                    isActive
                      ? "text-amber-400 bg-slate-900 pl-4 border-l-2 border-amber-400"
                      : "text-gray-350 hover:text-amber-400"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        )}
      </nav>
    </header>
  );
}
