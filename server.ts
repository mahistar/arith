import express from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import multer from "multer";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import {
  connectDB,
  PostModel,
  CategoryModel,
  CommentModel,
  SubscriberModel,
  ResourceModel,
  NotificationModel,
  SiteConfigModel,
  AdminAuthModel
} from "./db/mongodb.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Ensure uploads folder exists and is statically served
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOADS_DIR));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Define JSON database backup paths
const DATABASE_DIR = path.join(process.cwd(), "database");
const POSTS_FILE = path.join(DATABASE_DIR, "posts.json");
const CATEGORIES_FILE = path.join(DATABASE_DIR, "categories.json");
const RESOURCES_FILE = path.join(DATABASE_DIR, "resources.json");
const COMMENTS_FILE = path.join(DATABASE_DIR, "comments.json");
const SUBSCRIBERS_FILE = path.join(DATABASE_DIR, "subscribers.json");
const NOTIFICATIONS_FILE = path.join(DATABASE_DIR, "notifications.json");
const CONFIG_FILE = path.join(DATABASE_DIR, "site-config.json");
function getAuthFilePath(): string {
  const adminPath = path.join(DATABASE_DIR, "Admin-auth.json");
  if (fs.existsSync(adminPath)) {
    return adminPath;
  }
  return path.join(DATABASE_DIR, "admin-auth.json");
}

function readJSON(filePath: string, fallback: any = []): any {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`[HYBRID DB] Error reading JSON from ${filePath}:`, err);
  }
  return fallback;
}

function writeJSON(filePath: string, data: any) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error(`[HYBRID DB] Error writing JSON to ${filePath}:`, err);
  }
}

// One-time manual or startup database synchronization from JSON backup files to MongoDB
// This is critical because if MongoDB was recently reset or is empty, we must restore the content from local JSON files.
async function syncDatabaseFromJSONBackups() {
  try {
    console.log("[HYBRID DB] Checking if database needs restoration from JSON backups...");
    
    // Restore Posts
    const postCount = await PostModel.countDocuments();
    if (postCount === 0 && fs.existsSync(POSTS_FILE)) {
      const jsonPosts = readJSON(POSTS_FILE);
      if (Array.isArray(jsonPosts) && jsonPosts.length > 0) {
        console.log(`[HYBRID DB] Restoring ${jsonPosts.length} posts from JSON backup to MongoDB...`);
        await PostModel.insertMany(jsonPosts);
      }
    }

    // Restore Categories
    const categoryCount = await CategoryModel.countDocuments();
    if (categoryCount === 0 && fs.existsSync(CATEGORIES_FILE)) {
      const jsonCategories = readJSON(CATEGORIES_FILE);
      if (Array.isArray(jsonCategories) && jsonCategories.length > 0) {
        console.log(`[HYBRID DB] Restoring ${jsonCategories.length} categories from JSON backup to MongoDB...`);
        await CategoryModel.insertMany(jsonCategories);
      }
    }

    // Restore Resources
    const resourceCount = await ResourceModel.countDocuments();
    if (resourceCount === 0 && fs.existsSync(RESOURCES_FILE)) {
      const jsonResources = readJSON(RESOURCES_FILE);
      if (Array.isArray(jsonResources) && jsonResources.length > 0) {
        console.log(`[HYBRID DB] Restoring ${jsonResources.length} resources from JSON backup to MongoDB...`);
        await ResourceModel.insertMany(jsonResources);
      }
    }

    // Restore Comments
    const commentCount = await CommentModel.countDocuments();
    if (commentCount === 0 && fs.existsSync(COMMENTS_FILE)) {
      const jsonComments = readJSON(COMMENTS_FILE);
      if (Array.isArray(jsonComments) && jsonComments.length > 0) {
        console.log(`[HYBRID DB] Restoring ${jsonComments.length} comments from JSON backup to MongoDB...`);
        await CommentModel.insertMany(jsonComments);
      }
    }

    // Restore Subscribers
    const subscriberCount = await SubscriberModel.countDocuments();
    if (subscriberCount === 0 && fs.existsSync(SUBSCRIBERS_FILE)) {
      const jsonSubscribers = readJSON(SUBSCRIBERS_FILE);
      if (Array.isArray(jsonSubscribers) && jsonSubscribers.length > 0) {
        console.log(`[HYBRID DB] Restoring ${jsonSubscribers.length} subscribers from JSON backup to MongoDB...`);
        const docs = jsonSubscribers.map((email: string) => ({ email }));
        await SubscriberModel.insertMany(docs);
      }
    }

    // Restore Site Config
    const configCount = await SiteConfigModel.countDocuments();
    if (configCount === 0 && fs.existsSync(CONFIG_FILE)) {
      const jsonConfig = readJSON(CONFIG_FILE);
      if (jsonConfig && jsonConfig.siteName) {
        console.log(`[HYBRID DB] Restoring Site Config from JSON backup to MongoDB...`);
        await new SiteConfigModel({ ...jsonConfig, id: "site-config" }).save();
      }
    }
    
    console.log("[HYBRID DB] Synchronization check complete.");
  } catch (error) {
    console.error("[HYBRID DB] Error during backup sync to MongoDB:", error);
  }
}

// Security Configurations
const JWT_SECRET = process.env.JWT_SECRET || "arithmetica_super_secured_secret_key_2026_987453";

