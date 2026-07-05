// Set DB_PATH explicitly for tests to a test database so we don't pollute zihai.db
// This must be set before importing app/db. Since ESM hoists imports, we run vitest
// with process.env.DB_PATH.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs'

import { app, db } from './server.js'

describe('Login API Tests', () => {
  const testUser = {
    email: 'testlogin@example.com',
    password: 'password123'
  }

  beforeAll(async () => {
    // Clear test user if it exists from a previous failed run
    db.prepare('DELETE FROM users WHERE email = ?').run(testUser.email)

    // Register the test user
    await request(app)
      .post('/api/register')
      .send(testUser)
  })

  afterAll(() => {
    // Clean up test user
    db.prepare('DELETE FROM users WHERE email = ?').run(testUser.email)
  })

  it('should return 400 when missing email or password', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Email and password required' })
  })

  it('should return 400 when missing password', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: testUser.email })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Email and password required' })
  })

  it('should return 401 for non-existent user', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({
        email: 'doesnotexist@example.com',
        password: 'password123'
      })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Invalid credentials' })
  })

  it('should return 401 for invalid password', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Invalid credentials' })
  })

  it('should successfully log in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/login')
      .send(testUser)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.email).toBe(testUser.email)

    // Check if the auth cookie is set
    const cookies = res.headers['set-cookie']
    expect(cookies).toBeDefined()
    expect(cookies.some(cookie => cookie.startsWith('token='))).toBe(true)
  })
})

describe('Text Analyzer API', () => {
  it('should return 400 for non-string input', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ text: 123 })
    expect(res.status).toBe(400)
  })

  it('should successfully tokenize and analyze Chinese text', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .send({ text: '我们' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('tokens')
    expect(res.body.tokens.length).toBeGreaterThan(0)
    expect(res.body.tokens[0].isChinese).toBe(true)
  })
})

afterAll(() => {
  // Test database clean up
  try { db.close() } catch {}
  if (fs.existsSync('test-zihai.db')) fs.unlinkSync('test-zihai.db')
})