const GA_MEASUREMENT_ID = '' // Mettre ton ID GA4 ici (ex: 'G-ABC123XYZ')

export function initAnalytics() {
  if (!GA_MEASUREMENT_ID) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag() { window.dataLayer.push(arguments) }
  window.gtag = gtag

  gtag('js', new Date())
  gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    cookie_flags: 'SameSite=None;Secure',
    send_page_view: true
  })
}

export function sternyTrack(eventName, params = {}) {
  if (window.gtag) {
    window.gtag('event', eventName, params)
  }
}
