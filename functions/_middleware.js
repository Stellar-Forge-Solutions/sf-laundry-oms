// Cloudflare Pages Functions middleware to enforce Content Security Policy, HSTS, and security headers on API responses.
export async function onRequest(context) {
  const response = await context.next()

  // Clone headers to allow mutations
  const headers = new Headers(response.headers)

  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
  )
  headers.set('X-Frame-Options', 'DENY')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
