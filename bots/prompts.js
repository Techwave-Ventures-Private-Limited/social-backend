function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const CATEGORY_TOPICS = {
  "Business & Entrepreneurship": [
    "building something from scratch",
    "learning from small business challenges",
    "taking risks and learning daily",
    "managing work independently"
  ],
  "Technology & IT": [
    "learning new technical skills",
    "solving practical problems",
    "working on small projects",
    "improving technical understanding"
  ],
  "Design & Creative": [
    "creative problem solving",
    "improving design skills",
    "finding inspiration in daily work",
    "working on creative ideas"
  ],
  "Sales, Marketing & Growth": [
    "understanding customer needs",
    "improving communication skills",
    "learning from sales experiences",
    "working on growth strategies"
  ],
  "Product, Strategy & Operations": [
    "improving processes",
    "thinking about long-term planning",
    "handling operational challenges",
    "learning from execution"
  ],
  "Finance, Legal & HR": [
    "understanding policies and processes",
    "handling responsibilities carefully",
    "learning from real-world cases",
    "balancing work and compliance"
  ],
  "Law & Compliance": [
    "understanding regulations",
    "working through compliance challenges",
    "learning the importance of accuracy",
    "handling responsibilities carefully"
  ],
  "Industry & Trade": [
    "hands-on work experience",
    "learning through daily practice",
    "improving craftsmanship",
    "understanding the value of skill"
  ],
  "Retail & Services": [
    "handling daily customer interactions",
    "managing service responsibilities",
    "learning from everyday work",
    "improving service quality"
  ],
  "Education & Training": [
    "sharing knowledge",
    "continuous learning",
    "helping others grow",
    "improving understanding through teaching"
  ],
  "Healthcare & Wellness": [
    "focusing on well-being",
    "learning about care practices",
    "helping people feel better",
    "balancing work and responsibility"
  ],
  "Media, Content & Creators": [
    "creating meaningful content",
    "improving storytelling skills",
    "learning consistency",
    "sharing ideas with people"
  ],
  "Real Estate & Infrastructure": [
    "understanding long-term value",
    "learning from market observations",
    "handling practical challenges",
    "planning carefully"
  ],
  "Freelance & Independent": [
    "working independently",
    "managing time effectively",
    "learning from varied projects",
    "building consistency"
  ],
  "Students & Early Career": [
    "learning new skills",
    "understanding work basics",
    "building good habits",
    "preparing for future opportunities"
  ],
  "Government / Public Sector": [
    "understanding systems",
    "working with responsibility",
    "learning about public processes",
    "handling tasks carefully"
  ]
};

const DEFAULT_TOPICS = [
  "learning from daily work",
  "personal growth",
  "professional challenges",
  "building consistency"
];

const postPrompt = ({ category, headline }) => {
  const topics = CATEGORY_TOPICS[category] || DEFAULT_TOPICS;
  const topic = pickRandom(topics);

  return (
    "You are an Indian professional working as " +
    (headline || "an independent professional") +
    ". Write a short social media post about " +
    topic +
    ". Tone: natural, practical, and human. Do not use hashtags. Do not mention AI. Max 80 words."
  );
};

module.exports = { postPrompt };
