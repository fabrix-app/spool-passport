import { FabrixModel as Model } from '@fabrix/fabrix/dist/common'
/**
 * @module Passport
 * @description Passport model
 */
export interface Passport {
  generateHash(password: any): any
  validateUser(password: any): any
  validatePassword(password: any): any
  resolveUser(options: any): any
}
export class Passport extends Model {

  static config(app, Sequelize) {
    return {
      options: {
        underscored: true,
        hooks: {
          beforeCreate: (values, options) => {
            // return hashPassword(app.config.passport.bcrypt, values)
            // values.hashPassword(options)
            return values.generateHash(values.password)
              .catch(err => {
                return Promise.reject(err)
              })
          },
          beforeUpdate: (values, options) => {
            // return hashPassword(app.config.passport.bcrypt, values)
            // values.hashPassword(options)
            return values.generateHash(values.password)
              .catch(err => {
                return Promise.reject(err)
              })
          },
          // beforeUpdate: (values, options) => {
          //   options.validate = false // skip re-validation of password hash
          //   values.hashPassword(options)
          // }
        }
      }
    }
  }

  static schema(app, Sequelize) {
    return {
      user_id: {
        type: Sequelize.INTEGER
      },

      protocol: {
        type: Sequelize.STRING,
        validate: {
          isAlphanumeric: true
        },
        allowNull: false
      },

      password: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          len: {
            args: [8, undefined],
            msg: 'Password must be long at least 8 characters'
          }
        }
      },

      provider: {
        type: Sequelize.STRING,
        allowNull: true
      },

      identifier: {
        type: Sequelize.STRING,
        allowNull: true
      },

      tokens: {
        type: Sequelize.STRING,
        allowNull: true
      }
    }
  }

  // If you need associations, put them here
  // More information about associations here: http://docs.sequelizejs.com/en/latest/docs/associations/
  associate(models) {
    models.Passport.belongsTo(models.User, {
      //
      foreignKey: 'user_id'
    })
  }
}


/**
 *
 * @param password
 * @returns {Promise.<TResult>}
 */
Passport.prototype.generateHash = function(password) {
  if (!password) {
    return Promise.resolve(this)
  }
  return this.app.config.get('passport.bcrypt').hash(
    password,
    this.app.config.get('passport.bcrypt').genSaltSync(10)
  )
    .then(hash => {
      this.password = hash
      return this
    })
}
/**
 *
 * @param password
 * @returns {Promise}
 */
Passport.prototype.validatePassword = function(password) {
  return this.app.config.get('passport.bcrypt').compare(password, this.password)
}
/**
 *
 * @param options
 * @returns {*}
 */
Passport.prototype.resolveUser = function(options: {reload?: boolean, transaction?: any} = {}) {
  if (
    this.User
    && this.User instanceof this.app.models['User']
    && options.reload !== true
  ) {
    return Promise.resolve(this)
  }
  else {
    return this.getUser({transaction: options.transaction || null})
      .then(_user => {
        _user = _user || null
        this.User = _user
        this.setDataValue('User', _user)
        this.set('User', _user)
      })
  }
}
