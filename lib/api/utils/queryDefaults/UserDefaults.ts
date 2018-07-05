import { FabrixApp } from '@fabrix/fabrix'

export const UserDefaults = {
  default: (app: FabrixApp) => {
    return {
      include: [
        {
          model: app.models['Passport'],
          as: 'passports'
        }
      ]
    }
  }
}
