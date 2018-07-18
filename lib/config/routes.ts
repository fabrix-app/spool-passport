export const routes = {
  '/auth/recover': {
    'POST': 'AuthController.recover',
    config: {
      prefix: 'passport.prefix',
    }
  },
  '/auth/logout': {
    'GET': 'AuthController.logout',
    'POST': 'AuthController.logout',
    config: {
      prefix: 'passport.prefix',
      app: {}
    }
  },
  '/auth/session': {
    'GET': 'AuthController.session',
    config: {
      prefix: 'passport.prefix',
      app: {}
    }
  },
  '/auth/local': {
    'POST': 'AuthController.callback',
    config: {
      prefix: 'passport.prefix',
      app: {}
    }
  },
  '/auth/local/{action}': {
    'POST': 'AuthController.callback',
    config: {
      prefix: 'passport.prefix',
      app: {}
    }
  },
  '/auth/{provider}/callback': {
    'GET': 'AuthController.callback',
    'POST': 'AuthController.callback',
    config: {
      prefix: 'passport.prefix',
      app: {}
    }
  },
  '/auth/{provider}/{action}': {
    'GET': 'AuthController.callback',
    'POST': 'AuthController.callback',
    config: {
      prefix: 'passport.prefix',
      app: {}
    }
  },
  '/auth/{provider}': {
    'GET': 'AuthController.provider',
    config: {
      prefix: 'passport.prefix',
      app: {}
    }
  }
}