function isMongoConnected(): boolean {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

async function comparePasswords(plain: string, hashOrPlain: string): Promise<boolean> {
  if (typeof hashOrPlain !== "string") return false;

  const isHash = hashOrPlain.startsWith("$2a$") || hashOrPlain.startsWith("$2b$") || hashOrPlain.startsWith("$2y$");
  if (isHash) {
    try {
      return await bcrypt.compare(plain, hashOrPlain);
    } catch (e) {
      console.error("[AUTH] Bcrypt async comparison failed:", e);
      return false;
    }
  }

  // Fallback to strict plain-text direct matching if not a bcrypt hash
  return plain === hashOrPlain;
}

async function getAdminCredentials() {
  const envUsername = process.env.ADMIN_USERNAME || process.env.ADMIN_USER;
  const envPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS;

  if (envUsername && envPassword) {
    return {
      username: envUsername,
      passwordHash: bcrypt.hashSync(envPassword, 10),
      isFromEnv: true
    };
  }

  try {
    const authPath = getAuthFilePath();
    const backupAuth = readJSON(authPath, null);

    if (backupAuth) {
      const u = backupAuth.username || backupAuth.Username || backupAuth.user || backupAuth.User;
      const p = backupAuth.passwordHash || backupAuth.PasswordHash || backupAuth.password || backupAuth.Password;
      if (u && p) {
        return {
          username: u,
          passwordHash: p
        };
      }
    }
    
    if (isMongoConnected()) {
      const creds = await AdminAuthModel.findOne();
      if (creds) {
        const obj = creds.toObject();
        writeJSON(authPath, obj);
        const u = obj.username || obj.Username || "admin";
        const p = obj.passwordHash || obj.PasswordHash;
        return {
          username: u,
          passwordHash: p
        };
      }
    }
  } catch (e) {
    console.error("[LOCAL AUTH] Failed checking MongoDB for admin credentials:", e);
  }
  
  return {
    username: "admin",
    passwordHash: bcrypt.hashSync("admin", 10)
  };
}

// Establish direct MongoDB connection and restore database from local backups if empty
connectDB().then(() => {
  syncDatabaseFromJSONBackups().catch(console.error);
}).catch(console.error);

// Non-blocking background backup functions (for backward compatibility)
async function backupPosts() {}
async function backupCategories() {}
async function backupResources() {}
async function backupComments() {}

// 1. Fetch all posts via JSON (Local-First)
async function getAllPosts(): Promise<any[]> {
  try {
    const posts = readJSON(POSTS_FILE, []);
    
    if (isMongoConnected()) {
      PostModel.countDocuments().then(async (mCount) => {
        if (mCount !== posts.length) {
          console.log(`[MONGO SYNC] Local posts count (${posts.length}) != MongoDB count (${mCount}). Syncing...`);
          await PostModel.deleteMany({});
          if (posts.length > 0) {
            await PostModel.insertMany(posts);
          }
        }
      }).catch(err => console.error("[MONGO SYNC ERROR] Failed syncing posts:", err));
    }
    
    return posts;
  } catch (err: any) {
    console.error("[LOCAL db] Error fetching posts:", err);
    return [];
  }
}

// 2. Fetch specific post via JSON (Local-First)
async function getPostById(id: string): Promise<any | null> {
  const posts = readJSON(POSTS_FILE, []);
  const post = posts.find((p: any) => p.id === id);
  return post || null;
}

// 3. Create post (Local-First)
async function createPost(postData: any): Promise<any> {
  const posts = readJSON(POSTS_FILE, []);
  posts.unshift(postData);
  writeJSON(POSTS_FILE, posts);

  if (isMongoConnected()) {
    new PostModel(postData).save().catch(err => console.error("[MONGO SYNC] Failed to create post:", err));
  }
  return postData;
}

// 4. Update post (Local-First)
async function updatePost(id: string, updateData: any): Promise<any | null> {
  const posts = readJSON(POSTS_FILE, []);
  const index = posts.findIndex((p: any) => p.id === id);
  if (index === -1) return null;

  const updated = { ...posts[index], ...updateData };
  posts[index] = updated;
  writeJSON(POSTS_FILE, posts);

  if (isMongoConnected()) {
    PostModel.findOneAndUpdate({ id } as any, { $set: updateData }, { new: true } as any)
      .catch(err => console.error("[MONGO SYNC] Failed to update post:", err));
  }
  return updated;
}

// 5. Delete post (Local-First)
async function deletePostById(id: string): Promise<boolean> {
  const posts = readJSON(POSTS_FILE, []);
  const filtered = posts.filter((p: any) => p.id !== id);
  const deleted = posts.length !== filtered.length;
  if (deleted) {
    writeJSON(POSTS_FILE, filtered);
    
    if (isMongoConnected()) {
      PostModel.findOneAndDelete({ id } as any)
        .catch(err => console.error("[MONGO SYNC] Failed to delete post:", err));
    }
  }
  return deleted;
}

// 6. Increment view counter (Local-First)
async function incrementPostViews(id: string): Promise<number | null> {
  const posts = readJSON(POSTS_FILE, []);
  const index = posts.findIndex((p: any) => p.id === id);
  if (index === -1) return null;

  posts[index].views = (posts[index].views || 0) + 1;
  writeJSON(POSTS_FILE, posts);

  if (isMongoConnected()) {
    PostModel.findOneAndUpdate({ id } as any, { $inc: { views: 1 } }, { new: true } as any)
      .catch(err => console.error("[MONGO SYNC] Failed to increment views:", err));
  }
  return posts[index].views;
}

// Global variable or constant for app environment URL fallback
const BASE_APP_URL = "https://ais-dev-kh6mwlmue4vxpzaglxzghg-594005008537.asia-southeast1.run.app";

async function notifySubscribers(post: any) {
  // Only notify if post is published
  if (post.status !== "published") {
    return;
  }

  const subscribersDocs = await SubscriberModel.find();
  const subscribers = subscribersDocs.map((s: any) => s.email);
  if (!Array.isArray(subscribers) || subscribers.length === 0) {
    console.log("[EMAIL DISPATCH] No subscribers found. Skipping email notification.");
    return;
  }

  const siteConfig = await SiteConfigModel.findOne({ id: "site-config" } as any);
  const siteName = siteConfig?.siteName || "Arithmetica";
  
  // Clean, modern aesthetic email template
  const subject = `[${siteName}] নতুন নিবন্ধ প্রকাশিত: "${post.title}"`;
  const appUrl = (process.env.APP_URL || BASE_APP_URL).replace(/\/$/, "");
  const postUrl = `${appUrl}/?view=article&id=${post.id}`;
  
  const textContent = `অ্যারিথমেটিকায় নতুন একটি প্রবন্ধ প্রকাশিত হয়েছে।\n\nশিরোনাম: ${post.title}\nবিভাগ: ${post.category}\n\nসংক্ষিপ্ত বিবরণ: ${post.excerpt}\n\nসম্পূর্ণ প্রবন্ধটি পড়তে নিচের লিংকে ক্লিক করুন:\n${postUrl}\n\nধন্যবাদ,\n${siteName} মুক্তমঞ্চ`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1e293b; line-height: 1.6;">
      <div style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="color: #0f172a; margin: 0; font-size: 26px; font-weight: 800; tracking-wide">${siteName}</h1>
        <p style="color: #ea580c; margin: 5px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase;">জ্ঞান ও যুক্তির মুক্তমঞ্চ</p>
      </div>
      
      <div style="margin-bottom: 24px;">
        <span style="background-color: #fef3c7; color: #d97706; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; display: inline-block;">
          ${post.category}
        </span>
        
        <h2 style="color: #0f172a; margin: 16px 0 12px 0; font-size: 22px; font-weight: 800; line-height: 1.35;">
          ${post.title}
        </h2>
        
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px; font-style: italic;">
          "${post.excerpt}"
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${postUrl}" style="background-color: #020617; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: 700; border-radius: 4px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            সম্পূর্ণ নিবন্ধটি পড়ুন
          </a>
        </div>
      </div>
      
      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6;">
        <p style="margin: 0 0 8px 0;">আপনি এই মেইলটি পেয়েছেন কারণ আপনি <strong>${siteName}</strong>-এর নতুন কার্যক্রম ও প্রবন্ধ পেতে সাবস্ক্রাইব করেছিলেন।</p>
        <p style="margin: 0; font-weight: bold;">© ২০২৬ অ্যারিথমেটিকা মুক্তমঞ্চ • সর্বস্বত্ব সংরক্ষিত</p>
      </div>
    </div>
  `;

  const resendApiKey = process.env.RESEND_API_KEY || "re_QJk7pppQ_LGAvhuyiNorcjXnateGAYLjN";
  const resendFrom = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  let status = "failed";
  let errorMsg = null;
  const deliveryMethod = "Resend API";

  if (!resendApiKey) {
    status = "failed";
    errorMsg = "RESEND_API_KEY is not defined. Please verify your environment configurations.";
    console.error(`[EMAIL DISPATCH] Error: ${errorMsg}`);
  } else {
    console.log(`[EMAIL DISPATCH] Running email dispatch via Resend API to ${subscribers.length} subscriber(s)...`);
    
    const deliveryResults = await Promise.all(
      subscribers.map(async (subscriber) => {
        try {
          console.log(`[EMAIL DISPATCH] Sending to subscriber: ${subscriber}`);
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: resendFrom.includes("<") ? resendFrom : `"${siteName}" <${resendFrom}>`,
              to: subscriber,
              subject: subject,
              text: textContent,
              html: htmlContent,
            }),
          });

          const responseData: any = await response.json();
          if (response.ok) {
            console.log(`[EMAIL DISPATCH] Success! Resend ID for ${subscriber}: ${responseData.id || "N/A"}`);
            return { email: subscriber, success: true, id: responseData.id };
          } else {
            const apiError = responseData.message || JSON.stringify(responseData);
            console.error(`[EMAIL DISPATCH] Resend API error ${response.status} for address ${subscriber}:`, responseData);
            return { email: subscriber, success: false, error: apiError };
          }
        } catch (err: any) {
          const fetchError = err.message || JSON.stringify(err);
          console.error(`[EMAIL DISPATCH] Exception sending email to ${subscriber} using Resend:`, err);
          return { email: subscriber, success: false, error: fetchError };
        }
      })
    );

    const failures = deliveryResults.filter(r => !r.success);
    if (failures.length === 0) {
      status = "success";
      console.log(`[EMAIL DISPATCH] Successfully completed Resend delivery to all ${subscribers.length} subscribers.`);
    } else if (failures.length === deliveryResults.length) {
      status = "failed";
      errorMsg = `All deliveries failed: ${failures.map(f => `${f.email}: ${f.error}`).join("; ")}`;
      console.error(`[EMAIL DISPATCH] Critical: ${errorMsg}`);
    } else {
      status = "success"; // partially successful, so we mark as success but log error
      errorMsg = `Deliveries completed with some errors: ${failures.map(f => `${f.email}: ${f.error}`).join("; ")}`;
      console.warn(`[EMAIL DISPATCH] Warning: ${errorMsg}`);
    }
  }

  // Save trace log in NotificationModel in MongoDB for the Admin panel to query
  try {
    const newNotification = {
      id: `notif-${Date.now()}`,
      postId: post.id,
      postTitle: post.title,
      dateSent: new Date().toISOString(),
      recipientsCount: subscribers.length,
      status: status,
      deliveryMethod: deliveryMethod,
      error: errorMsg,
      recipients: subscribers
    };

    await NotificationModel.create(newNotification);
    console.log(`[EMAIL DISPATCH] Saved dispatch trace to MongoDB notification collection for post: "${post.title}"`);
  } catch (logErr) {
    console.error("Failed writing dispatch logging trace directly inside MongoDB notification collection:", logErr);
  }
}

// Security Guard Middleware (Admin authorization verification)
const authenticateAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "অনুমতিবিহীন প্রবেশাধিকার! (Authorization header missing)" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string };
    const envUsername = process.env.ADMIN_USERNAME || process.env.ADMIN_USER;
    const creds = await getAdminCredentials();
    const currentAdminUsername = envUsername || creds.username;
    
    if (decoded && decoded.username === currentAdminUsername) {
      next();
    } else {
      res.status(403).json({ error: "এই পাতায় প্রবেশের জন্য আপনার যথাযথ অনুমতি নেই।" });
    }
  } catch (err) {
    res.status(401).json({ error: "মেয়াদোত্তীর্ণ বা অবৈধ নিরাপত্তা টোকেন। দয়া করে আবার লগইন করুন।" });
  }
};

// --- AUTHENTICATION API ---
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "দয়া করে ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন।" });
  }

  const envUsername = process.env.ADMIN_USERNAME || process.env.ADMIN_USER;
  const envPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS;

  let isValid = false;

  // Prioritize checking environment variables directly
  if (envUsername && envPassword) {
    if (username === envUsername && password === envPassword) {
      isValid = true;
    }
  }

  // Fallback to local files or database credentials
  if (!isValid) {
    const creds = await getAdminCredentials();
    if (username === creds.username && await comparePasswords(password, creds.passwordHash)) {
      isValid = true;
    }
  }

  if (isValid) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "24h" });
    return res.json({ token, username });
  }

  return res.status(401).json({ error: "ভুল ইউজারনেম অথবা পাসওয়ার্ড! পুনরায় চেষ্টা করুন।" });
});

// Used to check if currently stored client token is valid
app.get("/api/auth/verify", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.json({ valid: false });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string };
    const envUsername = process.env.ADMIN_USERNAME || process.env.ADMIN_USER;
    const creds = await getAdminCredentials();
    const currentAdminUsername = envUsername || creds.username;
    
    if (decoded && decoded.username === currentAdminUsername) {
      return res.json({ valid: true, username: decoded.username });
    }
    return res.json({ valid: false });
  } catch {
    return res.json({ valid: false });
  }
});

// Update Admin Username and Password (secure settings section)
app.post("/api/auth/update-credentials", authenticateAdmin, async (req, res) => {
  const { currentPassword, newUsername, newPassword } = req.body;

  if (!currentPassword) {
    return res.status(400).json({ error: "নিরাপত্তার উদ্দেশ্যে আপনার বর্তমান পাসওয়ার্ড প্রদান করা আবশ্যক।" });
  }

  const creds = await getAdminCredentials();

  // Verify current password is correct
  if (!await comparePasswords(currentPassword, creds.passwordHash)) {
    return res.status(401).json({ error: "বর্তমান পাসওয়ার্ডটি সঠিক নয়! পুনরায় চেষ্টা করুন।" });
  }

  let updated = false;
  if (newUsername && newUsername.trim()) {
    creds.username = newUsername.trim();
    updated = true;
  }
  if (newPassword && newPassword.trim()) {
    if (newPassword.trim().length < 4) {
      return res.status(400).json({ error: "নতুন পাসওয়ার্ডটি অত্যন্ত ছোট! কমপক্ষে ৪ অক্ষরের পাসওয়ার্ড ব্যবহার করুন।" });
    }
    creds.passwordHash = bcrypt.hashSync(newPassword.trim(), 10);
    updated = true;
  }

  if (updated) {
    await AdminAuthModel.findOneAndUpdate(
      {} as any,
      { $set: { username: creds.username, passwordHash: creds.passwordHash } },
      { upsert: true, new: true } as any
    );
    writeJSON(getAuthFilePath(), { username: creds.username, passwordHash: creds.passwordHash });
    return res.json({ success: true, message: "অ্যাডমিন ক্রেডেনশিয়ালস সফলভাবে পরিবর্তন করা হয়েছে।" });
  }

  return res.status(400).json({ error: "কোনো নতুন ইউজারনেম বা পাসওয়ার্ড প্রদান করা হয়নি।" });
});

// --- POSTS API ---
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await getAllPosts();
    res.json(posts);
  } catch (error: any) {
    console.error("Failed to fetch posts:", error);
    res.status(500).json({ error: "ফাইল বা ডাটাবেজ থেকে পোস্ট লোড করতে সমস্যা হয়েছে।" });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const query = (req.query.q as string || "").trim().toLowerCase();
    if (!query) {
      return res.json([]);
    }

    const posts = await getAllPosts();
    const publicPosts = posts.filter((post: any) => 
      post.status === "published" || !post.status || post.status === ""
    );

    const results = publicPosts.filter((post: any) => {
      const titleMatch = post.title?.toLowerCase().includes(query);
      const excerptMatch = post.excerpt?.toLowerCase().includes(query);
      const contentMatch = post.content?.toLowerCase().includes(query);
      const tagMatch = Array.isArray(post.tags) && post.tags.some((tag: string) => tag?.toLowerCase().includes(query));
      const categoryMatch = post.category?.toLowerCase().includes(query);

      return titleMatch || excerptMatch || contentMatch || tagMatch || categoryMatch;
    });

    res.json(results.slice(0, 20));
  } catch (error: any) {
    console.error("Failed in search API:", error);
    res.status(500).json({ error: "সার্চ করার সময়ে সার্ভারে একটি অভ্যন্তরীণ ত্রুটি তৈরি হয়েছে।" });
  }
});

app.post("/api/posts", authenticateAdmin, async (req, res) => {
  try {
    const id = req.body.id || `post-${Date.now()}`;
    const views = req.body.views || 0;
    const publishDate = req.body.publishDate || new Date().toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    const newPostData = {
      ...req.body,
      id,
      views,
      publishDate
    };

    const newPost = await createPost(newPostData);

    // Save local JSON backup
    await backupPosts();

    // Trigger subscriber notifications asynchronously if published
    if (newPost && newPost.status === "published") {
      notifySubscribers(newPost).catch((err) => {
        console.error("Async subscriber notification error:", err);
      });
    }

    res.status(201).json(newPost);
  } catch (error: any) {
    console.error("Failed to create post:", error);
    res.status(500).json({ error: "নতুন নিবন্ধটি ডাটাবেজে সংরক্ষণ করতে সমস্যা হয়েছে।" });
  }
});

app.put("/api/posts/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const oldPost = await getPostById(id);

    if (!oldPost) {
      return res.status(404).json({ error: "নিবন্ধটি খুঁজে পাওয়া যায়নি।" });
    }

    const updateData = {
      ...req.body,
      id // safeguard ID overwrite
    };

    const updatedPost = await updatePost(id, updateData);

    if (!updatedPost) {
      return res.status(404).json({ error: "নিবন্ধটি আপডেট করা যায়নি।" });
    }

    // Save local JSON backup
    await backupPosts();

    // Trigger subscriber notifications asynchronously if transitioned from draft to published
    if (updatedPost.status === "published" && oldPost.status !== "published") {
      notifySubscribers(updatedPost).catch((err) => {
        console.error("Async subscriber notification error during update:", err);
      });
    }

    res.json(updatedPost);
  } catch (error: any) {
    console.error("Failed to update post:", error);
    res.status(500).json({ error: "নিবন্ধটি আপডেট করতে অভ্যন্তরীণ সার্ভার ত্রুটি তৈরি হয়েছে।" });
  }
});

app.delete("/api/posts/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[DELETE POST] Request received to delete post ID: ${id}`);
    
    const success = await deletePostById(id);

    if (!success) {
      console.warn(`[DELETE POST] Post with ID ${id} not found in database.`);
      return res.status(404).json({ error: "নিবন্ধটি খুঁজে পাওয়া যায়নি।" });
    }

    // Save local JSON backup for posts
    await backupPosts();

    // Database fix: Clean up comments associated with this post ID in MongoDB
    try {
      const deleteResult = await CommentModel.deleteMany({ postId: id } as any);
      if (deleteResult.deletedCount && deleteResult.deletedCount > 0) {
        console.log(`[DELETE POST] Found and removing ${deleteResult.deletedCount} related comments for post ID: ${id}`);
        // Save local JSON backup for comments
        await backupComments();
      }
    } catch (commentErr) {
      console.error(`[DELETE POST] Error cleaning up comments for post ID ${id}:`, commentErr);
    }

    console.log(`[DELETE POST] Successfully deleted post ID: ${id} from MongoDB database and local backup.`);
    res.json({ success: true, message: "নিবন্ধটি সম্পূর্ণ মুছে ফেলা হয়েছে।" });
  } catch (error: any) {
    console.error("Failed to delete post from MongoDB database:", error);
    res.status(500).json({ error: "নিবন্ধটি ডাটাবেজ থেকে মুছতে অভ্যন্তরীণ ত্রুটি তৈরি হয়েছে।" });
  }
});

