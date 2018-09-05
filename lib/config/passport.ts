import * as bcryptjs from 'bcryptjs'

export const passport = {
  // Prefix the routes
  prefix: null,

  redirect: {
    // Login successful
    login: '/',
    // Logout successful
    logout: '/',
    // Recover successful
    recover: '/'
  },

  // Algorithm to use
  bcrypt: bcryptjs,

  // onUserLogin: (req, app, user) => {
  //   user = user.toJSON()
  //   if (user.passports) {
  //     delete user.passports
  //   }
  //   return Promise.resolve(user)
  // },

  mergeThirdPartyProfile: (user, profile) => {
    return Promise.resolve(user)
  },

  // Send Emails
  emails: {
    userRecovery: true
  },

  // Allow Events
  events: {
    'user.registered': true,
    'user.password.updated': true,
    'user.login': true,
    'user.password.recover': true,
    'user.password.reset': true
  }
}
