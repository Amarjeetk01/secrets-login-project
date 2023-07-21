//jshint esversion:6
import 'dotenv/config';
import express from "express";
import bodyParser from "body-parser";
import ejs from "ejs";
import mongoose from "mongoose";
import fs from "fs";
import inquirer from 'inquirer';
import qr from 'qr-image';
import session from 'express-session';
import passport from 'passport';
import passportLocalMongoose from 'passport-local-mongoose';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import findOrCreate from 'mongoose-findorcreate';
import flash from 'connect-flash';
const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(flash());


app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret: 'our little secret.',
  resave: false,
  saveUninitialized: false,
  // cookie: { secure: true }
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://amarjeet:xsUP0m1JQARiW4uA@cluster0.pykd8lp.mongodb.net/userDB?retryWrites=true&w=majority", {useNewUrlParser: true});
const userSchema = mongoose.Schema({
  email: String,
  password: String,
  googleId:String,
  secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "https://amarjeet-kumar.onrender.com/auth/google/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("/register");
  }
}


app.get("/", function(req, res){
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] }));

  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect Secrete page.
    res.redirect('/secrets');
  });

app.get("/login", function(req, res){
  res.render("login");
});
app.get("/register", function(req, res){
  res.render("register");
});
// app.get("/secrets", function(req, res){
  // if(req.isAuthenticated()){
  //   res.render("secrets");
  // }
  // else{
  //   res.redirect("/login");
  // }
  app.get("/secrets", ensureAuthenticated, function(req, res) {
    User.find({"secret": {$ne: null}})
      .then(foundUsers => {
        if (foundUsers) {
          res.render("secrets", {userWithSecrets: foundUsers});
        }
      })
      .catch(err => {
        console.log(err);
      });
  });
 
    
  
app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else{
    res.redirect("/login");
  }
  
});

app.get("/qr-image", function(req, res) {
  res.download("qr_img.png"); 
});






app.post("/submit", async function(req, res){
  const submittedSecret = req.body.secret;

  var qr_png = qr.image(submittedSecret, { type: 'png' });
  qr_png.pipe(fs.createWriteStream('qr_img.png'));
  console.log("QR code image generated successfully!");
  try {
    const foundUser = await User.findById(req.user.id);
    if (foundUser) {
      foundUser.secret = submittedSecret;
      await foundUser.save();
      
      res.redirect("/share");
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/share", ensureAuthenticated, function(req, res) {
  // Render a share page with a link to download the QR code image
  res.render("share", { qrImageUrl: "/qr-image" });
});


app.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.post("/register", async function (req, res) {
  try {
    // Check if the user already exists in the database
    const existingUser = await User.findOne({ username: req.body.username });
    if (existingUser) {
      // Flash message indicating that the user is already registered
      req.flash("error", "User already registered. Please login.");
      res.redirect("/login");
    } else {
      // User is not already registered, proceed with registration
      User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function () {
            res.redirect("/secrets");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
    res.redirect("/register");
  }
});

app.post("/login", async function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local", function(err, user, info) {
        if (err) {
          console.log(err);
          res.redirect("/register");
        }
        if (!user) {
          req.flash("error", "User not registered. Please register first.");
          res.redirect("/register");
        } else {
          req.logIn(user, function(err) {
            if (err) {
              console.log(err);
              res.redirect("/register");
            }
            res.redirect("/secrets");
          });
        }
      })(req, res);
    }
  });
});







app.listen(3000, function() {
    console.log("Server started on port 3000");
  });