// Increment post view (accessible without admin auth, excludes admin views)
app.post("/api/posts/:id/view", async (req, res) => {
  try {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    let isAdmin = false;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { username: string };
        const envUsername = process.env.ADMIN_USERNAME || process.env.ADMIN_USER;
        const creds = await getAdminCredentials();
        const currentAdminUsername = envUsername || creds.username;
        if (decoded && decoded.username === currentAdminUsername) {
          isAdmin = true;
        }
      } catch {
        // Ignore token validation error, treat as guest visitor
      }
    }

    if (!isAdmin) {
      const updatedViewsCount = await incrementPostViews(id);
      if (updatedViewsCount !== null) {
        // Update views in JSON backup
        await backupPosts();
        return res.json({ success: true, views: updatedViewsCount });
      }
    } else {
      const post = await getPostById(id);
      if (post) {
        return res.json({ success: true, views: post.views });
      }
    }

    res.status(404).json({ error: "নিবন্ধটি পাওয়া যায়নি।" });
  } catch (error: any) {
    console.error("Failed to increment views under hybrid database:", error);
    res.status(500).json({ error: "পঠন সংখ্যা যুক্ত করার সময় ডাটাবেজ ত্রুটি তৈরি হয়েছে।" });
  }
});

// --- CATEGORIES API ---
app.get("/api/categories", async (req, res) => {
  try {
    const categories = readJSON(CATEGORIES_FILE, []);
    
    // Non-blocking sync check
    if (isMongoConnected()) {
      CategoryModel.countDocuments().then(async (mCount) => {
        if (mCount !== categories.length) {
          console.log(`[MONGO SYNC] Syncing categories. Local: ${categories.length}, Mongo: ${mCount}`);
          await CategoryModel.deleteMany({});
          if (categories.length > 0) {
            await CategoryModel.insertMany(categories);
          }
        }
      }).catch(err => console.error("[MONGO SYNC] Failed to sync Categories:", err));
    }
    
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ error: "বিভাগ লোড করতে সমস্যা হয়েছে।" });
  }
});

