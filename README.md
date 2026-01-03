This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Servizio UI

Applicazione web per la gestione di accessi e controllo porte per appartamenti.

### Ruoli disponibili

- **Host**: Gestione appartamenti, soggiorni, PIN e pulizie
- **Tech**: Monitoraggio tecnico, gestione sensori e rete
- **Guest**: Accesso ospite, controllo porta, info appartamento
- **Cleaner**: Gestione job pulizie e checklist

### PIN Demo

Per accedere all'applicazione in modalità demo:
- **Host**: `111111`
- **Tech**: `222222`
- **Guest**: `333333`
- **Cleaner**: `444444`

Tutti i PIN demo sono associati all'appartamento `101` (Lakeside Tower — Apt 101).

### Architettura dati

#### Store condivisi (Single Source of Truth)
- `Store.accessLog` - Eventi/audit log condiviso tra tutte le viste
- `Store.pinStore` - PIN attivi
- `clientStore` - Informazioni appartamenti e clienti
- `cleaningStore` - Job pulizie
- `staysStore` - Soggiorni

#### Stato porta
Lo stato della porta è condiviso tra tutte le viste attraverso `Store.accessLog`. 
Utilizza la funzione `door_getStateFromLog(Store, aptId)` per leggere lo stato corrente.

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
