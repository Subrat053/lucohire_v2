const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('../legacy-mongoose-models/User');
const ProviderProfile = require('../legacy-mongoose-models/ProviderProfile');
const JobPost = require('../legacy-mongoose-models/JobPost');
const { generateSEOPages } = require('../services/SeoEngineService');

// 1. Diverse dataset config
const CITIES = [
  'Delhi', 'Mumbai', 'Bangalore', 'Pune', 'Hyderabad', 
  'Chennai', 'Noida', 'Gurgaon', 'Kolkata', 'Jaipur'
];

const SKILL_PROFILES = [
  {
    roleName: 'React Developer',
    category: 'Software Development',
    skills: ['React', 'JavaScript', 'HTML5', 'CSS3', 'TailwindCSS'],
    bio: 'Specialized in building modern, high-performance responsive web applications using React and TailwindCSS.'
  },
  {
    roleName: 'Node.js Developer',
    category: 'Software Development',
    skills: ['Node.js', 'Express', 'MongoDB', 'REST APIs', 'SQL'],
    bio: 'Backend developer focused on building scalable APIs, microservices, and database systems.'
  },
  {
    roleName: 'Electrician',
    category: 'Home Services',
    skills: ['Electrical Wiring', 'Appliance Repair', 'Circuit Fix', 'Lighting Installation'],
    bio: 'Certified electrician with expertise in residential wiring, smart home installations, and safety checks.'
  },
  {
    roleName: 'Plumber',
    category: 'Home Services',
    skills: ['Pipe Fitting', 'Leak Repair', 'Drain Cleaning', 'Water Heater Repair'],
    bio: 'Professional plumber providing leak detection, bathroom installations, and emergency plumbing services.'
  },
  {
    roleName: 'UX Designer',
    category: 'Design & Creative',
    skills: ['UI/UX Design', 'Figma', 'Prototyping', 'Wireframing', 'User Research'],
    bio: 'Creative UI/UX designer passionate about designing user-friendly interfaces and intuitive user flows.'
  },
  {
    roleName: 'Driver',
    category: 'Logistics',
    skills: ['Chauffeur', 'Delivery Executive', 'Route Navigation', 'Road Safety'],
    bio: 'Experienced driver with a clean record, familiar with city routes, available for corporate or private hire.'
  },
  {
    roleName: 'Accountant',
    category: 'Financial Services',
    skills: ['Bookkeeping', 'Excel', 'Tally Prime', 'GST Return', 'Tax Audits'],
    bio: 'Detail-oriented accountant providing tax filings, financial statements, and financial bookkeeping services.'
  },
  {
    roleName: 'Tutor',
    category: 'Education',
    skills: ['Mathematics', 'Science Teacher', 'English Grammar', 'Home Tuition'],
    bio: 'Dedicated home tutor helping students master school subjects, improve grades, and prepare for exams.'
  },
  {
    roleName: 'Painter',
    category: 'Home Services',
    skills: ['Wall Painting', 'Textured Walls', 'Wood Polish', 'Interior Design'],
    bio: 'Creative home painter specializing in wall textures, wooden polish, and high-quality wall painting.'
  },
  {
    roleName: 'Content Writer',
    category: 'Writing & Translation',
    skills: ['SEO Copywriting', 'Blog Writing', 'Technical Writing', 'Editing'],
    bio: 'Experienced writer generating high-quality SEO-optimized blogs, technical guides, and copywriting pages.'
  }
];

