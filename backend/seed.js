const connectDB = require('./config/db');
require("dotenv").config();

connectDB()
  .then(async () => {
    const Plan = require("./models/Plan");
    const addons = [
      {
        name: "Top in 1 Pincode",
        slug: "one-pincode-top",
        type: "provider",
        priceMonthly: 200,
        price: 200,
        description: "Rank at the top for 1 Pincode and up to 5 Skills.",
        isActive: true,
      },
      {
        name: "Top in City",
        slug: "top-in-city",
        type: "provider",
        priceMonthly: 500,
        price: 500,
        description: "Rank at the top for 1 entire City and up to 5 Skills.",
        isActive: true,
      },
      {
        name: "Show Top in Country",
        slug: "show-top-in-country",
        type: "provider",
        priceMonthly: 1500,
        price: 1500,
        description: "Rank globally for the entire Country for up to 5 Skills.",
        isActive: true,
      },
    ];
    for (let a of addons) {
      await Plan.updateOne({ slug: a.slug }, { $setOnInsert: a }, { upsert: true });
    }
    console.log("Seeded top plans");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error seeding plans:", err);
    process.exit(1);
  });
