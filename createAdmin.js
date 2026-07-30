// Manual one-off admin seed script: `node createAdmin.js`
// The same logic now also runs automatically on every server startup (see
// app.js), so this script is mainly useful for seeding an admin without
// booting the full HTTP server (e.g. in a deploy pipeline's release step).
require("dotenv").config();

const mongoose = require("mongoose");
const seedAdmin = require("./utils/seedAdmin");

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    await seedAdmin();
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
