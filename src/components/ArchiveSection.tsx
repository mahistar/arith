import React, { useMemo, useState, useEffect } from "react";
import { Post } from "../types";
import { parsePostDate, toBengaliNumber, getBengaliMonthName } from "../utils/dateParser";
import { Calendar, ChevronDown, ChevronRight, Hash, Clock } from "lucide-react";

interface ArchiveSectionProps {
  posts: Post[];
  selectedArchiveYear: number | null;
  selectedArchiveMonth: number | null;
  onSelectArchive: (year: number | null, month: number | null) => void;
}

interface GroupedMonth {
  monthNum: number;
  monthNameBn: string;
  monthNameEn: string;
  count: number;
}

interface GroupedYear {
  year: number;
  totalCount: number;
  months: GroupedMonth[];
}

export default function ArchiveSection({
  posts,
  selectedArchiveYear,
  selectedArchiveMonth,
  onSelectArchive,
}: ArchiveSectionProps) {
  // 1. Group posts by Year and Month dynamically
  const groupedData = useMemo(() => {
    const published = posts.filter((p) => p.status === "published" || !p.status);
    
    const yearMap: { [year: number]: { [month: number]: number } } = {};

    published.forEach((post) => {
      const dateInfo = parsePostDate(post);
      const { year, monthNum } = dateInfo;

      if (!yearMap[year]) {
        yearMap[year] = {};
      }
      if (!yearMap[year][monthNum]) {
        yearMap[year][monthNum] = 0;
      }
      yearMap[year][monthNum]++;
    });

    // Form structured array sorted descending by years and months
    const result: GroupedYear[] = Object.keys(yearMap)
      .map(Number)
      .sort((a, b) => b - a)
      .map((year) => {
        let totalCount = 0;
        const months: GroupedMonth[] = Object.keys(yearMap[year])
          .map(Number)
          .sort((a, b) => b - a)
          .map((monthNum) => {
            const count = yearMap[year][monthNum];
            totalCount += count;
            return {
              monthNum,
              monthNameBn: getBengaliMonthName(monthNum),
              monthNameEn: [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
              ][monthNum - 1],
              count,
            };
          });

        return {
          year,
          totalCount,
          months,
        };
      });

    return result;
  }, [posts]);

  // Keep track of which years are expanded
  const [expandedYears, setExpandedYears] = useState<{ [year: number]: boolean }>({});

  // Expand the selected or first year initially
  useEffect(() => {
    if (groupedData.length > 0) {
      const initial: { [year: number]: boolean } = {};
      groupedData.forEach((g, idx) => {
        // Expand if it's the currently selected year or if it's the most recent year and no other is selected
        if (selectedArchiveYear) {
          initial[g.year] = g.year === selectedArchiveYear;
        } else {
          initial[g.year] = idx === 0; // expand first year by default
        }
      });
      setExpandedYears((prev) => {
        // Combine with previous expanded states so we don't override user clicks
        return { ...initial, ...prev };
      });
    }
  }, [groupedData, selectedArchiveYear]);

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  if (groupedData.length === 0) {
    return null;
  }

  return (
    <section 
      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-6 sm:p-8 mt-10 shadow-sm animate-fade-in"
      id="archive-system-section"
    >
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3.5 mb-5 select-none">
        <div className="p-1.5 bg-amber-500/10 rounded text-amber-500">
          <Calendar className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-serif font-black text-base text-slate-900 dark:text-white uppercase tracking-wider leading-none">
            নিবন্ধ আর্কাইভ
          </h3>
          <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 block">
            Archive Directory
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {groupedData.map((yGroup) => {
          const isExpanded = !!expandedYears[yGroup.year];
          const isYearSelected = selectedArchiveYear === yGroup.year && !selectedArchiveMonth;

          return (
            <div 
              key={yGroup.year} 
              className="border border-slate-100 dark:border-slate-850/60 rounded overflow-hidden bg-slate-50/20 dark:bg-slate-900/10"
            >
              {/* Year Header Button */}
              <div 
                className={`w-full flex items-center justify-between p-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 select-none transition-all duration-150 ${
                  isYearSelected ? "bg-amber-500/5 dark:bg-amber-500/10 border-l-2 border-amber-500" : ""
                }`}
                onClick={() => toggleYear(yGroup.year)}
              >
                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleYear(yGroup.year);
                    }}
                    className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-amber-400 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Clicking on the Year label triggers Year filter
                      onSelectArchive(yGroup.year, null);
                    }}
                    className={`font-serif font-bold text-sm hover:text-amber-500 dark:hover:text-amber-400 cursor-pointer ${
                      isYearSelected 
                        ? "text-amber-600 dark:text-amber-405 font-black" 
                        : "text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {toBengaliNumber(yGroup.year)} সাল
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectArchive(yGroup.year, null);
                    }}
                    className="text-[10px] text-slate-400 hover:text-amber-500 hover:underline uppercase tracking-wider font-bold cursor-pointer"
                  >
                    ({toBengaliNumber(yGroup.totalCount)}টি লেখা)
                  </span>
                </div>
              </div>

              {/* Month Group Expansion Accordion Body */}
              {isExpanded && (
                <div className="px-4 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-950/40 animate-fade-in">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                    {yGroup.months.map((mGroup) => {
                      const isMonthSelected =
                        selectedArchiveYear === yGroup.year &&
                        selectedArchiveMonth === mGroup.monthNum;

                      return (
                        <button
                          key={mGroup.monthNum}
                          onClick={() => onSelectArchive(yGroup.year, mGroup.monthNum)}
                          className={`flex items-center justify-between p-2 px-3 text-left rounded border transition-all duration-150 select-none cursor-pointer ${
                            isMonthSelected
                              ? "bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-sm"
                              : "bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 text-slate-750 dark:text-slate-300 border-slate-150 dark:border-slate-800/80"
                          }`}
                        >
                          <span className="text-[11px] font-serif tracking-tight truncate pr-1">
                            {mGroup.monthNameBn}
                          </span>
                          <span className={`text-[9px] font-mono font-bold shrink-0 ${
                            isMonthSelected ? "text-slate-950 bg-slate-100/40 px-1.5 py-0.5 rounded" : "ml-2 text-slate-400"
                          }`}>
                            ({toBengaliNumber(mGroup.count)})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
