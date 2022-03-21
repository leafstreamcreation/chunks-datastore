// ℹ️ Gets access to environment variables/settings
// https://www.npmjs.com/package/dotenv
require("dotenv/config");

// ℹ️ Connects to the database
require("./db").then((x) => {
  console.log(`Connected to Mongo! Database name: "${x.connections[0].name}"`);
})
.catch((err) => {
  console.error("Error connecting to mongo: ", err);
});

// Handles http requests (express is node js framework)
// https://www.npmjs.com/package/express
const express = require("express");

const app = express();

// ℹ️ This function is getting exported from the config folder. It runs most middlewares
require("./config")(app);

const projectName = "chunks-datastore";
// const capitalized = (string) =>
//   string[0].toUpperCase() + string.slice(1).toLowerCase();

app.locals.title = `${projectName}`;

// 👇 Start handling routes here

const allRoutes = require("./routes");
app.use("/", allRoutes);

// ❗ To handle errors. Routes that don't exist or errors that you handle in specific routes
require("./errors")(app);

module.exports = app;
