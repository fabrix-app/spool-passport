import { FabrixApp } from '@fabrix/fabrix'
import { FabrixModel as Model } from '@fabrix/fabrix/dist/common'
import { SequelizeResolver } from '@fabrix/spool-sequelize'

import { UserDefaults } from '../utils/queryDefaults/UserDefaults'
import * as shortId from 'shortid'

import { isObject, isNumber, isString, defaultsDeep } from 'lodash'

export interface User {
  getSalutation(app: FabrixApp, options): any
  generateRecovery(app: FabrixApp, val): any
  sendResetEmail(app: FabrixApp, options): any
  resolvePassports(app: FabrixApp, options): any
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
 */
User.prototype.getSalutation = function(app, options = {}) {

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
 */
User.prototype.generateRecovery = function(app, val) {
  return app.config.get('passport.bcrypt').hash(
    val,
    app.config.get('passport.bcrypt').genSaltSync(10)
  )
    .then(hash => {
      this.recovery = hash
      return this
    })
}

/**
 *
 */
User.prototype.sendResetEmail = function(app, options: any = {}) {
  return app.emails.User.recovery(this, {
    send_email: app.config.get('passport.emails.userRecovery')
  }, {
    transaction: options.transaction || null
  })
    .then(email => {
      if (!app.services.NotificationService) {
        app.log.debug('Spool-notifications is not installed, please install it to use NotificationService')
        return
      }
      return app.services.NotificationService.create(
        email,
        [ this ],
        {transaction: options.transaction || null}
      )
        .then(notes => {
          app.log.debug('NOTIFY', this.id, this.email, this.users.map(u => u.id), email.send_email, notes.users.map(u => u.id))
          return notes
        })
    })
    .catch(err => {
      app.log.error(err)
      return
    })
}
/**
 * Get's user's passports if not on DAO instance
 */
User.prototype.resolvePassports = function(app, options: any = {}) {

  if (
    this.passports
    && this.passports.every(t => t instanceof app.models.Passport.resolver.sequelizeModel)
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
