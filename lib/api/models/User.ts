import { FabrixApp } from '@fabrix/fabrix'
import { FabrixModel as Model } from '@fabrix/fabrix/dist/common'
import { SequelizeResolver } from '@fabrix/spool-sequelize'
import { ModelError } from '@fabrix/spool-sequelize/dist/errors'

import { UserDefaults } from '../utils/queryDefaults/UserDefaults'
import * as shortId from 'shortid'

import { isObject, isNumber, isString, defaultsDeep } from 'lodash'

export class UserResolver extends SequelizeResolver {

  findByIdDefault(criteria, options = {}) {
    options = defaultsDeep(options, UserDefaults.default(this.app))
    return this.findById(criteria, options)
  }

  findOneDefault(options = {}) {
    options = defaultsDeep(options, UserDefaults.default(this.app))
    return this.findOne(options)
  }

  /**
   * Resolve by instance Function
   * @param user
   * @param options
   */
  resolveByInstance (user, options: {[key: string]: any} = {}) {
    return Promise.resolve(user)
  }
  /**
   * Resolve by id Function
   * @param user
   * @param options
   */
  resolveById (user, options: {[key: string]: any} = {}) {
    return this.findById(user.id, options)
      .then(resUser => {
        if (!resUser && options.reject !== false) {
          throw new ModelError('E_NOT_FOUND', `User ${user.id} not found`)
        }
        return resUser
      })
  }
  /**
   * Resolve by token Function
   * @param user
   * @param options
   */
  resolveByToken (user, options: {[key: string]: any} = {}) {
    return this.findOne(defaultsDeep({
      where: {
        token: user.token
      }
    }, options))
      .then(resUser => {
        if (!resUser && options.reject !== false) {
          throw new ModelError('E_NOT_FOUND', `User token ${user.token} not found`)
        }
        return resUser
      })
  }
  /**
   * Resolve by email Function
   * @param user
   * @param options
   */
  resolveByEmail (user, options: {[key: string]: any} = {}) {
    return this.findOne(defaultsDeep({
      where: {
        email: user.email
      }
    }, options))
      .then(resUser => {
        if (!resUser && options.reject !== false) {
          throw new ModelError('E_NOT_FOUND', `User email ${user.email} not found`)
        }
        return resUser
      })
  }
  /**
   * Resolve by number Function
   * @param user
   * @param options
   */
  resolveByNumber (user, options: {[key: string]: any} = {}) {
    return this.findById(user, options)
      .then(resUser => {
        if (!resUser && options.reject !== false) {
          throw new ModelError('E_NOT_FOUND', `User ${user.token} not found`)
        }
        return resUser
      })
  }
  /**
   * Resolve by string Function
   * @param user
   * @param options
   */
  resolveByString (user, options: {[key: string]: any} = {}) {
    return this.findOne(defaultsDeep({
      where: {
        token: user
      }
    }, options))
      .then(resUser => {
        if (!resUser && options.reject !== false) {
          throw new ModelError('E_NOT_FOUND', `User ${user} not found`)
        }
        return resUser
      })
  }
  /**
   * Primary Resolve Function
   * @param user
   * @param options
   */
  resolve(user, options: {[key: string]: any} = {}) {
    const resolvers = {
      'instance': user instanceof this.sequelizeModel,
      'id': !!(user && isObject(user) && user.id),
      'token': !!(user && isObject(user) && user.token),
      'number': !!(user && isNumber(user)),
      'string': !!(user && isString(user))
    }
    const type = Object.keys(resolvers).find((key) => resolvers[key])

    switch (type) {
      case 'instance': {
        return this.resolveByInstance(user, options)
      }
      case 'id': {
        return this.resolveById(user, options)
      }
      case 'token': {
        return this.resolveByToken(user, options)
      }
      case 'email': {
        return this.resolveByEmail(user, options)
      }
      case 'number': {
        return this.resolveByNumber(user, options)
      }
      case 'string': {
        return this.resolveByString(user, options)
      }
      default: {
        // TODO create proper error
        const err = new Error(`Unable to resolve User ${user}`)
        return Promise.reject(err)
      }
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
          beforeCreate: [
            (values, options) => {
              // If not token was already created, create it
              if (!values.token) {
                values.token = `user_${shortId.generate()}`
              }
            }
          ]
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

export interface User {
  getSalutation(options): any
  generateRecovery(val): any
  sendResetEmail(options): any
  resolvePassports(options): any
}


/**
 *
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
 */
User.prototype.generateRecovery = function(val) {
  return this.app.config.get('passport.bcrypt').hash(
    val,
    this.app.config.get('passport.bcrypt').genSaltSync(10)
  )
    .then(hash => {
      this.recovery = hash
      return this
    })
}

/**
 *
 */
User.prototype.sendResetEmail = function(options: any = {}) {
  return this.app.emails.User.recovery(this, {
    send_email: this.app.config.get('passport.emails.userRecovery')
  }, {
    transaction: options.transaction || null
  })
    .then(email => {
      if (!this.app.services.NotificationService) {
        this.app.log.debug('Spool-notifications is not installed, please install it to use NotificationService')
        return
      }
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
 * Get's user's passports if not on DAO instance
 */
User.prototype.resolvePassports = function(options: any = {}) {

  if (
    this.passports
    && this.passports.every(t => t instanceof this.app.models.Passport.instance)
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
