import { FabrixApp } from '@fabrix/fabrix'
import * as url from 'url'
import { each, extend, clone } from 'lodash'

export const Passport = {
  init: (app: FabrixApp) => {
    const passport = app.services.PassportService.passport
    // app.config.set('web.middlewares.passportInit', passport.initialize())
    // app.config.set('web.middlewares.passportSession', passport.session())

    const webMiddlewares = app.config.get('web.middlewares')
    app.config.set('web.middlewares', Object.assign(webMiddlewares, {
      passportInit: passport.initialize(),
      passportSession: passport.session()
    }))

    /**
     * Connect a third-party profile to a local user
     *
     * This is where most of the magic happens when a user is authenticating with a
     * third-party provider. What it does, is the following:
     *
     *   1. Given a provider and an identifier, find a matching Passport.
     *   2. From here, the logic branches into two paths.
     *
     *     - A user is not currently logged in:
     *       1. If a Passport wasn't found, create a new user as well as a new
     *          Passport that will be assigned to the user.
     *       2. If a Passport was found, get the user associated with the passport.
     *
     *     - A user is currently logged in:
     *       1. If a Passport wasn't found, create a new Passport and associate it
     *          with the already logged in user (ie. "Connect")
     *       2. If a Passport was found, nothing needs to happen.
     *
     * As you can see, this function handles both "authentication" and "authori-
     * zation" at the same time. This is due to the fact that we pass in
     * `passReqToCallback: true` when loading the strategies, allowing us to look
     * for an existing session in the request and taking action based on that.
     *
     * For more information on auth(entication|rization) in Passport.js, check out:
     * http://passportjs.org/guide/authenticate/
     * http://passportjs.org/guide/authorize/
     *
     * @param {Object}   req
     * @param {Object}   query
     * @param {Object}   profile
     * @param {Function} next
     */
    passport.connect = function (req, query, profile, next) {
      const PassportModel = app.models['Passport']
      const user: {email?: string, username?: string} = {}

      // Get the authentication provider from the query.
      query.provider = req.params.provider

      // Use profile.provider or fallback to the query.provider if it is undefined
      // as is the case for OpenID, for example
      const provider = profile.provider || query.provider

      // If the provider cannot be identified we cannot match it to a passport so
      // throw an error and let whoever's next in line take care of it.
      if (!provider) {
        return next(new Error('No authentication provider was identified.'))
      }

      // If the profile object contains a list of emails, grab the first one and
      // add it to the user.
      if (profile.hasOwnProperty('emails')) {
        user.email = profile.emails[0].value
      }

      // If the profile object contains a username, add it to the user.
      if (profile.hasOwnProperty('username')) {
        user.username = profile.username
      }

      // If neither an email or a username was available in the profile, we don't
      // have a way of identifying the user in the future. Throw an error and let
      // whoever's next in the line take care of it.
      if (!user.username && !user.email) {
        return next(new Error('Neither a username nor email was available'))
      }

      PassportModel.findOne({
        provider: provider,
        identifier: query.identifier.toString()
      })
        .then(_passport => {
          if (!req.user) {
            // Scenario: A new user is attempting to sign up using a third-party
            //           authentication provider.
            // Action:   Create a new user and assign them a passport.
            if (!_passport) {
              // Merge the profile received from the third-party authentication
              // provider with the user.
              app.config.get('passport.mergeThirdPartyProfile')(user, profile)
                .then(mergedProfile => app.models['User'].create(mergedProfile)
                  .then(_user => {
                    query.tokens = JSON.stringify(query.tokens)
                    return _user.createPassport(query)
                      .then(() /* _passport */ => next(null, _user))
                      .catch(next)
                  })
                  .catch(next)
                )
                .catch(next)
            }
            // Scenario: An existing user is trying to log in using an already
            //           connected passport.
            // Action:   Get the user associated with the passport.
            else {
              // If the tokens have changed since the last session, update them
              if (query.hasOwnProperty('tokens') && query.tokens !== passport.tokens) {
                passport.tokens = JSON.stringify(query.tokens)
              }

              // TODO This shouldn't use the Tapestry Service as it is too slow, should be Sequelize Resolver
              // Save any update to the Passport and read the associated user instance
              return Promise.all([
                app.services.TapestryService.findAssociation('Passport', passport.id, 'User'),
                PassportModel.update(passport.id, passport)
              ])
                .then(results => {
                  const userInstance = results[0] // Not so usefull, just for keeping namings clear
                  next(null, userInstance)
                })
                .catch(next)
            }
          }
          else {
            // Scenario: A user is currently logged in and trying to connect a new
            //           passport.
            // Action:   Create and assign a new passport to the user.
            if (!passport) {
              query.user = req.user.id
              if (query.hasOwnProperty('tokens') && typeof(query.tokens) === 'object') {
                query.tokens = JSON.stringify(query.tokens)
              }
              PassportModel.create(query)
                .then(() /* _passport */ => next(null, req.user))
                .catch(next)
            }
            // Scenario: The user is a nutjob or spammed the back-button.
            // Action:   Simply pass along the already established session.
            else {
              next(null, req.user)
            }
          }
        })
        .catch(next)
    }

    passport.serializeUser((user, next) => {
      next(null, user.id)
    })

    passport.deserializeUser((id, next) => {
      const User = app.models['User']
      User.findByIdDefault(id)
        .then(user => {
          next(null, user)
        })
        .catch(err => {
          next(err)
        })
    })

  },

  loadStrategies: (app: FabrixApp) => {
    const passport = app.services.PassportService.passport
    each(app.config.get('passport.strategies'), (strategiesOptions, name) => {
      const Strategy = strategiesOptions.strategy
      const options = extend({passReqToCallback: true}, strategiesOptions.options || {})
      if (name === 'local') {
        passport.use(new Strategy(options, app.services.PassportService.protocols.local(app)))
      }
      else if (name === 'jwt') {
        passport.use(new Strategy(options, app.services.PassportService.protocols[name]))
      }
      else {
        const protocol = strategiesOptions.protocol
        let callback = strategiesOptions.callback

        if (!callback) {
          callback = 'auth/' + name + '/callback'
        }
        const serverProtocol = app.config.get('web.ssl') ? 'https' : 'http'
        const baseUrl = serverProtocol + '://' + (app.config.get('web.host') || 'localhost') + ':' + app.config.get('web.port')

        switch (protocol) {
        case 'oauth':
        case 'oauth2':
          options.callbackURL = url.resolve(baseUrl, callback)
          break
        case 'openid':
          options.returnURL = url.resolve(baseUrl, callback)
          options.realm = baseUrl
          options.profile = true
          break
        }

          // Merge the default options with any options defined in the config. All
          // defaults can be overriden, but I don't see a reason why you'd want to
          // do that.
        extend(options, strategiesOptions.options)

        passport.use(new Strategy(options, app.services.PassportService.protocols[protocol](app)))
      }
    })
  },
  /**
   * copyDefaults - Copies the default configuration so that it can be restored later
   * @param app
   * @returns {Promise.<{}>}
   */
  copyDefaults: (app: FabrixApp) => {
    app.config.set('passportDefaults', clone(app.config.get('passport')))
    return Promise.resolve({})
  }
}
