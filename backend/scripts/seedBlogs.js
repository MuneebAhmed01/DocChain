import "dotenv/config";
import mongoose from "mongoose";
import slugify from "slugify";
import Blog from "../models/Blog.js";
import doctorModel from "../models/doctorModel.js";

const seededBlogsData = [
  {
    doctorEmail: "doc01@gmail.com",
    title: "Understanding Hypertension: A Guide to Silent Killer",
    excerpt: "Learn about the risks, symptoms, and management of high blood pressure in this comprehensive guide.",
    content: `
      <p>Hypertension, commonly known as high blood pressure, is often called the "silent killer" because it typically has no obvious symptoms while causing significant damage to the heart and blood vessels. As a general physician, I frequently see patients who are unaware of their condition until it's diagnosed during a routine checkup.</p>
      <p>The primary risk factors for hypertension include genetics, high salt intake, lack of physical activity, and stress. Managing it requires a combination of medication (if prescribed) and lifestyle modifications. Reducing sodium intake to less than 2,300mg per day and engaging in at least 150 minutes of moderate-intensity aerobic activity per week can significantly lower your numbers.</p>
      <p>Regular monitoring at home and keeping a log of your readings helps your doctor make informed decisions about your treatment plan. Remember, early detection and consistent management are key to preventing complications like heart attacks and strokes.</p>
    `,
    imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80",
    tags: ["Hypertension", "Heart Health", "General Physician"],
  },
  {
    doctorEmail: "doc02@gmail.com",
    title: "Prenatal Care: Essential Steps for a Healthy Pregnancy",
    excerpt: "Expert advice on nutrition, exercise, and regular checkups during your pregnancy journey.",
    content: `
      <p>Pregnancy is a transformative journey, and proper prenatal care is vital for the health of both mother and baby. From the moment you discover you're pregnant, scheduling your first obstetric appointment should be a priority. These visits allow us to monitor fetal development and address any concerns early on.</p>
      <p>Nutrition plays a central role; focus on a balanced diet rich in folic acid, iron, and calcium. Prenatal vitamins are a helpful supplement but should not replace whole foods. Gentle exercise, such as walking or prenatal yoga, can improve your mood and prepare your body for labor.</p>
      <p>It's also important to be aware of warning signs like severe headaches or sudden swelling. Open communication with your gynecologist ensures that you feel supported and informed throughout every trimester. Our goal is to ensure a safe delivery and a healthy start for your newborn.</p>
    `,
    imageUrl: "https://images.unsplash.com/photo-1531983412531-1f49a365ffed?auto=format&fit=crop&w=1200&q=80",
    tags: ["Pregnancy", "Women's Health", "Gynecology"],
  },
  {
    doctorEmail: "doc03@gmail.com",
    title: "The Ultimate Skincare Routine for Sensitive Skin",
    excerpt: "Discover how to protect and nourish your skin without causing irritation or redness.",
    content: `
      <p>Sensitive skin requires a gentle touch and a minimalist approach. As a dermatologist, I often see patients who have damaged their skin barrier by using too many active ingredients at once. The key to managing sensitive skin is to soothe and protect rather than irritate.</p>
      <p>Start with a fragrance-free, non-foaming cleanser to remove impurities without stripping natural oils. Follow up with a moisturizer containing ceramides or hyaluronic acid to lock in hydration. Most importantly, never skip sunscreen; physical blockers like zinc oxide are often better tolerated by sensitive skin.</p>
      <p>Avoid harsh physical exfoliants and be cautious with retinoids. If you're introducing a new product, always perform a patch test first. Consistency and patience are your best allies in achieving a healthy, glowing complexion without the redness.</p>
    `,
    imageUrl: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=1200&q=80",
    tags: ["Skincare", "Dermatology", "Sensitive Skin"],
  },
  {
    doctorEmail: "doc04@gmail.com",
    title: "Common Childhood Vaccinations: Why They Matter",
    excerpt: "A guide for parents on the importance of following the recommended immunization schedule.",
    content: `
      <p>Vaccinations are one of the most effective public health tools we have to protect children from serious and potentially life-threatening diseases. Following the recommended immunization schedule ensures that your child builds immunity at the most vulnerable stages of their development.</p>
      <p>Common vaccines include those for Measles, Mumps, Rubella (MMR), Polio, and Hepatitis B. While it's normal for parents to have questions about side effects, the vast majority are mild, such as a low-grade fever or soreness at the injection site. The risks associated with the diseases themselves far outweigh the minor discomfort of the vaccine.</p>
      <p>As pediatricians, we are here to provide evidence-based information and support you in making the best decisions for your child's health. Keeping your child up to date with their shots not only protects them but also contributes to community immunity.</p>
    `,
    imageUrl: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80",
    tags: ["Pediatrics", "Vaccinations", "Child Health"],
  },
  {
    doctorEmail: "doc05@gmail.com",
    title: "Managing Migraines: Identifying Triggers and Finding Relief",
    excerpt: "Practical tips for chronic headache sufferers to reduce frequency and intensity of attacks.",
    content: `
      <p>Migraines are more than just bad headaches; they are a complex neurological condition that can be incredibly debilitating. Understanding your personal triggers is the first step toward regaining control. Common triggers include hormonal changes, certain foods, bright lights, and irregular sleep patterns.</p>
      <p>Keeping a headache diary can help you identify trends. When an attack occurs, resting in a dark, quiet room and applying a cold compress can often provide some relief. Medications range from over-the-counter pain relievers to prescription triptans and preventative treatments.</p>
      <p>If you experience migraines more than a few times a month, it's important to consult a neurologist. We can work together to develop a comprehensive management plan that includes both acute and preventative strategies tailored to your lifestyle.</p>
    `,
    imageUrl: "https://images.unsplash.com/photo-1559757175-570098bc9186?auto=format&fit=crop&w=1200&q=80",
    tags: ["Neurology", "Migraines", "Brain Health"],
  },
  {
    doctorEmail: "doc06@gmail.com",
    title: "Sleep Hygiene: The Foundation of Neurological Health",
    excerpt: "How quality sleep impacts your brain function and emotional well-being.",
    content: `
      <p>Quality sleep is not a luxury; it's a fundamental requirement for optimal brain function. During sleep, your brain performs essential maintenance tasks, such as clearing out metabolic waste and consolidating memories. Poor sleep hygiene can lead to cognitive decline, mood swings, and increased risk of neurological disorders.</p>
      <p>To improve your sleep, establish a consistent schedule by going to bed and waking up at the same time every day, even on weekends. Create a relaxing bedtime routine that excludes electronic screens at least an hour before sleep. Ensure your bedroom is cool, dark, and quiet.</p>
      <p>Limiting caffeine and heavy meals in the evening also helps. If you struggle with persistent insomnia or other sleep issues, a neurological evaluation can help rule out underlying conditions. Prioritizing rest is one of the best things you can do for your long-term health.</p>
    `,
    imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=1200&q=80",
    tags: ["Sleep", "Neurology", "Wellness"],
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
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const existingSlugs = new Set((await Blog.find({}, { slug: 1 }).lean()).map((b) => b.slug));
    const blogDocs = [];
    let skippedCount = 0;

    for (const data of seededBlogsData) {
      // Find doctor by email
      const doctor = await doctorModel.findOne({ email: data.doctorEmail });
      
      if (!doctor) {
        console.warn(`Warning: Doctor with email ${data.doctorEmail} not found. Skipping doctor assignment for blog "${data.title}"`);
      }

      const slug = buildUniqueSlug(data.title, existingSlugs);
      
      blogDocs.push({
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        imageUrl: data.imageUrl,
        tags: data.tags,
        slug: slug,
        doctorId: doctor ? doctor._id : null,
        author: doctor ? doctor.name : "DocChain Editorial Team",
        authorRole: doctor ? "doctor" : "admin",
        status: "approved",
        published: true,
        isDemo: true,
      });
    }

    if (blogDocs.length > 0) {
      const result = await Blog.insertMany(blogDocs, { ordered: false });
      console.log(`Successfully seeded ${result.length} blogs`);
    } else {
      console.log("No new blogs to seed");
    }

  } catch (err) {
    if (err.name === 'BulkWriteError' || err.code === 11000) {
      const insertedCount = err.result?.nInserted || 0;
      const totalAttempted = seededBlogsData.length;
      console.log(`Seeded ${insertedCount} blogs (skipped ${totalAttempted - insertedCount} duplicates)`);
    } else {
      console.error("Fatal error during seeding:", err);
      process.exit(1);
    }
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Unhandled error:", err);
    process.exit(1);
  });
