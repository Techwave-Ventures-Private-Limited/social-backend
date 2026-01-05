const mongoose = require("mongoose");
const crypto = require("crypto");
const User = require("../modules/user");
const Experience = require("../modules/experience");
const database = require("../config/dbonfig.js");

require("dotenv").config();

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const BIO_TEMPLATES = [
  "Working independently in {{category}} and sharing practical experiences.",
  "Currently involved in {{category}}, learning and growing through daily work.",
  "Exploring opportunities in {{category}} while sharing thoughts here.",
  "Building experience in {{category}} and learning from everyday challenges.",
  "Actively working in {{category}} and engaging with the community."
];

const EXPERIENCE_DESC_TEMPLATES = [
  "Independently working as a {{role}} with a focus on consistent improvement.",
  "Handling responsibilities as a {{role}} and learning through hands-on work.",
  "Currently engaged as a {{role}}, focusing on practical skills and growth.",
  "Working independently as a {{role}} while gaining real-world experience.",
  "Managing day-to-day work as a {{role}} with a focus on quality and learning."
];

(async () => {
  try {
    database.connect();

    await User.updateMany({ ib: true }, { bt: "UNKNOWN" });

    const BOTS_PER_CATEGORY = 10;

    const CATEGORIES = [
      "Business & Entrepreneurship",
      "Technology & IT",
      "Design & Creative",
      "Sales, Marketing & Growth",
      "Product, Strategy & Operations",
      "Finance, Legal & HR",
      "Law & Compliance",
      "Industry & Trade",
      "Retail & Services",
      "Education & Training",
      "Healthcare & Wellness",
      "Media, Content & Creators",
      "Real Estate & Infrastructure",
      "Freelance & Independent",
      "Students & Early Career",
      "Government / Public Sector"
    ];

    const INDIAN_NAMES = [
      // Male names
      "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun",
      "Rohan", "Kunal", "Siddharth", "Rahul", "Aman",
      "Akash", "Nikhil", "Saurabh", "Ankit", "Deepak",
      "Rajat", "Varun", "Harsh", "Manish", "Pankaj",
      "Vikas", "Mohit", "Abhishek", "Yash", "Rishabh",
      "Shubham", "Pranav", "Kartik", "Ayush", "Rohit",
      "Sanket", "Tejas", "Mayur", "Omkar", "Atharva",
      "Sameer", "Sachin", "Sunil", "Amit", "Rajesh",

      // Female names
      "Neha", "Priya", "Ananya", "Kavya", "Ishita",
      "Pooja", "Sneha", "Ritika", "Nisha", "Aditi",
      "Shruti", "Pallavi", "Riya", "Simran", "Swati",
      "Komal", "Anjali", "Sakshi", "Tanvi", "Shreya",
      "Isha", "Nandini", "Sonal", "Megha", "Bhavya",
      "Vaishnavi", "Prachi", "Mansi", "Kritika", "Rupali",
      "Shivani", "Namrata", "Monika", "Kiran", "Jyoti",
      "Kajal", "Seema", "Poonam", "Payal", "Rekha"
    ];


    const CATEGORY_ROLE_MAP = {
      "Business & Entrepreneurship": { name: "Self Employed", role: "Independent Business Operator" },
      "Technology & IT": { name: "Freelancer", role: "Freelance Software Professional" },
      "Design & Creative": { name: "Freelancer", role: "Creative Designer" },
      "Sales, Marketing & Growth": { name: "Self Employed", role: "Sales & Marketing Consultant" },
      "Product, Strategy & Operations": { name: "Independent", role: "Operations & Strategy Consultant" },
      "Finance, Legal & HR": { name: "Independent", role: "Finance & HR Consultant" },
      "Law & Compliance": { name: "Independent", role: "Legal & Compliance Consultant" },
      "Industry & Trade": { name: "Local Trade", role: "Skilled Trade Professional" },
      "Retail & Services": { name: "Service Provider", role: "Retail & Service Professional" },
      "Education & Training": { name: "Independent", role: "Trainer / Educator" },
      "Healthcare & Wellness": { name: "Independent", role: "Wellness & Care Practitioner" },
      "Media, Content & Creators": { name: "Freelancer", role: "Content Creator" },
      "Real Estate & Infrastructure": { name: "Independent", role: "Property & Infrastructure Consultant" },
      "Freelance & Independent": { name: "Freelancer", role: "Independent Professional" },
      "Students & Early Career": { name: "Learner", role: "Early Career Professional" },
      "Government / Public Sector": { name: "Independent", role: "Public Sector Consultant" }
    };

    const EMAIL_DOMAIN = "connektx.com";
    const BOT_PASSWORD = "asdjfklasdjfasdshubhamfklajskldfjabagulfaskdjfklsd";

    let globalCount = 1;
    let nameIndex = 0;

    console.log("Creating category-wise bots (10 per category)...");

    for (const category of CATEGORIES) {
      const roleData = CATEGORY_ROLE_MAP[category];

      for (let i = 0; i < BOTS_PER_CATEGORY; i++) {
        const baseName = INDIAN_NAMES[nameIndex % INDIAN_NAMES.length];

        const username = `${baseName.toLowerCase()}_${category
          .replace(/[^a-zA-Z]/g, "")
          .toLowerCase()}_${globalCount}`;

        const email = `${username}@${EMAIL_DOMAIN}`;

        const bio = pickRandom(BIO_TEMPLATES).replace(
          "{{category}}",
          category.toLowerCase()
        );

        const experienceDesc = pickRandom(EXPERIENCE_DESC_TEMPLATES).replace(
          "{{role}}",
          roleData.role.toLowerCase()
        );

        const user = await User.create({
          name: baseName,
          email,
          password: BOT_PASSWORD,
          category,
          bio,
          headline: roleData.role,
          address: "India",
          ib: true,
          bt: "CATEGORY",
          bk: crypto.randomBytes(16).toString("hex")
        });

        const experience = await Experience.create({
          name: roleData.name,
          role: roleData.role,
          startDate: new Date(2021, 0, 1),
          endDate: null,
          desc: experienceDesc,
          current: true,
          companyId: null,
          workEmail: null,
          isVerified: false
        });

        user.experience.push(experience._id);
        await user.save();

        nameIndex++;
        globalCount++;
      }
    }

    console.log("Successfully created 10 bots per category");
    process.exit(0);
  } catch (err) {
    console.error("Error creating category bots:", err);
    process.exit(1);
  }
})();
