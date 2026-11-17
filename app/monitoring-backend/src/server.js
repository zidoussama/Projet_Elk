const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

require("dotenv").config();

const app = express();

// ==========================
// Middleware
// ==========================

app.use(express.json());
app.use(cors());


// ==========================
// Routes
// ==========================

//const auth = require("./routes/Authroutes");
//const 


app.get("/test", (req, res) => {
  res.json({ message: "Server works" });
});


//app.use("/api/Auth", auth);


// ==========================
// MongoDB
// ==========================

const mongo_url = process.env.MONGO_URL;
mongoose.set("strictQuery", true);

mongoose
  .connect(mongo_url)
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => console.log(err));

// ==========================
// Server
// ==========================

const port = process.env.PORT;

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});