app.post("/api/categories", authenticateAdmin, async (req, res) => {
  try {
    const categories = readJSON(CATEGORIES_FILE, []);
    const newCat = {
      ...req.body,
      id: req.body.id || `cat-${Date.now()}`
    };
    categories.push(newCat);
    writeJSON(CATEGORIES_FILE, categories);
    
    if (isMongoConnected()) {
      new CategoryModel(newCat).save().catch(err => console.error("[MONGO SYNC] Failed to create Category:", err));
    }
    
    res.status(201).json(newCat);
  } catch (err: any) {
    res.status(500).json({ error: "নতুন বিভাগ তৈরি করতে সমস্যা হয়েছে।" });
  }
});

app.put("/api/categories/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const categories = readJSON(CATEGORIES_FILE, []);
    const idx = categories.findIndex((c: any) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "বিভাগটি খুঁজে পাওয়া যায়নি।" });
    }
    
    categories[idx] = { ...categories[idx], ...req.body };
    writeJSON(CATEGORIES_FILE, categories);
    
    if (isMongoConnected()) {
      CategoryModel.findOneAndUpdate({ id } as any, { $set: req.body }, { new: true } as any)
        .catch(err => console.error("[MONGO SYNC] Failed to update Category:", err));
    }
    
    res.json(categories[idx]);
  } catch (err: any) {
    res.status(500).json({ error: "বিভাগ আপডেট করতে সমস্যা হয়েছে।" });
  }
});

