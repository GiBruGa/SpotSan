import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { APP_VERSION } from './lib/version.js'
import { initTheme } from './lib/theme.js'

document.title = `SpotSan ${APP_VERSION}`
initTheme()

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
