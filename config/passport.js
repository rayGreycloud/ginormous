
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var secret = require('../config/secret');
var User = require('../models/user');

// serialize and deserialize
passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


// login middleware
passport.use('local-login', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true
}, function(req, email, password, done) {

  User.findOne({ email: email}, function(err, user) {
    if (err) return done(err);
    // username not found error message
    if (!user) {
      return done(null, false, req.flash('loginMessage', 'Sorry, username not found.' ));
    }
    // incorrect password error message
    if (!user.comparePassword(password)) {
      return done(null, false, req.flash('loginMessage', 'Sorry, that password is incorrect.' ));
    }

    return done(null, user);
  });
}));

// facebook login
passport.use( new FacebookStrategy(secret.facebook, function(token, refreshToken, profile, done){
  User.findOne({ facebook: profile.id }, function(err, user) {
    if (err) return done(err);

    if (user) {
      return done(null, user);
    } else {
      var newUser = new User();
      newUser.email = profile._json.email;
      newUser.facebook = profile.id;
      newUser.tokens.push({ kind: 'facebook', token: token});
      newUser.profile.name = profile.displayName;
      newUser.profile.picture = 'https://graph.facebook.com/' + profile.id + '/picture?type=large';

      newUser.save(function(err) {
        if (err) throw (err);

        return done(null, newUser);
      });
    }
  });
}));

// validation function
exports.isAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};
