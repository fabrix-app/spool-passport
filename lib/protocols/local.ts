import { FabrixApp } from '@fabrix/fabrix'

export const local = (app: FabrixApp) => {
  return (req, identifier, password, next) => {
    const criteria = {}
    const id = app.config.get('passport.strategies.local.options.usernameField')
    criteria[id || 'username'] = identifier

    app.services.PassportService.login(identifier, password)
      .then(user => next(null, user))
      .catch(next)
  }
}
