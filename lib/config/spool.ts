/**
 * Spool Configuration
 *
 * @see {@link http://fabrix.app/doc/spool/config
 */
export const spool = {

  /**
   * API and config resources provided by this Spool.
   */
  provides: {
    resources: ['controllers', 'models', 'services', 'emails', 'templates'],
    api: {
      controllers: ['AuthController'],
      services: ['PassportService'],
      models: ['User', 'Passport']
    },
    config: [ 'passport', 'policies', 'routes']
  },

  /**
   * Configure the lifecycle of this pack; that is, how it boots up, and which
   * order it loads relative to other spools.
   */
  lifecycle: {
    configure: {
      /**
       * List of events that must be fired before the configure lifecycle
       * method is invoked on this Spool
       */
      listen: [
        'spool:sequelize:configured',
        'spool:engine:configured'
      ],

      /**
       * List of events emitted by the configure lifecycle method
       */
      emit: [
        'spool:passport:configured'
      ]
    },
    initialize: {
      listen: [
        'spool:sequelize:initialized',
        'spool:engine:initialized'
      ],
      emit: [
        'spool:passport:initialized'
      ]
    }
  }
}
