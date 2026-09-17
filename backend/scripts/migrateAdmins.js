require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/User");
const Admin = require("../models/Admin");

const isDryRun = process.argv.includes("--dry-run");

const collectAdminCandidates = async () => {
  return User.find({
    $or: [
      { roles: { $in: ["admin"] } },
      { activeRole: "admin" },
      { role: "admin" },
    ],
  }).select("name email password roles activeRole role");
};

const migrateAdmins = async () => {
  await connectDB();

  const candidates = await collectAdminCandidates();
  if (!candidates.length) {
    console.log("No admin users found to migrate.");
    process.exit(0);
  }

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const user of candidates) {
    if (!user.email) {
      skipped += 1;
      continue;
    }

    const existing = await Admin.findOne({ email: user.email }).select(
      "+password"
    );

    if (existing) {
      if (!isDryRun) {
        existing.name = existing.name || user.name || "Admin";
        if (!existing.password && user.password) {
          existing.password = user.password;
        }
        existing.isActive = true;
        await existing.save();
      }
      updated += 1;
      continue;
    }

    if (!user.password) {
      console.log(
        `Skipping ${user.email} (no password on User record). Set a password before migrating.`
      );
      skipped += 1;
      continue;
    }

    if (!isDryRun) {
      await Admin.create({
        name: user.name || "Admin",
        email: user.email,
        password: user.password,
        role: "admin",
      });
    }

    created += 1;
  }

  console.log(
    `Migration complete. created=${created} updated=${updated} skipped=${skipped}`
  );
  if (isDryRun) {
    console.log("Dry run mode: no writes performed.");
  }
  process.exit(0);
};

migrateAdmins().catch((error) => {
  console.error("Migrate admins failed:", error.message);
  process.exit(1);
});
