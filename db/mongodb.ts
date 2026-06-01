import mongoose, { Schema } from "mongoose";
import fs from "fs";
import path from "path";

// 1. Author Sub-schema definition
const AuthorSchema = new Schema({
  name: { type: String, default: "Admin Editor" },
  role: { type: String, default: "Chief Editor" },
  bio: { type: String, default: "" },
  avatar: { type: String, default: "" }
}, { _id: false });

const transformConfig = {
  transform: (doc: any, ret: any) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
};

// 2. Post Schema
const PostSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  excerpt: { type: String, default: "" },
  content: { type: String, required: true },
  category: { type: String, required: true },
  categories: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  featuredImage: { type: String, default: "" },
  author: { type: AuthorSchema, default: {} },
  featured: { type: Schema.Types.Mixed, default: false },
  status: { type: String, default: "draft" },
  views: { type: Number, default: 0 },
  publishDate: { type: String, default: "" }
}, {
  timestamps: true,
  toJSON: transformConfig,
  toObject: transformConfig
});

export const PostModel = mongoose.models.Post || mongoose.model("Post", PostSchema);

// 3. Category Schema
const CategorySchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  englishName: { type: String, required: true },
  description: { type: String, default: "" },
  color: { type: String, default: "" },
  icon: { type: String, default: "" },
  order: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true }
}, {
  toJSON: transformConfig,
  toObject: transformConfig
});

export const CategoryModel = mongoose.models.Category || mongoose.model("Category", CategorySchema);

// 4. Comment Schema
const CommentSchema = new Schema({
  id: { type: String, required: true, unique: true },
  postId: { type: String, required: true },
  authorName: { type: String, required: true },
  authorEmail: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: String, required: true }
}, {
  toJSON: transformConfig,
  toObject: transformConfig
});

export const CommentModel = mongoose.models.Comment || mongoose.model("Comment", CommentSchema);

// 5. Subscriber Schema
const SubscriberSchema = new Schema({
  email: { type: String, required: true, unique: true }
}, {
  toJSON: transformConfig,
  toObject: transformConfig
});

export const SubscriberModel = mongoose.models.Subscriber || mongoose.model("Subscriber", SubscriberSchema);

// 6. Resource Schema
const ResourceSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  category: { type: String, required: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String, default: "" },
  fileSize: { type: String, default: "" },
  fileType: { type: String, default: "" },
  uploadedAt: { type: String, required: true },
  downloadCount: { type: Number, default: 0 },
  uploader: { type: String, default: "" }
}, {
  toJSON: transformConfig,
  toObject: transformConfig
});

export const ResourceModel = mongoose.models.Resource || mongoose.model("Resource", ResourceSchema);

// 7. Notification Schema
const NotificationSchema = new Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, default: "info" },
  isRead: { type: Boolean, default: false },
  createdAt: { type: String, required: true }
}, {
  toJSON: transformConfig,
  toObject: transformConfig
});

export const NotificationModel = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

// 8. SiteConfig Schema
const SiteConfigSchema = new Schema({
  id: { type: String, required: true, unique: true, default: "site-config" },
  siteName: { type: String, default: "অ্যারিথমেটিকা" },
  siteTagline: { type: String, default: "" },
  siteBrandingSymbol: { type: String, default: "অ" },
  headerTitle: { type: String, default: "" },
  headerSubtitle: { type: String, default: "" },
  footerAbout: { type: String, default: "" },
  footerCopyText: { type: String, default: "" },
  socialLinks: {
    facebook: { type: String, default: "" },
    twitter: { type: String, default: "" },
    github: { type: String, default: "" },
    youtube: { type: String, default: "" }
  },
  seoConfig: {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    keywords: { type: String, default: "" }
  },
  typography: { type: String, default: "serif-academic" },
  primaryThemeColor: { type: String, default: "gold" }
}, {
  toJSON: transformConfig,
  toObject: transformConfig
});

export const SiteConfigModel = mongoose.models.SiteConfig || mongoose.model("SiteConfig", SiteConfigSchema);

