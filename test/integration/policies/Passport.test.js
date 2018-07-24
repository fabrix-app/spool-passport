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
    assert(global.app.policies['Passport'])
  })
  it('should insert a user on /auth/local/register', (done) => {
    agent
      .post('/auth/local/register')
      .set('Accept', 'application/json') //set header for this test
      .send({
        username: 'admin',
        password: 'admin1234'
      })
      .expect(200)
      .end((err, res) => {
        assert.equal(res.body.redirect, '/')
        assert.notEqual(res.body.user.id, null)
        assert.equal(res.body.user.username, 'admin')
        assert.ok(res.body.user.onUserLogin)
        done(err)
      })
  })
  it('should test basic auth', (done) => {
    const basic = Buffer.from('admin:admin1234').toString('base64')
    request.get('/basic')
      .set('Authorization', `Basic ${basic}`)
      .expect(200)
      .end((err, res) => {
        done(err)
      })
  })
})
