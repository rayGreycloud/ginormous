// require dependencies
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var ejs = require('ejs');
var ejsMate = require('ejs-mate');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var flash = require('express-flash');
var mongoose = require('mongoose');
var morgan = require('morgan');
var MongoStore = require('connect-mongo/es5')(session);
var passport = require('passport');

var secret = require('./config/secret');
var User = require('./models/user');
var Category = require('./models/category');

var cartMidware = require('./middleware/cartMidware');

// connect to mongolab database
mongoose.connect(secret.database, function(err) {
  if (err) {
    console.log(err);
  } else {
    console.log('Database connected...');
  }
});

// tell app to use middlewares
app.use(express.static(__dirname + '/public'));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));
app.use(cookieParser());

app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: secret.secretKey,
  store: new MongoStore({ url: secret.database, autoReconnect: true})
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next) {
  res.locals.user = req.user;
  next();
});

app.use(cartMidware);

app.use(function(req, res, next) {
  Category.find({}, function(err, categories) {
    if (err) return next(err);
    res.locals.categories = categories;
    next();
  });
});

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');

var mainRoutes = require('./routes/main');
app.use(mainRoutes);

var userRoutes = require('./routes/user');
app.use(userRoutes);

var adminRoutes = require('./routes/admin');
app.use(adminRoutes);

var apiRoutes = require('./api/api');
app.use('/api', apiRoutes);


// start server
app.listen(secret.port, function(err) {
  if(err) throw err;
  console.log('Server running on port ' + secret.port +'...');

});
