// ?????????????????????????????????????????????????????????????????????????????
// All skill categories (mirrors backend SkillCategory collection)
// Used as fallback when backend is not available.
// ?????????????????????????????????????????????????????????????????????????????

export const SKILL_TIERS = {
  unskilled: { label: 'Unskilled', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800' },
  'semi-skilled': { label: 'Semi-Skilled', color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
  skilled: { label: 'Skilled / Professional', color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-800' },
};

export const SKILL_CATEGORIES = [
  // ?? UNSKILLED ??????????????????????????????????????????????????????????????
  { tier: 'unskilled', icon: '??', name: 'Home / Personal', slug: 'home-personal',
    skills: ['House helper / Maid','Cleaning staff','Dishwasher','Kitchen helper','Babysitting assistant','Elder care helper','Pet helper'] },
  { tier: 'unskilled', icon: '??', name: 'Transport / Delivery', slug: 'transport-delivery',
    skills: ['Delivery boy','Courier runner','Warehouse loader','Packing staff','Mover / Shifter'] },
  { tier: 'unskilled', icon: '??', name: 'Construction', slug: 'construction',
    skills: ['Construction helper','Site labour','Brick carrier','Road worker'] },
  { tier: 'unskilled', icon: '??', name: 'Factory / Industrial', slug: 'factory-industrial',
    skills: ['Factory worker','Assembly worker','Sorting staff','Helper'] },
  { tier: 'unskilled', icon: '??', name: 'Retail / Shop', slug: 'retail-shop',
    skills: ['Shop helper','Store assistant','Stock handler','Sales helper'] },
  { tier: 'unskilled', icon: '??', name: 'Office Support', slug: 'office-support-unskilled',
    skills: ['Office boy','Tea boy','Cleaner'] },

  // ?? SEMI-SKILLED ???????????????????????????????????????????????????????????
  { tier: 'semi-skilled', icon: '??', name: 'Technical Field', slug: 'technical-field',
    skills: ['Electrician','Plumber','Carpenter','AC technician','Painter','Welder','Mechanic','CCTV installer'] },
  { tier: 'semi-skilled', icon: '??', name: 'Transport', slug: 'transport-semi',
    skills: ['Driver (Car)','Truck driver','Bus driver','Forklift operator'] },
  { tier: 'semi-skilled', icon: '??', name: 'Hospitality', slug: 'hospitality',
    skills: ['Cook','Chef assistant','Waiter','Bartender'] },
  { tier: 'semi-skilled', icon: '??', name: 'Beauty & Personal Care', slug: 'beauty-personal-care',
    skills: ['Beautician','Hair stylist','Nail artist','Massage therapist'] },
  { tier: 'semi-skilled', icon: '??', name: 'Office / Sales', slug: 'office-sales',
    skills: ['Telecaller','Customer support','Field sales executive','Collection executive'] },
  { tier: 'semi-skilled', icon: '??', name: 'Healthcare (Semi)', slug: 'healthcare-semi',
    skills: ['Nurse assistant','Caretaker','Lab technician'] },

  // ?? SKILLED / PROFESSIONAL ?????????????????????????????????????????????????
  { tier: 'skilled', icon: '??', name: 'Tech & Digital', slug: 'tech-digital',
    skills: ['Software developer','App developer','Web developer','AI specialist','Data analyst','UI/UX designer','Graphic designer','Video editor','SEO expert','Digital marketer'] },
  { tier: 'skilled', icon: '??', name: 'Finance & Legal', slug: 'finance-legal',
    skills: ['Chartered Accountant','Accountant','Tax consultant','Lawyer','Legal advisor'] },
  { tier: 'skilled', icon: '??', name: 'Engineering', slug: 'engineering',
    skills: ['Civil engineer','Mechanical engineer','Electrical engineer','Architect','Interior designer'] },
  { tier: 'skilled', icon: '??', name: 'Education', slug: 'education',
    skills: ['School teacher','Online tutor','Coding teacher','Music teacher','Language trainer'] },
  { tier: 'skilled', icon: '??', name: 'Medical', slug: 'medical',
    skills: ['Doctor','Physiotherapist','Therapist','Psychologist','Dietician'] },
  { tier: 'skilled', icon: '??', name: 'Corporate & Remote', slug: 'corporate-remote',
    skills: ['HR manager','Project manager','Business consultant','Operations manager','Virtual assistant','Remote developer','Remote designer','Remote customer support','Freelance writer','Remote video editor'] },
];

// Flat list of all skills for autocomplete
export const ALL_SKILLS = SKILL_CATEGORIES.flatMap((c) => c.skills);

// Returns only categories for a specific tier
export const getCategoriesByTier = (tier) => SKILL_CATEGORIES.filter((c) => c.tier === tier);

// Popular shortlist shown as chip filters on Search/Landing pages
export const POPULAR_SKILLS = [
  'Electrician','Plumber','Carpenter','Driver (Car)','Delivery boy',
  'Cook','Cleaning staff','Web developer','UI/UX designer','Graphic designer',
  'Accountant','Nurse assistant','Beautician','Online tutor','Software developer',
  'Digital marketer','Security guard','Mechanic','AC technician','Data analyst',
];

// ?????????????????????????????????????????????????????????????????????????????
// Dummy provider data - used when backend is offline / returns empty
// ?????????????????????????????????????????????????????????????????????????????

const AVATAR_BASE = 'https://api.dicebear.com/7.x/avataaars/svg?seed=';

const DUMMY_PROVIDER_BASE = [
  {
    id: 'dummy-electrician-1',
    name: 'Rajesh Kumar',
    image: `${AVATAR_BASE}Rajesh`,
    category: 'Electrician',
    rating: 4.8,
    location: 'Delhi',
    experience: '8 years',
    description: 'Certified electrician for home wiring, CCTV and AC electrical diagnostics.',
    phone: '',
    email: '',
    skills: ['Electrician', 'CCTV installer', 'AC technician'],
    services: ['Wiring', 'Switchboard repair', 'Emergency fault fix'],
    tier: 'semi-skilled',
    ratePerHour: 600,
    totalReviews: 72,
    isAvailable: true,
  },
  {
    id: 'dummy-plumber-1',
    name: 'Arjun Patel',
    image: `${AVATAR_BASE}Arjun`,
    category: 'Plumber',
    rating: 4.6,
    location: 'Ahmedabad',
    experience: '7 years',
    description: 'Leak fixes, bathroom fittings and pipeline maintenance for homes and offices.',
    phone: '',
    email: '',
    skills: ['Plumber', 'Bathroom fittings', 'Leak repair'],
    services: ['Pipe leakage repair', 'Tap installation', 'Toilet repair'],
    tier: 'semi-skilled',
    ratePerHour: 500,
    totalReviews: 48,
    isAvailable: false,
  },
  {
    id: 'dummy-cleaner-1',
    name: 'Anita Sharma',
    image: `${AVATAR_BASE}Anita`,
    category: 'Cleaner',
    rating: 4.7,
    location: 'Mumbai',
    experience: '5 years',
    description: 'Trusted home cleaner for daily and deep cleaning support.',
    phone: '',
    email: '',
    skills: ['Cleaning staff', 'Kitchen helper'],
    services: ['Home cleaning', 'Utensil cleaning', 'Kitchen support'],
    tier: 'unskilled',
    ratePerHour: 300,
    totalReviews: 38,
    isAvailable: true,
  },
  {
    id: 'dummy-carpenter-1',
    name: 'Deepak Tiwari',
    image: `${AVATAR_BASE}Deepak`,
    category: 'Carpenter',
    rating: 4.5,
    location: 'Noida',
    experience: '6 years',
    description: 'Carpentry specialist for custom furniture and quick household fixes.',
    phone: '',
    email: '',
    skills: ['Carpenter', 'Furniture work'],
    services: ['Furniture assembly', 'Door lock fitting', 'Wood polish'],
    tier: 'semi-skilled',
    ratePerHour: 550,
    totalReviews: 41,
    isAvailable: true,
  },
  {
    id: 'dummy-painter-1',
    name: 'Suresh Meena',
    image: `${AVATAR_BASE}Suresh`,
    category: 'Painter',
    rating: 4.4,
    location: 'Jaipur',
    experience: '9 years',
    description: 'Interior and exterior painter with premium finish and quick turnaround.',
    phone: '',
    email: '',
    skills: ['Painter', 'Wall texture'],
    services: ['Interior paint', 'Texture paint', 'Waterproof coating'],
    tier: 'semi-skilled',
    ratePerHour: 520,
    totalReviews: 33,
    isAvailable: true,
  },
  {
    id: 'dummy-ac-repair-1',
    name: 'Imran Ali',
    image: `${AVATAR_BASE}Imran`,
    category: 'AC Repair',
    rating: 4.7,
    location: 'Mumbai',
    experience: '7 years',
    description: 'AC servicing, gas refill and split AC troubleshooting expert.',
    phone: '',
    email: '',
    skills: ['AC technician', 'Electrician'],
    services: ['AC service', 'Gas refill', 'Cooling issue repair'],
    tier: 'semi-skilled',
    ratePerHour: 700,
    totalReviews: 58,
    isAvailable: true,
  },
  {
    id: 'dummy-driver-1',
    name: 'Vikram Singh',
    image: `${AVATAR_BASE}Vikram`,
    category: 'Driver',
    rating: 4.6,
    location: 'Jaipur',
    experience: '10 years',
    description: 'Professional local and outstation driver with clean safety record.',
    phone: '',
    email: '',
    skills: ['Driver (Car)', 'Personal Driver'],
    services: ['Daily commute', 'Outstation rides'],
    tier: 'semi-skilled',
    ratePerHour: 450,
    totalReviews: 88,
    isAvailable: true,
  },
  {
    id: 'dummy-cook-1',
    name: 'Aisha Rahman',
    image: `${AVATAR_BASE}Aisha`,
    category: 'Cook',
    rating: 4.5,
    location: 'Kolkata',
    experience: '6 years',
    description: 'Home cook specializing in North Indian and Bengali meals.',
    phone: '',
    email: '',
    skills: ['Cook', 'Kitchen helper'],
    services: ['Breakfast prep', 'Lunch and dinner', 'Weekly meal planning'],
    tier: 'semi-skilled',
    ratePerHour: 550,
    totalReviews: 33,
    isAvailable: true,
  },
  {
    id: 'dummy-tutor-1',
    name: 'Meera Nair',
    image: `${AVATAR_BASE}Meera`,
    category: 'Tutor',
    rating: 4.9,
    location: 'Bengaluru',
    experience: '11 years',
    description: 'Math and science tutor for school students with proven results.',
    phone: '',
    email: '',
    skills: ['Online tutor', 'School teacher'],
    services: ['Class 6-10 tuition', 'Exam preparation'],
    tier: 'skilled',
    ratePerHour: 600,
    totalReviews: 112,
    isAvailable: true,
  },
  {
    id: 'dummy-web-developer-1',
    name: 'Rohit Verma',
    image: `${AVATAR_BASE}Rohit`,
    category: 'Web Developer',
    rating: 4.7,
    location: 'Pune',
    experience: '6 years',
    description: 'Full-stack web developer for business websites and dashboards.',
    phone: '',
    email: '',
    skills: ['Software developer', 'Web developer', 'React'],
    services: ['Landing pages', 'Admin dashboards', 'API integration'],
    tier: 'skilled',
    ratePerHour: 1500,
    totalReviews: 61,
    isAvailable: true,
  },
  {
    id: 'dummy-accountant-1',
    name: 'Neha Gupta',
    image: `${AVATAR_BASE}Neha`,
    category: 'Accountant',
    rating: 4.4,
    location: 'Delhi',
    experience: '8 years',
    description: 'Accounting and tax filing support for small businesses and startups.',
    phone: '',
    email: '',
    skills: ['Accountant', 'Tax consultant'],
    services: ['GST filing', 'Bookkeeping', 'Monthly reports'],
    tier: 'skilled',
    ratePerHour: 800,
    totalReviews: 23,
    isAvailable: true,
  },
  {
    id: 'dummy-beautician-1',
    name: 'Sana Khan',
    image: `${AVATAR_BASE}Sana`,
    category: 'Beautician',
    rating: 4.8,
    location: 'Mumbai',
    experience: '5 years',
    description: 'At-home beautician for makeup, hair styling and grooming services.',
    phone: '',
    email: '',
    skills: ['Beautician', 'Hair stylist'],
    services: ['Bridal makeup', 'Party makeup', 'Hair styling'],
    tier: 'semi-skilled',
    ratePerHour: 400,
    totalReviews: 45,
    isAvailable: true,
  },
];

export const DUMMY_PROVIDERS = DUMMY_PROVIDER_BASE.map((provider, index) => ({
  ...provider,
  _id: provider.id,
  city: provider.location,
  profilePhoto: provider.image,
  photo: provider.image,
  avgRating: provider.rating,
  averageRating: provider.rating,
  headline: provider.description,
  ratePerHour: provider.ratePerHour,
  totalReviews: provider.totalReviews,
  distanceKm: index % 6,
  isDummy: true,
}));

// Levenshtein distance between two strings (word-level typo detection)
const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
};

/**
 * Resolve a user-typed skill (possibly misspelled) to the closest known skill.
 * Returns the matched skill string, or the original input if nothing close found.
 */
export const fuzzyResolveSkill = (input) => {
  if (!input || !input.trim()) return '';
  const s = input.trim().toLowerCase();

  // 1. Exact case-insensitive match — return as-is (no mutation)
  if (ALL_SKILLS.some((sk) => sk.toLowerCase() === s)) return input.trim();

  // 2. Substring containment — e.g. "tutor" matches "Online tutor"
  const subMatch = ALL_SKILLS.find((sk) => sk.toLowerCase().includes(s));
  if (subMatch) return subMatch;

  // 3. Word-level Levenshtein — compare each word of input to each word of skill names
  //    e.g. "Tuter" → word "tuter" vs "tutor" = distance 1 → "Online tutor"
  const inputWords = s.split(/\s+/);
  let bestSkill = null;
  let bestScore = Infinity;
  for (const sk of ALL_SKILLS) {
    const skWords = sk.toLowerCase().split(/\s+/);
    let minDist = Infinity;
    for (const iw of inputWords) {
      for (const sw of skWords) {
        const d = levenshtein(iw, sw);
        if (d < minDist) minDist = d;
      }
    }
    if (minDist < bestScore) {
      bestScore = minDist;
      bestSkill = sk;
    }
  }

  // Accept fuzzy match only if close enough (≤2 edits)
  if (bestScore <= 2 && bestSkill) return bestSkill;

  // No good match found — keep the original so backend still gets a search term
  return input.trim();
};

/**
 * Filter dummy providers by skill and/or city.
 * City matching is fuzzy: handles trailing typos like "Kolkataa" → "Kolkata".
 */
export const filterDummyProviders = (skill = '', city = '') => {
  const s = skill.toLowerCase().trim();
  const c = city.toLowerCase().trim();
  return DUMMY_PROVIDERS.filter((p) => {
    const skillMatch =
      !s ||
      p.category.toLowerCase().includes(s) ||
      p.skills.some((sk) => sk.toLowerCase().includes(s) || s.includes(sk.toLowerCase())) ||
      (p.services || []).some((service) => service.toLowerCase().includes(s)) ||
      p.description.toLowerCase().includes(s) ||
      p.headline.toLowerCase().includes(s);

    // Fuzzy city: exact, substring, reverse-substring, or prefix match (trims 1 trailing char)
    const cityNorm = (p.location || p.city || '').toLowerCase();
    const cityMatch =
      !c ||
      cityNorm === c ||
      cityNorm.includes(c) ||
      c.includes(cityNorm) ||
      (c.length > 3 && cityNorm.startsWith(c.slice(0, c.length - 1)));

    return skillMatch && cityMatch;
  });
};