app.delete("/api/categories/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const categories = readJSON(CATEGORIES_FILE, []);
    const filtered = categories.filter((c: any) => c.id !== id);
    if (categories.length === filtered.length) {
      return res.status(404).json({ error: "বিভাগটি খুঁজে পাওয়া যায়নি।" });
    }
    
    writeJSON(CATEGORIES_FILE, filtered);
    
    if (isMongoConnected()) {
      CategoryModel.findOneAndDelete({ id } as any)
        .catch(err => console.error("[MONGO SYNC] Failed to delete Category:", err));
    }
    
    res.json({ success: true, message: "বিভাগটি মুছে ফেলা হয়েছে।" });
  } catch (err: any) {
    res.status(500).json({ error: "বিভাগ মুছতে সমস্যা হয়েছে।" });
  }
});

// --- COMMENTS API ---
app.get("/api/comments", async (req, res) => {
  try {
    const { postId } = req.query;
    const comments = readJSON(COMMENTS_FILE, []);
    const filtered = postId ? comments.filter((c: any) => c.postId === postId) : comments;
    
    if (isMongoConnected()) {
      CommentModel.countDocuments().then(async (mCount) => {
        if (mCount !== comments.length) {
          await CommentModel.deleteMany({});
          if (comments.length > 0) {
            await CommentModel.insertMany(comments);
          }
        }
      }).catch(err => console.error("[MONGO SYNC] Failed to sync comments:", err));
    }
    
    res.json(filtered);
  } catch (err: any) {
    res.status(500).json({ error: "মন্তব্য লগ লোড করতে সমস্যা হয়েছে।" });
  }
});

