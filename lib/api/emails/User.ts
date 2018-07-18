import { Email } from '@fabrix/spool-email'

export class User extends Email {

  /**
   *
   */
  registered(user, data, options) {
    const UserModel = this.app.models['User']
    let resUser
    return UserModel.resolve(user, options)
      .then(_user => {
        if (!_user) {
          throw new Error('User did not resolve')
        }
        resUser = _user

        const subject = data.subject || `Welcome ${ resUser.getSalutation(this.app) || 'User'}`
        const sendEmail = typeof data.send_email !== 'undefined' ? data.send_email : true

        return this.compose('registered', subject, resUser, sendEmail)
      })
  }

  /**
   *
   */
  recover(user, data, options) {
    const UserModel = this.app.models['User']
    let resUser
    return UserModel.resolve(user, options)
      .then(_user => {
        if (!_user) {
          throw new Error('User did not resolve')
        }
        resUser = _user

        const subject = data.subject || `${ resUser.getSalutation() || 'User'} Recover Password`
        const sendEmail = typeof data.send_email !== 'undefined' ? data.send_email : true

        return this.compose('recover', subject, resUser, sendEmail)
      })
  }
}
