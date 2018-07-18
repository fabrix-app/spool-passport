import { FabrixApp } from '@fabrix/fabrix'

export const UserDefaults = {
  default: (app: FabrixApp) => {
    return {
      include: [
        {
          model: app.models['Passport'].resolver.sequelizeModel,
          as: 'passports'
        }
      ]
    }
  }
}
