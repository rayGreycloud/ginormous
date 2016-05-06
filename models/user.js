// require dependencies
var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');
var Schema = mongoose.Schema;

// user schema
var UserSchema = new Schema({
  email: { type: String, unique: true, lowercase: true},
  password: String,

  facebook: String,
  tokens: Array,

  profile: {
    name: { type: String, default: ''},
    picture: { type: String, default: ''}
  },
  address: String,
  history: [{
    paid: { type: Number, default: 0},
    item: { type: Schema.Types.ObjectId, ref: 'Product'}
  }]
});

// hash password before saving to database
UserSchema.pre('save', function(next) {
  var user = this;
  // check if modified
  if (!user.isModified('password')) return next();
  // generate salt and pass to hash function
  bcrypt.genSalt(10, function(err, salt) {
   if (err) return next(err);
   // hash password with salt and set database password to hash
   bcrypt.hash(user.password, salt, null, function(err, hash) {
     if (err) return next(err);
     user.password = hash;
     next();
   });
  });
});

// compare database password to input password
UserSchema.methods.comparePassword = function(password) {
  return bcrypt.compareSync(password, this.password);
}

//
UserSchema.methods.gravatar = function(size) {
  if (!this.size) size = 200;
  if (!this.email) return 'https://gravatar.com/avatar/?s=' + size + '&d=retro';
  var md5 = crypto.createHash('md5').update(this.email).digest('hex');
  return 'https://gravatar.com/avatar/' + md5 + '?s=' + size + '&d=retro';
}


// export module
module.exports = mongoose.model('User', UserSchema);