app.post("/api/comments", async (req, res) => {
  try {
    const comments = readJSON(COMMENTS_FILE, []);
    const newComment = {
      ...req.body,
      id: `comment-${Date.now()}`,
      date: new Date().toLocaleDateString("bn-BD", {
        year: "numeric",
        month: "long",
        day: "numeric"
      }),
      createdAt: new Date().toISOString()
    };
    comments.unshift(newComment);
    writeJSON(COMMENTS_FILE, comments);
    
    if (isMongoConnected()) {
      new CommentModel(newComment).save().catch(err => console.error("[MONGO SYNC] Failed to save Comment:", err));
    }
    
    res.status(201).json(newComment);
  } catch (err: any) {
    res.status(500).json({ error: "মন্তব্য প্রকাশ করতে সমস্যা হয়েছে।" });
  }
});

// --- EMAIL SUBSCRIBERS API ---
app.post("/api/subscribe", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ error: "দয়া করে একটি সঠিক ইমেইল ঠিকানা প্রদান করুন।" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: "অনগ্রহ করে একটি বৈধ ইমেইল ঠিকানা প্রদান করুন।" });
    }

    const subscribers = readJSON(SUBSCRIBERS_FILE, []);
    const exist = subscribers.some((sub: any) => {
      const e = typeof sub === "string" ? sub : sub.email;
      return e?.toLowerCase() === normalizedEmail;
    });

    if (exist) {
      return res.status(400).json({ error: "এই ইমেইল ঠিকানাটি ইতিমধ্যে সাবস্ক্রাইব করা হয়েছে।" });
    }

    const newSubscriber = {
      id: `sub-${Date.now()}`,
      email: normalizedEmail,
      subscribedAt: new Date().toISOString()
    };
    subscribers.push(newSubscriber);
    writeJSON(SUBSCRIBERS_FILE, subscribers);

    if (isMongoConnected()) {
      new SubscriberModel({ email: normalizedEmail }).save().catch(err => console.error("[MONGO SYNC] Failed to save Subscriber:", err));
    }

    res.json({ success: true, message: "সাবস্ক্রিপশন সফল হয়েছে! আমাদের সাথে যুক্ত হওয়ার জন্য ধন্যবাদ।" });
  } catch (err: any) {
    res.status(500).json({ error: "সাবস্ক্রাইব করতে সমস্যা হয়েছে।" });
  }
});

