var router = require('express').Router();
var Category = require('../models/category');

// add product category page
router.get('/add-category', function(req, res, next) {
  res.render('admin/add-category', { message: req.flash('success') });
});

// save new category route 
router.post('/add-category', function(req, res, next) {
  var category = new Category();
  category.name = req.body.name;
 
  category.save(function(err) {
    if (err) return next(err);
    req.flash('success', 'New Product Category Added.');
    return res.redirect('/add-category');
  });
});

module.exports = router;

