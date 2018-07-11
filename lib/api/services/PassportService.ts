import { FabrixService as Service } from '@fabrix/fabrix/dist/common'
import { PassportError } from '../../errors/PassportError'

import * as passport from 'passport'
import * as protocols from '../../protocols'

const jwt = require('jsonwebtoken')
const _ = require('lodash')

/**
 * @module PassportService
 * @description Main passport service
 */
export class PassportService extends Service {
  public protocols
  public passport

  constructor(app) {
    super(app)
    this.protocols = protocols
    this.passport = passport
  }

  publish(type, event, options: {save?: boolean, transaction?: any} = {}) {
    if (this.app.services.EngineService) {
      return this.app.services.EngineService.publish(type, event, options)
    }
    else {
      this.app.log.debug('Spool-engine is not installed, please install it to use publish')
    }
    return Promise.resolve()
  }

  // tslint:disable max-line-length
  validateEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return re.test(email)
  }
  /**
   * Create a token based on the passed user
   * @param user infos to serialize
   */
  createToken(user) {
    const config = this.app.config.get('passport.strategies.jwt')
    return jwt.sign(
      {
        user: user.toJSON ? user.toJSON() : user
      },
      config.tokenOptions.secret,
      {
        algorithm: config.tokenOptions.algorithm,
        expiresIn: config.tokenOptions.expiresInSeconds,
        issuer: config.tokenOptions.issuer,
        audience: config.tokenOptions.audience
      }
    )
  }

  /**
   * Redirect to the right provider URL for login
   * @param req request object
   * @param res response object
   * @param provider to go to
   */
  endpoint(req, res, provider) {
    const strategies = this.app.config.get('passport.strategies')
    const options: {scope?: any } = {}

    // If a provider doesn't exist for this endpoint, send the user back to the
    // login page
    if (!strategies.hasOwnProperty(provider)) {
      return Promise.reject(this.app.config.get('passport.redirect.login'))
    }

    // Attach scope if it has been set in the config
    if (strategies[provider].hasOwnProperty('scope')) {
      options.scope = strategies[provider].scope
    }

    // Redirect the user to the provider for authentication. When complete,
    // the provider will redirect the user back to the application at
    //     /auth/:provider/callback
    this.passport.authenticate(provider, options)(req, res, req.next)
    return Promise.resolve()
  }

  /**
   * Provider callback to log or register the user
   * @param req request object
   * @param res response object
   * @param next callback
   */
  callback(req, res, next) {
    const provider = req.params.provider || 'local'
    const action = req.params.action

    if (provider === 'local') {
      if (action === 'register' && !req.user) {
        this.register(req, req.body)
          .then(user => next(null, user))
          .catch(next)
      }
      else if (action === 'connect' && req.user) {
        this.connect(req.user, req.body.password)
          .then(user => next(null, req.user))
          .catch(next)
      }
      else if (action === 'disconnect' && req.user) {
        this.disconnect(req, next)
      }
      else if (action === 'reset' && req.user) {
        this.reset(req.user, req.body.password)
          .then(user => next(null, user))
          .catch(next)
      }
      else if (action === 'recover' && !req.user) {
        this.resetRecover(req, req.body)
          .then(user => next(null, user))
          .catch(next)
      }
      else {
        let id = this.app.config.get('passport.strategies.local.options.usernameField')
        if (!id) {
          if (req.body['username']) {
            id = 'username'
          }
          else if (req.body['email']) {
            id = 'email'
          }
          else if (req.body['identifier']) {
            const test = this.validateEmail(req.body['identifier'])
            id = test ? 'email' : 'username'
          }
          else {
            const err = new PassportError('E_VALIDATION', 'No username or email field')
            return next(err)
          }
        }

        this.login(req, id, req.body.identifier || req.body[id], req.body.password)
          .then(user => next(null, user))
          .catch(next)
      }
    }
    else {
      if (action === 'disconnect' && req.user) {
        this.disconnect(req, next)
      }
      else {
        this.passport.authenticate(provider, next)(req, res, req.next)
      }
    }
  }

  /**
   * Register the user
   * @param req
   * @param userInfos
   * @param options
   * @returns {*}
   */
  register(req, userInfos, options: {transaction?: any} = {}) {
    const User = this.app.models['User']
    const Passport = this.app.models['Passport']

    if (userInfos.email) {
      userInfos.email = userInfos.email.toLowerCase()
    }
    if (userInfos.username) {
      userInfos.username = userInfos.username.toLowerCase()
    }
    if (userInfos.identifier) {
      userInfos.identifier = userInfos.identifier.toLowerCase()
    }

    const password = userInfos.password
    delete userInfos.password

    let resUser
    return Promise.resolve()
      .then(() => {
        if (!password) {
          const err = new PassportError('E_VALIDATION', 'No Password Provided', 400)
          throw err
        }

        userInfos.passports = {
          protocol: 'local',
          password: password
        }

        return User.create(userInfos, {
          include: [
            {
              model: Passport,
              as: 'passports'
            }
          ],
          transaction: options.transaction || null
        })
      })
      .then(_user => {
        if (!_user) {
          throw new Error('E_USER_NOT_CREATED')
        }
        resUser = _user

        const event = {
          object_id: resUser.id,
          object: 'user',
          objects: [{
            user: resUser.id
          }],
          type: 'user.registered',
          message: `User ${resUser.getSalutation()} registered`,
          data: resUser
        }
        return this.publish(event.type, event, {
          save: true,
          transaction: options.transaction || null
        })
      })
      .then(event => {

        const onUserLogin = this.app.config.get('passport.onUserLogin')
        if (typeof onUserLogin === 'object') {
          const promises = []
          Object.keys(onUserLogin).forEach(func => {
            promises.push(onUserLogin[func])
          })
          return Promise.all(promises.map(func => {
            return func(req, this.app, resUser)
          }))
            .then(userAttrs => {
              userAttrs.map(u => {
                resUser = _.extend(resUser, u)
              })
              return Promise.resolve(resUser)
            })
            .catch(err => {
              return Promise.reject(err)
            })
        }
        else if (typeof onUserLogin === 'function') {
          return Promise.resolve(onUserLogin(req, this.app, resUser))
        }
        else {
          return Promise.resolve(resUser)
        }
      })
  }

  /**
   * Update the local passport password of an user
   * @param user
   * @param password
   * @param options
   * @returns {Promise}
   */
  updateLocalPassword(user, password, options: {save?: boolean, transaction?: any} = {}) {
    const User = this.app.models['User']

    let resUser
    return User.resolve(user, {transaction: options.transaction || null})
      .then(_user => {
        if (!_user) {
          throw new Error('E_USER_NOT_FOUND')
        }
        resUser = _user
        return resUser.resolvePassports({transaction: options.transaction || null})
      })
      .then(() => {
        if (!resUser.passports || resUser.passports.length === 0) {
          throw new Error('E_NO_AVAILABLE_PASSPORTS')
        }
        const localPassport = resUser.passports.find(passportObj => passportObj.protocol === 'local')
        if (!localPassport) {
          throw new Error('E_NO_AVAILABLE_LOCAL_PASSPORT')
        }

        const event = {
          object_id: resUser.id,
          object: 'user',
          objects: [{
            user: resUser.id
          }, {
            passport: localPassport.id
          }],
          type: 'user.password.updated',
          message: `User ${resUser.getSalutation()} password updated`,
          data: resUser
        }
        this.publish(event.type, event, {save: true})

        localPassport.password = password
        return localPassport.save({transaction: options.transaction || null})
      })
  }

  /**
   * Assign local Passport to user
   *
   * This function can be used to assign a local Passport to a user who doens't
   * have one already. This would be the case if the user registered using a
   * third-party service and therefore never set a password.
   *
   * @param {Object}   user
   * @param {Object}   password
   * @param {Object}   options
   * @returns Promise to chain calls
   */
  connect(user, password, options: {transaction?: any} = {}) {

    const PassportModel = this.app.models['Passport']
    const UserModel = this.app.models['User']

    let resUser
    return UserModel.resolve(user, {transaction: options.transaction || null})
      .then(_user => {
        if (!_user) {
          throw new Error('E_USER_NOT_FOUND')
        }
        resUser = _user
        return PassportModel.findOne({
          where: {
            protocol: 'local',
            user: resUser.id
          },
          transaction: options.transaction || null
        })
      })
      .then(_passport => {
        if (!_passport) {
          return PassportModel.create({
            protocol: 'local',
            password: password,
            user: resUser.id
          }, {
            include: [
              {
                model: UserModel,
                required: true
              }
            ],
            transaction: options.transaction || null
          })
        }
        return _passport
      })
  }

  /**
   * Disconnect a provider from the current user by removing the Passport object
   * @param req request object
   * @param next callback to call after
   */
  disconnect(req, next) {
    const PassportModel = this.app.models['Passport']
    const user = req.user
    const provider = req.params.provider || 'local'
    const query: {user?: any, protocol?: any, provider?: any} = {}

    query.user = user.id
    query[provider === 'local' ? 'protocol' : 'provider'] = provider
    return PassportModel.findOne({
      where: query
    })
      .then(_passportInstance => {
        if (!_passportInstance) {
          throw new Error('E_USER_NO_PASSWORD')
        }
        return _passportInstance.destroy()
      })
      .then(_passportInstance => next(null, user))
      .catch(next)
  }

  /**
   * Log a user and check password
   * @param req
   * @param fieldName
   * @param identifier of the user
   * @param password of the user
   * @returns {Promise} promise for next calls
   */
  login(req, fieldName, identifier, password) {
    const UserModel = this.app.models['User']
    const onUserLogin = this.app.config.get('passport.onUserLogin')
    const criteria = {}

    criteria[fieldName] = identifier.toLowerCase()

    let reqUser
    return Promise.resolve()
      .then(() => {
        if (!fieldName) {
          throw new Error('E_FIELD_NAME_NOT_SPECIFIED')
        }
        return UserModel.findOne({
          where: criteria
        })
      })
      .then(_user => {
        if (!_user) {
          throw new Error('E_USER_NOT_FOUND')
        }
        reqUser = _user

        return reqUser.resolvePassports()
      })
      .then(() => {

        const passportInstance = reqUser.passports.find(passportObj => passportObj.protocol === 'local')

        if (!passportInstance) {
          throw new Error('E_USER_NO_PASSWORD')
        }

        return passportInstance.validatePassword(password)
          .catch(err => {
            throw new Error('E_WRONG_PASSWORD')
          })
      })
      .then(valid => {
        if (!valid) {
          throw new Error('E_WRONG_PASSWORD')
        }
        const event = {
          object_id: reqUser.id,
          object: 'user',
          objects: [{
            user: reqUser.id
          }],
          type: 'user.login',
          message: `User ${reqUser.id} logged in`,
          data: reqUser
        }
        return this.publish(event.type, event, {
          save: true
        })
      })
      .then(event => {
        if (typeof onUserLogin === 'function') {
          return onUserLogin(req, this.app, reqUser)
        }
        else if (typeof onUserLogin === 'object') {
          const promises = []

          Object.keys(onUserLogin).forEach(func => {
            promises.push(onUserLogin[func])
          })

          return Promise.all(promises.map(func => {
            return func(req, this.app, reqUser)
          }))
            .then(userAttrs => {
              userAttrs.map(u => {
                reqUser = _.extend(reqUser, u)
              })
              return reqUser
            })
        }
        else {
          return reqUser
        }
      })
  }

  /**
   *
   * @param req
   * @param user
   * @returns {*}
   */
  logout(req, user) {
    const onUserLogout = this.app.config.get('config.passport.onUserLogout')
    if (typeof onUserLogout === 'object') {
      const promises = []
      Object.keys(onUserLogout).forEach(func => {
        promises.push(onUserLogout[func])
      })

      return Promise.all(promises.map(func => {
        return func(req, this.app, user)
      }))
        .then(userAttrs => {
          userAttrs.map(u => {
            user = _.extend(user, u)
          })
          return Promise.resolve(user)
        })
        .catch(err => {
          return Promise.reject(err)
        })
    }
    else {
      return Promise.resolve(onUserLogout(req, this.app))
    }
  }

  /**
   *
   * @param req
   * @param body
   * @param options
   * @returns {Promise.<T>}
   */
  recover(req, body, options) {
    options = options || {}
    const UserModel = this.app.models['User']
    const criteria = {}

    let resUser, localPassport, id, fieldName

    return Promise.resolve()
      .then(() => {
        if (body['username']) {
          id = 'username'
          fieldName = 'username'
        }
        else if (body['email']) {
          id = 'email'
          fieldName = 'email'
        }
        else if (body['identifier']) {
          const test = this.validateEmail(body['identifier'])
          id = test ? 'email' : 'username'
          fieldName = 'identifier'
        }
        else {
          const err = new PassportError('E_VALIDATION', 'No username or email field')
          throw err
        }

        criteria[id] = body[fieldName].toLowerCase()

        return UserModel.findOne({
          where: criteria,
          transaction: options.transaction || null
        })
      })
      .then(_user => {
        if (!_user) {
          throw new Error('E_USER_NOT_FOUND')
        }
        resUser = _user
        return resUser.resolvePassports({transaction: options.transaction || null})
      })
      .then(() => {
        if (!resUser.passports || resUser.passports.length === 0) {
          throw new Error('E_NO_AVAILABLE_PASSPORTS')
        }

        localPassport = resUser.passports.find(passportObj => passportObj.protocol === 'local')

        if (!localPassport) {
          throw new Error('E_NO_AVAILABLE_LOCAL_PASSPORT')
        }

        return resUser.generateRecovery(body[fieldName].toLowerCase())
          .catch(err => {
            throw new Error('E_VALIDATION_HASH')
          })
      })
      .then(hash => {
        return resUser.save({
          transaction: options.transaction || null
        })
      })
      .then(() => {
        const event = {
          object_id: resUser.id,
          object: 'user',
          objects: [{
            user: resUser.id
          }, {
            passport: localPassport.id
          }],
          type: 'user.password.recover',
          message: `User ${resUser.getSalutation()} requested to recover password`,
          data: resUser
        }
        return this.publish(event.type, event, {
          save: true,
          transaction: options.transaction || null
        })
      })
      .then(() => {
        return this.onRecover(req, resUser, options)
      })
      .catch(err => {
        return Promise.reject('E_VALIDATION')
      })
  }

  /**
   *
   * @param req
   * @param user
   * @param options
   * @returns {*}
   */
  onRecover(req, user, options) {
    options = options || {}
    // console.log('THIS RECOVER onRecover', user)
    const onUserRecover = this.app.config.get('passport.onUserRecover')
    if (typeof onUserRecover === 'object') {
      const promises = []
      Object.keys(onUserRecover).forEach(func => {
        promises.push(onUserRecover[func])
      })

      return Promise.all(promises.map(func => {
        return func(req, this.app, user)
      }))
        .then(userAttrs => {
          userAttrs.map(u => {
            user = _.extend(user, u)
          })
          return Promise.resolve(user)
        })
        .catch(err => {
          return Promise.reject(err)
        })
    }
    else {
      return Promise.resolve(onUserRecover(req, this.app, user))
    }
  }

  /**
   *
   * @param req
   * @param user
   * @param options
   * @returns {*}
   */
  onRecovered(req, user, options) {
    options = options || {}
    // console.log('THIS RECOVER onRecover', user)
    const onUserRecovered = this.app.config.get('passport.onUserRecovered')

    if (typeof onUserRecovered === 'object') {
      const promises = []
      Object.keys(onUserRecovered).forEach(func => {
        promises.push(onUserRecovered[func])
      })

      return Promise.all(promises.map(func => {
        return func(req, this.app, user)
      }))
        .then(userAttrs => {
          userAttrs.map(u => {
            user = _.extend(user, u)
          })
          return Promise.resolve(user)
        })
        .catch(err => {
          return Promise.reject(err)
        })
    }
    else {
      return Promise.resolve(onUserRecovered(req, this.app, user))
    }
  }

  /**
   *
   * @param user
   * @param password
   * @param options
   * @returns {Promise.<T>}
   */
  reset(user, password, options: {transaction?: any} = {}) {
    const UserModel = this.app.models['User']

    let resUser
    return Promise.resolve()
      .then(() => {
        if (!user) {
          throw new Error('E_USER_NOT_DEFINED')
        }
        return UserModel.resolve(user, {transaction: options.transaction || null})
      })
      .then(_user => {
        if (!_user) {
          throw new Error('E_USER_NOT_FOUND')
        }
        resUser = _user
        return this.updateLocalPassword(resUser, password, {
          transaction: options.transaction || null
        })
      })
      .then(passportInstance => {
        const event = {
          object_id: resUser.id,
          object: 'user',
          objects: [{
            user: resUser.id
          }, {
            passport: passportInstance.id
          }],
          type: 'user.password.reset',
          message: `User ${resUser.getSalutation()} password was reset`,
          data: passportInstance
        }
        return this.publish(event.type, event, {
          save: true,
          transaction: options.transaction || null
        })
      })
      .then(event => {
        return resUser
      })
  }

  /**
   *
   * @param req
   * @param body
   * @param options
   * @returns {Promise.<T>|*}
   */
  resetRecover(req, body, options: {transaction?: any} = {}) {
    const UserModel = this.app.models['User']

    let resUser
    return Promise.resolve()
      .then(() => {
        if (!body.recovery) {
          throw new Error('E_USER_RECOVERY_NOT_DEFINED')
        }
        if (!body.password) {
          throw new Error('E_VALIDATION')
        }

        return UserModel.findOne({
          where: {
            recovery: body.recovery
          },
          transaction: options.transaction || null
        })
      })
      .then(_user => {
        if (!_user) {
          throw new Error('E_USER_NOT_FOUND')
        }
        resUser = _user

        return this.updateLocalPassword(resUser, body.password, {
          transaction: options.transaction || null
        })
      })
      .then(passportInstance => {
        if (!passportInstance) {
          throw new Error('E_PASSPORT_NOT_UPDATED')
        }
        const event = {
          object_id: resUser.id,
          object: 'user',
          objects: [{
            user: resUser.id
          }, {
            passport: passportInstance.id
          }],
          type: 'user.password.reset',
          message: `User ${ resUser.getSalutation() } password was reset`,
          data: passportInstance
        }
        return this.publish(event.type, event, {
          save: true,
          transaction: options.transaction || null
        })
      })
      .then(event => {
        return this.onRecovered(req, resUser, options)
      })
  }
}
