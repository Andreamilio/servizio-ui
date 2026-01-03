# Changelog

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

