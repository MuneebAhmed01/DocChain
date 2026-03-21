import "dotenv/config";
import mongoose from "mongoose";
import slugify from "slugify";
import Blog from "../models/Blog.js";

const demoBlogs = [
  {
    title: "7 Daily Habits To Protect Heart Health",
    excerpt: "Simple daily actions that lower cardiovascular risk and improve long-term energy.",
    content:
      "<p>Heart health is built through small, consistent habits. Start with a 30-minute walk, reduce processed foods, and track your blood pressure once a week. Include omega-3 sources like fish and walnuts, and prioritize sleep quality to reduce stress hormones.</p><p>If you have diabetes or high blood pressure, regular checkups are essential. Prevention plans work best when personalized by your doctor.</p>",
    imageUrl:
      "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=80",
    tags: ["cardiology", "prevention", "lifestyle"],
  },
  {
    title: "When A Child's Fever Needs Medical Attention",
    excerpt: "A practical guide for parents on warning signs and safe first steps at home.",
    content:
      "<p>Most fevers are caused by viral infections and settle with hydration and rest. Seek immediate care if a baby under three months has fever, or if there are symptoms like breathing difficulty, persistent vomiting, confusion, or seizures.</p><p>Use age-appropriate fever medicine and avoid over-bundling clothing. If the fever lasts more than 48 hours, consult your pediatrician.</p>",
    imageUrl:
      "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80",
    tags: ["pediatrics", "family-health", "urgent-care"],
  },
  {
    title: "How Telemedicine Improves Follow-Up Care",
    excerpt: "Why virtual consultations are effective for chronic disease monitoring and continuity.",
    content:
      "<p>Telemedicine reduces travel burden, improves treatment adherence, and makes follow-up easier for patients with chronic conditions. Doctors can review progress, adjust medications, and catch warning trends earlier through regular remote check-ins.</p><p>For best outcomes, prepare your appointment notes, recent lab reports, and symptom timeline before the consultation.</p>",
    imageUrl:
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
    tags: ["telemedicine", "digital-health", "continuity"],
  },
  {
    title: "Recognizing Early Signs Of Vitamin Deficiency",
    excerpt: "Fatigue, brittle nails, and mood changes may indicate nutrient gaps.",
    content:
      "<p>Vitamin and mineral deficiencies often appear gradually. Common signs include tiredness, frequent infections, muscle weakness, and pale skin. Blood tests can confirm deficiencies such as iron, vitamin D, B12, and folate.</p><p>Self-supplementation without diagnosis can be risky. A doctor-guided nutrition plan is safer and more effective.</p>",
    imageUrl:
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80",
    tags: ["nutrition", "wellness", "lab-tests"],
  },
];

function buildUniqueSlug(baseTitle, used) {
  const base = slugify(baseTitle, { lower: true, strict: true });
  let slug = base;
  let counter = 1;

  while (used.has(slug)) {
    slug = `${base}-${counter++}`;
  }

  used.add(slug);
  return slug;
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const existingSlugs = new Set((await Blog.find({}, { slug: 1 }).lean()).map((b) => b.slug));

    const docs = demoBlogs.map((item) => ({
      ...item,
      slug: buildUniqueSlug(item.title, existingSlugs),
      author: "DocChain Editorial Team",
      authorRole: "admin",
      status: "approved",
      published: true,
      isDemo: true,
    }));

    const inserted = await Blog.insertMany(docs);
    console.log(`Created ${inserted.length} demo blogs`);
  } finally {
    await mongoose.disconnect();
  }
}

run()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("Failed to seed demo blogs:", err.message);
    try {
      await mongoose.disconnect();
    } catch (_e) {
      // ignore disconnect errors
    }
    process.exit(1);
  });
