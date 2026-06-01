import React, { useState } from "react";
import { Resource } from "../types";
import { 
  FileDown, Search, FileText, Image as ImageIcon, BookOpen, 
  HelpCircle, Download, Check, ShieldAlert, FileMinus 
} from "lucide-react";

interface DownloadsSectionProps {
  resources: Resource[];
  onDownloadIncrement?: (id: string) => void;
}

export default function DownloadsSection({ resources = [], onDownloadIncrement }: DownloadsSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | "Notes" | "Assignments" | "Books" | "Other">("All");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filter study materials based on active filters and sort: last uploaded file must show on top of the list
  const filteredResources = resources
    .filter((item) => {
      const matchesSearch = 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.fileName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      return new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime();
    });

  const getFileIcon = (fileType: string) => {
    switch (fileType?.toLowerCase()) {
      case "pdf":
        return <FileText className="h-6 w-6 text-rose-500 shrink-0" />;
      case "png":
      case "jpg":
      case "jpeg":
      case "webp":
      case "gif":
        return <ImageIcon className="h-6 w-6 text-indigo-500 shrink-0" />;
      case "doc":
      case "docx":
      case "rtf":
      case "txt":
        return <BookOpen className="h-6 w-6 text-blue-500 shrink-0" />;
      default:
        return <HelpCircle className="h-6 w-6 text-slate-500 shrink-0" />;
    }
  };

  const handleDownloadClick = (id: string, title: string) => {
    setDownloadingId(id);
    
    // Simulate minor progress feel for high quality interaction feedback
    setTimeout(() => {
      setDownloadingId(null);
      
      // Navigate to the download route which delivers the attachment and increments download counter
      window.location.href = `/api/resources/download/${id}`;

      if (onDownloadIncrement) {
        onDownloadIncrement(id);
      }
    }, 600);
  };

  return (
    <section id="downloads-handouts-section" className="bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-850 rounded-lg p-6 shadow-sm transition-colors duration-300 mt-8 scroll-mt-24">
      {/* Section Headline */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif font-black text-xl text-slate-950 dark:text-white flex items-center gap-2">
            <FileDown className="h-6 w-6 text-amber-500 shrink-0" />
            রিসোর্স ও পাঠ্য উপকরণ (Academic Resources & Downloads)
          </h2>
          <p className="text-[11px] text-slate-450 dark:text-slate-550 font-serif leading-relaxed mt-1 md:max-w-2xl">
            অ্যারিথমেটিকা অ্যাডমিন প্যানেল থেকে পাবলিশকৃত ক্লাস নোটস, অনন্য অ্যাসাইনমেন্ট শিট, রেফারেন্স বুক এবং একাডেমিক গাইডসমূহ এখানে বিনামূল্যে ডাউনলোড করতে পারবেন।
          </p>
        </div>

        {/* Total resources badge */}
        <span className="shrink-0 bg-slate-50 border-slate-150 border text-slate-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 font-mono text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider self-start sm:self-auto leading-none">
          {resources.length} files available
        </span>
      </div>

      {/* Filter and Search Action Row */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between mb-6">
        {/* Category Tabs list */}
        <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none max-w-full">
          {(["All", "Notes", "Assignments", "Books", "Other"] as const).map((cat) => {
            const labelBengali = 
              cat === "All" ? "সবগুলো" :
              cat === "Notes" ? "নোটসমূহ" :
              cat === "Assignments" ? "অ্যাসাইনমেন্টস" :
              cat === "Books" ? "বইসমূহ" : "অন্যান্য";
            
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-serif font-bold rounded-md transition-all cursor-pointer whitespace-nowrap active:scale-95 leading-relaxed ${
                  selectedCategory === cat
                    ? "bg-amber-500 text-slate-950 dark:bg-amber-600 dark:text-slate-950 shadow-sm"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900"
                }`}
              >
                {labelBengali} ({cat})
              </button>
            );
          })}
        </div>

        {/* Real-time Document Search Input */}
        <div className="relative flex-1 md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="উপকরণ খুঁজুন (Search Notes, Books)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-serif pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:border-amber-500 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Grid Material Cards container */}
      {filteredResources.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded bg-slate-50/40 dark:bg-slate-950/20 text-slate-400 dark:text-slate-600 font-serif italic text-sm space-y-2 flex flex-col items-center">
          <FileMinus className="h-8 w-8 text-slate-350 dark:text-slate-700" />
          <p>আপনার অনুসন্ধান কিংবা বাছাইকৃত ক্যাটাগরিতে কোনো উপকরণ পাওয়া যায়নি।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-fade-in">
          {filteredResources.map((item) => {
            const isDownloading = downloadingId === item.id;
            
            return (
              <div 
                key={item.id}
                className="group flex flex-col justify-between bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-md transition-all duration-300 p-5 font-serif relative"
              >
                {/* Upper container */}
                <div className="space-y-3">
                  {/* Category badging & type design */}
                  <div className="flex justify-between items-center">
                    <span className={`text-[9px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded leading-normal ${
                      item.category === "Notes" 
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-955/20 dark:text-amber-400" 
                        : item.category === "Assignments"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-955/20 dark:text-blue-400"
                          : item.category === "Books"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-955/20 dark:text-emerald-400"
                            : "bg-purple-100 text-purple-800 dark:bg-purple-955/20 dark:text-purple-400"
                    }`}>
                      {item.category === "Notes" ? "নোট" : item.category === "Assignments" ? "অ্যাসাইনমেন্ট" : item.category === "Books" ? "বই" : "অন্যান্য"}
                    </span>
                    
                    <span className="text-[9px] font-mono text-slate-400 font-bold">
                      {item.fileSize}
                    </span>
                  </div>

                  {/* Icon and Title block */}
                  <div className="flex gap-3 items-start">
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded p-2 text-slate-600 dark:text-slate-400 transition-colors group-hover:bg-amber-500/10">
                      {getFileIcon(item.fileType)}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <h3 className="font-serif font-black text-xs text-slate-900 dark:text-slate-100 group-hover:text-amber-500 transition-colors leading-snug">
                        {item.title}
                      </h3>
                      <span className="text-[9px] font-mono text-slate-400 block truncate leading-none">
                        Name: {item.fileName}
                      </span>
                      <span className="text-[10px] text-slate-450 dark:text-slate-500 block pt-1 font-serif">
                        আপলোডার: <span className="text-amber-600 dark:text-amber-400 font-bold">{item.uploader || "Arithmetica Admin"}</span>
                      </span>
                    </div>
                  </div>

                  {/* Description text */}
                  {item.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed pl-1 pt-1 border-l-2 border-slate-100 dark:border-slate-800">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Footer download button block */}
                <div className="mt-5 border-t border-slate-100 dark:border-slate-850/60 pt-3.5 flex items-center justify-between gap-4">
                  <div className="text-[9px] text-slate-400 font-mono flex items-center gap-1.5 shrink-0 select-none">
                    <Download className="h-3 w-3 inline" />
                    <span>ডাউনলোড: {item.downloadCount} বার</span>
                  </div>

                  <button
                    onClick={() => handleDownloadClick(item.id, item.title)}
                    disabled={isDownloading}
                    className={`inline-flex items-center gap-1.5 text-xs font-serif font-bold py-1.5 px-3 rounded cursor-pointer select-none transition-all active:scale-95 px-3 uppercase shrink-0 ${
                      isDownloading
                        ? "bg-emerald-500 text-slate-950 font-sans"
                        : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-amber-600 hover:dark:bg-amber-550 dark:text-slate-950"
                    }`}
                  >
                    {isDownloading ? (
                      <>
                        <Check className="h-3.5 w-3.5 animate-bounce" />
                        Downloading
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
