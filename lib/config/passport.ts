import * as bcryptjs from 'bcryptjs'

export const passport = {
  redirect: {
    // Login successful
    login: '/',
    // Logout successful
    logout: '/',
    // Recover successful
    recover: '/'
  },
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

  emails: {
    userRecovery: true
  },

  events: {}
}
