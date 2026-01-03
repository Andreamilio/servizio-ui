This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Servizio UI

Applicazione web per la gestione di accessi e controllo porte per appartamenti.

### Ruoli disponibili

- **Host**: Gestione appartamenti, soggiorni, PIN e pulizie
- **Tech**: Monitoraggio tecnico, gestione sensori e rete, configurazione sistema
- **Guest**: Accesso ospite, controllo porta/portone, info appartamento
- **Cleaner**: Gestione job pulizie e checklist con foto

### Login

L'applicazione supporta due tipi di accesso:

1. **Login PIN** (`/`) - Per Guest e Cleaner
   - Accesso tramite PIN temporaneo associato a uno stay
   - PIN validi solo nel periodo di validità dello stay

2. **Login Username/Password** (`/loginhost-tech`) - Per Host e Tech
   - Accesso tramite credenziali username/password
   - Demo: `tech/tech123` o `host/host123`

### PIN Demo

Per accedere all'applicazione in modalità demo con PIN:
- **Host**: `111111`
- **Tech**: `222222`
- **Guest**: `333333`
- **Cleaner**: `444444`

Tutti i PIN demo sono associati all'appartamento `101` (Lakeside Tower — Apt 101).

**Nota:** Per Host e Tech è consigliato usare il login username/password (`/loginhost-tech`).

### Funzionalità principali

#### User Management (Tech)
- Gestione completa utenti Tech e Host
- CRUD utenti con password hashing (pbkdf2)
- Associazione Host ↔ Clienti
- Abilitazione/disabilitazione utenti

#### CRUD Clienti e Appartamenti (Tech)
- Gestione completa clienti e appartamenti
- Campi estesi appartamenti:
  - Indirizzo breve, WiFi (SSID/password)
  - Orari check-in/check-out
  - House rules, contatti supporto
  - Note operative interne

#### Portone/Cancello
- Controllo separato per porta appartamento e portone/cancello
- Azioni indipendenti per Guest, Host, Tech e Cleaner
- Stato sincronizzato tra tutte le viste

#### Storage Foto Cleaning
- Upload foto finali per job pulizie (mock base64 in-memory)
- Foto problema per segnalazioni
- Visualizzazione foto in Host view

#### Device Package Checklist (Tech)
- Configurazione dispositivi per appartamento
- Supporto per diversi tipi di device (lock, sensors, etc.)
- Configurazione controller (API/Home Assistant)

#### Technical Settings (Tech)
- **Home Assistant**: Base URL, Token, Entity mapping
- **Network**: WireGuard endpoint, Cloudflare endpoint, Health check
- **Diagnostics**: Test connessioni, risultati test, ultimi errori

### Architettura dati

#### Store condivisi (Single Source of Truth)
- `Store.accessLog` - Eventi/audit log condiviso tra tutte le viste
- `Store.pinStore` - PIN attivi
- `clientStore` - Informazioni appartamenti e clienti
- `cleaningStore` - Job pulizie con foto
- `staysStore` - Soggiorni
- `userStore` - Utenti Tech/Host
- `devicePackageStore` - Configurazione dispositivi
- `technicalSettingsStore` - Impostazioni tecniche

#### Stato porta e portone
Lo stato della porta e del portone è condiviso tra tutte le viste attraverso `Store.accessLog`. 
Utilizza le funzioni:
- `door_getStateFromLog(Store, aptId)` - Stato porta appartamento
- `gate_getStateFromLog(Store, aptId)` - Stato portone/cancello

#### Flusso eventi
1. Qualsiasi vista (Guest/Host/Tech/Cleaner) esegue un'azione
2. L'evento viene loggato in `Store.accessLog` tramite `events_log()` o `Store.logAccessEvent()`
3. Tutte le viste leggono da `Store.accessLog` per mostrare lo stato corrente

Vedi `CHANGELOG.md` per dettagli sulle modifiche recenti.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
