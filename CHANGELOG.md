# Changelog

## [2026-01-03] - Implementazione completa funzionalità principali

### 🎉 Nuove funzionalità

#### 1. Login diviso
**Implementato:** Sistema di autenticazione separato per ruoli diversi.

**Dettagli:**
- **Login PIN** (`/`) - Per Guest e Cleaner
  - Accesso tramite PIN temporaneo associato a stay
  - Validità basata su periodo stay
- **Login Username/Password** (`/loginhost-tech`) - Per Host e Tech
  - Autenticazione con credenziali username/password
  - Password hashing con pbkdf2
  - Demo: `tech/tech123`, `host/host123`

**File aggiunti:**
- `app/loginhost-tech/page.tsx` - Pagina login Host/Tech
- `app/api/auth/login/route.ts` - API login username/password
- `app/lib/userStore.ts` - Store utenti Tech/Host con password hashing

#### 2. User Management (Tech)
**Implementato:** Gestione completa utenti Tech e Host.

**Funzionalità:**
- CRUD completo utenti (crea, modifica, elimina)
- Cambio password
- Abilitazione/disabilitazione utenti
- Associazione Host ↔ Clienti
- UI completa in `/app/tech/users`

**File aggiunti:**
- `app/app/tech/users/page.tsx` - UI gestione utenti
- `app/lib/userStore.ts` - Store e logica utenti

#### 3. CRUD Clienti e Appartamenti (Tech)
**Implementato:** Gestione completa clienti e appartamenti con campi estesi.

**Funzionalità:**
- CRUD clienti
- CRUD appartamenti con campi estesi:
  - `addressShort` - Indirizzo breve
  - `wifiSsid` / `wifiPass` - Credenziali WiFi
  - `checkIn` / `checkOut` - Orari check-in/out (formato HH:mm)
  - `rules` - House rules (array di stringhe)
  - `supportContacts` - Contatti supporto
  - `notes` - Note operative interne
- UI completa in `/app/tech/clients`

**File aggiunti:**
- `app/app/tech/clients/page.tsx` - UI CRUD clienti/appartamenti
- `app/lib/clientStore.ts` - Esteso con campi appartamenti

#### 4. Portone/Cancello separato
**Implementato:** Controllo indipendente per porta appartamento e portone/cancello.

**Funzionalità:**
- Azioni separate: `door_open/close()` e `gate_open/close()`
- Stato separato: `door_getStateFromLog()` e `gate_getStateFromLog()`
- Eventi separati: `door_opened/closed` e `gate_opened/closed`
- Supporto completo in tutte le viste (Guest, Host, Tech, Cleaner)

**File aggiunti:**
- `app/lib/domain/gateStore.ts` - Store e logica portone/cancello

**File modificati:**
- Tutte le viste aggiornate con azioni portone
- `app/lib/store.ts` - Aggiunti eventi `gate_opened/closed`

#### 5. Storage Foto Cleaning
**Implementato:** Sistema di storage foto per job pulizie (mock base64 in-memory).

**Funzionalità:**
- Upload foto finali per job completati
- Foto problema per segnalazioni
- Visualizzazione foto in Host view
- Generazione automatica foto placeholder per demo

**File modificati:**
- `app/lib/cleaningstore.ts` - Aggiunti campi `finalPhotos` e `problemPhotos`
- `app/app/cleaner/[jobId]/page.tsx` - UI upload foto
- `app/app/host/job/[jobId]/page.tsx` - Visualizzazione foto

#### 6. Device Package Checklist (Tech)
**Implementato:** Sistema di configurazione dispositivi per appartamento.

**Funzionalità:**
- Configurazione dispositivi per appartamento
- Supporto per diversi tipi device (lock, sensors, etc.)
- Configurazione controller (API/Home Assistant)
- UI in `/app/tech/apt/[aptId]/devices`

**File aggiunti:**
- `app/lib/devicePackageStore.ts` - Store dispositivi
- `app/lib/devicePackageTypes.ts` - Tipi dispositivi
- `app/app/tech/apt/[aptId]/devices/page.tsx` - UI dispositivi
- `app/app/tech/apt/[aptId]/devices/DeviceTable.tsx` - Tabella dispositivi

#### 7. Technical Settings (Tech)
**Implementato:** Configurazione impostazioni tecniche per appartamento.

**Funzionalità:**
- **Home Assistant Tab:**
  - Base URL configurabile
  - Token autenticazione
  - Entity mapping per dispositivi
- **Network Tab:**
  - WireGuard endpoint
  - Cloudflare endpoint
  - Health check URL
- **Diagnostics Tab:**
  - Test connessione Home Assistant
  - Visualizzazione risultati test
  - Ultimi errori

**File aggiunti:**
- `app/lib/technicalSettingsStore.ts` - Store impostazioni tecniche
- `app/app/tech/apt/[aptId]/settings/page.tsx` - UI impostazioni
- `app/app/tech/apt/[aptId]/settings/ApiDevicesSection.tsx` - Sezione API devices
- `app/app/tech/apt/[aptId]/settings/DeviceApiModal.tsx` - Modal configurazione device API

### 🔧 Miglioramenti

- Migliorata UX Guest view con feedback immediato azioni porta/portone
- Sincronizzazione stato porta/portone tra tutte le viste
- Validazione sessioni utente (verifica utente abilitato)
- Filtraggio eventi per vista (WAN/VPN solo Tech, cleaner solo Host/Tech)

### 📋 Architettura

#### Single Source of Truth
Tutti gli store seguono il pattern single source of truth:
- `Store.accessLog` - Eventi condivisi
- `clientStore` - Appartamenti e clienti (usato da tutte le viste)
- `userStore` - Utenti Tech/Host
- `devicePackageStore` - Configurazione dispositivi
- `technicalSettingsStore` - Impostazioni tecniche

