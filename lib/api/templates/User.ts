// tslint:disable max-line-length

import { Template } from '@fabrix/spool-email'

export class User extends Template {
  registered(user) {
    return `<h1>Welcome</h1>
<p>Dear ${user.getSalutation() || 'User'},</p>
<p>
  Thank you for creating your account!
</p>
<p>Thank you!</p>`
  }

  recover(user) {
    return `<h1>Password Recovery</h1>
<p>Dear ${user.getSalutation() || 'User'},</p>
<p>
  You are receiving this email because you or someone attempted to reset your password.  If it was you, follow the instructions below. Otherwise, please ignore this message.
</p>
<p>
  This is your recovery number: ${ user.recovery }
</p>
<p>Thank you!</p>`
  }
}
