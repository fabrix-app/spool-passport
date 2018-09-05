'use strict'
const _ = require('lodash')
const smokesignals = require('smokesignals')
const fs = require('fs')
const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt
const Controller = require('@fabrix/fabrix/dist/common').FabrixController

const EXPIRES_IN_SECONDS = 60 * 24
const ALGORITHM = 'HS256'
const ISSUER = 'localhost'
const AUDIENCE = 'localhost'
const SECRET = 'mysupersecuretokentest'

const spools = [
  require('@fabrix/spool-router').RouterSpool,
  require('@fabrix/spool-express').ExpressSpool,
  require('@fabrix/spool-email').EmailSpool,
  require('@fabrix/spool-events').EventsSpool,
  require('@fabrix/spool-sequelize').SequelizeSpool,
  require('../../dist/index').PassportSpool // spool-passport
]

const App = {
  pkg: {
    name: 'passport-spool-test',
    version: '1.0.0'
  },
  api: {
    controllers: {
      DefaultController: class DefaultController extends Controller {
        info(req, res){
          res.send('ok')
        }
      },
      TestBasicController: class DefaultController extends Controller {
        info(req, res){
          res.send('ok')
        }
      }
    }
  },
  config: {
    stores: {
      sequelize: {
        migrate: 'drop',
        orm: 'sequelize',
        database: 'Sequelize',
        host: '127.0.0.1',
        dialect: 'postgres'
      }
    },
    models: {
      defaultStore: 'sequelize',
      migrate: 'drop'
    },
    passport: {
      // prefix: '/',
      redirect: {
        // Login successful
        login: '/',
        // Logout successful
        logout: '/',
        // Recover successful
        recover: '/'
      },
      onUserLogin: {
        test: (req, app, user) => {
          if (user.passports) {
            delete user.passports
          }
          user.setDataValue('onUserLogin', true)
          return Promise.resolve(user)
        }
      },
      onUserLogout: (req, app, user) => {
        return Promise.resolve(user)
      },
      onUserRecover: (req, app, user) => {
        // console.log('THIS RECOVER onUserRecover', user)
        // if (user.recovery) {
        //   delete user.recovery
        // }
        if (user.passports) {
          delete user.passports
        }
        return Promise.resolve(user)
      },
      onUserRecovered: (req, app, user) => {
        // console.log('THIS RECOVER onUserRecover', user)
        // if (user.recovery) {
        //   delete user.recovery
        // }
        if (user.passports) {
          delete user.passports
        }
        return Promise.resolve(user)
      },
      strategies: {
        jwt: {
          strategy: JwtStrategy,
          tokenOptions: {
            expiresInSeconds: EXPIRES_IN_SECONDS,
            secret: SECRET,
            algorithm: ALGORITHM,
            issuer: ISSUER,
            audience: AUDIENCE
          },
          options: {
            secretOrKey: SECRET,
            issuer: ISSUER,
            audience: AUDIENCE,
            jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt") // Authorization: JWT JSON_WEB_TOKEN_STRING
          }
        },
        local: {
          strategy: require('passport-local').Strategy
        }/*,
         twitter: {
         name: 'Twitter',
         protocol: 'oauth',
         strategy: require('passport-twitter').Strategy,
         options: {
         consumerKey: 'your-consumer-key',
         consumerSecret: 'your-consumer-secret'
         }
         },
         github: {
         strategy: require('passport-github').Strategy,
         name: 'Github',
         protocol: 'oauth2',
         options: {
         clientID: 'your-client-id',
         clientSecret: 'your-client-secret'
         }
         }*/
      },
      // Emails that are allowed to send
      emails: {
        userRecovery: true
      }
    },
    main: {
      spools: spools
    },
    // Email
    email: { },
    routes: {
      '/': {
        'GET': 'DefaultController.info'
      },
      '/basic': {
        'GET': 'TestBasicController.info'
      }
    },
    policies: {
      DefaultController: {
        '*': {
          '*': ['Passport.jwt']
        }
      },
      TestBasicController: {
        '*': {
          '*': ['Passport.basicAuth']
        }
      },
    },
    session: {
      secret: 'ok'
    },
    web: {
      express: require('express'),
      middlewares: {
        order: [
          'addMethods',
          'cookieParser',
          'session',
          'bodyParser',
          'passportInit',
          'passportSession',
          'methodOverride',
          'router',
          'www',
          '404',
          '500'
        ]
      }
    }
  }
}
const dbPath = __dirname + '/../.tmp/sqlitedev.db'
if (fs.existsSync(dbPath))
  fs.unlinkSync(dbPath)

_.defaultsDeep(App, smokesignals.FailsafeConfig)
module.exports = App
