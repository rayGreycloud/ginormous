// require express router object
var router = require('express').Router();
var User = require('../models/user');
var Product = require('../models/product');
var Cart = require('../models/cart');
var async = require('async');
var stripe = require('stripe')('sk_test_Iso7OGUCbjHpszSkuV1ZwHdW');

// pagination
function paginate(req, res, next) {
  var perPage = 9;
  var page = req.params.page;
  // pagination control
  Product
    .find()
    .skip( perPage * page) // skip products on prior pages
    .limit (perPage) // limit # of products shown on 1 page
    .populate('category')
    .exec(function(err, products) {
      if (err) return next(err);
      Product.count().exec(function(err, count) {
        if (err) return next(err);
        res.render('main/product-main', {
          products: products,
          pages: count / perPage
        });
      });
    });
}

// product mapping btwn database and elasticsearch
Product.createMapping(function(err, mapping) {
  if (err) {
    console.log('Error: Mapping not created');
    console.log(err);
  } else {
    console.log('Mapping created.');
    console.log(mapping);
  }
});

// send data to product database
var stream = Product.synchronize();
var count = 0;

stream.on('data', function() {
  count++;
});

stream.on('close', function() {
  console.log('Indexed ' + count + ' documents.');
});

stream.on('error', function() {
  console.log(err);
});

// routes
//search routes
router.post('/search', function(req, res, next) {
  res.redirect('/search?q=' + req.body.q);
});

router.get('/search', function(req, res, next) {
  if (req.query.q) {
    Product.search({
      query_string: { query: req.query.q }
    }, function(err, results) {
      if (err) return next(err);
      var data = results.hits.hits.map(function(hit) {
        return hit;
      });
      res.render('main/search-result', {
        query: req.query.q,
        data: data
      });
    });
  }
});

// show page of search results
router.get('/page/:page', function(req, res, next) {
     paginate(req, res, next);
});


// home page route
router.get('/', function(req, res, next) {

  if (req.user) {
    paginate(req, res, next);
  } else {
  res.render('main/home');
  }
});

// about page route
router.get('/about', function(req, res) {
  res.render('main/about');
});

// show products page for a category
router.get('/products/:id', function(req, res, next) {
  Product
  .find({ category: req.params.id })
  .populate('category')
  .exec(function(err, products) {
    if (err) return next(err);
    res.render('main/category', {
      products: products
    });
  });
});

// show product page
router.get('/product/:id', function(req, res, next) {
  Product.findById({ _id: req.params.id }, function(err, product) {
    if (err) return next(err);
    res.render('main/product', {
      product: product
    });
  });
});

// saving items to shopping cart
router.post('/product/:product_id', function(req, res, next) {
  Cart.findOne({ owner: req.user._id }, function(err, cart) {
    if (err) return next(err);
    cart.items.push({
        item: req.body.product_id,
        price: parseFloat(req.body.priceValue),
        quantity: parseInt(req.body.quantity)
    });

    cart.total = (cart.total + parseFloat(req.body.priceValue)).toFixed(2);

    cart.save(function(err) {
      if (err) return next(err);
      return res.redirect('/cart');
    });
  });
});

//removing item from shopping cart
router.post('/remove', function(req, res, next) {
  Cart.findOne({ owner: req.user._id }, function(err, foundCart) {
    if (err) return next(err);
    foundCart.items.pull(String(req.body.item));

    foundCart.total = (foundCart.total - parseFloat(req.body.price)).toFixed(2);
    foundCart.save(function(err) {
      if (err) return next(err);
      req.flash('remove', 'Item(s) removed from your cart');
      res.redirect('/cart');
    });
  });
});

// show shopping cart
router.get('/cart', function(req, res, next) {
  Cart
    .findOne({ owner: req.user._id})
    .populate('items.item')
    .exec(function(err, foundCart) {
      if (err) return next(err);
      res.render('main/cart', {
        foundCart: foundCart,
        message: req.flash('remove')
      });
    });
});

// Stripe payment route
router.post('/payment', function(req, res, next) {
  // process payment
  var stripeToken = req.body.stripeToken;
  var currentCharges = Math.round(req.body.stripeMoney * 100);
  stripe.customers.create({
    source: stripeToken
  }).then(function(customer) {
    return stripe.charges.create({
      amount: currentCharges,
      currency: 'usd',
      customer: customer.id
    });
  }).then(function(charge) {
    async.waterfall([
      function(callback) {
        Cart.findOne({ owner: req.user._id}, function(err, cart) {
          callback(err, cart);
        });
      },
      // push purchases into user history
      function(cart, callback) {
        User.findOne({ _id: req.user._id}, function(err, user) {
          if (user) {
            for (var i = 0; i < cart.items.length; i++) {
              user.history.push({
                item: cart.items[i].item,
                paid: cart.items[i].price
              });
            };

            user.save(function(err, user) {
                if (err) return next(err);
                callback(err, user);
            });
          }
        });
      },
      // empty cart
      function(user) {
        Cart.update({ owner: user._id}, {$set: { items: [], total: 0}}, function(err, updated) {
            if (updated) {
              res.redirect('/profile');
            }
          });
        }
      ]);
    });
});


// export router
module.exports = router;
