# spool-passport

[![Gitter][gitter-image]][gitter-url]
[![NPM version][npm-image]][npm-url]
[![Build Status][ci-image]][ci-url]
[![Test Coverage][coverage-image]][coverage-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![Follow @FabrixApp on Twitter][twitter-image]][twitter-url]


## Dependencies
### Supported ORMs
| Repo          |  Build Status (edge)                  |
|---------------|---------------------------------------|
| [spool-sequelize](https://github.com/fabrix-app/spool-sequelize) | [![Build status][ci-sequelize-image]][ci-sequelize-url] |

### Supported Webserver
| Repo          |  Build Status (edge)                  |
|---------------|---------------------------------------|
| [spool-express](https://github.com/fabrix-app/spool-express) | [![Build status][ci-express-image]][ci-express-url] |

## Intallation
With the cli: 

```
$ npm install -g @fabrix/fab-cli
$ fab install spool spool-passport
```

With npm (you will have to create config file manually):
 
`npm install --save @fabrix/spool-passport`

## Configuration

First you need to add this spool to your __main__ configuration : 
```js
// config/main.ts
import { PassportSpool } from '@fabrix/spool-passport' 
export const main = {
   // ...

   spools: [
      // ...
      PassportSpool,
      // ...
   ]
   // ...
}
```

You need to add `passportInit` and optionally `passportSession` : 
```js
// config/web.ts
middlewares: {
  order: [
    'addMethods',
    'cookieParser',
    'session',
    'passportInit',
    'passportSession',
    'bodyParser',
    'methodOverride',
    'router',
    'www',
    '404',
    '500'
  ]
}
```
And to configure passport: 

```js
// config/passport.ts

const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt

const EXPIRES_IN_SECONDS = 60 * 60 * 24
const SECRET = process.env.tokenSecret || 'mysupersecuretoken'
const ALGORITHM = 'HS256'
const ISSUER = 'localhost'
const AUDIENCE = 'localhost'

export const passport = {
  redirect: {
    login: '/',// Login successful
    logout: '/'// Logout successful
  },
  bcrypt: require('bcryptjs'), // custom bcrypt version if you prefer the native one instead of full js
  // Called when user is logged, before returning the json response
  onUserLogin: (req, app, user) => {
    return Promise.resolve(user)
  },
  onUserLogout: (req, app, user) => {
    return Promise.resolve(user)
  },
  // Optional: can be used to merge data from all third party profiles and the default user properties.
  mergeThirdPartyProfile: (user, profile) => {
    const mergedProfile = {
      email: user.email,
      gender: profile.gender
    }
    return Promise.resolve(mergedProfile)
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
        jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt")
      }
    },

    local: {
      strategy: require('passport-local').Strategy,
      options: {
        usernameField: 'username' // If you want to enable both username and email just remove this field
      }
    }

    /*
     twitter : {
     name     : 'Twitter',
     protocol : 'oauth',
     strategy : require('passport-twitter').Strategy,
     options  : {
     consumerKey    : 'your-consumer-key',
     consumerSecret : 'your-consumer-secret'
     }
     },

     facebook : {
     name     : 'Facebook',
     protocol : 'oauth2',
     strategy : require('passport-facebook').Strategy,
     options  : {
     clientID     : 'your-client-id',
     clientSecret : 'your-client-secret',
     scope        : ['email'] // email is necessary for login behavior
     }
     },

     google : {
     name     : 'Google',
     protocol : 'oauth2',
     strategy : require('passport-google-oauth').OAuth2Strategy,
     options  : {
     clientID     : 'your-client-id',
     clientSecret : 'your-client-secret'
     }
     }

     github: {
     strategy: require('passport-github').Strategy,
     name: 'Github',
     protocol: 'oauth2',
     options: {
     clientID     : 'your-client-id',
     clientSecret : 'your-client-secret',
     callbackURL:  'your-app-url' + '/auth/google/callback',
     scope:        [
      'https://www.googleapis.com/auth/plus.login',
      'https://www.googleapis.com/auth/plus.profile.emails.read'
     ]
     }
     }*/
  }
}
```

Then make sure to include the new file in **config/index.ts**

```
//config/index.ts
...
export { passport } from './passport'
```

### WARNING : be sure you configure sessions correctly if your strategies need them

Further documentation on passport-jwt config can be found at [themikenicholson/passport-jwt](https://github.com/themikenicholson/passport-jwt)

## Usage

### Policies 
Now you can apply some policies to control sessions under `config/policies.ts` 

```
  ViewController: {
    helloWorld: [ 'Passport.sessionAuth' ]
  }
  or 
  ViewController: {
    helloWorld: [ 'Passport.jwt' ]
  }
```

### Routes prefix
By default auth routes do not have a prefix, you can change this prefix by setting `config.router.prefix` or by setting `config.passport.prefix`.

### Log/Register users with third party providers
You can register or log users with third party strategies by redirect the user to : 
```
http://localhost:3000/auth/{provider}
example github 
http://localhost:3000/auth/github
```

### Log/Register users with credentials
For adding a new user you can make a POST to `auth/local/register`  with at least this fields : `username` (or `email`) and `password`. 
For local authentication you have to POST credentials to `/auth/local` in order to log the user.

### Disconnect
If you want to disconnect a user from a provider you can call : 
```
http://localhost:3000/auth/{provider}/disconnect
example if a user don't want to connect with github anymore
http://localhost:3000/auth/github/disconnect
```

### Logout
Just make a POST or GET request to `auth/logout`

## License
[MIT](https://github.com/fabrix-app/spool-passport/blob/master/LICENSE)

[npm-image]: https://img.shields.io/npm/v/@fabrix/spool-passport.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@fabrix/spool-passport
[npm-download]: https://img.shields.io/npm/dt/@fabrix/spool-passport.svg
[ci-image]: https://img.shields.io/circleci/project/github/fabrix-app/spool-passport/master.svg
[ci-url]: https://circleci.com/gh/fabrix-app/spool-passport/tree/master
[daviddm-image]: http://img.shields.io/david/fabrix-app/spool-passport.svg?style=flat-square
[daviddm-url]: https://david-dm.org/fabrix-app/spool-passport
[codeclimate-image]: https://img.shields.io/codeclimate/github/fabrix-app/spool-passport.svg?style=flat-square
[codeclimate-url]: https://codeclimate.com/github/fabrix-app/spool-passport
[gitter-image]: http://img.shields.io/badge/+%20GITTER-JOIN%20CHAT%20%E2%86%92-1DCE73.svg?style=flat-square
[gitter-url]: https://gitter.im/fabrix-app/Lobby
[twitter-image]: https://img.shields.io/twitter/follow/FabrixApp.svg?style=social
[twitter-url]: https://twitter.com/FabrixApp

[ci-sequelize-image]: https://img.shields.io/circleci/project/github/fabrix-app/spool-sequelize/master.svg
[ci-sequelize-url]: https://circleci.com/gh/fabrix-app/spool-sequelize/tree/master

[ci-express-image]: https://img.shields.io/circleci/project/github/fabrix-app/spool-express/master.svg
[ci-express-url]: https://circleci.com/gh/fabrix-app/spool-express/tree/master
