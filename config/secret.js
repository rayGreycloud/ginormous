module.exports = {

  database: 'mongodb://test:test@ds023520.mlab.com:23520/ecommerce041316',
  port: 3000,
  secretKey: 'Daniel',

  facebook: {
    clientID: process.env.FACEBOOK_ID || '1022598987815906',
    clientSecret: process.env.FACEBOOK_SECRET || '94f30e615be54b81c48c199acb485317',
    profileFields: ['emails', 'displayName'],
    callbackURL: 'http://localhost:3000/auth/facebook/callback'
  }
};
