// stores/themeStore.ts
import { defineStore } from 'pinia'

const defaultBrand = 'aliht'

// Nextravel Brand
const nextravelBrand = {
    primary: "359 79% 51%",
    secondary: "355 85% 48%",
    primaryLight: "358 78% 62%",
    muted: "220 14% 96%",
    mutedForeground: "220 10% 50%",
    accent: "358 100% 96%",
    accentForeground: "358 70% 45%",
    ring: "358 78% 51%",
    border: "220 13% 90%",
    input: "220 13% 90%",
}

// Bestravel Brand
const bestravelBrand = {
    primary: "50 90% 48%",
    primaryLight: "50 90% 60%",
    secondary: "48 100% 40%",
    muted: "50 20% 96%",
    mutedForeground: "50 10% 40%",
    accent: "50 100% 94%",
    accentForeground: "50 90% 35%",
    ring: "50 90% 48%",
    border: "50 20% 88%",
    input: "50 20% 88%",
}

const alihtBrand = {
    primary: "200 64% 52%",
    secondary: "200 64% 52%",
    primaryLight: "200 64% 62%",
    muted: "220 14% 96%",
    mutedForeground: "220 10% 50%",
    accent: "200 64% 96%",
    accentForeground: "200 64% 45%",
    ring: "200 64% 51%",
    border: "200 13% 90%",
    input: "200 13% 90%",
}

// Themes
const themes = {
    nextravel: nextravelBrand,
    bestravel: bestravelBrand,
    aliht: alihtBrand
}

export const useThemeStore = defineStore('theme', {
    state: () => ({
        currentTheme: defaultBrand as keyof typeof themes
    }),
    actions: {
        setThemeByDomain() {
            const host = window.location.hostname
            const allowedDomains = ['nextravel', 'bestravel', 'aliht']

            const matchedDomain = allowedDomains.find(domain => host.includes(domain)) ?? defaultBrand

            this.currentTheme = matchedDomain as keyof typeof themes

            const themeSelection = themes[this.currentTheme]
            const root = document.documentElement

            // Aplicar variables CSS
            Object.entries(themeSelection).forEach(([key, value]) => {
                root.style.setProperty(`--${key}`,  value)
            })
        }
    }
})