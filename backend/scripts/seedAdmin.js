require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");

// Helper to parse CLI arguments supporting both --key=val and --key val
const getArg = (key) => {
  const argWithEq = process.argv.find((arg) => arg.startsWith(`--${key}=`));
  if (argWithEq) return argWithEq.split("=").slice(1).join("=");
  const idx = process.argv.findIndex((arg) => arg === `--${key}`);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith("--")) {
    return process.argv[idx + 1];
  }
  return null;
};

const seedAdmin = async () => {
  const email = (
    getArg("email") ||
    process.env.ADMIN_SEED_EMAIL ||
    "admin@servicehub.com"
  ).trim().toLowerCase();

  const password =
    getArg("password") ||
    process.env.ADMIN_SEED_PASSWORD ||
    "admin123";

  const name =
    getArg("name") ||
    process.env.ADMIN_SEED_NAME ||
    "Admin";

  const force = process.argv.includes("--force");

  if (!email || !password) {
    console.error("❌ Admin email and password are required.");
    process.exit(1);
  }

  console.log(`\n🌱 Seeding Admin user...`);
  console.log(`   Target Email : ${email}`);
  console.log(`   Admin Name   : ${name}`);
  console.log(`   Force Reset  : ${force ? "Yes (--force)" : "No (will skip if already exists)"}\n`);

  // Check if admin already exists in both tables
  const existingAdmin = await prisma.admin.findUnique({ where: { email } });
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if ((existingAdmin || existingUser) && !force) {
    console.log(`ℹ️  Admin already exists for "${email}".`);
    if (existingAdmin) console.log(`   - Found in Admin table (id: ${existingAdmin.id})`);
    if (existingUser) console.log(`   - Found in User table (id: ${existingUser.id})`);
    console.log(`\n💡 To update/reset credentials, run with the --force flag:`);
    console.log(`   npm run seed:admin -- --force`);
    console.log(`   or: node scripts/seedAdmin.js --force\n`);
    await prisma.$disconnect();
    process.exit(0);
  }

  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const emailHash = crypto.createHash("sha256").update(email).digest("hex");

  // 1. Upsert into Admin table (used by /api/v1/admin/login)
  const adminRecord = await prisma.admin.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
      role: "admin",
      isActive: true,
    },
    create: {
      name,
      email,
      password: hashedPassword,
      role: "admin",
      isActive: true,
    },
  });
  console.log(`✅ [Admin Table] Seeded record (id: ${adminRecord.id})`);

  // 2. Upsert into User table (used by unified login /api/v1/auth/login-email & adminAuth middleware)
  const userRecord = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
      role: "admin",
      roles: ["admin"],
      activeRole: "admin",
      roleIntent: "admin",
      isActive: true,
      isEmailVerified: true,
      isVerified: true,
      hasPassword: true,
      email_hash: emailHash,
      approvalStatus: "approved",
      termsAccepted: true,
    },
    create: {
      name,
      email,
      password: hashedPassword,
      role: "admin",
      roles: ["admin"],
      activeRole: "admin",
      roleIntent: "admin",
      authProvider: "email",
      isActive: true,
      isEmailVerified: true,
      isVerified: true,
      hasPassword: true,
      email_hash: emailHash,
      approvalStatus: "approved",
      termsAccepted: true,
    },
  });
  console.log(`✅ [User Table]  Seeded unified user (id: ${userRecord.id})`);

  console.log(`\n🎉 Admin seeded successfully!`);
  console.log(`-------------------------------------------`);
  console.log(` Email    : ${email}`);
  console.log(` Password : ${password}`);
  console.log(` Role     : admin`);
  console.log(`-------------------------------------------\n`);

  await prisma.$disconnect();
  process.exit(0);
};

seedAdmin().catch(async (error) => {
  console.error("❌ Seed admin failed:", error);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