// --- ADMIN EMAIL SUBSCRIBERS MANAGEMENT API ---
app.get("/api/admin/subscribers", authenticateAdmin, async (req, res) => {
  try {
    const subscribers = readJSON(SUBSCRIBERS_FILE, []);
    res.json(subscribers.map((s: any) => typeof s === "string" ? s : s.email));
  } catch (err: any) {
    res.status(500).json({ error: "সাবস্ক্রাইবার তালিকা লোড করতে সমস্যা হয়েছে।" });
  }
});

app.delete("/api/admin/subscribers/:email", authenticateAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const targetEmail = decodeURIComponent(email).trim().toLowerCase();
    
    const subscribers = readJSON(SUBSCRIBERS_FILE, []);
    const filtered = subscribers.filter((s: any) => {
      const emailVal = typeof s === "string" ? s : s.email;
      return emailVal?.toLowerCase() !== targetEmail;
    });
    
    if (subscribers.length === filtered.length) {
      return res.status(404).json({ error: "সাবস্ক্রাইবার তালিকাভুক্ত তথ্য পাওয়া যায়নি।" });
    }

    writeJSON(SUBSCRIBERS_FILE, filtered);

    if (isMongoConnected()) {
      SubscriberModel.findOneAndDelete({ email: targetEmail } as any)
        .catch(err => console.error("[MONGO SYNC] Failed to delete Subscriber:", err));
    }

    res.json({ success: true, message: "সাবস্ক্রাইবার সফলভাবে তালিকা থেকে অপসারিত করা হয়েছে।" });
  } catch (err: any) {
    res.status(500).json({ error: "সাবস্ক্রাইবার অপসারন করতে সমস্যা হয়েছে।" });
  }
});

app.get("/api/admin/notifications", authenticateAdmin, async (req, res) => {
  try {
    const notifications = readJSON(NOTIFICATIONS_FILE, []);
    res.json(notifications.slice(0, 50));
  } catch (err: any) {
    res.status(500).json({ error: "নোটিফিকেশন লগ লোড করতে সমস্যা হয়েছে।" });
  }
});

// --- SITE CONFIG API ---
app.get("/api/site-config", async (req, res) => {
  try {
    let config = readJSON(CONFIG_FILE, null);
    if (!config || !config.siteName) {
      config = {
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
      writeJSON(CONFIG_FILE, config);
    }
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: "সাইট কনফিগারেশন লোড করতে সমস্যা হয়েছে।" });
  }
});

app.put("/api/site-config", authenticateAdmin, async (req, res) => {
  try {
    const config = readJSON(CONFIG_FILE, {});
    const updatedConfig = { ...config, ...req.body, id: "site-config" };
    writeJSON(CONFIG_FILE, updatedConfig);
    
    if (isMongoConnected()) {
      SiteConfigModel.findOneAndUpdate({ id: "site-config" } as any, { $set: req.body }, { new: true, upsert: true } as any)
        .catch(err => console.error("[MONGO SYNC] Failed to update SiteConfig:", err));
    }
    
    res.json(updatedConfig);
  } catch (err: any) {
    res.status(500).json({ error: "সাইট কনফিগারেশন সংরক্ষণ করতে সমস্যা হয়েছে।" });
  }
});

// --- SYSTEM RESET (MAINTENANCE) ---
app.post("/api/system/reset", authenticateAdmin, async (req, res) => {
  try {
    await PostModel.deleteMany({});
    await CategoryModel.deleteMany({});
    await CommentModel.deleteMany({});
    await SubscriberModel.deleteMany({});
    await ResourceModel.deleteMany({});
    await NotificationModel.deleteMany({});
    await SiteConfigModel.deleteMany({});
    await AdminAuthModel.deleteMany({});
    
    console.log("[MONGO db] Truncated all collections during system reset. Re-syncing from local backups...");
    
    // Automatically trigger restoration of all local JSON state backups
    await syncDatabaseFromJSONBackups();
    
    res.json({ success: true, message: "System database successfully reset and restored to backup state." });
  } catch (err: any) {
    console.error("System reset failed:", err);
    res.status(500).json({ error: "সিস্টেম রিসেট করার সময় ডাটাবেজ ত্রুটি তৈরি হয়েছে।" });
  }
});

// --- DYNAMIC IMAGE UPLOADS HANDLER ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `upload-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only images (jpeg, jpg, png, webp, gif) are allowed!"));
  }
});

const uploadSingle = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "file", maxCount: 1 }
]);

app.post("/api/upload", authenticateAdmin, (req, res) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    const uploadedFile = (req.files as any)?.image?.[0] || (req.files as any)?.file?.[0];
    if (!uploadedFile) {
      return res.status(400).json({ error: "No image file provided in multipart/form-data upload request under key 'image' or 'file'." });
    }
    const fileUrl = `/uploads/${uploadedFile.filename}`;
    res.json({ url: fileUrl });
  });
});

// --- RESOURCE MANAGEMENT & DOWNLOADS SERVICE ---

const resourceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `resource-${uniqueSuffix}${ext}`);
  }
});

const uploadResource = multer({
  storage: resourceStorage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for study materials
  }
});

app.get("/api/resources", async (req, res) => {
  try {
    const resources = readJSON(RESOURCES_FILE, []);
    
    // Sync Resources to MongoDB in background if connected
    if (isMongoConnected()) {
      ResourceModel.countDocuments().then(async (mCount) => {
        if (mCount !== resources.length) {
          await ResourceModel.deleteMany({});
          if (resources.length > 0) {
            await ResourceModel.insertMany(resources);
          }
        }
      }).catch(err => console.error("[MONGO SYNC] Failed to sync Resources:", err));
    }
    
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: "Failed to read academic resources catalogue" });
  }
});

