import React, { useState, useRef, useEffect } from "react";
import { Post, Category, SiteConfig, Resource } from "../types";
import { 
  Plus, Edit3, Trash2, List, Save, Settings, 
  RefreshCw, Globe, ChevronLeft, Image as ImageIcon, Sparkles, Check, KeySquare, Laptop, Grid,
  BarChart2, Layers, Eye, ShieldAlert, Sliders, ToggleLeft, ToggleRight, ArrowUp, ArrowDown,
  Upload, HelpCircle, FileText, Share2, Mail, FolderOpen, FileDown
} from "lucide-react";

interface AdminDashboardProps {
  posts: Post[];
  categories: Category[];
  siteConfig: SiteConfig;
  onAddPost: (post: Omit<Post, "id" | "views" | "publishDate"> & { id?: string }) => Promise<boolean>;
  onDeletePost: (id: string) => Promise<{ success: boolean; error?: string }>;
  onEditPost: (post: Post) => Promise<boolean>;
  onAddCategory: (cat: Category) => void;
  onEditCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateSiteConfig: (config: SiteConfig) => void;
  onBackToHome: () => void;
  resources?: Resource[];
  onReloadResources?: () => void;
}

export default function AdminDashboard({
  posts,
  categories,
  siteConfig,
  onAddPost,
  onDeletePost,
  onEditPost,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onUpdateSiteConfig,
  onBackToHome,
  resources = [],
  onReloadResources,
}: AdminDashboardProps) {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      return localStorage.getItem("arithmetica-is-authenticated") === "true";
    }
    return false;
  });
  const [loadingAuth, setLoadingAuth] = useState(() => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const token = localStorage.getItem("arithmetica-jwt-token");
      const isAuth = localStorage.getItem("arithmetica-is-authenticated") === "true";
      if (!token) return false;
      if (isAuth) return false; // Verify in background, but show dashboard instantly
    }
    return true;
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authVerifyError, setAuthVerifyError] = useState("");
  const [showTimeoutBypass, setShowTimeoutBypass] = useState(false);

  useEffect(() => {
    let timeoutId: any;
    
    // Safety timeout to trigger bypass option if backend is slow/cold starting
    timeoutId = setTimeout(() => {
      setShowTimeoutBypass(true);
    }, 6000); // 6 seconds backup display

    const verifyCurrentlyStoredToken = async () => {
      const token = localStorage.getItem("arithmetica-jwt-token");
      if (!token) {
        setIsAuthenticated(false);
        setLoadingAuth(false);
        clearTimeout(timeoutId);
        return;
      }
      try {
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 5000); // 5s fetch limit

        const res = await fetch("/api/auth/verify", {
          headers: {
            "Authorization": `Bearer ${token}`
          },
          signal: controller.signal
        });
        clearTimeout(fetchTimeout);

        const data = await res.json();
        if (res.ok && data.valid) {
          setIsAuthenticated(true);
          localStorage.setItem("arithmetica-is-authenticated", "true");
        } else {
          setIsAuthenticated(false);
          localStorage.removeItem("arithmetica-jwt-token");
          localStorage.removeItem("arithmetica-is-authenticated");
        }
      } catch (err) {
        console.error("Authentication verification error:", err);
        setAuthVerifyError("ভেরিফিকেশন সার্ভারে সংযোগ ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন বা সরাসরি লগইন করুন।");
      } finally {
        setLoadingAuth(false);
        clearTimeout(timeoutId);
      }
    };

    verifyCurrentlyStoredToken();
    return () => clearTimeout(timeoutId);
  }, []);

  // Tab state
  const [activeTab, setActiveTab] = useState<"posts" | "categories" | "analytics" | "media" | "settings" | "subscribers" | "resources">("posts");

  // Downloads / Resources management states
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceDesc, setResourceDesc] = useState("");
  const [resourceCategory, setResourceCategory] = useState("Notes");
  const [uploadedResourceUrl, setUploadedResourceUrl] = useState("");
  const [uploadedResourceName, setUploadedResourceName] = useState("");
  const [uploadedResourceSize, setUploadedResourceSize] = useState<number | string>("");
  const [resourceUploader, setResourceUploader] = useState("");
  const [isUploadingResource, setIsUploadingResource] = useState(false);
  const [uploadResourceError, setUploadResourceError] = useState("");

  const [uploadMode, setUploadMode] = useState<"single" | "multiple">("single");
  const [multipleUploadedFiles, setMultipleUploadedFiles] = useState<Array<{ url: string; filename: string; size: number; mimetype: string }>>([]);
  const [isUploadingMultiple, setIsUploadingMultiple] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);

  // Custom configuration confirmation model state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);

  const requestConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    cancelText?: string
  ) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(null);
      },
      confirmText,
      cancelText,
    });
  };

  // Subscribers & Notifications states
  const [subscribersList, setSubscribersList] = useState<string[]>([]);
  const [notificationsHistory, setNotificationsHistory] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [subsError, setSubsError] = useState("");

  const fetchSubscribersAndNotifications = async () => {
    setLoadingSubs(true);
    setSubsError("");
    const token = localStorage.getItem("arithmetica-jwt-token");
    try {
      const [subRes, notifRes] = await Promise.all([
        fetch("/api/admin/subscribers", {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        fetch("/api/admin/notifications", {
          headers: { "Authorization": `Bearer ${token}` }
        })
      ]);
      
      if (subRes.ok && notifRes.ok) {
        const subsData = await subRes.json();
        const notifsData = await notifRes.json();
        setSubscribersList(subsData);
        setNotificationsHistory(notifsData);
      } else {
        setSubsError("সাবস্ক্রাইবার বা নোটিফিকেশন তথ্য লোড করতে ব্যর্থ হয়েছে।");
      }
    } catch (err) {
      setSubsError("সার্ভারের সাথে সংযোগ স্থাপন করতে ব্যর্থ হয়েছে।");
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleDeleteSubscriber = async (email: string) => {
    requestConfirmation(
      "সাবস্ক্রাইবার অপসারণ (Remove Subscriber)",
      `আপনি কি নিশ্চিতভাবে "${email}" কে সাবস্ক্রাইবার তালিকা থেকে অপসারিত করতে চান?`,
      async () => {
        const token = localStorage.getItem("arithmetica-jwt-token");
        try {
          const res = await fetch(`/api/admin/subscribers/${encodeURIComponent(email)}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            setActionSuccess("সাবস্ক্রাইবার সফলভাবে অপসারিত হয়েছে।");
            fetchSubscribersAndNotifications();
          } else {
            const errData = await res.json();
            setActionError(errData.error || "অপসারণে ব্যর্থ হয়েছে।");
          }
        } catch (err) {
          setActionError("সার্ভার ত্রুটি। অনুগ্রহ করে পরে চেষ্টা করুন।");
        }
      },
      "হ্যাঁ, অপসারিত করুন",
      "না, ফিরে যান"
    );
  };

  useEffect(() => {
    if (activeTab === "subscribers" && isAuthenticated) {
      fetchSubscribersAndNotifications();
    }
  }, [activeTab, isAuthenticated]);

  // Post Editor states
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  
  // Post Form fields List
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [postCategory, setPostCategory] = useState("");
  const [postCategories, setPostCategories] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [coverImage, setCoverImage] = useState(""); // Support cover image placement
  const [authorName, setAuthorName] = useState("Admin Editor");
  const [authorRole, setAuthorRole] = useState("Chief Editor");
  const [authorBio, setAuthorBio] = useState("Regular essayist. Devoted investigator of science, logic, and philosophies.");
  const [isFeatured, setIsFeatured] = useState(false);
  const [postStatus, setPostStatus] = useState<"published" | "draft">("published");
  const [isSavingPost, setIsSavingPost] = useState(false);

  // Category Form fields List
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catColor, setCatColor] = useState("#D4AF37");
  const [catIcon, setCatIcon] = useState("GraduationCap");
  const [catOrder, setCatOrder] = useState(1);
  const [catEnabled, setCatEnabled] = useState(true);
  const [catImageUrl, setCatImageUrl] = useState(""); // Support category Cover image

  // Settings local state
  const [localSettings, setLocalSettings] = useState<SiteConfig>(siteConfig);

  // Media Library states
  const [uploadedImages, setUploadedImages] = useState<string[]>(() => {
    const saved = localStorage.getItem("arithmetica-uploaded-images");
    return saved ? JSON.parse(saved) : [];
  });
  const [mediaUploadError, setMediaUploadError] = useState("");

  // Success alert
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Admin Secure Credentials states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [credsSuccessMsg, setCredsSuccessMsg] = useState("");
  const [credsErrorMsg, setCredsErrorMsg] = useState("");
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set initial category value when categories list is ready
  useEffect(() => {
    if (categories.length > 0) {
      if (!postCategory) {
        setPostCategory(categories[0].name);
      }
      if (postCategories.length === 0) {
        setPostCategories([categories[0].name]);
      }
    }
  }, [categories]);

  // Keep local settings in sync with prop updates
  useEffect(() => {
    setLocalSettings(siteConfig);
  }, [siteConfig]);

  // Standard Unsplash presets
  const PRESET_IMAGES = [
    { name: "Science", url: "https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&q=80&w=600" },
    { name: "Math", url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=600" },
    { name: "Library", url: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=600" },
    { name: "Philosophy", url: "https://images.unsplash.com/photo-1605647540924-852290f6b0d5?auto=format&fit=crop&q=80&w=600" },
    { name: "Technology", url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=600" },
    { name: "Nature", url: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&q=80&w=600" }
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("arithmetica-jwt-token", data.token);
        localStorage.setItem("arithmetica-is-authenticated", "true");
        setIsAuthenticated(true);
        setAuthError("");
        if (typeof window !== "undefined") {
          window.location.href = "/?view=admin";
        }
      } else {
        setAuthError(data.error || "Incorrect username or password! Please try again.");
      }
    } catch (err) {
      setAuthError("Could not connect to the authentication service!");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("arithmetica-is-authenticated");
    localStorage.removeItem("arithmetica-jwt-token");
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const handleUpdateCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setCredsErrorMsg("নিরাপত্তার স্বার্থে আপনার বর্তমান পাসওয়ার্ড প্রদান করা বাধ্যতামূলক।");
      return;
    }

    setIsUpdatingCreds(true);
    setCredsSuccessMsg("");
    setCredsErrorMsg("");

    try {
      const token = localStorage.getItem("arithmetica-jwt-token");
      const res = await fetch("/api/auth/update-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newUsername: newUsername.trim() || undefined,
          newPassword: newPassword.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        setCredsSuccessMsg("আপনার ক্রেডেনশিয়ালস সফলভাবে হালনাগাদ করা হয়েছে! পরবর্তী লগইন করতে এটি ব্যবহার করুন।");
        setCurrentPassword("");
        setNewUsername("");
        setNewPassword("");
      } else {
        setCredsErrorMsg(data.error || "ক্রেডেনশিয়ালস পরিবর্তন করতে ব্যর্থ হয়েছে।");
      }
    } catch (err) {
      setCredsErrorMsg("সার্ভারের সাথে সংযোগ স্থাপন করা যাচ্ছে না।");
    } finally {
      setIsUpdatingCreds(false);
    }
  };

  const handleGenerateSlug = () => {
    if (!title.trim()) return;
    const slugified = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // remove non-alphanumeric english chars except spaces / hyphens
      .replace(/\s+/g, "-");
    setSlug(slugified);
  };

  const handleInsertHTML = (openTag: string, closeTag: string) => {
    const txtarea = textareaRef.current;
    if (!txtarea) return;

    const start = txtarea.selectionStart;
    const end = txtarea.selectionEnd;
    const innerText = content.substring(start, end) || "Insert your text here";
    const insertion = `${openTag}${innerText}${closeTag}`;
    const newContent = content.substring(0, start) + insertion + content.substring(end);
    
    setContent(newContent);
    
    setTimeout(() => {
      txtarea.focus();
      txtarea.setSelectionRange(start + openTag.length, start + openTag.length + innerText.length);
    }, 50);
  };

  const handleInsertInlineImageUrl = (url: string) => {
    const txtarea = textareaRef.current;
    if (!txtarea) {
      setContent((prev) => prev + `\n<img src="${url}" alt="image" className="my-6 rounded-lg w-full max-h-96 object-cover shadow-sm md:max-h-[500px]" />\n`);
      return;
    }

    const start = txtarea.selectionStart;
    const end = txtarea.selectionEnd;
    const insertion = `\n<img src="${url}" alt="image" className="my-6 rounded-lg w-full max-h-[500px] object-cover shadow-md" />\n`;
    const newContent = content.substring(0, start) + insertion + content.substring(end);
    
    setContent(newContent);

    setTimeout(() => {
      txtarea.focus();
      txtarea.setSelectionRange(start + insertion.length, start + insertion.length);
    }, 50);
  };

  const handleResetForm = () => {
    setTitle("");
    setSlug("");
    setExcerpt("");
    setContent("");
    const defaultCatName = categories.length > 0 ? categories[0].name : "";
    setPostCategory(defaultCatName);
    setPostCategories(defaultCatName ? [defaultCatName] : []);
    setTagsInput("");
    setFeaturedImage("");
    setCoverImage("");
    setIsFeatured(false);
    setPostStatus("published");
    setEditingPostId(null);
    setIsEditingPost(false);
  };

  const handleStartCreate = () => {
    handleResetForm();
    setFeaturedImage(PRESET_IMAGES[0].url);
    setIsEditingPost(true);
  };

  const handleStartEdit = (post: Post) => {
    setEditingPostId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt);
    setContent(post.content);
    setPostCategory(post.category);
    // Extract multi-categories, support backward Compatibility
    const cats = Array.isArray(post.categories) && post.categories.length > 0 
      ? post.categories 
      : (post.category ? [post.category] : []);
    setPostCategories(cats);

    setTagsInput(post.tags.join(", "));
    setFeaturedImage(post.featuredImage);
    setCoverImage(post.coverImage || "");
    setAuthorName(post.author.name);
    setAuthorRole(post.author.role);
    setAuthorBio(post.author.bio);
    setIsFeatured(!!post.featured);
    setPostStatus(post.status || "published");
    setIsEditingPost(true);
  };

  const handleDelete = async (id: string) => {
    if (!id) {
       setActionError("ত্রুটি: নিবন্ধটির আইডি সঠিক নয়।");
       return;
    }

    requestConfirmation(
      "নিবন্ধ অপসারণ (Delete Article)",
      "আপনি কি নিশ্চিতভাবে এই নিবন্ধটি চিরতরে মুছে ফেলতে চান? (Are you sure you want to permanently delete this post?)",
      async () => {
        setActionSuccess("");
        setActionError("");
        try {
          console.log(`[FRONTEND] Calling delete action for post: ${id}`);
          const result = await onDeletePost(id);
          if (result && result.success) {
            showTemporarySuccess("নিবন্ধটি সফলভাবে মুছে ফেলা হয়েছে! (Post deleted successfully)");
          } else if (result && result.error) {
            setActionError(`নিবন্ধ মুছে ফেলা সম্ভব হয়নি: ${result.error}`);
          } else {
            showTemporarySuccess("নিবন্ধটি সফলভাবে মুছে ফেলা হয়েছে! (Post deleted successfully)");
          }
        } catch (err: any) {
          console.error("[FRONTEND] Error in handleDelete:", err);
          setActionError(`নিবন্ধ মুছার সময় ত্রুটি তৈরি হয়েছে: ${err?.message || err}`);
        }
      },
      "হ্যাঁ, মুছে ফেলুন",
      "না, ফিরে যান"
    );
  };

  const showTemporarySuccess = (message: string) => {
    setActionSuccess(message);
    setTimeout(() => setActionSuccess(""), 4000);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim() || !content.trim()) {
      alert("Please provide a valid Title, SEO URL Slug, and Detailed Description Content!");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const finalCats = postCategories.length > 0 ? postCategories : [postCategory].filter(Boolean);
    if (finalCats.length === 0) {
      alert("Please select at least one post category!");
      return;
    }

    const postPayload = {
      id: editingPostId || undefined,
      title,
      slug,
      excerpt: excerpt || content.replace(/<[^>]*>/g, "").substring(0, 150) + "...",
      content,
      category: finalCats[0] || "",
      categories: finalCats,
      tags,
      featuredImage: featuredImage || PRESET_IMAGES[0].url,
      coverImage: coverImage || undefined,
      author: {
        name: authorName,
        role: authorRole,
        bio: authorBio,
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"
      },
      featured: isFeatured,
      status: postStatus,
    };

    setIsSavingPost(true);
    try {
      if (editingPostId) {
        const originalPost = posts.find(p => p.id === editingPostId);
        const success = await onEditPost({
          ...originalPost!,
          ...postPayload,
          id: editingPostId,
        });
        if (success) {
          showTemporarySuccess("Post edited and saved successfully!");
          setIsEditingPost(false);
          handleResetForm();
        } else {
          console.error("[PUBLISH] Failed to edit/save the post on the backend.");
        }
      } else {
        const success = await onAddPost(postPayload);
        if (success) {
          showTemporarySuccess(postStatus === "published" ? "New post has been published successfully!" : "Post has been saved as a draft!");
          setIsEditingPost(false);
          handleResetForm();
        } else {
          console.error("[PUBLISH] Failed to publish/save the post on the backend.");
        }
      }
    } catch (err: any) {
      console.error("[PUBLISH] Error of post action:", err);
      alert(`সার্ভারে ত্রুটি হয়েছে: ${err.message || err}`);
    } finally {
      setIsSavingPost(false);
    }
  };

  // Category Handlers
  const handleResetCategoryForm = () => {
    setCatName("");
    setCatSlug("");
    setCatDesc("");
    setCatColor("#D4AF37");
    setCatIcon("GraduationCap");
    setCatOrder(categories.length + 1);
    setCatEnabled(true);
    setCatImageUrl("");
    setEditingCategoryId(null);
    setIsEditingCategory(false);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !catSlug.trim()) {
      alert("Please enter the Category Name and English URL Slug!");
      return;
    }

    const categoryData: Category = {
      id: editingCategoryId || `cat-${Date.now()}`,
      name: catName.trim(),
      englishName: catSlug.trim().toLowerCase().replace(/\s+/g, "-"),
      description: catDesc.trim(),
      color: catColor,
      icon: catIcon,
      order: Number(catOrder) || 1,
      enabled: catEnabled,
      imageUrl: catImageUrl || undefined,
    };

    if (editingCategoryId) {
      onEditCategory(categoryData);
      showTemporarySuccess(`Category '${catName}' updated successfully!`);
    } else {
      onAddCategory(categoryData);
      showTemporarySuccess(`New category '${catName}' created successfully!`);
    }

    handleResetCategoryForm();
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setCatName(cat.name);
    setCatSlug(cat.englishName);
    setCatDesc(cat.description || "");
    setCatColor(cat.color || "#D4AF37");
    setCatIcon(cat.icon || "GraduationCap");
    setCatOrder(cat.order);
    setCatEnabled(cat.enabled);
    setCatImageUrl(cat.imageUrl || "");
    setIsEditingCategory(true);
  };

  const handleDeleteCategory = (id: string, name: string) => {
    requestConfirmation(
      "বিভাগ অপসারণ (Delete Category)",
      `Are you sure you want to delete the category '${name}'? Any posts linked with this category might become uncategorized.`,
      () => {
        onDeleteCategory(id);
        showTemporarySuccess("Category removed successfully!");
      },
      "হ্যাঁ, মুছে ফেলুন",
      "না, ফিরে যান"
    );
  };

  const handleReorderCategory = (cat: Category, direction: "up" | "down") => {
    const change = direction === "up" ? -1 : 1;
    const updatedCategory = {
      ...cat,
      order: Math.max(1, cat.order + change)
    };
    onEditCategory(updatedCategory);
    showTemporarySuccess("Category sorting order changed successfully!");
  };

  // Media Library Handlers (Server static folder /uploads with fallback)
  const [deviceUploading, setDeviceUploading] = useState(false);
  const [deviceUploadError, setDeviceUploadError] = useState("");

  const handleDeviceFileUpload = async (file: File): Promise<string | null> => {
    setDeviceUploading(true);
    setDeviceUploadError("");
    try {
      const formData = new FormData();
      formData.append("image", file);

      const token = localStorage.getItem("arithmetica-jwt-token");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image. Please try WebP, PNG or JPG format under 5MB.");
      }

      const returnedUrl = data.url;
      // Append url to recently uploaded media list for easy reuse
      const updated = [returnedUrl, ...uploadedImages].slice(0, 30);
      setUploadedImages(updated);
      localStorage.setItem("arithmetica-uploaded-images", JSON.stringify(updated));

      return returnedUrl;
    } catch (err: any) {
      console.error("Image upload failed:", err);
      setDeviceUploadError(err.message || "Network / server upload error occurred.");
      return null;
    } finally {
      setDeviceUploading(false);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const url = await handleDeviceFileUpload(file);
    if (url) {
      showTemporarySuccess("Image successfully uploaded from computer to secure server storage!");
    } else {
      setMediaUploadError(deviceUploadError || "Failed to process image upload.");
      setTimeout(() => setMediaUploadError(""), 4000);
    }
  };

  const handleDeleteUploadedImage = (indexToDelete: number) => {
    requestConfirmation(
      "ছবি অপসারণ (Delete Image Entry)",
      "Are you sure you want to remove this image from your local history list? (The uploaded asset remains on the server).",
      () => {
        const updated = uploadedImages.filter((_, idx) => idx !== indexToDelete);
        setUploadedImages(updated);
        localStorage.setItem("arithmetica-uploaded-images", JSON.stringify(updated));
        showTemporarySuccess("Image path deleted from dashboard quick reuse list.");
      },
      "হ্যাঁ, অপসারণ করুন",
      "না, ফিরে যান"
    );
  };

  const handleResourceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingResource(true);
    setUploadResourceError("");
    setUploadedResourceUrl("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("arithmetica-jwt-token");
      const res = await fetch("/api/resources/upload", {
        method: "POST",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload file.");
      }

      setUploadedResourceUrl(data.url);
      setUploadedResourceName(data.filename);
      setUploadedResourceSize(data.size);
      
      // Auto-populate Title if empty
      if (!resourceTitle) {
        const lastDot = data.filename.lastIndexOf('.');
        const cleanName = lastDot !== -1 ? data.filename.substring(0, lastDot) : data.filename;
        // replace underscores/hyphens with spaces for a cleaner title guess
        const humanName = cleanName.replace(/[-_]/g, ' ');
        setResourceTitle(humanName);
      }
    } catch (err: any) {
      console.error(err);
      setUploadResourceError(err.message || "File upload failed. Supported formats: pdf, docx, txt, zip, png, etc.");
    } finally {
      setIsUploadingResource(false);
    }
  };

  const handleMultipleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingMultiple(true);
    setUploadResourceError("");

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const token = localStorage.getItem("arithmetica-jwt-token");
      const res = await fetch("/api/resources/upload-multiple", {
        method: "POST",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload files bulk.");
      }

      // Append to the list of staged multiple files
      const newStagedFiles = data.files.map((file: any) => {
        const lastDot = file.filename.lastIndexOf('.');
        const cleanName = lastDot !== -1 ? file.filename.substring(0, lastDot) : file.filename;
        const humanTitle = cleanName.replace(/[-_]/g, ' ');
        
        return {
          title: humanTitle,
          description: "",
          category: resourceCategory, // default to currently selected category
          fileUrl: file.url,
          fileName: file.filename,
          fileSize: file.size,
          fileType: file.filename.split('.').pop()?.toLowerCase() || "pdf",
          uploader: resourceUploader.trim() || "Arithmetica Admin"
        };
      });

      setMultipleUploadedFiles(prev => [...prev, ...newStagedFiles]);
      showTemporarySuccess(`${newStagedFiles.length}টি ফাইল সফলভাবে আপলোড ও সেন্ট্রাল স্টোরেজে যুক্ত হয়েছে!`);
    } catch (err: any) {
      console.error(err);
      setUploadResourceError(err.message || "Multiple files upload failed.");
    } finally {
      setIsUploadingMultiple(false);
    }
  };

  const handleBulkPublish = async () => {
    if (multipleUploadedFiles.length === 0) return;
    
    setIsUploadingMultiple(true);
    let successCount = 0;
    
    try {
      const token = localStorage.getItem("arithmetica-jwt-token");
      
      // Loop and call the create endpoint for each staged file
      for (const file of multipleUploadedFiles) {
        const res = await fetch("/api/resources", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify(file)
        });
        if (res.ok) {
          successCount++;
        }
      }
      
      setMultipleUploadedFiles([]);
      showTemporarySuccess(`${successCount}টি সম্পদ সামগ্রিক ডাটাবেজে সফলভাবে পাবলিশ করা হয়েছে!`);
      if (onReloadResources) {
        onReloadResources();
      }
    } catch (err: any) {
      setUploadResourceError("বুল্ক পাবলিশিং সম্পূর্ণ করতে সমস্যা হয়েছে।");
    } finally {
      setIsUploadingMultiple(false);
    }
  };

  const handleEditResourceClick = (item: Resource) => {
    setEditingResourceId(item.id);
    setResourceTitle(item.title);
    setResourceDesc(item.description);
    setResourceCategory(item.category);
    setUploadedResourceUrl(item.fileUrl);
    setUploadedResourceName(item.fileName);
    setUploadedResourceSize(item.fileSize);
    setResourceUploader(item.uploader || "");
    setUploadMode("single"); // switch back to allow form field edit
    setUploadResourceError("");
  };

  const handleCancelEditResource = () => {
    setEditingResourceId(null);
    setResourceTitle("");
    setResourceDesc("");
    setResourceCategory("Notes");
    setUploadedResourceUrl("");
    setUploadedResourceName("");
    setUploadedResourceSize("");
    setResourceUploader("");
    setUploadResourceError("");
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceTitle.trim() || !resourceCategory || !uploadedResourceUrl) {
      setUploadResourceError("Please provide a Title and upload a file first.");
      return;
    }

    try {
      const token = localStorage.getItem("arithmetica-jwt-token");
      const url = editingResourceId ? `/api/resources/${editingResourceId}` : "/api/resources";
      const method = editingResourceId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: resourceTitle,
          description: resourceDesc,
          category: resourceCategory,
          fileUrl: uploadedResourceUrl,
          fileName: uploadedResourceName,
          fileSize: uploadedResourceSize,
          fileType: uploadedResourceName.split('.').pop()?.toLowerCase() || "pdf",
          uploader: resourceUploader.trim() || "Arithmetica Admin"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save resource entry.");
      }

      // Reset form on success!
      setEditingResourceId(null);
      setResourceTitle("");
      setResourceDesc("");
      setResourceCategory("Notes");
      setUploadedResourceUrl("");
      setUploadedResourceName("");
      setUploadedResourceSize("");
      setResourceUploader("");
      setUploadResourceError("");

      showTemporarySuccess(editingResourceId ? "রিসোর্স বিবরণী সফলভাবে আপডেট করা হয়েছে!" : "Academic study material published successfully!");

      if (onReloadResources) {
        onReloadResources();
      }
    } catch (err: any) {
      setUploadResourceError(err.message || "Failed to make resource entry.");
    }
  };

  const handleDeleteResource = (id: string, name: string) => {
    requestConfirmation(
      "রিসোর্স মুছে ফেলার নিশ্চিতকরণ",
      `আপনি কি নিশ্চিতভাবে "${name}" নামক রিসোর্স ফাইলটি স্থায়ীভাবে সার্ভার ডাটাবেজ থেকে মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা সম্ভব হবে না।`,
      async () => {
        try {
          const token = localStorage.getItem("arithmetica-jwt-token");
          const res = await fetch(`/api/resources/${id}`, {
            method: "DELETE",
            headers: {
              ...(token ? { "Authorization": `Bearer ${token}` } : {})
            }
          });
          if (res.ok) {
            showTemporarySuccess("Resource deleted successfully");
            if (onReloadResources) {
              onReloadResources();
            }
          } else {
            const data = await res.json();
            alert(data.error || "Failed to delete resource");
          }
        } catch (e) {
          console.error("Error deleting resource:", e);
        }
      }
    );
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSiteConfig(localSettings);
    showTemporarySuccess("Global site designs and settings saved successfully!");
  };

  const handleResetDemoDatabase = async () => {
    requestConfirmation(
      "সিস্টেম রিসেট (System Hard Reset)",
      "WARNING: This will wipe all custom posts, categories, comments, and site layout settings from the backend and restore initial clean states. Do you wish to proceed?",
      async () => {
        try {
          const token = localStorage.getItem("arithmetica-jwt-token");
          const res = await fetch("/api/system/reset", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });
          if (res.ok) {
            localStorage.removeItem("arithmetica-posts");
            localStorage.removeItem("arithmetica-comments");
            localStorage.removeItem("arithmetica-categories");
            localStorage.removeItem("arithmetica-site-config");
            showTemporarySuccess("System reset completed! The page will now reload.");
            setTimeout(() => window.location.reload(), 1500);
          } else {
            setActionError("Failed to perform system reset. Unauthorized action.");
          }
        } catch (err: any) {
          setActionError(`Reset backend failed: ${err.message || err}`);
        }
      },
      "Yes, Reset Everything",
      "No, Cancel"
    );
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="relative">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <KeySquare className="h-4 w-4 text-amber-500/60 animate-pulse" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-sans">
              নিরাপত্তা ভেরিফিকেশন চলছে...
            </p>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Verifying secure admin authorization...
            </p>
          </div>

          {(showTimeoutBypass || authVerifyError) && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl space-y-3 animate-fade-in shadow-sm">
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {authVerifyError || "অনুরোধটি সময় অতিক্রম করেছে। সম্ভবত সার্ভার কোল্ডস্টার্ট বা ব্যস্ত রয়েছে। আপনি চাইলে প্রক্রিয়াটি এড়িয়ে সরাসরি লগইন পেজে যেতে পারেন।"}
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    localStorage.removeItem("arithmetica-jwt-token");
                    localStorage.removeItem("arithmetica-is-authenticated");
                    setIsAuthenticated(false);
                    setLoadingAuth(false);
                  }}
                  className="bg-slate-900 hover:bg-slate-850 dark:bg-amber-600 dark:hover:bg-amber-500 text-white dark:text-slate-950 font-bold px-3 py-1.5 rounded text-[10px] cursor-pointer transition-all"
                >
                  সরাসরি লগইনে যান (Skip to Login)
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[10px] rounded hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition-all"
                >
                  পুনরায় লোড করুন (Reload)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <span className="inline-flex p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-full mb-3 border border-amber-100 dark:border-amber-900/40">
              <KeySquare className="h-6 w-6" />
            </span>
            <h2 className="font-serif font-bold text-2xl text-slate-900 dark:text-white">
              Arithmetica Portal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Protected authentication entry point to publish articles, moderate categories, and edit global layouts.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Username *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                className="w-full px-4 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Security Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your security password"
                className="w-full px-4 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
              />
            </div>

            {authError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded border border-rose-200 dark:border-rose-900/40 font-medium">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white dark:text-slate-950 font-bold py-2.5 text-xs rounded transition-all cursor-pointer shadow-md border border-slate-950 dark:border-amber-600 uppercase tracking-widest font-sans"
              id="admin-login-submit"
            >
              Secure Login Entry
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Upper header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <button 
            onClick={onBackToHome}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-2 transition-colors cursor-pointer font-semibold"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Public Homepage
          </button>
          <h2 className="font-serif font-bold text-3xl text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <Sliders className="h-7 w-7 text-amber-500" />
            Arithmetica Control Panel
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Draft or publish essays and academic pieces, manage taxonomy categories, and customize editorial designs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs rounded transition-colors cursor-pointer font-bold"
          >
            Logout
          </button>
          {!isEditingPost && !isEditingCategory && activeTab === "posts" && (
            <button
              onClick={handleStartCreate}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white dark:text-slate-950 font-bold px-4 py-2 rounded text-xs transition-all cursor-pointer shadow border border-slate-950 dark:border-amber-600 uppercase tracking-wider"
              id="btn-create-creative-post"
            >
              <Plus className="h-4 w-4" />
              Create New Post
            </button>
          )}
          {activeTab === "categories" && !isEditingCategory && (
            <button
              onClick={() => {
                handleResetCategoryForm();
                setIsEditingCategory(true);
              }}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white dark:text-slate-950 font-bold px-4 py-2 rounded text-xs transition-all cursor-pointer shadow border border-slate-950 dark:border-amber-600 uppercase tracking-wider"
            >
              <Plus className="h-4 w-4" />
              Add New Category
            </button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-400 p-3 rounded mb-6 text-center text-xs font-semibold flex items-center justify-center gap-2 animate-fade-inEdge">
          <Check className="h-4 w-4 text-emerald-500" />
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-455 p-3 rounded mb-6 text-center text-xs font-semibold flex items-center justify-center gap-2 animate-fade-inEdge">
          <ShieldAlert className="h-4 w-4 text-rose-500" />
          {actionError}
        </div>
      )}

      {/* Tabs list navigation bar */}
      {!isEditingPost && (
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-850 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab("posts")}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "posts"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4" />
            Posts ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "categories"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Grid className="h-4 w-4" />
            Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "analytics"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("media")}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "media"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            Media Gallery
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "settings"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Settings className="h-4 w-4" />
            Design Settings
          </button>
          <button
            onClick={() => setActiveTab("subscribers")}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "subscribers"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Mail className="h-4 w-4" />
            Newsletter & Subscribers ({subscribersList.length})
          </button>
          <button
            onClick={() => setActiveTab("resources")}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "resources"
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FolderOpen className="h-4 w-4 text-amber-500" />
            Resources & Study Materials ({resources.length})
          </button>
        </div>
      )}

      {/* RENDER ACTIVE TAB CODES */}

      {/* 1. POSTS TAB OR EDITING FORM */}
      {activeTab === "posts" && (
        isEditingPost ? (
          /* Rich Text HTML Editor Form Module */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-md p-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
              <h3 className="font-serif font-bold text-xl text-slate-950 dark:text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-amber-500" />
                {editingPostId ? "Edit Article Details" : "Construct and Compile New Post"}
              </h3>
              <button
                onClick={() => setIsEditingPost(false)}
                className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 py-1.5 px-3 rounded border border-slate-300 dark:border-slate-700 cursor-pointer font-bold"
              >
                Cancel / Return
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Form fields column */}
                <div className="lg:col-span-12 xl:col-span-5 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Post Title *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. The first second of the universe & spatial geometry..."
                        className="flex-1 px-4 py-2.5 text-sm bg-slate-105 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateSlug}
                        title="Generate English URL Slug"
                        className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-bold flex items-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer border border-slate-300 dark:border-slate-700"
                      >
                        <Globe className="h-3.5 w-3.5 text-amber-500" />
                        Generate Slug
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                      SEO URL Slug *
                    </label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="e.g. universe-first-second-geometry"
                      className="w-full px-4 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 shadow-sm font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Post Categories (select multiple) *
                      </label>
                      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-lg p-3 max-h-36 overflow-y-auto space-y-2">
                        {categories.map(c => {
                          const isChecked = postCategories.includes(c.name);
                          return (
                            <label key={c.id} className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPostCategories([...postCategories, c.name]);
                                    if (!postCategory) {
                                      setPostCategory(c.name);
                                    }
                                  } else {
                                    const updated = postCategories.filter(name => name !== c.name);
                                    setPostCategories(updated);
                                    if (postCategory === c.name) {
                                      setPostCategory(updated[0] || "");
                                    }
                                  }
                                }}
                                className="rounded text-amber-500 focus:ring-amber-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                              />
                              <span className="font-serif font-semibold">{c.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Publication Status
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPostStatus("published")}
                          className={`py-2 px-3 rounded text-xs font-bold transition-all border cursor-pointer ${
                            postStatus === "published"
                              ? "bg-emerald-55 bg-emerald-100 border-emerald-400 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          Published
                        </button>
                        <button
                          type="button"
                          onClick={() => setPostStatus("draft")}
                          className={`py-2 px-3 rounded text-xs font-bold transition-all border cursor-pointer ${
                            postStatus === "draft"
                              ? "bg-amber-100 border-amber-450 text-amber-800 border-amber-400 dark:bg-amber-950/20 dark:text-amber-400"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          Draft
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="e.g. math, essay, logic"
                        className="w-full px-4 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Feature on Homepage?
                      </label>
                      <label className="inline-flex items-center gap-2 mt-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded select-none cursor-pointer w-full text-xs text-slate-700 dark:text-slate-300 font-semibold shadow-sm">
                        <input
                          type="checkbox"
                          checked={isFeatured}
                          onChange={(e) => setIsFeatured(e.target.checked)}
                          className="rounded border-slate-350 dark:border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4 shrink-0"
                        />
                        Display on Home Page Banner
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Short Excerpt *
                    </label>
                    <textarea
                      rows={2}
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      placeholder="Write a brief 1-2 line summary about core themes of the post details..."
                      className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                    />
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1 font-mono">
                      <Sliders className="h-3.5 w-3.5 text-amber-500" />
                      Author Credentials
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase mb-1">Author Name</label>
                        <input
                          type="text"
                          value={authorName}
                          onChange={(e) => setAuthorName(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded font-semibold focus:bg-white dark:focus:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase mb-1">Role/Designation</label>
                        <input
                          type="text"
                          value={authorRole}
                          onChange={(e) => setAuthorRole(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded font-semibold focus:bg-white dark:focus:bg-slate-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-450 uppercase mb-1">Author Bio</label>
                      <input
                        type="text"
                        value={authorBio}
                        onChange={(e) => setAuthorBio(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Right content column: Rich Editor, Images */}
                <div className="lg:col-span-12 xl:col-span-7 flex flex-col justify-between space-y-4">
                  {/* Image Placement & Upload Hub */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-205 border-dashed border-slate-300 dark:border-slate-800 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                        <ImageIcon className="h-4 w-4 text-amber-500" />
                        Post Image Director Hub
                      </h4>
                      {deviceUploading && (
                        <span className="text-[10px] bg-amber-100 dark:bg-amber-950/45 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded animate-pulse font-mono">
                          Uploading Image...
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                      Assign uploaded images into sections. Select type first, then choose a computer file or drop it directly here.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                          Image Destination Section
                        </label>
                        <select
                          id="post-placement-selector"
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                          defaultValue="featured animate-none"
                        >
                          <option value="featured">Feature Image (Main post thumbnail)</option>
                          <option value="cover">Cover Image (Homepage banner)</option>
                          <option value="inline">Inline Image (Insert at current text cursor)</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-end">
                        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                          File Upload
                        </label>
                        <div 
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              const dest = (document.getElementById("post-placement-selector") as HTMLSelectElement)?.value || "featured";
                              const url = await handleDeviceFileUpload(file);
                              if (url) {
                                if (dest === "featured") setFeaturedImage(url);
                                else if (dest === "cover") setCoverImage(url);
                                else handleInsertInlineImageUrl(url);
                                showTemporarySuccess(`Successfully hosted and assigned image to Post ${dest === "featured" ? "Featured Image" : dest === "cover" ? "Cover Image" : "Inline Content"}`);
                              }
                            }
                          }}
                          className="border border-dashed border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 p-2 flex items-center justify-between text-xs cursor-pointer hover:border-amber-500 transition-colors"
                          onClick={() => {
                            const fileInput = document.createElement("input");
                            fileInput.type = "file";
                            fileInput.accept = "image/*";
                            fileInput.onchange = async (event: any) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                const dest = (document.getElementById("post-placement-selector") as HTMLSelectElement)?.value || "featured";
                                const url = await handleDeviceFileUpload(file);
                                if (url) {
                                  if (dest === "featured") setFeaturedImage(url);
                                  else if (dest === "cover") setCoverImage(url);
                                  else handleInsertInlineImageUrl(url);
                                  showTemporarySuccess(`Successfully hosted and assigned image to Post ${dest === "featured" ? "Featured Image" : dest === "cover" ? "Cover Image" : "Inline Content"}`);
                                }
                              }
                            };
                            fileInput.click();
                          }}
                        >
                          <span className="text-slate-400 truncate pr-2">Click or Drop Computer File...</span>
                          <Upload className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-205 dark:border-slate-805">
                        <img src={featuredImage || PRESET_IMAGES[0].url} alt="" className="w-9 h-7 rounded object-cover border" />
                        <div className="min-w-0">
                          <span className="text-[8px] font-bold uppercase text-slate-400 block tracking-wide">Thumbnail Image</span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono truncate block">{featuredImage ? "Assigned Upload" : "Default Preset"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-205 dark:border-slate-805">
                        <img src={coverImage || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200"} alt="" className="w-9 h-7 rounded object-cover border" />
                        <div className="min-w-0">
                          <span className="text-[8px] font-bold uppercase text-slate-400 block tracking-wide">Banner Cover</span>
                          <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono truncate block">{coverImage ? "Custom Upload" : "Inherit Thumbnail"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Featured Cover URL Link *
                    </label>
                    <input
                      type="url"
                      required
                      value={featuredImage}
                      onChange={(e) => setFeaturedImage(e.target.value)}
                      placeholder="Provide raw photo asset URL..."
                      className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 font-mono"
                    />

                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mt-2 mb-1.5">
                      Homepage Banner Cover URL Link (Optional Cover Image placement)
                    </label>
                    <input
                      type="url"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="Optional banner overlay graphic URL link..."
                      className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 font-mono"
                    />
                    
                    {/* Preset Image list click */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-750 rounded-sm">
                      <p className="text-[10px] font-bold text-slate-550 dark:text-slate-405 uppercase tracking-wide mb-2 flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <Grid className="h-3.5 w-3.5 text-amber-500" />
                        Quick Premium Presets (Click to link cover instantly):
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {PRESET_IMAGES.map((img) => (
                          <button
                            key={img.name}
                            type="button"
                            onClick={() => setFeaturedImage(img.url)}
                            className={`text-[9px] p-2 rounded truncate text-center transition-all cursor-pointer border font-bold ${
                              featuredImage === img.url 
                                ? "bg-amber-500 border-amber-600 text-slate-950 font-extrabold shadow" 
                                : "bg-white dark:bg-slate-805 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-850"
                            }`}
                          >
                            {img.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rich Text Toolbar Options */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Post Main Details Content (Plain Text or HTML supported) *
                      </label>
                      
                      <div className="flex items-center flex-wrap gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded border border-slate-300 dark:border-slate-700 text-[10px] shadow-sm">
                        <span className="text-slate-500 dark:text-slate-400 px-1 font-bold">Inject Custom Tags:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const fileInput = document.createElement("input");
                            fileInput.type = "file";
                            fileInput.accept = "image/*";
                            fileInput.onchange = async (event: any) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                const url = await handleDeviceFileUpload(file);
                                if (url) {
                                  handleInsertInlineImageUrl(url);
                                  showTemporarySuccess("Inline image uploaded and HTML inserted at cursor!");
                                }
                              }
                            };
                            fileInput.click();
                          }}
                          className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-600 rounded font-black flex items-center gap-1 cursor-pointer shrink-0 transition-colors mr-1"
                          title="Upload image from computer and insert immediately at cursor position"
                        >
                          <Upload className="h-3 w-3" />
                          + Upload & Insert Image
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertHTML("<h2>", "</h2>")}
                          className="px-2 py-0.5 bg-white border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:bg-slate-700 dark:hover:bg-slate-650 rounded text-slate-800 dark:text-white font-bold"
                          title="Insert Heading 2 tag"
                        >
                          H2
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertHTML("<h3>", "</h3>")}
                          className="px-2 py-0.5 bg-white border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:bg-slate-700 dark:hover:bg-slate-650 rounded text-slate-800 dark:text-white font-bold"
                          title="Insert Heading 3 tag"
                        >
                          H3
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertHTML("<p>", "</p>")}
                          className="px-2 py-0.5 bg-white border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:bg-slate-700 dark:hover:bg-slate-650 rounded text-slate-800 dark:text-white font-medium"
                          title="Insert Paragraph tag"
                        >
                          P
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertHTML("<strong>", "</strong>")}
                          className="px-2 py-0.5 bg-white border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:bg-slate-700 dark:hover:bg-slate-650 rounded text-slate-800 dark:text-white font-bold"
                          title="Insert Strong Bold tag"
                        >
                          Bold
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertHTML("<blockquote>\"", "\"</blockquote>")}
                          className="px-2 py-0.5 bg-white border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:bg-slate-700 dark:hover:bg-slate-650 rounded text-slate-800 dark:text-white italic font-serif font-bold"
                          title="Insert Quotation tag"
                        >
                          Quote
                        </button>
                      </div>
                    </div>

                    <textarea
                      ref={textareaRef}
                      rows={12}
                      required
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Use default HTML headings and paragraph structures or type plain text here. Examples: <h2>My Header</h2> <p>Core essay texts...</p>"
                      className="w-full p-4 text-xs bg-slate-100 dark:bg-slate-850 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-mono leading-relaxed shadow-sm placeholder-slate-400 dark:placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800All headers">
                <button
                  type="button"
                  disabled={isSavingPost}
                  onClick={handleResetForm}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 text-xs rounded font-bold cursor-not-allowed border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear Form / Reset Values
                </button>
                <button
                  type="submit"
                  disabled={isSavingPost}
                  className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-805 dark:bg-amber-600 dark:hover:bg-amber-500 text-white dark:text-slate-950 font-bold py-2 px-6 rounded text-xs active:scale-95 transition-all shadow-md cursor-pointer border border-slate-950 dark:border-amber-600 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                  id="btn-save-creative-post"
                >
                  {isSavingPost ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSavingPost ? (editingPostId ? "Saving..." : "Publishing...") : (editingPostId ? "Save Changes" : "Save and Publish Post")}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Dynamic Articles List Spreadsheet View */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-serif font-bold text-lg text-slate-950 dark:text-white flex items-center gap-2">
                <List className="h-5 w-5 text-amber-500" />
                Compiled Articles Directory ({posts.length} entries)
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Click the edit pen icon to refine text or trash button to delete.
              </span>
            </div>

            {posts.length === 0 ? (
              <div className="p-16 text-center text-slate-400 dark:text-slate-500">
                <FileText className="h-12 w-12 mx-auto text-slate-350 dark:text-slate-700 mb-3" />
                <p className="font-bold text-base mb-1">No Articles Compiled!</p>
                <p className="text-xs">There are no posts inside database. Click "Create New Post" to start composing pieces.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 text-[10px] font-extrabold text-slate-500 dark:text-slate-300 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 font-sans">
                      <th className="py-3 px-4">Article Details & Taxonomy Category</th>
                      <th className="py-3 px-4">Author</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Views</th>
                      <th className="py-3 px-4 text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-1 00 divide-slate-200 dark:divide-slate-800/80">
                    {posts.map((p) => (
                      <tr 
                        key={p.id}
                        className="hover:bg-slate-100/50 dark:hover:bg-slate-800/20 transition-all text-xs"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.featuredImage}
                              alt=""
                              className="w-12 h-8 rounded object-cover shrink-0 border border-slate-200 dark:border-slate-800"
                            />
                            <div>
                              <div className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 leading-snug">
                                {p.title}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {(Array.isArray(p.categories) && p.categories.length > 0 ? p.categories : [p.category].filter(Boolean)).map((cat, idx) => (
                                  <span key={idx} className="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-955/20 dark:bg-amber-950/20 p-0.5 px-1.5 rounded border border-amber-200/20 whitespace-nowrap">
                                    {cat}
                                  </span>
                                ))}
                                {p.featured && (
                                  <span className="text-[9px] bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 px-1.5 py-0.5 rounded font-black tracking-wide">
                                    [FEATURED]
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-semibold font-sans">
                          {p.author.name}
                        </td>
                        <td className="py-3.5 px-4 font-bold">
                          {p.status === "draft" ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200">
                              DRAFT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200">
                              PUBLISHED
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-bold dark:text-slate-400 font-mono">
                          {p.views.toLocaleString()} views
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded overflow-hidden divide-x divide-slate-305 divide-slate-300 dark:divide-slate-700">
                            <button
                              onClick={() => handleStartEdit(p)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-cyan-400 transition-colors cursor-pointer"
                              title="Edit post parameters"
                              id={`btn-edit-${p.id}`}
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-605 text-rose-600 transition-colors cursor-pointer"
                              title="Delete this article"
                              id={`btn-delete-${p.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      )}

      {/* 2. CATEGORIES TAB */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left panel: Category create/edit form */}
          <div className="lg:col-span-12 xl:col-span-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 shadow-sm">
              <h3 className="font-serif font-bold text-lg text-slate-955 dark:text-white flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                <Grid className="h-5 w-5 text-amber-500" />
                {editingCategoryId ? "Edit Taxonomies Settings" : "Add New Category"}
              </h3>

              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Science & Mathematics"
                    className="w-full px-4 py-2.5 text-sm bg-slate-105 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-705 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                    English URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={catSlug}
                    onChange={(e) => setCatSlug(e.target.value)}
                    placeholder="e.g. science-math"
                    className="w-full px-4 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 shadow-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Category Brief Outline
                  </label>
                  <textarea
                    rows={2}
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="Scope, aims or notes for contributors..."
                    className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Category Cover Image (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={catImageUrl}
                      onChange={(e) => setCatImageUrl(e.target.value)}
                      placeholder="Asset URL or uploads path..."
                      className="flex-1 px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const fileInput = document.createElement("input");
                        fileInput.type = "file";
                        fileInput.accept = "image/*";
                        fileInput.onchange = async (event: any) => {
                          const file = event.target.files?.[0];
                          if (file) {
                             const url = await handleDeviceFileUpload(file);
                             if (url) {
                               setCatImageUrl(url);
                               showTemporarySuccess("Category image uploaded and linked successfully!");
                             }
                          }
                        };
                        fileInput.click();
                      }}
                      className="px-3 py-2 bg-slate-205 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded text-xs shrink-0 font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5 text-amber-500" />
                      Upload
                    </button>
                  </div>
                  {catImageUrl && (
                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded flex gap-2 items-center leading-none">
                      <img src={catImageUrl} alt="" className="w-8 h-8 rounded object-cover shadow-sm border" />
                      <span className="text-[10px] text-slate-500 font-mono truncate">{catImageUrl}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Accent Color HEX
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={catColor}
                        onChange={(e) => setCatColor(e.target.value)}
                        className="w-8 h-8 rounded border border-slate-400 cursor-pointer overflow-hidden p-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={catColor}
                        onChange={(e) => setCatColor(e.target.value)}
                        className="flex-1 px-3 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 font-mono text-center font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Lucide Icon Type
                    </label>
                    <select
                      value={catIcon}
                      onChange={(e) => setCatIcon(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="GraduationCap">Academic / Thesis</option>
                      <option value="BookOpen">Book / Archive</option>
                      <option value="Globe">Cosmos / Astronomics</option>
                      <option value="Sparkles">Philosophy / Ideas</option>
                      <option value="Laptop">Electronics / Tech</option>
                      <option value="Check">Check / Reasoning</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-800 pt-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Sort Index Value (Order)
                    </label>
                    <input
                      type="number"
                      value={catOrder}
                      onChange={(e) => setCatOrder(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-850 dark:bg-slate-800 text-slate-910 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Availability Status
                    </label>
                    <label className="inline-flex items-center gap-2 mt-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-305 border-slate-300 dark:border-slate-700 rounded select-none cursor-pointer w-full text-xs text-slate-700 dark:text-slate-300 font-bold shadow-sm">
                      <input
                        type="checkbox"
                        checked={catEnabled}
                        onChange={(e) => setCatEnabled(e.target.checked)}
                        className="rounded border-slate-305 dark:border-slate-750 text-amber-500 focus:ring-amber-500 h-4 w-4"
                      />
                      Active & Visible
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={handleResetCategoryForm}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-305 text-xs rounded transition-all cursor-pointer font-bold text-center border border-slate-300 dark:border-slate-700"
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white dark:text-slate-950 py-2 text-xs rounded transition-all font-bold cursor-pointer border border-slate-950 dark:border-amber-600 uppercase tracking-wider"
                  >
                    Save Category
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right panel: Category inventory table */}
          <div className="lg:col-span-12 xl:col-span-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-serif font-bold text-lg text-slate-950 dark:text-white">
                  Categories Directory
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 text-[10px] font-extrabold text-slate-500 dark:text-slate-300 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 font-sans">
                      <th className="py-3 px-4">Name & Description</th>
                      <th className="py-3 px-4">English URL Slug</th>
                      <th className="py-3 px-4 text-center">Sorting Grid Order</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                    {categories.map((cat) => (
                      <tr 
                        key={cat.id}
                        className="hover:bg-slate-100/50 dark:hover:bg-slate-800/20 transition-all text-xs"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-2.5">
                            <span 
                              className="w-3.5 h-3.5 rounded-full mt-1 shrink-0 shadow-sm border border-black/10" 
                              style={{ backgroundColor: cat.color || "#D4AF37" }}
                            />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1 font-sans text-sm">
                                {cat.name}
                                <span className="text-[10px] text-slate-400 font-mono font-medium">({cat.icon})</span>
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{cat.description || "No specific guidelines written."}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-350 font-bold">
                          {cat.englishName}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-2 justify-center">
                            <button
                              onClick={() => handleReorderCategory(cat, "up")}
                              className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-amber-500 border border-slate-200 dark:border-slate-700 cursor-pointer"
                              title="Increase Priority Order ↑"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono font-bold underline px-1 text-slate-900 dark:text-white text-xs">{cat.order}</span>
                            <button
                              onClick={() => handleReorderCategory(cat, "down")}
                              className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-amber-500 border border-slate-200 dark:border-slate-700 cursor-pointer"
                              title="Decrease Priority Order ↓"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {cat.enabled ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/25 dark:text-emerald-400 p-0.5 px-2 rounded border border-emerald-200 dark:border-emerald-800">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 p-0.5 px-2 rounded border border-slate-200 dark:border-slate-700">
                              INACTIVE
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center bg-slate-50 dark:bg-slate-805 border border-slate-305 border-slate-300 dark:border-slate-700 rounded overflow-hidden divide-x divide-slate-300 dark:divide-slate-700">
                            <button
                              onClick={() => handleStartEditCategory(cat)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-cyan-400 transition-colors cursor-pointer"
                              title="Modify category parameters"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-955 text-rose-600 transition-colors cursor-pointer"
                              title="Delete category"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. ANALYTICS & VIEWCOUNTS TAB */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Statistical Boxes Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 bg-gradient-to-tr from-slate-900 to-slate-950 text-white rounded shadow-sm border border-slate-800">
              <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase font-mono block mb-1">Total Hits (Reads)</span>
              <h4 className="text-3xl font-black font-mono">
                {posts.reduce((sum, p) => sum + p.views, 0).toLocaleString()} Views
              </h4>
              <p className="text-[10px] text-slate-450 text-slate-300 mt-2 font-semibold">Aggregate hits counted across live articles</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono block mb-1 font-sans">Total Articles</span>
              <h4 className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
                {posts.length} Posts
              </h4>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">All database files records count</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tracking-wider uppercase font-mono block mb-1">Published Posts</span>
              <h4 className="text-3xl font-bold font-mono text-slate-950 dark:text-white">
                {posts.filter(p => p.status === "published").length} Live
              </h4>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">Read-accessible to public audience</p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-450 tracking-wider uppercase font-mono block mb-1">Saved Drafts</span>
              <h4 className="text-3xl font-bold tracking-wide font-mono text-slate-950 dark:text-white">
                {posts.filter(p => p.status === "draft").length} Drafts
              </h4>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">Internal works under editing check</p>
            </div>
          </div>

          {/* Premium CSS Bar Chart of Top Read Articles */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded border border-slate-200 dark:border-slate-805 shadow-sm">
            <h3 className="font-serif font-bold text-lg text-slate-955 dark:text-white mb-6 flex items-center gap-1.5">
              <BarChart2 className="h-5 w-5 text-amber-500 animate-pulse" />
              Highest Performing Articles (Top 5 Reads Progress Chart)
            </h3>

            {posts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 font-semibold">There are no compiled posts inside backend database to measure views analytics.</p>
            ) : (
              <div className="space-y-4">
                {[...posts]
                  .sort((a, b) => b.views - a.views)
                  .slice(0, 5)
                  .map((post) => {
                    const maxViews = Math.max(...posts.map(p => p.views)) || 1;
                    const percent = Math.min(100, Math.max(8, Math.round((post.views / maxViews) * 100)));
                    return (
                      <div key={post.id} className="space-y-1 text-xs">
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-800 dark:text-slate-200 truncate max-w-lg font-sans text-sm">{post.title}</span>
                          <span className="font-mono text-amber-600 dark:text-amber-400 font-extrabold ml-2">
                            {post.views.toLocaleString()} visits
                          </span>
                        </div>
                        <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded overflow-hidden border border-slate-200 dark:border-slate-700">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 flex items-center pl-2 font-mono text-[9px] font-extrabold shadow-sm transition-all duration-1000"
                            style={{ width: `${percent}%` }}
                          >
                            {percent}%
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>

          {/* Table of view counts readable strictly by admins */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-serif font-bold text-base text-slate-950 dark:text-white">
                Complete Views Inventory Audit
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-[10px] font-extrabold text-slate-505 dark:text-slate-300 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 font-sans">
                    <th className="py-3 px-4">Article Title Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Author</th>
                    <th className="py-3 px-4 text-right">Raw View Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-mono text-xs text-slate-700 dark:text-slate-300">
                  {[...posts]
                    .sort((a, b) => b.views - a.views)
                    .map((p) => (
                      <tr key={p.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/20">
                        <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-white">{p.title}</td>
                        <td className="py-3 px-4 font-sans text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          {(Array.isArray(p.categories) && p.categories.length > 0 ? p.categories : [p.category].filter(Boolean)).join(", ")}
                        </td>
                        <td className="py-3 px-4 font-sans font-semibold">{p.author.name}</td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {p.views.toLocaleString()} views
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. MEDIA GALLERY TAB */}
      {activeTab === "media" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded p-6 shadow-sm">
            <h3 className="font-serif font-bold text-lg text-slate-955 dark:text-white flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <Upload className="h-5 w-5 text-amber-500" />
              Secure Multipart Server Storage Gallery (Dynamic Hosting)
            </h3>
            
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4 font-medium">
              Easily host and preview custom files directly in backend storage. This panel uploads selected images to the secure server <code>/uploads</code> directory, returning dynamic image URLs that you can paste inside post settings or rich content bodies.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-950">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleUploadImage}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white dark:text-slate-950 px-5 py-2.5 rounded font-bold text-xs pointer transition-all active:scale-95 border border-slate-950 dark:border-amber-600 cursor-pointer uppercase tracking-wider"
              >
                <Upload className="h-4 w-4" />
                Select Image File from Device
              </button>
              <span className="text-xs text-slate-500 dark:text-slate-450 font-bold">Max Limit per File: 5.0 MB</span>
            </div>

            {mediaUploadError && (
              <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded border border-rose-200 dark:border-rose-900/40 mt-3 font-semibold text-center">
                {mediaUploadError}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded border border-slate-205 border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-serif font-bold text-base text-slate-950 dark:text-white mb-4">
              Server-Hosted Gallery History ({uploadedImages.length} files tracked)
            </h3>

            {uploadedImages.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-550 font-sans italic text-xs font-semibold">
                No server images have been uploaded yet in this dashboard session. Upload a sample file above.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-fade-in">
                {uploadedImages.map((imgStr, idx) => (
                  <div key={idx} className="relative group rounded overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
                    <img
                      src={imgStr}
                      alt=""
                      className="w-full aspect-[16/10] object-cover animate-fade-in"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-center items-center gap-2 p-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(imgStr);
                          showTemporarySuccess("Direct image URL copied successfully to clipboard!");
                        }}
                        className="px-2.5 py-1.5 text-[10px] bg-amber-500 hover:bg-amber-450 text-slate-950 rounded font-bold pointer cursor-pointer uppercase tracking-wider w-full text-center"
                      >
                        Copy URL Path
                      </button>
                      <button
                        onClick={() => handleDeleteUploadedImage(idx)}
                        className="px-2.5 py-1.5 text-[10px] bg-rose-600 hover:bg-rose-500 text-white rounded font-bold pointer cursor-pointer uppercase tracking-wider w-full text-center"
                      >
                        Remove Reference
                      </button>
                    </div>
                    <div className="p-2 text-[9px] text-slate-500 dark:text-slate-400 truncate font-mono text-center font-bold">
                      Direct Assets Hook
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. SETTINGS FORM TAB */}
      {activeTab === "settings" && (
        <>
          <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Column 1: App Identity & Typography */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-lg text-slate-950 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <Sliders className="h-5 w-5 text-amber-500" />
                Branding Identity Customize
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Logo Text (Brand Name)
                  </label>
                  <input
                    type="text"
                    required
                    value={localSettings.siteName}
                    onChange={(e) => setLocalSettings({ ...localSettings, siteName: e.target.value })}
                    className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1.5">
                    Logo Symbol
                  </label>
                  <input
                    type="text"
                    required
                    value={localSettings.siteBrandingSymbol}
                    onChange={(e) => setLocalSettings({ ...localSettings, siteBrandingSymbol: e.target.value })}
                    placeholder="e.g. অ, Δ, Φ"
                    className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center font-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Brand Tagline
                </label>
                <input
                  type="text"
                  required
                  value={localSettings.siteTagline}
                  onChange={(e) => setLocalSettings({ ...localSettings, siteTagline: e.target.value })}
                  className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-sans">
                    Typography & Font Style
                  </label>
                  <select
                    value={localSettings.typography}
                    onChange={(e) => setLocalSettings({ ...localSettings, typography: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    <option value="serif-academic">Academic Serif (Classic Noto)</option>
                    <option value="sans-minimal">Minimalist Sans (Modern Inter)</option>
                    <option value="manuscript-classical">Classical Manuscript (Serif Scholar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-sans">
                    Primary Color Accent Theme
                  </label>
                  <select
                    value={localSettings.primaryThemeColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, primaryThemeColor: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  >
                    <option value="gold">Gold & Ancient Ivory</option>
                    <option value="blue">Sapphire & Deep Ocean Blue</option>
                    <option value="emerald">Emerald & Dark Cosmic Teal</option>
                    <option value="amber">Warm Sand & Orange Terracotta</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                  Social Media Connections
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Facebook URL</label>
                    <input
                      type="url"
                      value={localSettings.socialLinks.facebook}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        socialLinks: { ...localSettings.socialLinks, facebook: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Twitter (X) URL</label>
                    <input
                      type="url"
                      value={localSettings.socialLinks.twitter}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        socialLinks: { ...localSettings.socialLinks, twitter: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-semibold"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">GitHub Profile URL</label>
                    <input
                      type="url"
                      value={localSettings.socialLinks.github}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        socialLinks: { ...localSettings.socialLinks, github: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">YouTube Channel URL</label>
                    <input
                      type="url"
                      value={localSettings.socialLinks.youtube}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        socialLinks: { ...localSettings.socialLinks, youtube: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Structural Titles & SEO */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-sm space-y-4">
              <h3 className="font-serif font-bold text-lg text-slate-955 dark:text-white border-b border-slate-204 border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <Globe className="h-5 w-5 text-amber-500" />
                SEO Configuration & Layouts
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Header Headline Text
                  </label>
                  <input
                    type="text"
                    required
                    value={localSettings.headerTitle}
                    onChange={(e) => setLocalSettings({ ...localSettings, headerTitle: e.target.value })}
                    className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Footer Copyright Notice
                  </label>
                  <input
                    type="text"
                    required
                    value={localSettings.footerCopyText}
                    onChange={(e) => setLocalSettings({ ...localSettings, footerCopyText: e.target.value })}
                    className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Header Introductory Subtitle
                </label>
                <textarea
                  rows={2}
                  required
                  value={localSettings.headerSubtitle}
                  onChange={(e) => setLocalSettings({ ...localSettings, headerSubtitle: e.target.value })}
                  className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Footer Summary / About Us
                </label>
                <textarea
                  rows={2}
                  required
                  value={localSettings.footerAbout}
                  onChange={(e) => setLocalSettings({ ...localSettings, footerAbout: e.target.value })}
                  className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold shadow-sm"
                />
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-mono">
                  Global Search Engine Optimization (SEO)
                </h4>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">SEO Title Tag *</label>
                  <input
                    type="text"
                    required
                    value={localSettings.seoConfig.title}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      seoConfig: { ...localSettings.seoConfig, title: e.target.value }
                    })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Meta Description</label>
                    <input
                      type="text"
                      required
                      value={localSettings.seoConfig.description}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        seoConfig: { ...localSettings.seoConfig, description: e.target.value }
                      })}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-905 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Meta Keywords</label>
                    <input
                      type="text"
                      required
                      value={localSettings.seoConfig.keywords}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        seoConfig: { ...localSettings.seoConfig, keywords: e.target.value }
                      })}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-905 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action configurations */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-205 border-slate-200 dark:border-slate-800 rounded gap-4 shadow-sm">
            <button
              type="button"
              onClick={handleResetDemoDatabase}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 text-xs rounded font-bold border border-rose-200/50 dark:border-rose-900/40 transition-colors cursor-pointer uppercase tracking-wider shadow-sm"
            >
              Reset Database & Revert States
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white dark:text-slate-950 font-bold py-2.5 px-6 rounded text-xs active:scale-95 transition-all shadow-md cursor-pointer border border-slate-950 dark:border-amber-600 uppercase tracking-widest font-sans"
            >
              <Save className="h-4 w-4" />
              Save Layout Configuration
            </button>
          </div>
        </form>

        {/* Secure Admin Credentials Update Card (Dynamic Access Control Settings) */}
        <div className="mt-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-sm">
          <h3 className="font-serif font-bold text-lg text-slate-955 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 flex items-center gap-1.5 uppercase tracking-wide">
            <KeySquare className="h-5 w-5 text-amber-500" />
            পাসওয়ার্ড পরিবর্তন ও অ্যাডমিন ক্রেডেনশিয়ালস হালনাগাদ (Change Password & Credentials)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-6 max-w-2xl font-serif leading-relaxed">
            এই প্যানেলের মাধ্যমে আপনি যেকোনো সময়ে আপনার অ্যাডমিন অ্যাকাউন্টের ইউজারনেম এবং পাসওয়ার্ড পরিবর্তন করতে পারেন। নিরাপত্তা সুনিশ্চিত করতে সকল পাসওয়ার্ড পরিবর্তনের ক্ষেত্রে আপনার বর্তমান পাসওয়ার্ড প্রদানপূর্বক রি-ভেরিফাই করা বাধ্যতামূলক। পাসওয়ার্ডটি স্বনামধন্য ক্রিপ্টোগ্রাফিক হ্যাশ (bcrypt) হিসেবে সুরক্ষিত রাখা হয়।
          </p>

          <form onSubmit={handleUpdateCredentialsSubmit} className="space-y-4 max-w-xl">
            {credsSuccessMsg && (
              <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-900 rounded animate-fade-in">
                ✓ {credsSuccessMsg}
              </div>
            )}
            {credsErrorMsg && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900 rounded animate-fade-in">
                ✕ {credsErrorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-sans">
                  নতুন ইউজারনেম (New Username)
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="অপরিবর্তিত রাখতে ফাঁকা রাখুন..."
                  className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-sans">
                  নতুন পাসওয়ার্ড (New Password)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="কমপক্ষে ৪ অক্ষর, বা ফাঁকা রাখুন..."
                  className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-semibold"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-850">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-sans">
                বর্তমান পাসওয়ার্ড (Current Password) * <span className="text-rose-500">প্রয়োজনীয়</span>
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="পরিবর্তন নিশ্চিত করতে প্রবিষ্ট করুন..."
                className="w-full px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-rose-300 dark:border-rose-700 rounded focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono font-semibold"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={isUpdatingCreds}
                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-450 dark:bg-amber-600 dark:hover:bg-amber-500 text-slate-950 font-bold py-2 px-6 rounded text-xs active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 uppercase tracking-wider"
              >
                {isUpdatingCreds ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <KeySquare className="h-4 w-4" />
                )}
                অ্যাডমিন তথ্য হালনাগাদ করুন
              </button>
            </div>
          </form>
        </div>
        </>
      )}

      {/* 6. SUBSCRIBERS & NEWSLETTERS TAB */}
      {activeTab === "subscribers" && (
        <div className="space-y-8 animate-fade-in">
          {/* Status Indicators / Overview Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">মোট সাবস্ক্রাইবার</span>
                <span className="font-serif font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">
                  {subscribersList.length.toLocaleString('bn-BD')} জন
                </span>
                <p className="text-[10px] text-slate-500 mt-1">সরাসরি ইমেইল তালিকায় সচল রয়েছে</p>
              </div>
              <div className="p-3.5 bg-amber-500/10 rounded text-amber-500">
                <Mail className="h-7 w-7" />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">প্রেরিত নোটিফিকেশন</span>
                <span className="font-serif font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">
                  {notificationsHistory.length.toLocaleString('bn-BD')} বার
                </span>
                <p className="text-[10px] text-slate-500 mt-1">নতুন প্রকাশনায় মেইল পাঠানো হয়েছে</p>
              </div>
              <div className="p-3.5 bg-cyan-500/10 rounded text-cyan-600 dark:text-cyan-400">
                <RefreshCw className="h-7 w-7" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Subscribers List Table */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
                <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
                  সাবস্ক্রাইবার তালিকা (Subscribers List)
                </h3>
                <button
                  onClick={fetchSubscribersAndNotifications}
                  disabled={loadingSubs}
                  className="p-1 px-2.5 rounded bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[10px] uppercase tracking-wider font-bold transition-all duration-200 inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingSubs ? 'animate-spin' : ''}`} />
                  রিলোড
                </button>
              </div>

              {subsError && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-705 dark:text-rose-400 p-3 rounded mb-4 text-center text-xs">
                  {subsError}
                </div>
              )}

              {loadingSubs && subscribersList.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center font-serif italic">সাবস্ক্রাইবার তালিকা লোড করা হচ্ছে...</p>
              ) : subscribersList.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center font-serif italic">কোনো ইমেইল সাবস্ক্রাইবার নেই।</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase font-sans tracking-wider">
                        <th className="py-2">ক্রমিক</th>
                        <th className="py-2">ইমেইল ঠিকানা</th>
                        <th className="py-2 text-right">পদক্ষেপ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscribersList.map((subscriber, idx) => (
                        <tr key={subscriber} className="border-b border-slate-100 dark:border-slate-850/60 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                          <td className="py-3 font-mono text-slate-400">{(idx + 1).toLocaleString('bn-BD')}</td>
                          <td className="py-3 font-semibold font-mono text-slate-700 dark:text-slate-300 select-all">{subscriber}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDeleteSubscriber(subscriber)}
                              className="p-1.5 rounded hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-450 text-slate-400 transition-colors cursor-pointer"
                              title="সাবস্ক্রিপশন সরান"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Notification History Log */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-6 shadow-sm">
              <h3 className="font-serif font-bold text-lg text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 mb-4 flex items-center gap-1.5 uppercase tracking-wide">
                মেইলিং নোটিফিকেশন ইতিহাস (Notification Logs)
              </h3>

              {loadingSubs && notificationsHistory.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center font-serif italic">ইতিহাস লোড করা হচ্ছে...</p>
              ) : notificationsHistory.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center font-serif italic mb-2">কোনো প্রেরিত নোটিফিকেশন পাওয়া যায়নি। নতুন নিবন্ধ প্রকাশ করা হলে স্বয়ংক্রিয়ভাবে মেইল পাঠানো হবে।</p>
              ) : (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                  {notificationsHistory.map((notif: any) => {
                    const localDate = new Date(notif.dateSent).toLocaleDateString("bn-BD", {
                      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
                    });
                    return (
                      <div key={notif.id} className="p-3.5 border border-slate-100 dark:border-slate-850 rounded-md bg-slate-50/50 dark:bg-slate-950/20 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest font-mono">
                            {notif.id}
                          </span>
                          <span className={`text-[10px] font-sans font-black uppercase px-1.5 py-0.5 rounded ${
                            notif.status === "success" 
                              ? "bg-emerald-500/10 text-emerald-500" 
                              : notif.status === "simulated" 
                                ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" 
                                : "bg-rose-500/10 text-rose-500"
                          }`}>
                            {notif.status === "success" 
                              ? (notif.deliveryMethod ? `${notif.deliveryMethod} Sent` : "Delivered") 
                              : notif.status === "simulated" 
                                ? "Simulated" 
                                : "Failed"}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight font-serif mt-1">
                          {notif.postTitle}
                        </h4>
                        <div className="text-[10px] text-slate-400 font-medium flex justify-between flex-wrap gap-2 mt-1">
                          <span>তারিখ: {localDate}</span>
                          <span>প্রাপক: <strong className="text-slate-600 dark:text-slate-300 font-mono">{notif.recipientsCount} জন</strong></span>
                        </div>
                        {notif.error && (
                          <p className="text-[9px] font-mono text-rose-500 dark:text-rose-450 mt-1 border border-rose-100 dark:border-rose-900/40 p-1 rounded bg-rose-50/20 overflow-x-auto text-left leading-normal">
                            ত্রুটি: {notif.error}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. RESOURCES & DOWNLOADS SYSTEM TAB */}
      {activeTab === "resources" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left column: Add/Upload Resource Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded p-6 shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <h3 className="font-serif font-bold text-[15px] text-slate-950 dark:text-white flex items-center gap-2">
                  <FileDown className="h-5 w-5 text-amber-500" />
                  {editingResourceId ? "রিসোর্স বিবরণী সম্পাদনা (Edit File)" : "রিসোর্স পাবলিশিং সিস্টেম"}
                </h3>

                {/* Single/Multiple tab switcher - hidden when editing */}
                {!editingResourceId && (
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded border border-slate-205 dark:border-slate-800 text-[10px] font-bold font-sans">
                    <button
                      type="button"
                      onClick={() => { setUploadMode("single"); setUploadResourceError(""); }}
                      className={`px-2 py-1 rounded cursor-pointer transition-all ${
                        uploadMode === "single" 
                          ? "bg-amber-500 text-slate-950" 
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Single
                    </button>
                    <button
                      type="button"
                      onClick={() => { setUploadMode("multiple"); setUploadResourceError(""); }}
                      className={`px-2 py-1 rounded cursor-pointer transition-all ${
                        uploadMode === "multiple" 
                          ? "bg-amber-500 text-slate-950" 
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Bulk ({multipleUploadedFiles.length})
                    </button>
                  </div>
                )}
              </div>

              {uploadMode === "single" ? (
                <form onSubmit={handleCreateResource} className="space-y-4">
                  {/* 1. File Selection Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-sans">
                      ফাইল আপলোড করুন (Accepts PDF, ZIP, DOCX, TXT, HTML, images, etc.) <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal mb-2">
                      No document format restriction. Upload limit is up to 100MB per file.
                    </p>
                    
                    <div className="border border-dashed border-slate-300 dark:border-slate-705 rounded-lg p-5 bg-slate-50 dark:bg-slate-950 text-center relative transition-colors hover:border-amber-500">
                      <input
                        type="file"
                        id="resourceFileInput"
                        onChange={handleResourceFileChange}
                        className="hidden"
                      />
                      
                      <div className="flex flex-col items-center justify-center space-y-2 font-serif">
                        <FolderOpen className="h-8 w-8 text-slate-400 dark:text-slate-600 animate-pulse" />
                        
                        {isUploadingResource ? (
                          <div className="flex flex-col items-center space-y-1.5">
                            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-amber-500 font-medium">ফাইল আপলোড হচ্ছে...</span>
                          </div>
                        ) : uploadedResourceUrl ? (
                          <div className="text-slate-800 dark:text-slate-100 space-y-1">
                            <p className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                              <Check className="h-4 w-4 shrink-0" />
                              ফাইল আপলোড কমপ্লিট!
                            </p>
                            <p className="text-[10px] font-mono text-slate-500 max-w-xs break-all mx-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-1.5 rounded">
                              {uploadedResourceName} ({typeof uploadedResourceSize === 'number' ? (uploadedResourceSize / 1024 < 1024 ? `${(uploadedResourceSize / 1024).toFixed(1)} KB` : `${(uploadedResourceSize / 1024 / 1024).toFixed(1)} MB`) : uploadedResourceSize})
                            </p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => document.getElementById("resourceFileInput")?.click()}
                            className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-600 dark:hover:bg-amber-550 dark:text-slate-950 px-4 py-1.5 rounded font-bold text-xs cursor-pointer transition-transform active:scale-95 border border-slate-950 dark:border-amber-600 uppercase tracking-wider"
                          >
                            ফাইল নির্বাচন করুন [Browse File]
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. File Title */}
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-sans">
                      রিসোর্স শিরোনাম (Resource Custom Title) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: উচ্চতর ক্যালকুলাস চ্যাপ্টার ২ সমাধান"
                      value={resourceTitle}
                      onChange={(e) => setResourceTitle(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded text-slate-950 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* 3. Description */}
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-sans">
                      সংক্ষিপ্ত বিবরণ (Resource Description)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="যেমন: ক্লাস টেস্টের জন্য অত্যন্ত প্রয়োজনীয় প্রশ্নাবলী এবং সমাধান..."
                      value={resourceDesc}
                      onChange={(e) => setResourceDesc(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded text-slate-950 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* 4. Category */}
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-sans">
                      ক্যাটাগরি নির্ধারণ করুন (Filter Category) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={resourceCategory}
                      onChange={(e) => setResourceCategory(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 p-2.5 rounded text-slate-950 dark:text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Notes">Notes (নোট বা লেকচার শিট)</option>
                      <option value="Assignments">Assignments (অ্যাসাইনমেন্ট বা সমাধানপত্র)</option>
                      <option value="Books">Books (বই বা নির্দেশিকা)</option>
                      <option value="Other">Other (অন্যান্য বা চার্টচিত্র)</option>
                    </select>
                  </div>

                  {/* 4.5. Uploader Name */}
                  <div>
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-sans">
                      আপলোডারের নাম (Uploader Name)
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: Arithmetica Admin (ফাঁকা রাখলে 'Arithmetica Admin' যুক্ত হবে)"
                      value={resourceUploader}
                      onChange={(e) => setResourceUploader(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded text-slate-950 dark:text-white focus:outline-none focus:border-amber-500 font-sans"
                    />
                  </div>

                  {uploadResourceError && (
                    <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded border border-rose-200 dark:border-rose-900/40 font-semibold leading-relaxed font-serif">
                      ত্রুটি: {uploadResourceError}
                    </p>
                  )}

                  {/* 5. Submit Button */}
                  <div className="pt-2 flex gap-3">
                    <button
                      type="submit"
                      disabled={isUploadingResource || !uploadedResourceUrl}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-450 dark:bg-amber-600 dark:hover:bg-amber-500 text-slate-950 font-bold py-2.5 px-6 rounded text-xs active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 uppercase tracking-widest font-sans"
                    >
                      {editingResourceId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {editingResourceId ? "পরিবর্তন সংরক্ষণ করুন (Save)" : "রিসোর্স পাবলিশ করুন (Publish)"}
                    </button>

                    {editingResourceId && (
                      <button
                        type="button"
                        onClick={handleCancelEditResource}
                        className="p-2.5 text-xs font-bold border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-950 rounded text-slate-600 dark:text-slate-400 active:scale-95 transition-all cursor-pointer font-sans"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="space-y-4 animate-fade-in font-serif">
                  {/* Multiple/Bulk upload file picker */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block font-sans">
                      মাল্টিপল ফাইল সিলেক্ট করুন (Upload Multiple Files) <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal mb-2">
                      একসাথে একাধিক ফাইল (PDF, ZIP, html, docx, txt) নির্বাচন করুন এবং আপলোড করুন।
                    </p>
                    
                    <div className="border border-dashed border-amber-500/30 rounded-lg p-6 bg-amber-500/5 text-center relative hover:bg-amber-500/10 transition-colors">
                      <input
                        type="file"
                        id="bulkFileInput"
                        multiple
                        onChange={handleMultipleFilesChange}
                        className="hidden"
                      />
                      
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FolderOpen className="h-9 w-9 text-amber-500 animate-bounce" />
                        
                        {isUploadingMultiple ? (
                          <div className="flex flex-col items-center space-y-1.5">
                            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs text-amber-500 font-medium font-sans">ফাইলসমূহ আপলোড হচ্ছে...</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => document.getElementById("bulkFileInput")?.click()}
                            className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-600 dark:hover:bg-amber-550 dark:text-slate-950 px-4 py-2 rounded font-bold text-xs cursor-pointer transition-transform active:scale-95 border border-slate-950 dark:border-amber-600 font-sans"
                          >
                            একাধিক ফাইল চুজ করুন [Select Files]
                          </button>
                        )}
                        <p className="text-[9px] text-slate-400 pt-0.5">Select up to 10 files in bulk</p>
                      </div>
                    </div>
                  </div>

                  {/* Bulk materials options setting */}
                  {multipleUploadedFiles.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-100 dark:border-slate-850">
                        <span className="text-[11px] text-slate-500 font-bold">Staged files count: {multipleUploadedFiles.length}টি</span>
                        <button
                          type="button"
                          onClick={() => setMultipleUploadedFiles([])}
                          className="text-[10px] text-red-500 uppercase font-bold tracking-wider hover:underline"
                        >
                          Clear All
                        </button>
                      </div>

                      {/* Default bulk Category Selector */}
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 font-sans">
                          নির্ধারিত ক্যাটাগরি (Apply to all staged files)
                        </label>
                        <select
                          value={resourceCategory}
                          onChange={(e) => {
                            const cat = e.target.value;
                            setResourceCategory(cat);
                            setMultipleUploadedFiles(prev => prev.map(f => ({ ...f, category: cat })));
                          }}
                          className="w-full text-xs bg-slate-50 dark:bg-slate-100 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 p-2 rounded text-slate-950 dark:text-white"
                        >
                          <option value="Notes">Notes (নোট বা লেকচার শিট)</option>
                          <option value="Assignments">Assignments (অ্যাসাইনমেন্ট বা সমাধানপত্র)</option>
                          <option value="Books">Books (বই বা নির্দেশিকা)</option>
                          <option value="Other">Other (অন্যান্য یا চার্টচিত্র)</option>
                        </select>
                      </div>

                      {/* Staged files custom labels list editor */}
                      <div className="max-h-56 overflow-y-auto space-y-2.5 border border-slate-100 dark:border-slate-850 p-2 rounded-md bg-slate-50/50 dark:bg-slate-950/20">
                        {multipleUploadedFiles.map((f, idx) => (
                          <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-805 p-2 rounded text-xs space-y-1">
                            <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                              <span className="truncate max-w-[180px]">{f.fileName}</span>
                              <button
                                type="button"
                                onClick={() => setMultipleUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                                className="text-red-500 hover:text-red-600 font-serif font-bold text-xs"
                              >
                                ✕
                              </button>
                            </div>
                            <input
                              type="text"
                              value={f.title}
                              placeholder="শিরোনাম দিন..."
                              onChange={(e) => {
                                const val = e.target.value;
                                setMultipleUploadedFiles(prev => {
                                  const updated = [...prev];
                                  updated[idx].title = val;
                                  return updated;
                                });
                              }}
                              className="w-full text-xs border border-slate-100 dark:border-slate-800 p-1.5 rounded dark:bg-slate-950 text-slate-900 dark:text-white"
                            />
                            <input
                              type="text"
                              value={f.description}
                              placeholder="সংক্ষিপ্ত বিবরণী (ঐচ্ছিক)..."
                              onChange={(e) => {
                                const val = e.target.value;
                                setMultipleUploadedFiles(prev => {
                                  const updated = [...prev];
                                  updated[idx].description = val;
                                  return updated;
                                });
                              }}
                              className="w-full text-[10px] border border-slate-100 dark:border-slate-800 p-1 rounded dark:bg-slate-950 text-slate-500 dark:text-white"
                            />
                          </div>
                        ))}
                      </div>

                      {uploadResourceError && (
                        <p className="text-xs text-rose-600 font-semibold leading-relaxed">
                          {uploadResourceError}
                        </p>
                      )}

                      <button
                        type="button"
                        disabled={isUploadingMultiple || multipleUploadedFiles.length === 0}
                        onClick={handleBulkPublish}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-450 dark:bg-amber-600 dark:hover:bg-amber-500 text-slate-950 font-bold py-2.5 px-6 rounded text-xs active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 uppercase tracking-widest font-sans"
                      >
                        <Check className="h-4 w-4" />
                        বুল্ক পাবলিশ করুন (Publish All)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Manage Resources List */}
          <div className="lg:col-span-7 space-y-6 font-serif">
            <div className="bg-white dark:bg-slate-900 p-6 rounded border border-slate-200 dark:border-slate-805 shadow-sm">
              <h3 className="font-serif font-bold text-lg text-slate-950 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <FolderOpen className="h-5 w-5 text-amber-500" />
                পাবলিশকৃত রিসোর্স তালিকা (Resource Catalogue Management)
              </h3>
              
              <div className="mb-4">
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  These materials are instantly accessible to students on the home page download panel. You can track dynamic download counts and delete stale assets below.
                </p>
              </div>

              {resources.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-600 font-serif italic text-sm">
                  সার্ভারে এখনও কোনো রিসোর্স বা ফাইল আপলোড করা হয়নি। বামপাশের ফর্মটি ব্যবহার করে প্রথম ফাইলটি পাবলিশ করুন।
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-850 rounded">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-850">
                        <th className="px-4 py-3 text-[10px] font-sans font-black uppercase text-slate-400 tracking-wider">রিসোর্স ও ফাইল নাম</th>
                        <th className="px-3 py-3 text-[10px] font-sans font-black uppercase text-slate-400 tracking-wider">ক্যাটাগরি</th>
                        <th className="px-3 py-3 text-[10px] font-sans font-black uppercase text-slate-400 tracking-wider">ডাউনলোড</th>
                        <th className="px-3 py-3 text-[10px] font-sans font-black uppercase text-slate-400 tracking-wider text-right">অপশন</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {[...resources].sort((a: any, b: any) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime()).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                          <td className="px-4 py-3.5">
                            <p className="text-xs font-serif font-bold text-slate-900 dark:text-white leading-snug">
                              {item.title}
                            </p>
                            <span className="text-[9px] font-mono text-slate-400 block mt-0.5 max-w-[240px] truncate">
                              {item.fileName} ({item.fileSize})
                            </span>
                            {item.uploader && (
                              <span className="text-[9px] font-serif text-amber-600 dark:text-amber-500 block mt-0.5">
                                Uploader: {item.uploader}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3.5">
                            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              item.category === "Notes" 
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" 
                                : item.category === "Assignments"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                  : item.category === "Books"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            }`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                            {item.downloadCount}টি
                          </td>
                          <td className="px-3 py-3.5 text-right flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditResourceClick(item)}
                              className="p-1 px-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-705 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1"
                              title="সম্পাদনা করুন"
                            >
                              <Edit3 className="h-3 w-3 text-amber-500" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteResource(item.id, item.title)}
                              className="p-1 px-2.5 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-450 rounded text-[10px] font-bold active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1 border border-rose-200/40 dark:border-rose-900/30"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Elegant Real Modal Overlay Confirmation Dialog */}
      {confirmState?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-inEdge">
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden p-6">
            <div className="flex items-start gap-4">
              <div className="bg-amber-105 bg-amber-100 dark:bg-amber-950/40 p-3 rounded-full text-amber-600 dark:text-amber-400 shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold font-serif text-slate-900 dark:text-white leading-snug">
                  {confirmState.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {confirmState.message}
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6 border-t border-slate-100 dark:border-slate-800/60 pt-4">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-705 dark:text-slate-300 text-xs rounded font-bold cursor-pointer transition-colors border border-slate-300 dark:border-slate-700"
              >
                {confirmState.cancelText || "না, ফিরে যান"}
              </button>
              <button
                type="button"
                onClick={confirmState.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded font-bold cursor-pointer transition-colors border border-rose-600 uppercase tracking-wider"
              >
                {confirmState.confirmText || "হ্যাঁ, মুছে ফেলুন"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
