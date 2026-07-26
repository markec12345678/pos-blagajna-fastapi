import { describe, it, expect, beforeEach } from 'vitest'

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('exports useTranslation hook', async () => {
    const i18n = await import('../i18n')
    expect(i18n.useTranslation).toBeDefined()
    expect(typeof i18n.useTranslation).toBe('function')
  })

  it('exports getItemName function', async () => {
    const { getItemName } = await import('../i18n')
    expect(getItemName).toBeDefined()
    expect(typeof getItemName).toBe('function')
  })

  it('getItemName returns fallback when no translations', async () => {
    const { getItemName } = await import('../i18n')
    const result = getItemName({ name: 'Test' }, 'Fallback')
    expect(result).toBe('Fallback')
  })

  it('getItemName returns fallback when item is null', async () => {
    const { getItemName } = await import('../i18n')
    const result = getItemName(null, 'Fallback')
    expect(result).toBe('Fallback')
  })

  it('getItemName reads from translations object', async () => {
    const { getItemName } = await import('../i18n')
    const item = { translations: { sl: { name: 'Pijača' }, en: { name: 'Drink' } } }
    localStorage.setItem('pos-lang', 'sl')
    expect(getItemName(item, 'X')).toBe('Pijača')
  })

  it('getItemName falls back to English', async () => {
    const { getItemName } = await import('../i18n')
    const item = { translations: { en: { name: 'Drink' } } }
    localStorage.setItem('pos-lang', 'de')
    expect(getItemName(item, 'X')).toBe('Drink')
  })

  it('getItemName handles JSON string translations', async () => {
    const { getItemName } = await import('../i18n')
    const item = { translations: '{"sl":{"name":"Kava"},"en":{"name":"Coffee"}}' }
    localStorage.setItem('pos-lang', 'en')
    expect(getItemName(item, 'X')).toBe('Coffee')
  })
})
