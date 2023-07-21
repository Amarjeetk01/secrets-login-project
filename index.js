//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require('express-session')
const passport=require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')

const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');



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

// const secret="ThisIsMySecret"

// userSchema.plugin(encrypt, { secret: secret,encryptedFields: ['password']  });
// userSchema.plugin(encrypt, { secret: process.env.SECRET,encryptedFields: ['password']  });

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

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
  app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}})
      .then(foundUsers => {
        if(foundUsers){
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


app.post("/submit", async function(req, res){
  const submittedSecret = req.body.secret;
  try {
    const foundUser = await User.findById(req.user.id);
    if (foundUser) {
      foundUser.secret = submittedSecret;
      await foundUser.save();
      res.redirect("/secrets");
    }
  } catch (err) {
    console.log(err);
  }
});



app.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});


app.post("/register", function (req, res) {
  // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  //   const newUser = new User({
  //     email: req.body.username,
  //     // password: md5(req.body.password),
  //     password: hash,
  //   });
  
  //   newUser.save()
  //     .then(() => {
  //       res.render("secrets");
  //     })
  //     .catch((err) => {
  //       console.log(err);
  //     });
// });

User.register({username:req.body.username}, req.body.password, function(err, user) {
  if (err) { 
    console.log(err);
    res.redirect("/register");
  }
  else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    })
  }
})
  
});

app.post("/login", async function(req, res){
  // const username = req.body.username;
  // // const password = md5(req.body.password);
  // const password = req.body.password;

  // try {
  //   const foundUser = await User.findOne({ email: username });

  //   // if (foundUser && foundUser.password === password) {
  //   //   res.render("secrets");
  //   // }
  //   bcrypt.compare(password, foundUser.password, function(err, result) {
  //     // result == true
  //     if(result===true){
  //       res.render("secrets");
  //     }
  // });
  // } catch (err) {
  //   console.log(err);
  // }

  const user= new User({
    username :req.body.username,
    password :req.body.password
  })
  req.login(user,function(err){
    if (err) { 
      console.log(err);
      res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      })
    }
  })

});





app.listen(3000, function() {
    console.log("Server started on port 3000");
  });
