//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require('mongoose-encryption');

const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');



app.use(bodyParser.urlencoded({extended: true}));
mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true});
const userSchema = mongoose.Schema({
  email: String,
  password: String
});
// const secret="ThisIsMySecret"

// userSchema.plugin(encrypt, { secret: secret,encryptedFields: ['password']  });
userSchema.plugin(encrypt, { secret: process.env.SECRET,encryptedFields: ['password']  });

const User = mongoose.model("User", userSchema);

app.get("/", function(req, res){
  res.render("home");
});
app.get("/login", function(req, res){
  res.render("login");
});
app.get("/register", function(req, res){
  res.render("register");
});
app.post("/register", function (req, res) {
  const newUser = new User({
    email: req.body.username,
    password: req.body.password,
  });

  newUser.save()
    .then(() => {
      res.render("secrets");
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/login", async function(req, res){
  const username = req.body.username;
  const password = req.body.password;

  try {
    const foundUser = await User.findOne({ email: username });
    if (foundUser && foundUser.password === password) {
      res.render("secrets");
    }
  } catch (err) {
    console.log(err);
  }
});





app.listen(3000, function() {
    console.log("Server started on port 3000");
  });