require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

const port = process.env.PORT || 3000;

const secret = process.env.SECRET;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: secret,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB');

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/google/secrets',
    },
    (accessToken, refreshToken, profile, cb) => {
      console.log(profile, '<--Profile');
      User.findOrCreate({ googleId: profile.id }, (err, user) => {
        return cb(err, user);
      });
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: 'http://localhost:3000/auth/facebook/secrets',
    },
    (accessToken, refreshToken, profile, cb) => {
      User.findOrCreate({ facebookId: profile.id }, (err, user) => {
        return cb(err, user);
      });
    }
  )
);

app.get('/', (req, res) => {
  res.render('home');
});

app.route('/auth/google').get((req, res) => {
  passport.authenticate('google', { scope: ['profile'] })(req, res);
  console.log('google', req.user);
});

app.route('/auth/google/secrets').get((req, res) => {
  passport.authenticate('google', { failureRedirect: '/login' })(req, res, () => {
    console.log('google', req.user);
    res.redirect('/secrets');
  });
});

app.route('/auth/facebook').get((req, res) => {
  passport.authenticate('facebook')(req, res);
  console.log('google', req.user);
});

app.route('/auth/facebook/secrets').get((req, res) => {
  passport.authenticate('facebook', { failureRedirect: '/login' })(req, res, () => {
    console.log('facebook', req.user);
    res.redirect('/secrets');
  });
});

app
  .route('/register')
  .get((req, res) => {
    res.render('register');
  })
  .post((req, res) => {
    User.register({ username: req.body.username }, req.body.password, (err, user) => {
      if (err) {
        console.log(err);
        res.render('/register');
      } else {
        passport.authenticate('local')(req, res, () => {
          res.redirect('/secrets');
        });
      }
    });
  });

app
  .route('/login')
  .get((req, res) => {
    res.render('login');
  })
  .post((req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const user = new User({
      username: username,
      password: password,
    });

    req.login(user, (err) => {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate('local')(req, res, () => {
          res.redirect('/secrets');
        });
      }
    });
  });

app.route('/logout').get((req, res) => {
  req.logout();
  res.render('home');
});

app.route('/secrets').get((req, res) => {
  if (req.isAuthenticated()) {
    User.find({ secret: { $ne: null } }, (err, foundUsers) => {
      if (err) {
        console.log(err);
      } else {
        res.render('secrets', { userWithSecrets: foundUsers });
      }
    });
  } else {
    res.redirect('/login');
  }
});

app
  .route('/submit')
  .get((req, res) => {
    if (req.isAuthenticated()) {
      res.render('submit');
    } else {
      res.redirect('/login');
    }
  })
  .post((req, res) => {
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, (err, foundUser) => {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.secret = submittedSecret;
          foundUser.save(() => {
            res.redirect('/secrets');
          });
        }
      }
    });
  });

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
