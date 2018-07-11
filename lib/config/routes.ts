export const routes = [
  {
    method: ['POST'],
    path: '/auth/local',
    handler: 'AuthController.callback',
    config: {
      app: {
      }
    }
  },
  {
    method: ['POST'],
    path: '/auth/local/{action}',
    handler: 'AuthController.callback',
    config: {
      app: {
      }
    }
  },
  {
    method: ['GET'],
    path: '/auth/{provider}/callback',
    handler: 'AuthController.callback',
    config: {
      app: {
      }
    }
  }, {
    method: ['GET'],
    path: '/auth/{provider}/callback',
    handler: 'AuthController.callback',
    config: {
      app: {
      }
    }
  },
  {
    method: ['GET'],
    path: '/auth/{provider}/{action}',
    handler: 'AuthController.callback',
    config: {
      app: {
      }
    }
  },
  {
    method: ['POST'],
    path: '/auth/recover',
    handler: 'AuthController.recover'
  },
  {
    method: ['GET', 'POST'],
    path: '/auth/logout',
    handler: 'AuthController.logout',
    config: {
      app: {
      }
    }
  },
  {
    method: ['GET'],
    path: '/auth/session',
    handler: 'AuthController.session',
    config: {
      app: {
      }
    }
  },
  {
    method: ['GET'],
    path: '/auth/{provider}',
    handler: 'AuthController.provider',
    config: {
      app: {
      }
    }
  }
]
