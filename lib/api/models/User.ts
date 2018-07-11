import { FabrixModel as Model } from '@fabrix/fabrix/dist/common'
import { SequelizeResolver } from '@fabrix/spool-sequelize'

import { UserDefaults } from '../utils/queryDefaults/UserDefaults'
import * as shortId from 'shortid'

import { isObject, isNumber, isString, defaultsDeep } from 'lodash'

export interface User {
  getSalutation(options): any
  generateRecovery(val): any
  sendResetEmail(options): any
  resolvePassports(options): any
}

export class UserResolver extends SequelizeResolver {

  findByIdDefault(criteria, options = {}) {
    options = defaultsDeep(options, UserDefaults.default(this.app))
    return this.findById(criteria, options)
  }

  findOneDefault(options = {}) {
    options = defaultsDeep(options, UserDefaults.default(this.app))
    return this.findOne(options)
  }

  resolve(user, options = {}) {
    options = options || {}
    if (user instanceof this.sequelizeModel) {
      return Promise.resolve(user)
    }
    else if (user && isObject(user) && user.id) {
      return this.findById(user.id, options)
        .then(resUser => {
          if (!resUser) {
            throw Error(`User ${user.id} not found`)
          }
          return resUser
        })
    }
    else if (user && isObject(user) && user.email) {
      return this.findOne(defaultsDeep({
        where: {
          email: user.email
        }
      }, options))
        .then(resUser => {
          if (!resUser) {
            throw new Error(`User ${user.email} not found`)
          }
          return resUser
        })
    }
    else if (user && isNumber(user)) {
      return this.findById(user, options)
        .then(resUser => {
          if (!resUser) {
            throw new Error(`User ${user} not found`)
          }
          return resUser
        })
    }
    else if (user && isString(user)) {
      return this.findOne(defaultsDeep({
        where: {
          email: user
        }
      }, options))
        .then(resUser => {
          if (!resUser) {
            throw new Error(`User ${user} not found`)
          }
          return resUser
        })
    }
    else {
      throw new Error(`User ${user} not found`)
    }
  }
}

/**
 * @module User
 * @description User model for basic auth
 */
export class User extends Model {

  static config(app, Sequelize) {
    return {
      // More information about supported models options here : http://docs.sequelizejs.com/en/latest/docs/models-definition/#configuration
      options: {
        underscored: true,
        hooks: {
          beforeCreate: (values, options) => {
            // If not token was already created, create it
            if (!values.token) {
              values.token = `user_${shortId.generate()}`
            }
          }
        }
      }
    }
  }

  static schema(app, Sequelize) {
    return {
      token: {
        type: Sequelize.STRING,
        unique: true
      },
      // Username
      username: {
        type: Sequelize.STRING,
        unique: true
      },
      // Unique Email address for user
      email: {
        type: Sequelize.STRING,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      // Recovery string in the event of a password reset
      recovery: {
        type: Sequelize.STRING,
        allowNull: true
      },
      // An object of user preferences
      preferences: {
        type: Sequelize.JSONB,
        defaultValue: {}
      }
    }
  }

  public static get resolver () {
    return UserResolver
  }

  // If you need associations, put them here
  // More information about associations here: http://docs.sequelizejs.com/en/latest/docs/associations/
  public static associate(models) {
    models.User.hasMany(models.Passport, {
      as: 'passports',
      onDelete: 'CASCADE',
      foreignKey: {
        allowNull: false
      }
    })
  }
}

/**
 *
 * @param options
 * @returns {string}
 */
User.prototype.getSalutation = function(options = {}) {

  let salutation = 'User'

  if (this.username) {
    salutation = this.username
  }
  else if (this.email) {
    salutation = this.email
  }
  else {
    salutation = this.id
  }
  return salutation
}
/**
 *
 * @param val
 * @returns {Promise.<TResult>}
 */
User.prototype.generateRecovery = function(val) {
  return this.app.config.get('passport.bcrypt').hash(
    val,
    this.app.config.get('assport.bcrypt').genSaltSync(10)
  )
    .then(hash => {
      this.recovery = hash
      return this
    })
}
/**
 *
 * @param options
 */
User.prototype.sendResetEmail = function(options: any = {}) {
  return this.app.emails.User.recovery(this, {
    send_email: this.app.config.get('passport.emails.userRecovery')
  }, {
    transaction: options.transaction || null
  })
    .then(email => {
      return this.app.services.NotificationService.create(
        email,
        [ this ],
        {transaction: options.transaction || null}
      )
        .then(notes => {
          this.app.log.debug('NOTIFY', this.id, this.email, this.users.map(u => u.id), email.send_email, notes.users.map(u => u.id))
          return notes
        })
    })
    .catch(err => {
      this.app.log.error(err)
      return
    })
}
/**
 * Get's user's passports if not on DAO
 * @param options
 */
User.prototype.resolvePassports = function(options: any = {}) {

  if (
    this.passports
    && this.passports.every(t => t instanceof this.app.models.Passport.sequelizeModel)
    && options.reload !== true
  ) {
    return Promise.resolve(this)
  }
  else {
    return this.getPassports({transaction: options.transaction || null})
      .then(passports => {
        passports = passports || []
        this.passports = passports
        this.setDataValue('passports', passports)
        this.set('passports', passports)
        return this
      })
  }
}
