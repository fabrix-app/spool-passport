import { Spool } from '@fabrix/fabrix/dist/common'
import { Validator } from './validator'
import { Passport } from './passport'

import * as config from './config/index'
import * as pkg from '../package.json'
import * as api  from './api/index'

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

    if (!this.app.config.get('passport')) {
      return Promise.reject(new Error('No configuration found at config.passport!'))
    }

    const strategies = this.app.config.get('passport.strategies')
    if (!strategies || (strategies && Object.keys(strategies).length === 0)) {
      return Promise.reject(new Error('No strategies found at config.passport.strategies!'))
    }

    if (strategies.jwt && this.app.get('config.passport.jwt.tokenOptions.secret') === 'mysupersecuretoken') {
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
    Passport.addRoutes(this.app)
  }
}