// 9. AdminAuth Schema
const AdminAuthSchema = new Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }
}, {
  toJSON: transformConfig,
  toObject: transformConfig
});

export const AdminAuthModel = mongoose.models.AdminAuth || mongoose.model("AdminAuth", AdminAuthSchema);

let isConnected = false;
let connectionPromise: Promise<boolean> | null = null;

// Seed defaults helpers
async function seedDefaultConfig() {
  const DEFAULT_CONFIG = {
    id: "site-config",
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

  const count = await SiteConfigModel.countDocuments();
  if (count === 0) {
    console.log("[MONGO SEED] Seeding default SiteConfig...");
    const jsonPath = path.join(process.cwd(), "database", "site-config.json");
    if (fs.existsSync(jsonPath)) {
      try {
        const jsonContent = fs.readFileSync(jsonPath, "utf8");
        const parsed = JSON.parse(jsonContent);
        await new SiteConfigModel({ ...parsed, id: "site-config" }).save();
        console.log("[MONGO SEED] SiteConfig migrated successfully from JSON!");
      } catch (e) {
        await new SiteConfigModel(DEFAULT_CONFIG).save();
      }
    } else {
      await new SiteConfigModel(DEFAULT_CONFIG).save();
    }
  }
}

async function seedDefaultCategories() {
  const DEFAULT_CATEGORIES = [
    {
      id: "cat-science-math",
      name: "বিজ্ঞান ও গণিত",
      englishName: "science-math",
      description: "বিজ্ঞান, মহাজাগতিক রহস্য, যুক্তিবিজ্ঞান এবং গণিত সংক্রান্ত আলোচনা ও প্রবন্ধ সমুহ।",
      color: "#F59E0B",
      icon: "Globe",
      order: 1,
      enabled: true
    },
    {
      id: "cat-philosophy-society",
      name: "দর্শন ও সমাজ",
      englishName: "philosophy-society",
      description: "সমাজ বিনির্মাণ, চিন্তাধারা, মনস্তাত্ত্বিক আলোচনা ও প্রাচীন-আধুনিক দর্শন নিয়ে বিশ্লেষণাত্মক নিবন্ধ।",
      color: "#3B82F6",
      icon: "Sparkles",
      order: 2,
      enabled: true
    },
    {
      id: "cat-history-culture",
      name: "ইতিহাস ও সংস্কৃতি",
      englishName: "history-culture",
      description: "ইতিহাসের হারিয়ে যাওয়া পাতা, সভ্যতা ও সংস্কৃতির বহুমাত্রিক দিক নিয়ে দীর্ঘ গবেষণা ও প্রবন্ধ।",
      color: "#10B981",
      icon: "BookOpen",
      order: 3,
      enabled: true
    }
  ];

  const count = await CategoryModel.countDocuments();
  if (count === 0) {
    console.log("[MONGO SEED] Seeding default Categories...");
    const jsonPath = path.join(process.cwd(), "database", "categories.json");
    if (fs.existsSync(jsonPath)) {
      try {
        const jsonContent = fs.readFileSync(jsonPath, "utf8");
        const parsed = JSON.parse(jsonContent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          await CategoryModel.insertMany(parsed);
          console.log("[MONGO SEED] Categories migrated successfully from JSON!");
          return;
        }
      } catch (e) {
        // Fallback
      }
    }
    await CategoryModel.insertMany(DEFAULT_CATEGORIES);
  }
}

async function seedDefaultResources() {
  const mockResources = [
    {
      id: "res-quantum",
      title: "উচ্চতর কোয়ান্টাম বলবিদ্যা নোট (Quantum Mechanics Lecture Notes)",
      description: "অ্যারিথমেটিকা বিজ্ঞান ও পদার্থবিজ্ঞান বিভাগের জন্য তৈরি করা কোয়ান্টাম বলবিদ্যার উপর একটি সচিত্র লেকচার শিট। এতে শ্রোডিঙ্গার সমীকরণ এবং হাইজেনবার্গের অনিশ্চয়তা নীতি বিস্তারিত আলোচনা করা হয়েছে।",
      category: "Notes",
      fileUrl: "/uploads/quantum-mechanics-notes.pdf",
      fileName: "Quantum_Mechanics_Notes.pdf",
      fileSize: "1.8 MB",
      fileType: "pdf",
      uploadedAt: "2026-05-15T10:00:00.000Z",
      downloadCount: 42,
      uploader: "Arithmetica Admin"
    },
    {
      id: "res-logic",
      title: "গাণিতিক যুক্তিবিজ্ঞান ও সেট তত্ত্ব নিয়ে মৌলিক নির্দেশিকা (Intro to Math Logic Book)",
      description: "যুক্তিশাস্ত্র ও সেট তত্ত্বের গাণিতিক অবতারণার সংকলন। এতে রয়েছে আরোহী ও অবরোহী যুক্তিপ্রণালীর সুবিন্যস্ত বাংলা চার্ট ও ব্যাখ্যা।",
      category: "Books",
      fileUrl: "/uploads/intro-mathematical-logic.pdf",
      fileName: "Mathematical_Logic_Intro.pdf",
      fileSize: "3.4 MB",
      fileType: "pdf",
      uploadedAt: "2026-05-20T12:30:00.000Z",
      downloadCount: 89,
      uploader: "Arithmetica Admin"
    },
    {
      id: "res-algebra",
      title: "বীজগণিতের লিনিয়ার ট্রান্সফরমেশন অ্যাসাইনমেন্ট সমাধান (Linear Algebra Solved)",
      description: "অনার্স প্রথম বর্ষের লিনিয়ার অ্যালজেব্রা কোর্সের হোমওয়ার্ক ও গুরুত্বপূর্ণ কিছু গাণিতিক সমস্যার সমাধানপত্র।",
      category: "Assignments",
      fileUrl: "/uploads/linear-algebra-solved.pdf",
      fileName: "Linear_Algebra_Solved_Assignment.pdf",
      fileSize: "920 KB",
      fileType: "pdf",
      uploadedAt: "2026-05-24T15:45:00.000Z",
      downloadCount: 154,
      uploader: "Arithmetica Admin"
    },
    {
      id: "res-pi-chart",
      title: "পাই তত্ত্বের ঐতিহাসিক বিবর্তনের চার্টচিত্র (Pi Historical Evolution Chart)",
      description: "আর্কিমিডিস থেকে রামানুজন পর্যন্ত পাই (π) এর মান নির্ণয়ের ঐতিহাসিক ইতিহাসের চার্টচিত্র ও মানসূচী।",
      category: "Other",
      fileUrl: "/uploads/pi-history-evolution.png",
      fileName: "Pi_History_Evolution.png",
      fileSize: "1.2 MB",
      fileType: "png",
      uploadedAt: "2026-05-28T18:10:00.000Z",
      downloadCount: 201,
      uploader: "Arithmetica Admin"
    }
  ];

  const count = await ResourceModel.countDocuments();
  if (count === 0) {
    console.log("[MONGO SEED] Seeding default Resources...");
    const jsonPath = path.join(process.cwd(), "database", "resources.json");
    if (fs.existsSync(jsonPath)) {
      try {
        const jsonContent = fs.readFileSync(jsonPath, "utf8");
        const parsed = JSON.parse(jsonContent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          await ResourceModel.insertMany(parsed);
          console.log("[MONGO SEED] Resources migrated successfully from JSON!");
          return;
        }
      } catch (e) {
        // Fallback
      }
    }
    await ResourceModel.insertMany(mockResources);
  }
}

async function migrateRemainingJSONs() {
  // Migrate Comments
  try {
    const commentCount = await CommentModel.countDocuments();
    if (commentCount === 0) {
      const jsonPath = path.join(process.cwd(), "database", "comments.json");
      if (fs.existsSync(jsonPath)) {
        const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        if (Array.isArray(parsed) && parsed.length > 0) {
          await CommentModel.insertMany(parsed);
          console.log("[MONGO SEED] Comments migrated successfully from JSON!");
        }
      }
    }
  } catch (e) {
    console.error("Error migrating comments:", e);
  }

  // Migrate Subscribers
  try {
    const subscriberCount = await SubscriberModel.countDocuments();
    if (subscriberCount === 0) {
      const jsonPath = path.join(process.cwd(), "database", "subscribers.json");
      if (fs.existsSync(jsonPath)) {
        const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        if (Array.isArray(parsed) && parsed.length > 0) {
          const docs = parsed.map((email: string) => ({ email }));
          await SubscriberModel.insertMany(docs);
          console.log("[MONGO SEED] Subscribers migrated successfully from JSON!");
        }
      }
    }
  } catch (e) {
    console.error("Error migrating subscribers:", e);
  }

  // Migrate Notifications
  try {
    const notificationCount = await NotificationModel.countDocuments();
    if (notificationCount === 0) {
      const jsonPath = path.join(process.cwd(), "database", "notifications.json");
      if (fs.existsSync(jsonPath)) {
        const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        if (Array.isArray(parsed) && parsed.length > 0) {
          await NotificationModel.insertMany(parsed);
          console.log("[MONGO SEED] Notifications migrated successfully from JSON!");
        }
      }
    }
  } catch (e) {
    console.error("Error migrating notifications:", e);
  }

  // Migrate AdminAuth
  try {
    const authCount = await AdminAuthModel.countDocuments();
    if (authCount === 0) {
      let jsonPath = path.join(process.cwd(), "database", "admin-auth.json");
      if (!fs.existsSync(jsonPath)) {
        jsonPath = path.join(process.cwd(), "database", "Admin-auth.json");
      }
      if (fs.existsSync(jsonPath)) {
        const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        if (parsed) {
          const u = parsed.username || parsed.Username;
          const p = parsed.passwordHash || parsed.PasswordHash;
          if (u && p) {
            await AdminAuthModel.create({ username: u, passwordHash: p });
            console.log("[MONGO SEED] Admin authentication credentials migrated successfully from JSON!");
          }
        }
      }
    }
  } catch (e) {
    console.error("Error migrating admin authentication:", e);
  }
}

// 4. Migrate existing posts from backup posts.json to MongoDB if collection is currently empty
export async function syncJSONPostsToMongo() {
  try {
    const postsCount = await PostModel.countDocuments();
    if (postsCount === 0) {
      console.log("[MONGO SYNC] MongoDB posts collection is empty. Checking JSON files...");
      const jsonPath = path.join(process.cwd(), "database", "posts.json");
      if (fs.existsSync(jsonPath)) {
        const jsonContent = fs.readFileSync(jsonPath, "utf8");
        const posts = JSON.parse(jsonContent);
        if (Array.isArray(posts) && posts.length > 0) {
          console.log(`[MONGO SYNC] Found ${posts.length} posts in JSON backup. Migrating to MongoDB...`);
          await PostModel.insertMany(posts);
          console.log("[MONGO SYNC] Successfully migrated all posts from JSON to MongoDB!");
        }
      }
    }
  } catch (error) {
    console.error("[MONGO SYNC] Error migrating posts from JSON to MongoDB:", error);
  }
}

// 5. Establish connection helper to MongoDB
export async function connectDB() {
  if (isConnected) return true;
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    isConnected = true;
    return true;
  }
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    mongoose.set("bufferCommands", false);

    const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MONGO_URI || "mongodb://localhost:27017/arithmetica";

    try {
      console.log(`[MONGODB] Attempting to connect to database...`);
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
      console.log(`[MONGODB] Connected successfully to MongoDB!`);
      
      // Automatically migrate JSON backup if needed
      await syncJSONPostsToMongo();
      await seedDefaultConfig();
      await seedDefaultCategories();
      await seedDefaultResources();
      await migrateRemainingJSONs();
      return true;
    } catch (err: any) {
      console.error(`[MONGODB] Connection failed: ${err.message || err}`);
      connectionPromise = null; // Reset pointer for retries
      return false;
    }
  })();

  return connectionPromise;
}
