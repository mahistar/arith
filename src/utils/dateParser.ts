import { Post } from "../types";

export interface PostDateInfo {
  year: number;
  monthNum: number;
  monthNameEn: string;
  monthNameBn: string;
}

const bnMonths = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
const enMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const enDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function toBengaliNumber(num: number | string): string {
  return num.toString().split("").map(char => {
    const d = parseInt(char, 10);
    return isNaN(d) ? char : bnDigits[d];
  }).join("");
}

export function parsePostDate(post: Post): PostDateInfo {
  // 1. Try to extract from ID if it contains a 13-digit timestamp
  const tsMatch = post.id ? post.id.match(/post-(\d{13})/) : null;
  if (tsMatch && tsMatch[1]) {
    const d = new Date(parseInt(tsMatch[1], 10));
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1; // 1-indexed
      return {
        year,
        monthNum,
        monthNameEn: enMonths[monthNum - 1],
        monthNameBn: bnMonths[monthNum - 1],
      };
    }
  }

  // 2. Fallback: Parse from publishDate string (supports formatting like "২৭ মে, ২০২৬" or "May 27, 2026")
  const dateStr = post.publishDate || "";
  
  // Convert Bengali numerals to English
  const cleanStr = dateStr.replace(/[০-৯]/g, d => enDigits[bnDigits.indexOf(d)]);

  // Match 4-digit years (e.g., 2026)
  const yearMatch = cleanStr.match(/\b(20\d{2}|19\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

  // Parse month by scanning the name
  let monthNum = 5; // default to May (5) if unresolved
  let monthNameEn = "May";
  let monthNameBn = "মে";

  let found = false;
  for (let i = 0; i < bnMonths.length; i++) {
    if (cleanStr.includes(bnMonths[i])) {
      monthNum = i + 1;
      monthNameBn = bnMonths[i];
      monthNameEn = enMonths[i];
      found = true;
      break;
    }
  }

  if (!found) {
    const lowercaseCleanStr = cleanStr.toLowerCase();
    for (let i = 0; i < enMonths.length; i++) {
      if (lowercaseCleanStr.includes(enMonths[i].toLowerCase())) {
        monthNum = i + 1;
        monthNameBn = bnMonths[i];
        monthNameEn = enMonths[i];
        found = true;
        break;
      }
    }
  }

  return {
    year,
    monthNum,
    monthNameEn,
    monthNameBn,
  };
}

export function getBengaliMonthName(monthNum: number): string {
  return bnMonths[monthNum - 1] || "";
}

export function getBengaliYearString(year: number): string {
  return toBengaliNumber(year);
}
