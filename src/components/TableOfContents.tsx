import React, { useState } from "react";
import { List, ChevronDown, ChevronUp } from "lucide-react";

export interface TOCItem {
  id: string;
  text: string;
  level: number;
  numbering: string;
}

interface TableOfContentsProps {
  items: TOCItem[];
  activeId: string;
  onItemClick: (e: React.MouseEvent, id: string) => void;
}

export default function TableOfContents({ items, activeId, onItemClick }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="w-full">
      {/* Mobile Table of Contents - Collapsible Accordion Card */}
      <div className="block lg:hidden border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl overflow-hidden transition-all duration-300 shadow-sm">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-5 py-4 text-left font-serif font-bold text-slate-900 dark:text-white hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2.5">
            <List className="h-4 w-4 text-cyan-500" />
            <span className="text-sm">সূচিপত্র (Table of Contents)</span>
            <span className="text-[10px] font-mono font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              {items.length.toLocaleString("bn-BD")} টি অনুচ্ছেদ
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-sans font-medium">
              {isOpen ? "লুকান" : "দেখুন"}
            </span>
            {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </div>
        </button>

        {isOpen && (
          <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/20 px-5 py-4">
            <ul className="space-y-3">
              {items.map((item) => {
                const isH3 = item.level === 3;
                const isActive = activeId === item.id;
                return (
                  <li
                    key={item.id}
                    style={{ paddingLeft: isH3 ? "1.25rem" : "0" }}
                    className="transition-all duration-150"
                  >
                    <a
                      href={`#${item.id}`}
                      onClick={(e) => onItemClick(e, item.id)}
                      className={`inline-flex items-start gap-2 cursor-pointer text-xs active:scale-98 transition-all ${
                        isActive
                          ? "text-cyan-600 dark:text-cyan-400 font-bold"
                          : "text-slate-650 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <span className="font-mono text-slate-400 font-semibold">{item.numbering}</span>
                      <span className="font-serif leading-relaxed text-left">{item.text}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Desktop Table of Contents - Fine-crafted Bordered Card */}
      <div className="hidden lg:block border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20 rounded-2xl p-6 transition-all duration-300 shadow-sm w-full">
        <div className="flex items-center gap-2.5 mb-4 border-b border-slate-150 dark:border-slate-850 pb-3">
          <List className="h-4 w-4 text-cyan-500" />
          <h3 className="font-serif font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">
            সূচিপত্র
          </h3>
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 ml-auto bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">
            INDEX
          </span>
        </div>

        <nav className="relative">
          <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
            {items.map((item) => {
              const isH3 = item.level === 3;
              const isActive = activeId === item.id;
              return (
                <li
                  key={item.id}
                  className="transition-all duration-150"
                  style={{ paddingLeft: isH3 ? "1rem" : "0" }}
                >
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => onItemClick(e, item.id)}
                    className={`group inline-flex items-start gap-2 cursor-pointer text-xs transition-all duration-150 ${
                      isActive
                        ? "text-cyan-600 dark:text-cyan-400 font-bold translate-x-1"
                        : "text-slate-600 dark:text-slate-450 hover:text-slate-950 dark:hover:text-white"
                    }`}
                  >
                    <span 
                      className={`font-mono text-[11px] font-semibold tracking-tight transition-colors ${
                        isActive 
                          ? "text-cyan-500" 
                          : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                      }`}
                    >
                      {item.numbering}
                    </span>
                    <span className="font-serif leading-relaxed text-left border-b border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-800 pb-0.5 transition-all">
                      {item.text}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
