import * as joi from 'joi'

export const passportsConfig = joi.object().keys({
  prefix: joi.string(),
  redirect: joi.object().keys({
    logout: joi.string().required(),
    login: joi.string().required(),
    recover: joi.string().required()
  }).required(),
  onUserLogin: joi.alternatives().try(
    joi.func(),
    joi.object({
      arg: joi.string(),
      value: joi.func()
    }).unknown()
  ),
  onUserLogout: joi.alternatives().try(
    joi.func(),
    joi.object({
      arg: joi.string(),
      value: joi.func()
    }).unknown()
  ),
  onUserRecover: joi.alternatives().try(
    joi.func(),
    joi.object({
      arg: joi.string(),
      value: joi.func()
    }).unknown()
  ),
  onUserRecovered: joi.alternatives().try(
    joi.func(),
    joi.object({
      arg: joi.string(),
      value: joi.func()
    }).unknown()
  ),
  mergeThirdPartyProfile: joi.func(),
  bcrypt: joi.any(),
  strategies: joi.object().keys({
    jwt: joi.object().keys({
      strategy: joi.func().required(),
      tokenOptions: joi.object().keys({
        expiresInSeconds: joi.number().positive().optional(),
        secret: joi.string().required(),
        algorithm: joi.string().required(),
        issuer: joi.string().required(),
        audience: joi.string().required()
      }).required(),
      options: joi.object().keys({
        secretOrKey: joi.string().required(),
        issuer: joi.string().required(),
        audience: joi.string().required(),
        jwtFromRequest: joi.func().required()
      }).required()
    }).optional()
  }).unknown().required(),
  emails: joi.object(),
  events: joi.object()
})
