import React, { useState } from "react";
import { Mail } from "lucide-react";

export default function EmailSubscription() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setStatus("error");
      setMessage("দয়া করে একটি সঠিক ইমেইল ঠিকানা প্রদান করুন।");
      return;
    }

    // Standard email validation pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setStatus("error");
      setMessage("অনুগ্রহ করে একটি বৈধ ইমেইল ঠিকানা প্রবেশ করান।");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "সাবস্ক্রিপশন সফল হয়েছে! ধন্যবাদ আমাদের সাথে যুক্ত হওয়ার জন্য।");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "সাবস্ক্রিপশন ব্যর্থ হয়েছে। দয়া করে পুনরায় চেষ্টা করুন।");
      }
    } catch (error) {
      setStatus("error");
      setMessage("সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না। অনুগ্রহ করে পরে চেষ্টা করুন।");
    }
  };

  return (
    <section 
      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 sm:p-8 mt-12 text-center max-w-2xl mx-auto shadow-sm animate-fade-in"
      id="email-subscription-section"
    >
      <div className="flex justify-center mb-3">
        <div className="p-2.5 bg-amber-500/10 rounded-full text-amber-500">
          <Mail className="h-6 w-6" />
        </div>
      </div>
      
      <h3 className="font-serif font-bold text-xl text-slate-900 dark:text-white mb-2">
        Get posts via email
      </h3>
      
      <p className="text-xs text-slate-500 dark:text-slate-450 font-serif leading-relaxed max-w-md mx-auto mb-6">
        নতুন প্রবন্ধ বা গবেষণামূলক নিবন্ধ প্রকাশিত হওয়া মাত্রই সরাসরি আপনার ইমেইল ইনবক্সে পেতে সাবস্ক্রাইব করুন। কোনো স্প্যাম পাঠানো হবে না।
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          disabled={status === "loading" || status === "success"}
          placeholder="আপনার ইমেইল ঠিকানা লিখুন..."
          className="flex-grow px-3.5 py-2 text-xs bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans tracking-wide"
          required
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-5 py-2 text-xs bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white dark:text-slate-950 font-bold rounded cursor-pointer select-none transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 uppercase tracking-widest font-sans"
        >
          {status === "loading" ? (
            <div className="w-3.5 h-3.5 border-2 border-white dark:border-slate-950 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            "Subscribe"
          )}
        </button>
      </form>

      {message && (
        <p className={`text-[11px] font-serif font-bold mt-4 animate-fade-in ${
          status === "success" 
            ? "text-emerald-600 dark:text-emerald-400" 
            : status === "error" 
              ? "text-rose-600 dark:text-rose-400" 
              : "text-slate-400"
        }`}>
          {status === "success" ? "✓ " : "✕ "}{message}
        </p>
      )}
    </section>
  );
}
