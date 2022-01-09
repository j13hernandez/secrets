const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect('mongodb://localhost:27017/userDB');

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const User = new mongoose.model('User', userSchema);

app.get('/', (req, res) => {
  res.render('home');
});

app
  .route('/login')
  .get((req, res) => {
    res.render('login');
  })
  .post((req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({ email: username }, (err, foundUser) => {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          if (foundUser.password === password) {
            res.render('secrets');
          }
        }
      }
    });
  });

app
  .route('/register')
  .get((req, res) => {
    res.render('register');
  })
  .post((req, res) => {
    const user = new User({
      email: req.body.username,
      password: req.body.password,
    });
    user.save((err) => {
      if (err) {
        console.log(err);
      } else {
        res.render('secrets');
      }
    });
  });

app.listen(3000, () => {
  console.log('Listening on port 3000');
});