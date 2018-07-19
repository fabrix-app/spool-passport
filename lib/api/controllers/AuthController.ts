import { FabrixController as Controller } from '@fabrix/fabrix/dist/common'

export class AuthController extends Controller {
  /**
   *
   * @param req
   * @param res
   */
  provider(req, res) {
    this.app.services.PassportService.endpoint(req, res, req.params.provider)
      .catch(e => {
        res.serverError(e)
      })
  }

  /**
   *
   * @param req
   * @param res
   */
  callback(req, res) {
    this.app.services.PassportService.callback(req, res, (err, user, challenges, statuses) => {
      if (err) {
        if (err.message === 'E_USER_NOT_FOUND') {
          req.err = err
          res.notFound(req, res)
        }
        else if (
          err.message === 'E_VALIDATION'
          || err.message === 'E_USER_NOT_DEFINED'
          || err.message === 'E_USER_RECOVERY_NOT_DEFINED'
          || err.message === 'passport.initialize() middleware not in use'
        ) {
          res.status(400).json({error: err.message || err})
        }
        else if (
          err === 'Not a valid BCrypt hash.'
          || err.message === 'E_WRONG_PASSWORD'
          || err.message === 'E_USER_NO_PASSWORD'
        ) {
          res.status(401).json({error: err.message || err})
        }
        else {
          this.app.log.error(err)
          res.serverError(err, req, res)
        }
      }
      else {
        req.login(user, error => {
          if (error) {
            this.app.log.error(error)
            res.serverError(error, req, res)
          }
          else {
            let redirect = this.app.config.get('passport.redirect.login')

            if (req.body.redirect || req.query.redirect) {
              redirect = req.body.redirect || req.query.redirect
            }
            // Mark the session as authenticated to work with default Sails sessionAuth.js policy
            req.session.authenticated = true

            // Upon successful login, send the user to the homepage were req.user
            // will be available.
            if (req.wantsJSON) {
              const result = {
                redirect: redirect,
                user: user,
                token: null
              }

              if (this.app.config.get('passport.strategies.jwt')) {
                result.token = this.app.services.PassportService.createToken(user)
              }
              res.json(result)
            }
            else {
              res.redirect(redirect)
            }
          }
        })
      }
    })
  }

  /**
   * Log out a user and return them to the homepage
   *
   * Passport exposes a logout() function on req (also aliased as logOut()) that
   * can be called from any route handler which needs to terminate a login
   * session. Invoking logout() will remove the req.user property and clear the
   * login session (if any).
   *
   * For more information on logging out users in Passport.js, check out:
   * http://passportjs.org/guide/logout/
   *
   * @param {Object} req
   * @param {Object} res
   */
  logout(req, res) {
    req.logout()

    let redirect = this.app.config.get('passport.redirect.logout')
    if (req.body.redirect || req.query.redirect) {
      redirect = req.body.redirect || req.query.redirect
    }
    // mark the user as logged out for auth purposes
    if (req.session) {
      req.session.authenticated = false
    }

    this.app.services.PassportService.logout(req)
      .then(() => {
        if (req.wantsJSON) {
          res.json({ redirect: redirect })
        }
        else {
          res.redirect(redirect)
        }
      })
      .catch(err => {
        if (req.wantsJSON) {
          res.json({ redirect: redirect })
        }
        else {
          res.redirect(redirect)
        }
      })
  }

  /**
   *
   * @param req
   * @param res
   */
  recover(req, res) {
    let redirect = this.app.config.get('passport.redirect.recover')
    if (req.body.redirect || req.query.redirect) {
      redirect = req.body.redirect || req.query.redirect
    }

    this.app.services.PassportService.recover(req, req.body)
      .then((user) => {
        if (!user) {
          // err.message === 'E_USER_NOT_FOUND'
        }
        if (req.wantsJSON) {
          res.json({
            redirect: redirect,
            user: user
          })
        }
        else {
          res.redirect(redirect)
        }
      })
      .catch(err => {
        if (req.wantsJSON) {
          res.json({
            redirect: redirect
          })
        }
        else {
          res.redirect(redirect)
        }
      })
  }

  /**
   * The session of the user logged in
   * @param req
   * @param res
   */
  session (req, res) {
    if (req.user) {
      const user = req.user
      if (user.passports) {
        delete user.passports
      }
      const token = this.app.services.PassportService.createToken(user)
      return res.json({
        token: token,
        user: user
      })
    }
    else {
      return res.sendStatus(401)
    }
  }
}
