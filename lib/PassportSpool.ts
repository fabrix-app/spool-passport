import { Spool } from '@fabrix/fabrix/dist/common'
import { Validator } from './validator'
import { Passport } from './passport'

import * as config from './config/index'
import * as pkg from '../package.json'
import * as api from './api/index'

export class PassportSpool extends Spool {

  constructor(app) {
    super(app, {
      config: config,
      pkg: pkg,
      api: api
    })
  }

  /**
   * Check express, sequelize is used and verify session configuration
   */
  async validate() {
    const requiredSpools = ['express', 'sequelize']
    const spools = Object.keys(this.app.spools)

    if (!spools.some(v => requiredSpools.indexOf(v) >= 0)) {
      return Promise.reject(new Error(`spool-passport requires spools: ${ requiredSpools.join(', ') }!`))
    }
    if (!spools.some(v => v === 'engine')) {
      this.app.log.warn('spool-engine not installed, pubSub is disabled')
    }
    if (!spools.some(v => v === 'notifications')) {
      this.app.log.warn('spool-notifications not installed, notifications are disabled')
    }
    if (!spools.some(v => v === 'email')) {
      this.app.log.warn('spool-email not installed, emails are disabled')
    }

    if (!this.app.config.get('passport')) {
      return Promise.reject(new Error('No configuration found at config.passport!'))
    }

    if (!this.app.config.get('web.middlewares.order').some(a => a === 'passportInit')) {
      return Promise.reject(new Error('passportInit middleware missing in web.middlewares.order!'))
    }

    const strategies = this.app.config.get('passport.strategies')
    if (!strategies || (strategies && Object.keys(strategies).length === 0)) {
      return Promise.reject(new Error('No strategies found at config.passport.strategies!'))
    }

    if (strategies.jwt && this.app.config.get('passport.jwt.tokenOptions.secret') === 'mysupersecuretoken') {
      return Promise.reject(new Error('You need to change the default token!'))
    }

    return Promise.all([
      Validator.validatePassportsConfig(this.app.config.get('passport'))
    ])
  }

  /**
   * Initialise passport functions and load strategies
   */
  configure() {
    Passport.init(this.app)
    Passport.loadStrategies(this.app)
    Passport.copyDefaults(this.app)
  }

  sanity() {
    if (
      !this.app.config.get('web.middlewares.passportInit')
      || !this.app.config.get('web.middlewares').passportInit
      || !this.app.config.get('web').middlewares.passportInit
    ) {
      throw new Error('passportInit middleware missing in web.middlewares!')
    }
    if (
      !this.app.config.get('web.middlewares.passportSession')
      || !this.app.config.get('web.middlewares').passportSession
      || !this.app.config.get('web').middlewares.passportSession
    ) {
      throw new Error('passportSession middleware missing in web.middlewares!')
    }
  }

}

