const client = jwksClient({
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 1000 * 60 * 60 * 24, // 24 hours
})