#### Pattern Domain
Separazione tra store (storage) e domain (logica):
- `app/lib/domain/` - Logica di dominio
- `app/lib/*Store.ts` - Storage in-memory

### 🔑 Credenziali Demo

**Login Username/Password:**
- Tech: `tech` / `tech123`
- Host: `host` / `host123` (associato a client "global-properties")

**PIN Demo:**
- Host: `111111` → `aptId: "101"`
- Tech: `222222` → `aptId: "101"`
- Guest: `333333` → `aptId: "101"`
- Cleaner: `444444` → `aptId: "101"`

### ⚠️ Breaking Changes
Nessun breaking change. Tutte le modifiche sono retrocompatibili.

---

## [2026-01-03] - Allineamento stato porta e fix vari

### 🔧 Modifiche principali

#### 1. Allineamento stato porta tra tutte le viste
**Problema risolto:** Lo stato della porta non era sincronizzato tra le viste Guest, Host e Tech.

**Soluzione implementata:**
- Creato `door_getStateFromLog()` in `app/lib/domain/doorStore.ts` come funzione helper condivisa
- Tutte le viste ora leggono lo stato porta da `Store.accessLog` (single source of truth)
- Rimossa duplicazione dello stato porta in `techstore.ts` (funzioni `openDoor()` e `closeDoor()`)

**File modificati:**
- `app/lib/domain/doorStore.ts` - Aggiunta funzione `door_getStateFromLog()`
- `app/app/guest/page.tsx` - Ora usa `door_getStateFromLog()` invece di `gueststore` locale
- `app/lib/techstore.ts` - Rimossa gestione stato porta duplicato

#### 2. Fix PIN demo e aptId Guest
**Problema risolto:** Guest view mostrava sempre "Apt 017" invece degli appartamenti demo corretti (101-106).

**Soluzione implementata:**
- Aggiornato `matchDemoPin()` in `app/api/auth/pin/route.ts` per usare `aptId: "101"` invece di `"017"`
- Modificato `getGuestState()` in `app/lib/gueststore.ts` per leggere info appartamento da `clientStore.getApartment()`
- Rimossi fallback hardcoded "017" in `guest/page.tsx` e `guest/apartment/page.tsx`

**File modificati:**
- `app/api/auth/pin/route.ts` - Aggiornati aptId demo PIN da "017" a "101"
- `app/lib/gueststore.ts` - Integrazione con `clientStore` per info appartamenti
- `app/app/guest/page.tsx` - Rimosso fallback "017"
- `app/app/guest/apartment/page.tsx` - Rimosso fallback "017"

#### 3. Fix logout su Vercel
**Problema risolto:** Logout su Vercel causava errore HTTP 405 reindirizzando a `/app/login` (rotta inesistente).

**Soluzione implementata:**
- Cambiato redirect da `/app/login` a `/` (pagina di login corretta)
- Aggiunto status code 303 al redirect

**File modificati:**
- `app/api/auth/logout/route.ts` - Redirect corretto a `/`

#### 4. Miglioramenti UX Guest view
**Aggiunte:**
- `revalidatePath()` dopo azioni open/close door per assicurare aggiornamento
- Rimozione automatica toast dall'URL quando non corrisponde allo stato attuale
- Timestamp nel redirect per forzare refresh

**File modificati:**
- `app/app/guest/page.tsx` - Aggiunti `revalidatePath()` e logica pulizia toast

### 📋 Architettura dati

#### Single Source of Truth per stato porta
Tutte le viste (Guest, Host, Tech) ora leggono lo stato porta da:
- `Store.accessLog` - Array globale condiviso di eventi
- `door_getStateFromLog(Store, aptId)` - Funzione helper che cerca l'ultimo evento `door_opened` o `door_closed`

**Flusso eventi:**
1. Qualsiasi vista (Guest/Host/Tech) chiama `events_log()` o `Store.logAccessEvent()`
2. L'evento viene aggiunto a `Store.accessLog` (array globale)
3. Tutte le viste leggono da `Store.accessLog` per mostrare lo stato corrente

### 🔑 PIN Demo
I PIN demo ora usano `aptId: "101"` (allineato con `clientStore` demo):
- Host: `111111` → `aptId: "101"`
- Tech: `222222` → `aptId: "101"`
- Guest: `333333` → `aptId: "101"`
- Cleaner: `444444` → `aptId: "101"` (se presente)

### ⚠️ Breaking Changes
Nessun breaking change. Tutte le modifiche sono retrocompatibili.

### 📝 Note per sviluppatori

#### Come aggiungere una nuova vista che gestisce lo stato porta
```typescript
import * as Store from "@/app/lib/store";
import { door_getStateFromLog } from "@/app/lib/domain/doorStore";

const doorState = door_getStateFromLog(Store, aptId);
const doorIsOpen = doorState === "open";
```

#### Come registrare eventi porta
```typescript
import * as Store from "@/app/lib/store";
import { events_log } from "@/app/lib/domain/eventsDomain";

// Dopo apertura/chiusura porta
events_log(Store, {
  aptId,
  type: "door_opened", // o "door_closed"
  actor: "guest", // o "host", "tech", "cleaner"
  label: "Porta aperta dall'ospite",
});
```

#### Store condivisi
- `Store.accessLog` - Eventi/audit log condiviso
- `Store.pinStore` - PIN condivisi
- `clientStore` - Info appartamenti/clients
- `cleaningStore` - Job pulizie condivisi

### 🐛 Bug fix
- ✅ Stato porta ora sincronizzato tra tutte le viste
- ✅ Guest view mostra appartamenti demo corretti
- ✅ Logout funziona correttamente su Vercel
- ✅ Toast vengono rimossi quando non più rilevanti