const NAMES = [
  'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Reddy', 'Rohan Das',
  'Deepa Nair', 'Sanjay Gupta', 'Ananya Sen', 'Vikram Singh', 'Kriti Verma',
  'Sunil Mishra', 'Meera Rao', 'Vijay Sharma', 'Nehal Jain', 'Abhishek Patil',
  'Divya Pillai', 'Manoj Joshi', 'Karan Johar', 'Shreya Ghoshal', 'Alok Nath',
  'Girish Karnad', 'Lata Mangeshkar', 'Sachin Tendulkar', 'Rahul Dravid', 'Sourav Ganguly',
  'Anil Kumble', 'VVS Laxman', 'MS Dhoni', 'Virat Kohli', 'Rohit Sharma',
  'Jasprit Bumrah', 'Hardik Pandya', 'Rishabh Pant', 'Ravindra Jadeja', 'Shikhar Dhawan',
  'Ajinkya Rahane', 'Cheteshwar Pujara', 'Ishant Sharma', 'Umesh Yadav', 'Mohammed Shami',
  'Bhuvneshwar Kumar', 'Yuzvendra Chahal', 'Kuldeep Yadav', 'Ravichandran Ashwin', 'Axar Patel',
  'Shreyas Iyer', 'KL Rahul', 'Mayank Agarwal', 'Hanuma Vihari', 'Prithvi Shaw',
  'Arshad Nadeem', 'Neeraj Chopra', 'PV Sindhu', 'Saina Nehwal', 'Mary Kom',
  'Abhinav Bindra', 'Sushil Kumar', 'Yogeshwar Dutt', 'Sakshi Malik', 'Geeta Phogat',
  'Babita Kumari', 'Vinesh Phogat', 'Bajrang Punia', 'Ravi Kumar Dahiya', 'Lovlina Borgohain',
  'Mirabai Chanu', 'Saikhom Mirabai', 'Karnam Malleswari', 'Pullela Gopichand', 'Prakash Padukone',
  'Milkha Singh', 'PT Usha', 'Anju Bobby George', 'Dutee Chand', 'Hima Das',
  'Bhaichung Bhutia', 'Sunil Chhetri', 'Gurpreet Singh Sandhu', 'Sandesh Jhingan', 'Jeje Lalpekhlua',
  'Viswanathan Anand', 'Pentala Harikrishna', 'Vidit Gujrathi', 'Adhiban Baskaran', 'Koneru Humpy',
  'Harika Dronavalli', 'Tania Sachdev', 'Praggnanandhaa R', 'Gukesh D', 'Nihal Sarin',
  'Leander Paes', 'Mahesh Bhupathi', 'Sania Mirza', 'Rohan Bopanna', 'Somdev Devvarman',
  'Yuki Bhambri', 'Ramkumar Ramanathan', 'Prajnesh Gunneswaran', 'Ankita Raina', 'Karman Thandi'
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required for this legacy MongoDB seed');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('DB Connected.');

    // 2. Clear old seeded data to prevent duplicate keys
    console.log('Cleaning old seed users and profiles...');
    const seedUsers = await User.find({ email: /^seed_user_.*@lucohire\.com$/ });
    const userIds = seedUsers.map(u => u._id);
    
    await ProviderProfile.deleteMany({ user: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    await JobPost.deleteMany({ description: /\[Seeded Job\]/ });

    console.log(`Removed ${userIds.length} legacy seeded users and profiles.`);

    const passwordHash = await bcrypt.hash('password123', 10);

    // 3. Generate 100 Providers
    console.log('Generating 100 mock providers...');
    const usersToInsert = [];
    const profilesToInsert = [];

    for (let i = 1; i <= 100; i++) {
      const name = NAMES[(i - 1) % NAMES.length];
      const email = `seed_user_${i}@lucohire.com`;
      const phone = `+9199999${String(10000 + i)}`; // unique phone number
      const skillProfile = SKILL_PROFILES[(i - 1) % SKILL_PROFILES.length];
      const city = CITIES[(i - 1) % CITIES.length];

      // Insert User
      const userId = new mongoose.Types.ObjectId();
      usersToInsert.push({
        _id: userId,
        name,
        email,
        phone,
        password: passwordHash,
        roles: ['provider'],
        activeRole: 'provider',
        approvalStatus: 'approved',
        isVerified: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        cityName: city,
        country: 'IN'
      });

      // Insert Provider Profile
      profilesToInsert.push({
        user: userId,
        skills: skillProfile.skills,
        tier: 'skilled',
        skillLevel: 'skilled',
        experience: '5 years',
        city,
        profileName: name,
        description: `${skillProfile.bio} [Seeded User]`,
        pricing: String(300 + (i % 5) * 100),
        pricingType: 'hourly',
        isVerified: true,
        isApproved: true,
        approvalAction: 'approved',
        currentPlan: 'provider-free-default',
        whatsappAlerts: true
      });
    }

    await User.insertMany(usersToInsert);
    await ProviderProfile.insertMany(profilesToInsert);
    console.log('Seeded 100 Users and Provider Profiles.');

    // 4. Generate Job Posts to test Matching and trigger SEO Page Generation
    // We need 10+ jobs in specific city/skill pairs to cross the SEO threshold!
    // Delhi + React Developer -> 12 active jobs
    // Mumbai + Electrician -> 11 active jobs
    // Bangalore + Plumber -> 10 active jobs
    // Other jobs randomly distributed
    console.log('Generating job posts...');
    const jobsToInsert = [];

    // Pair 1: Delhi + React Developer (12 jobs)
    for (let i = 1; i <= 12; i++) {
      jobsToInsert.push({
        title: 'React Developer',
        skill: 'React Developer',
        speciality: 'Frontend',
        city: 'Delhi',
        budget: { perHour: 600, currency: 'INR' },
        budgetMin: 500,
        budgetMax: 800,
        budgetType: 'hourly',
        description: `Looking for skilled React Developer for building web interfaces. Job #${i} [Seeded Job]`,
        companyName: `Global Tech Delhi ${i}`,
        status: 'active',
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }

    // Pair 2: Mumbai + Electrician (11 jobs)
    for (let i = 1; i <= 11; i++) {
      jobsToInsert.push({
        title: 'Electrician',
        skill: 'Electrician',
        speciality: 'Wiring',
        city: 'Mumbai',
        budget: { perHour: 400, currency: 'INR' },
        budgetMin: 300,
        budgetMax: 500,
        budgetType: 'hourly',
        description: `Need an Electrician for domestic rewiring and installations. Job #${i} [Seeded Job]`,
        companyName: `Mumbai Home Services ${i}`,
        status: 'active',
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }

    // Pair 3: Bangalore + Plumber (10 jobs)
    for (let i = 1; i <= 10; i++) {
      jobsToInsert.push({
        title: 'Plumber',
        skill: 'Plumber',
        speciality: 'Leakage Fix',
        city: 'Bangalore',
        budget: { perHour: 450, currency: 'INR' },
        budgetMin: 350,
        budgetMax: 550,
        budgetType: 'hourly',
        description: `Plumber required for emergency water leakage repairs. Job #${i} [Seeded Job]`,
        companyName: `Bangalore Water Services ${i}`,
        status: 'active',
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }

    // Random Jobs: 17 additional jobs distributed across other cities/skills
    const randomProfiles = SKILL_PROFILES.filter(p => !['React Developer', 'Electrician', 'Plumber'].includes(p.roleName));
    const randomCities = CITIES.filter(c => !['Delhi', 'Mumbai', 'Bangalore'].includes(c));

    for (let i = 1; i <= 17; i++) {
      const profile = randomProfiles[i % randomProfiles.length];
      const city = randomCities[i % randomCities.length];
      jobsToInsert.push({
        title: profile.roleName,
        skill: profile.roleName,
        city,
        budget: { perHour: 350, currency: 'INR' },
        budgetMin: 250,
        budgetMax: 450,
        budgetType: 'hourly',
        description: `Urgent requirement for ${profile.roleName} in ${city}. Job #${i} [Seeded Job]`,
        companyName: `${city} Enterprises ${i}`,
        status: 'active',
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }

    await JobPost.insertMany(jobsToInsert);
    console.log(`Seeded ${jobsToInsert.length} Job Posts.`);

    // 5. Trigger SEO Page Generation
    console.log('Triggering SEO page generation engine...');
    await generateSEOPages();
    console.log('SEO Generation complete.');

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('DB Connection closed.');
    process.exit(0);
  }
}

seed();
