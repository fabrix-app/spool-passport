'use strict'
/* global describe, it */

const assert = require('assert')
const supertest = require('supertest')

describe('PassportPolicy', () => {
  let request, agent, token, user, recovery
  before((done) => {
    request = supertest('http://localhost:3000')
    agent = supertest.agent(global.app.spools.express.server)
    done()
  })
  it('should exist', () => {
    assert(global.app.api.policies['Passport'])
  })

  it('should test basic auth', (done) => {
    agent.get('/basic')
      .set('Authorization', 'Basic admin:admin1234')
      .expect(200)
      .end((err, res) => {
        done()
      })
  })
})
