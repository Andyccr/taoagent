// Restore the surface before the stylesheet paints, without relaxing the CSP.
(() => {
  const read = key => { try { return localStorage.getItem('taoagent.' + key) } catch { return null } }
  const root = document.documentElement, theme = read('theme')
  root.dataset.theme = theme === 'light' || theme === 'dark' ? theme : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  const choices = { visualStyle: ['studio', 'paper', 'terminal', 'aurora', 'ink'], readingSize: ['default', 'large'], density: ['comfortable', 'compact'], readingFont: ['system', 'serif', 'mono'], motion: ['auto', 'reduce'], width: ['focused', 'wide'] }
  for (const [key, values] of Object.entries(choices)) root.dataset[key] = values.includes(read(key)) ? read(key) : values[0]
})()
