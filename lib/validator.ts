import * as joi from 'joi'
import { passportsConfig } from './schemas/passportsConfig'

export const Validator = {
  validatePassportsConfig (config) {
    return new Promise((resolve, reject) => {
      joi.validate(config, passportsConfig, (err, value) => {
        if (err) {
          return reject(new TypeError('config.passport: ' + err))
        }
        return resolve(value)
      })
    })
  }
}
