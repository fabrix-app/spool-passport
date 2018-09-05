import { FabrixApp } from '@fabrix/fabrix'
import { FabrixModel as Model } from '@fabrix/fabrix/dist/common'
import { SequelizeResolver } from '@fabrix/spool-sequelize'

/**
 * @module Passport
 * @description Passport model
 */
export interface Passport {
  generateHash(app: FabrixApp, password: any): any
  validateUser(app: FabrixApp, password: any): any
  validatePassword(app: FabrixApp, password: any): any
  resolveUser(app: FabrixApp, options: any): any
}
export class Passport extends Model {

  static config(app, Sequelize): {[key: string]: any} {
    return {
      options: {
        underscored: true,
        hooks: {
          beforeCreate: [
            (values, options) => {
              // return hashPassword(app.config.passport.bcrypt, values)
              // values.hashPassword(options)
              return values.generateHash(app, values.password)
                .catch(err => {
                  return Promise.reject(err)
                })
            }
          ],
          beforeUpdate: [
            (values, options) => {
              return values.generateHash(app, values.password)
                .catch(err => {
                  return Promise.reject(err)
                })
            }
          ],
          // beforeUpdate: (values, options) => {
          //   options.validate = false // skip re-validation of password hash
          //   values.hashPassword(options)
          // }
        }
      }
    }
  }

  static schema(app, Sequelize): {[key: string]: any} {
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

  public static get resolver () {
    return SequelizeResolver
  }

  // If you need associations, put them here
  // More information about associations here: http://docs.sequelizejs.com/en/latest/docs/associations/
  public static associate(models) {
    models.Passport.belongsTo(models.User, {
      //
      foreignKey: 'user_id'
    })
  }
}


/**
 *
 */
Passport.prototype.generateHash = function(app, password) {
  if (!password) {
    return Promise.resolve(this)
  }
  return app.config.get('passport.bcrypt').hash(
    password,
    app.config.get('passport.bcrypt').genSaltSync(10)
  )
    .then(hash => {
      this.password = hash
      return this
    })
}
/**
 *
 */
Passport.prototype.validatePassword = function(app, password) {
  return app.config.get('passport.bcrypt').compare(password, this.password)
}
/**
 *
 */
Passport.prototype.resolveUser = function(app, options: {reload?: boolean, transaction?: any} = {}) {
  if (
    this.User
    && this.User instanceof app.models['User'].resolver.sequelizeModel
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
