//jshint esversion:6
require("dotenv").config();
const request = require("request");
const https = require("https");




require("./config/database").connect();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


const bodyParser = require("body-parser");
const ejs = require("ejs");
const User = require("./model/user");
const Post = require("./model/post");
const auth = require("./middleware/auth");

const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(express.json({ limit: "50mb" }));
 app.get("/", function(req,res){
  res.render("start");
 })
 const homeStartingContent = "Hi! Welcome to our blog website. Write your stories and see what others have to say!! ";
const aboutContent = "This is a blog website where you can post your blogs and reads other users blogs";
const contactContent = "Email-kusummahajan27@gmail.com";
app.get("/register", function(req, res){
  res.render("register");
});

app.get("/login",function(req,res){
  res.render("login");
});
app.post("/register", async (req, res) => {
  try {
    // Get user input
    const { first_name, last_name, email, password } = req.body;

    // Validate user input
    if (!(email && password && first_name && last_name)) {
      res.status(400).send("All input is required");
    }

    // check if user already exist
    // Validate if user exist in our database
    const oldUser = await User.findOne({ email });

    if (oldUser) {
      return res.status(409).send("User Already Exist. Please Login");
    }

    //Encrypt user password
    encryptedPassword = await bcrypt.hash(password, 10);

    // Create user in our database
    const user = await User.create({
      first_name,
      last_name,
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      password: encryptedPassword,
    });

    // Create token
    const token = jwt.sign(
      { user_id: user._id, email },
      process.env.TOKEN_KEY,
      {
        expiresIn: "2h",
      }
    );
    // save user token
    user.token = token;

    // return new user
    if(res.status(201)){
      Post.find({}, function(err, posts){
    res.render("home", {
      startingContent: homeStartingContent,
      posts: posts
      });
  });
    }
    
  } catch (err) {
    console.log(err);
  }
});

app.post("/login",auth, async (req, res) => {
  try {
    // Get user input
    const { email, password } = req.body;

    // Validate user input
    if (!(email && password)) {
      res.status(400).send("All input is required");
    }
    // Validate if user exist in our database
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Create token 
      
      const token = jwt.sign(
        { user_id: user._id, email },
        process.env.TOKEN_KEY,
        {
          expiresIn: "2h",
        }
      );
      res.setHeader('x-access-token', 'Bearer '+ token);
      // save user token
      user.token = token;

      // user
      if(res.status(200)){
        Post.find({}, function(err, posts){
      res.render("home", {
        startingContent: homeStartingContent,
        posts: posts
        });
    });
      }
      // res.status(200).json(user);
    }
    res.status(400).send("Invalid Credentials");
  } catch (err) {
    console.log(err);
  }
});
 
app.get("/compose", function(req, res){
  res.render("compose");
});

app.post("/compose", function(req, res){
  const post = new Post({
    title: req.body.postTitle,
    content: req.body.postBody
  });


  post.save(function(err){
    if (!err){
        res.redirect("/");
    }
  });
});


app.get("/posts/:postId", function(req, res){

const requestedPostId = req.params.postId;

  Post.findOne({_id: requestedPostId}, function(err, post){
    res.render("post", {
      title: post.title,
      content: post.content
    });
  });

});

app.get("/about", function(req, res){
  res.render("about", {aboutContent: aboutContent});
});

app.get("/contact", function(req, res){
  res.render("contact", {contactContent: contactContent});
});

app.post("/form", function(req, res) {
  const firstname = req.body.fname;
  const email = req.body.email;
  const data = {
    members: [{
      email_address: email,
      status: "subscribed",
    }]
  }

  const jsonData = JSON.stringify(data);
  

  const options = {
    method: "POST",
    auth: "kusum:0f81b925862919bbd4e5a8d879079a2f-us5"

  }

  const request = https.request(process.env.URL, options, function(response) {
    if (response.statusCode=== 200){
      res.sendFile(__dirname + "/views/partials/success.ejs");
      res.render("success");
    }
   response.on("data", function(data) {
      console.log(JSON.parse(data))
    })
  })
  request.write(jsonData);
  request.end();
  
});
// This should be the last route else any after it won't work
app.use("*", (req, res) => {
  res.status(404).json({
    success: "false",
    message: "Page not found",
    error: {
      statusCode: 404,
      message: "You reached a route that is not defined on this server",
    },
  });
});


module.exports = app;