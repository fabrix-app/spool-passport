import { FabrixPolicy as Policy } from '@fabrix/fabrix/dist/common'
/**
 * @module PassportPolicy
 * @description Passport policy
 */
export class Passport extends Policy {
  init(req, res, next) {
    next()
    /*
    this.app.services.PassportService.passport.initialize()(req, res, () => {
      // Use the built-in sessions
      this.app.services.PassportService.passport.session()(req, res, () => {
        // Make the user available throughout the frontend
        res.locals.user = req.user
        next()
      })
    })*/
  }

  /**
   *
   * @param req
   * @param res
   * @param next
   */
  jwt(req, res, next) {
    this.init(req, res, () => {
      this.app.services.PassportService.passport.authenticate('jwt', (error, user, info) => {
        if (error) {
          res.serverError(error)
        }
        else if (!user) {
          res.status(401).send(info.message)
        }
        else {
          // req.token = req.query.token
          // delete req.query.token
          req.user = user
          next()
        }
      })(req, res)
    })
  }

  /**
   *
   * @param req
   * @param res
   * @param next
   * @returns {*}
   */
  basicAuth(req, res, next) {
    this.init(req, res, () => {
      const auth = req.headers.authorization

      if (!auth || auth.search('Basic ') !== 0) {
        return next()
      }

      const authString = new Buffer(auth.split(' ')[1], 'base64').toString()
      const username = authString.split(':')[0]
      const password = authString.split(':')[1]
      const test = this.app.services.PassportService.validateEmail(username)
      const fieldName = test ? 'email' : 'username'

      this.app.log.silly('authenticating', username, 'using basic auth:', req.url)

      this.app.services.PassportService.login(req, fieldName, username, password)
        .then(user => {

          req.user = user

          return next()
        })
        .catch(err => {
          return next(err)
        })
    })
  }

  /**
   *
   * @param req
   * @param res
   * @param next
   */
  sessionAuth(req, res, next) {
    this.init(req, res, () => {
      // User is allowed, proceed to the next policy,
      // or if this is the last policy, the controller
      if (req.session && req.session.authenticated) {
        next()
      }
      else {
        // User is not allowed
        if (req.wantsJSON) {
          res.status(401).json({logout: this.app.config.get('passport.redirect.logout')})
        }
        else {
          res.redirect(this.app.config.get('passport.redirect.logout'))
        }
      }
    })
  }
}

