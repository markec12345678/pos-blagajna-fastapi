import { useState, useEffect } from 'react'
import { useTranslation } from './i18n'

const DISMISSED_KEY = 'pos_install_dismissed'
const INSTALLED_KEY = 'pos_installed'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const { t } = useTranslation()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(INSTALLED_KEY)) return
    if (localStorage.getItem(DISMISSED_KEY)) {
      const dismissedAt = parseInt(localStorage.getItem(DISMISSED_KEY) || '0')
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return
    }
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setTimeout(() => setShow(true), 3000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => {
      localStorage.setItem(INSTALLED_KEY, '1')
      setShow(false)
    })
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!deferred) return
    setInstalling(true)
    try {
      deferred.prompt()
      const result = await deferred.userChoice
      if (result.outcome === 'accepted') {
        localStorage.setItem(INSTALLED_KEY, '1')
        setShow(false)
      }
    } catch {}
    setDeferred(null)
    setInstalling(false)
  }

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setShow(false)
  }

  if (!show || !deferred) return null

  return (
    <div className="install-prompt" role="alert" aria-label={t('install_app')}>
      <div className="install-prompt-icon">📱</div>
      <div className="install-prompt-text">
        <div className="install-prompt-title">{t('install_app')}</div>
        <div className="install-prompt-subtitle">{t('install_description')}</div>
      </div>
      <div className="install-prompt-actions">
        <button onClick={install} className="btn btn-primary btn-sm" disabled={installing} aria-label={t('install')}>
          {installing ? '⏳' : t('install')}
        </button>
        <button onClick={dismiss} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }} aria-label={t('dismiss')}>
          ✕
        </button>
      </div>
    </div>
  )
}
