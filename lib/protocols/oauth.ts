/**
 * OAuth Authentication Protocol
 *
 * OAuth 1.0 is a delegated authentication strategy that involves multiple
 * steps. First, a request token must be obtained. Next, the user is redirected
 * to the service provider to authorize access. Finally, after authorization has
 * been granted, the user is redirected back to the application and the request
 * token can be exchanged for an access token. The application requesting access,
 * known as a consumer, is identified by a consumer key and consumer secret.
 *
 * For more information on OAuth in Passport.js, check out:
 * http://passportjs.org/guide/oauth/
 *
 * @param {Object}   req
 * @param {string}   token
 * @param {string}   tokenSecret
 * @param {Object}   profile
 * @param {Function} next
 */

import { FabrixApp } from '@fabrix/fabrix'

export const oauth = (app: FabrixApp) => {
  const passport = app.services.PassportService.passport
  return (req, token, tokenSecret, profile, next) => {

    const query = {
      identifier: profile.id,
      protocol: 'oauth',
      tokens: {
        token: token,
        tokenSecret: null
      }
    }

    if (tokenSecret !== undefined) {
      query.tokens.tokenSecret = tokenSecret
    }

    passport.connect(req, query, profile, next)
  }
}