app.post("/api/resources/upload", authenticateAdmin, uploadResource.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No storage file was uploaded within form-data 'file' field" });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

app.post("/api/resources/upload-multiple", authenticateAdmin, uploadResource.array("files", 10), (req, res) => {
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    return res.status(400).json({ error: "No storage files were uploaded within files array" });
  }
  const fileObjs = (req.files as Express.Multer.File[]).map(file => ({
    url: `/uploads/${file.filename}`,
    filename: file.originalname,
    size: file.size,
    mimetype: file.mimetype
  }));
  res.json({ files: fileObjs });
});

app.post("/api/resources", authenticateAdmin, async (req, res) => {
  try {
    const { title, description, category, fileUrl, fileName, fileSize, fileType, uploader } = req.body;
    if (!title || !category || !fileUrl) {
      return res.status(400).json({ error: "Title, category, and file URL parameters are required to build standard resource metadata" });
    }
    
    // Convert bytes to readable format if size is a number
    let readableSize = fileSize;
    if (typeof fileSize === "number") {
      const kb = fileSize / 1024;
      if (kb < 1024) {
        readableSize = `${kb.toFixed(1)} KB`;
      } else {
        readableSize = `${(kb / 1024).toFixed(1)} MB`;
      }
    }

    const newResource = {
      id: "res-" + Date.now() + "-" + Math.round(Math.random() * 1000),
      title,
      description: description || "",
      category,
      fileUrl,
      fileName: fileName || "download-resource",
      fileSize: readableSize || "Unknown sizes",
      fileType: fileType || "pdf",
      uploadedAt: new Date().toISOString(),
      downloadCount: 0,
      uploader: uploader || "Arithmetica Admin"
    };

    const resources = readJSON(RESOURCES_FILE, []);
    resources.unshift(newResource);
    writeJSON(RESOURCES_FILE, resources);
    
    // Sync to Mongo asynchronously
    if (isMongoConnected()) {
      new ResourceModel(newResource).save().catch(err => console.error("[MONGO SYNC] Failed to save Resource:", err));
    }
    
    res.status(201).json(newResource);
  } catch (error) {
    res.status(500).json({ error: "Failed to write new resource entry" });
  }
});

app.put("/api/resources/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, fileUrl, fileName, fileSize, fileType, uploader } = req.body;
    
    const resources = readJSON(RESOURCES_FILE, []);
    const idx = resources.findIndex((r: any) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Resource item not found" });
    }

    // Convert bytes to readable format if size is a number
    let readableSize = fileSize;
    if (typeof fileSize === "number") {
      const kb = fileSize / 1024;
      if (kb < 1024) {
        readableSize = `${kb.toFixed(1)} KB`;
      } else {
        readableSize = `${(kb / 1024).toFixed(1)} MB`;
      }
    }

    const updateObj: any = {};
    if (title !== undefined) updateObj.title = title;
    if (description !== undefined) updateObj.description = description;
    if (category !== undefined) updateObj.category = category;
    if (fileUrl !== undefined) updateObj.fileUrl = fileUrl;
    if (fileName !== undefined) updateObj.fileName = fileName;
    if (readableSize !== undefined) updateObj.fileSize = readableSize;
    if (fileType !== undefined) updateObj.fileType = fileType;
    if (uploader !== undefined) updateObj.uploader = uploader;

    resources[idx] = { ...resources[idx], ...updateObj };
    writeJSON(RESOURCES_FILE, resources);

    // Sync to Mongo asynchronously
    if (isMongoConnected()) {
      ResourceModel.findOneAndUpdate({ id } as any, { $set: updateObj }, { new: true } as any)
        .catch(err => console.error("[MONGO SYNC] Failed to update Resource:", err));
    }
    
    res.json(resources[idx]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update resource info" });
  }
});

app.delete("/api/resources/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const resources = readJSON(RESOURCES_FILE, []);
    const filtered = resources.filter((r: any) => r.id !== id);
    if (resources.length === filtered.length) {
      return res.status(404).json({ error: "Resource item not found" });
    }

    writeJSON(RESOURCES_FILE, filtered);

    // Sync to Mongo asynchronously
    if (isMongoConnected()) {
      ResourceModel.findOneAndDelete({ id } as any)
        .catch(err => console.error("[MONGO SYNC] Failed to delete Resource:", err));
    }
    
    res.json({ success: true, message: "Resource entry deleted from index successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete from resources index" });
  }
});

app.get("/api/resources/download/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const resources = readJSON(RESOURCES_FILE, []);
    const idx = resources.findIndex((r: any) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Resource not found" });
    }
    
    // Increment downloadCount
    resources[idx].downloadCount = (resources[idx].downloadCount || 0) + 1;
    writeJSON(RESOURCES_FILE, resources);

    // Sync to Mongo asynchronously
    if (isMongoConnected()) {
      ResourceModel.findOneAndUpdate({ id } as any, { $inc: { downloadCount: 1 } }, { new: true } as any)
        .catch(err => console.error("[MONGO SYNC] Failed to increment resource downloadCount:", err));
    }

    // Read directory safe filename logic
    const filenameOnDisk = path.basename(resources[idx].fileUrl);
    const filePath = path.join(UPLOADS_DIR, filenameOnDisk);
    
    if (fs.existsSync(filePath)) {
      res.download(filePath, resources[idx].fileName || filenameOnDisk);
    } else {
      // Direct redirect fallback if we are dealing with external files or lost disk states
      res.redirect(resources[idx].fileUrl);
    }
  } catch (e) {
    res.status(500).json({ error: "Failed to process resource download link" });
  }
});

// Vite & Static Asset Delivery Layer
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Arithmetica Server] Running smoothly on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
