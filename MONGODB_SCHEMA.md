# Documentazione Modelli Dati MongoDB - Servizio UI

**Versione:** 1.2  
**Data:** 2026-01-04  
**Aggiornamento:** Migrazione da Web Push API a Firebase Cloud Messaging (FCM)  
**Database:** MongoDB

---

## Indice

1. [Panoramica](#panoramica)
2. [Modelli Dati](#modelli-dati)
    - [Users](#users)
    - [Clients](#clients)
    - [Apartments](#apartments)
    - [Stays](#stays)
    - [Pins](#pins)
    - [CleaningJobs](#cleaningjobs)
    - [AccessEvents](#accessevents)
    - [PushSubscriptions](#pushsubscriptions)
    - [CleanerConfigs](#cleanerconfigs)
    - [DevicePackages](#devicepackages)
    - [TechnicalSettings](#technicalsettings)
    - [Readiness](#readiness)
    - [Plans](#plans)
    - [BillingCustomers](#billingcustomers)
    - [Subscriptions](#subscriptions)
    - [Payments](#payments)
3. [Indici Consigliati](#indici-consigliati)
4. [Relazioni tra Collezioni](#relazioni-tra-collezioni)
5. [Note Implementative](#note-implementative)

---

## Panoramica

Questa documentazione descrive la struttura completa del database MongoDB per l'applicazione **Servizio UI**, un sistema di gestione accessi e controllo dispositivi per appartamenti.

Il sistema supporta 4 ruoli principali:

-   **Tech**: Gestione tecnica, monitoraggio, configurazione
-   **Host**: Gestione appartamenti, soggiorni, PIN
-   **Guest**: Accesso ospite, controllo porte
-   **Cleaner**: Gestione job pulizie

---

## Modelli Dati

### Users

**Collezione:** `users`

Utenti Tech e Host con autenticazione username/password.

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  userId: String,                   // Unique: "user-{uuid}" (indexed)
  username: String,                 // Unique, lowercase, trimmed (indexed)
  passwordHash: String,              // Format: "{salt}${hash}" (pbkdf2 sha512)
  role: String,                      // Enum: "tech" | "host" (indexed)
  clientId: String,                  // Optional, solo per host (indexed)
  enabled: Boolean,                  // Default: true
  createdAt: Number,                 // Unix timestamp (ms)
  lastLoginAt: Number,               // Optional, Unix timestamp (ms)
  profileImageUrl: String            // Optional, URL o base64
}
```

**Indici:**

-   `{ userId: 1 }` (unique)
-   `{ username: 1 }` (unique)
-   `{ role: 1 }`
-   `{ clientId: 1 }` (sparse, solo per host)
-   `{ enabled: 1, role: 1 }` (compound)

**Note:**

-   Guest e Cleaner non hanno account utente, accedono tramite PIN
-   Password hashing: pbkdf2 con 100000 iterazioni, sha512, keylen 64

---

### Clients

**Collezione:** `clients`

Clienti (proprietari/gestori) degli appartamenti.

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  clientId: String,                 // Unique: es. "global-properties" (indexed)
  name: String,                     // Nome cliente
  createdAt: Number,                 // Unix timestamp (ms)
  updatedAt: Number                  // Unix timestamp (ms)
}
```

**Indici:**

-   `{ clientId: 1 }` (unique)

**Note:**

-   Un cliente può avere più appartamenti (relazione 1:N con Apartments)

---

### Apartments

**Collezione:** `apartments`

Appartamenti gestiti dal sistema.

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  aptId: String,                    // Unique: es. "101" (indexed)
  name: String,                     // es. "Lakeside Tower — Apt 101"
  clientId: String,                 // FK a Clients.clientId (indexed)
  status: String,                   // Enum: "ok" | "warn" | "crit"
  addressShort: String,             // Optional, indirizzo breve
  wifiSsid: String,                 // Optional, SSID WiFi
  wifiPass: String,                 // Optional, password WiFi
  checkIn: String,                  // Optional, formato "HH:mm" (es. "15:00")
  checkOut: String,                 // Optional, formato "HH:mm" (es. "11:00")
  rules: [String],                  // Optional, array house rules
  supportContacts: String,          // Optional, contatti supporto
  notes: String,                    // Optional, note operative interne
  readiness: String,                // Enum: "ready" | "guest_in_house" | "checkout_today" | "to_clean" | "cleaning_in_progress"
  activePlan: String,              // Optional, cache: planId attivo (derivato da Subscriptions)
  subscriptionStatus: String,      // Optional, cache: stato subscription (derivato da Subscriptions)
  subscriptionEndsAt: Number,       // Optional, cache: scadenza subscription (derivato da Subscriptions)
  createdAt: Number,                 // Unix timestamp (ms)
  updatedAt: Number                  // Unix timestamp (ms)
}
```

**Indici:**

-   `{ aptId: 1 }` (unique)
-   `{ clientId: 1 }`
-   `{ status: 1 }`
-   `{ readiness: 1 }`
-   `{ clientId: 1, status: 1 }` (compound)

**Note:**

-   `aptId` è univoco a livello globale (non solo per client)
-   `readiness` può essere calcolato dinamicamente o persistito
-   `activePlan`, `subscriptionStatus`, `subscriptionEndsAt` sono campi cache derivati da `Subscriptions` (non sono source of truth)

---

### Stays

**Collezione:** `stays`

Soggiorni (prenotazioni) degli ospiti.

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  stayId: String,                   // Unique: "stay-{uuid}" (indexed)
  aptId: String,                    // FK a Apartments.aptId (indexed)
  checkInAt: Number,                 // Unix timestamp (ms) (indexed)
  checkOutAt: Number,                // Unix timestamp (ms) (indexed)
  guests: [{                         // Array embedded di ospiti
    guestId: String,                // Unique per stay: "g-{random}"
    name: String,                    // Nome completo (per retrocompatibilità)
    firstName: String,              // Optional
    lastName: String,                // Optional
    phone: String,                   // Optional
    email: String                    // Optional
  }],
  cleanerName: String,               // Optional, nome cleaner assegnato
  createdBy: String,                // Enum: "host" | "system"
  createdAt: Number,                 // Unix timestamp (ms)
  updatedAt: Number                  // Unix timestamp (ms)
}
```

**Indici:**

-   `{ stayId: 1 }` (unique)
-   `{ aptId: 1 }`
-   `{ aptId: 1, checkInAt: 1, checkOutAt: 1 }` (compound, per query range date)
-   `{ checkInAt: 1 }`
-   `{ checkOutAt: 1 }`

**Note:**

-   Gli ospiti sono embedded per performance (query frequenti)
-   Un stay può avere più ospiti
-   `cleanerName` è persistente e indipendente dai PIN

---

### Pins

**Collezione:** `pins`

PIN di accesso temporanei per Guest, Cleaner, Host, Tech.

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  pin: String,                      // Unique: 6 cifre (es. "123456") (indexed)
  role: String,                     // Enum: "host" | "tech" | "guest" | "cleaner" (indexed)
  aptId: String,                    // FK a Apartments.aptId (indexed)
  validFrom: Number,                // Unix timestamp (ms) (indexed)
  validTo: Number,                   // Unix timestamp (ms) (indexed)
  expiresAt: Number,                 // Legacy alias di validTo
  stayId: String,                   // FK a Stays.stayId (indexed)
  guestId: String,                  // FK a Stays.guests[].guestId
  guestName: String,                // Optional, nome ospite
  source: String,                   // Enum: "auto" | "manual"
  createdAt: Number,                 // Unix timestamp (ms)
  consumedAt: Number,                // Optional, timestamp quando PIN è stato usato
  revokedAt: Number                  // Optional, timestamp quando PIN è stato revocato
}
```

**Indici:**

-   `{ pin: 1 }` (unique)
-   `{ aptId: 1 }`
-   `{ stayId: 1 }`
-   `{ role: 1 }`
-   `{ validFrom: 1, validTo: 1 }` (compound, per query validità)
-   `{ aptId: 1, role: 1 }` (compound)
-   TTL Index: `{ validTo: 1 }` con expireAfterSeconds: 0 (opzionale, per auto-cleanup)

**Note:**

-   PIN a 6 cifre, generati randomicamente
-   Validità controllata da `validFrom` e `validTo`
-   Un PIN può essere revocato manualmente (campo `revokedAt`)
-   Un PIN può essere consumato (campo `consumedAt`) per tracciamento

---

### CleaningJobs

**Collezione:** `cleaningjobs`

Job di pulizia associati agli stay.

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  id: String,                       // Unique: "job-{aptId}-{timestamp}" (indexed)
  aptId: String,                    // FK a Apartments.aptId (indexed)
  aptName: String,                  // Denormalizzato, nome appartamento
  windowLabel: String,              // Formato: "HH:mm–HH:mm" (es. "10:00–13:00")
  status: String,                   // Enum: "todo" | "in_progress" | "done" | "problem" (indexed)
  checklist: [{                     // Array embedded di item checklist
    id: String,                     // Unique per job
    label: String,                   // es. "Cucina (piani + lavello)"
    done: Boolean
  }],
  startedAt: Number,                // Optional, Unix timestamp (ms)
  completedAt: Number,              // Optional, Unix timestamp (ms)
  stayId: String,                   // Optional, FK a Stays.stayId (indexed)
  cleanerName: String,              // Optional, nome cleaner assegnato
  finalPhotos: [String],             // Optional, array di base64 o URL foto finali
  problemNote: String,              // Optional, note quando status="problem"
  problemPhotos: [String],          // Optional, array di base64 o URL foto problema
  createdAt: Number,                 // Unix timestamp (ms)
  updatedAt: Number                  // Unix timestamp (ms)
}
```

**Indici:**

-   `{ id: 1 }` (unique)
-   `{ aptId: 1 }`
-   `{ stayId: 1 }` (sparse)
-   `{ status: 1 }`
-   `{ aptId: 1, status: 1 }` (compound)
-   `{ stayId: 1, status: 1 }` (compound, sparse)

**Note:**

-   Le foto possono essere salvate come base64 (prototipo) o come URL a storage esterno (S3/R2)
-   `windowLabel` è denormalizzato per performance UI
-   Un job può essere associato a uno stay o essere standalone

---

### AccessEvents

**Collezione:** `accessevents`

Log eventi di accesso e azioni (audit trail).

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  id: String,                       // Unique: UUID (indexed)
  aptId: String,                    // FK a Apartments.aptId (indexed)
  type: String,                     // Enum: vedi AccessEventType (indexed)
  label: String,                    // Descrizione evento
  actor: String,                    // Optional, Enum: "host" | "guest" | "cleaner" | "tech" | "system"
  ts: Number,                        // Unix timestamp (ms) (indexed)
  metadata: {                        // Optional, dati aggiuntivi
    pin: String,                     // Se evento relativo a PIN
    stayId: String,                  // Se evento relativo a stay
    guestId: String,                 // Se evento relativo a guest
    outcome: String,                 // Per eventi door/gate: "ok" | "retrying" | "fail"
    [key: String]: Any               // Altri campi dinamici
  }
}
```

**AccessEventType enum:**

```javascript
'guest_access_ok' |
    'guest_access_ko' |
    'cleaner_access_ok' |
    'pin_created' |
    'pin_revoked' |
    'cleaning_done' |
    'problem_reported' |
    'door_opened' |
    'door_closed' |
    'gate_opened' |
    'wan_switched' |
    'vpn_toggled' |
    'stay_created' |
    'stay_deleted' |
    'stay_guests_updated';
```

**Indici:**

-   `{ id: 1 }` (unique)
-   `{ aptId: 1, ts: -1 }` (compound, per query recenti per appartamento)
-   `{ type: 1 }`
-   `{ ts: -1 }` (per query globali recenti)
-   TTL Index: `{ ts: 1 }` con expireAfterSeconds: 7776000 (90 giorni, opzionale)

**Note:**

-   Single source of truth per stato porte/portoni (derivato da eventi più recenti)
-   Collezione ad alta scrittura, considerare sharding per scale
-   `actor` può essere aggiunto in futuro per audit completo

---

### PushSubscriptions

**Collezione:** `pushsubscriptions`

Sottoscrizioni push notifications (Firebase Cloud Messaging - FCM). Supporta tutti i tipi di utenti: Tech, Host, Guest, Cleaner. Compatibile con PWA web, app native Android e iOS.

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  fcmToken: String,                  // Unique: FCM registration token (indexed)
  role: String,                     // Enum: "tech" | "host" | "guest" | "cleaner" (indexed)
  userId: String,                   // Optional, FK a Users.userId (per tech/host) (indexed)
  aptId: String,                    // Optional, FK a Apartments.aptId (indexed)
  stayId: String,                   // Optional, FK a Stays.stayId (per guest/cleaner) (indexed)
  guestId: String,                  // Optional, FK a Stays.guests[].guestId (per guest)
  cleanerName: String,              // Optional, nome cleaner (per cleaner)
  deviceId: String,                  // Optional, identificatore device univoco
  platform: String,                 // Enum: "ios" | "android" | "web" (indexed)
  topics: [String],                  // Optional, array di topic FCM (es. ["apt-101", "cleaning"]) (indexed)
  createdAt: Number,                 // Unix timestamp (ms)
  updatedAt: Number,                 // Unix timestamp (ms) - ultimo aggiornamento token
  lastUsedAt: Number,               // Optional, ultimo utilizzo per invio notifica
  isActive: Boolean                  // Default: true, false se token invalidato
}
```

**Indici:**

-   `{ fcmToken: 1 }` (unique)
-   `{ userId: 1 }` (sparse)
-   `{ aptId: 1 }` (sparse)
-   `{ stayId: 1 }` (sparse)
-   `{ role: 1 }`
-   `{ platform: 1 }`
-   `{ userId: 1, isActive: 1 }` (compound, per query token attivi per utente)
-   `{ stayId: 1, guestId: 1 }` (compound, sparse, per query guest)
-   `{ stayId: 1, cleanerName: 1 }` (compound, sparse, per query cleaner)
-   `{ aptId: 1, isActive: 1 }` (compound, per query token attivi per appartamento)
-   `{ topics: 1 }` (per topic-based messaging)
-   `{ updatedAt: 1 }` (per cleanup token inattivi)

**Note:**

-   `fcmToken` è la chiave unica (un token per device/app instance)
-   **Per Users (tech/host)**: associare tramite `userId` e `role`
-   **Per Guest**: associare tramite `stayId` + `guestId` e `role="guest"`
-   **Per Cleaner**: associare tramite `stayId` + `cleanerName` e `role="cleaner"`
-   `aptId` può essere usato per filtrare per appartamento (utile per tutti i ruoli)
-   `platform` identifica la piattaforma: "web" per PWA, "ios" per app iOS nativa, "android" per app Android nativa
-   `topics` permette di sottoscrivere a topic FCM per messaging di gruppo (es. `/topics/apt-101`)
-   `isActive` permette di disabilitare token senza rimuoverli (utile per debug/analytics)
-   Quando un token diventa invalido (es. errore FCM `NOT_FOUND`, `INVALID_ARGUMENT`), impostare `isActive: false` o rimuovere il documento
-   `updatedAt` viene aggiornato quando il token viene rinnovato o modificato (es. cambio topic)
-   FCM gestisce automaticamente il refresh dei token; quando un token viene rinnovato, aggiornare il documento esistente o creare uno nuovo (rimuovendo quello vecchio)
-   **Compatibilità PWA**: FCM per web usa Web Push API sotto il cofano, quindi funziona su PWA con le stesse limitazioni di Web Push (iOS 16.4+ richiede PWA installata)

---

### CleanerConfigs

**Collezione:** `cleanerconfigs`

Configurazioni cleaner per appartamento.

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  aptId: String,                    // Unique, FK a Apartments.aptId (indexed)
  cleaners: [{                       // Array embedded di cleaner
    name: String,                    // Nome cleaner
    phone: String                    // Telefono cleaner
  }],
  durationMin: Number,               // Durata default pulizia (minuti), default: 60
  cleaningTimeRanges: [{             // Array embedded di range orari
    from: String,                    // Formato "HH:mm" (es. "09:00")
    to: String                       // Formato "HH:mm" (es. "18:00")
  }],
  createdAt: Number,                 // Unix timestamp (ms)
  updatedAt: Number                  // Unix timestamp (ms)
}
```

**Indici:**

-   `{ aptId: 1 }` (unique)

**Note:**

-   Un appartamento ha una sola configurazione cleaner
-   `durationMin` è limitato tra 15 e 1440 minuti (24 ore)
-   `cleaningTimeRanges` definisce gli slot disponibili per le pulizie

---

### DevicePackages

**Collezione:** `devicepackages`

Configurazioni device abilitati per appartamento.

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  aptId: String,                    // Unique, FK a Apartments.aptId (indexed)
  devices: {                         // Map/object di device configurati
    "smart_lock": {
      enabled: Boolean,
      controllable: Boolean,
      controller: String             // Enum: "api" | "home_assistant"
    },
    "relay_gate": { ... },
    "smoke_sensor": { ... },
    "thermostat": { ... },
    "alarm_sensors": { ... },
    "lights": { ... },
    "ring_cam": { ... },
    "scenes": { ... },
    "ups": {                         // UPS non ha controller
      enabled: Boolean,
      controllable: false,           // Sempre false per UPS
      controller: null               // Sempre null per UPS
    }
  },
  createdAt: Number,                 // Unix timestamp (ms)
  updatedAt: Number                  // Unix timestamp (ms)
}
```

**DeviceType enum:**

```javascript
'smart_lock' | 'relay_gate' | 'smoke_sensor' | 'thermostat' | 'alarm_sensors' | 'lights' | 'ring_cam' | 'scenes' | 'ups';
```

**Indici:**

-   `{ aptId: 1 }` (unique)

**Note:**

-   Un appartamento ha un solo device package
-   `enabled`: device presente nell'appartamento
-   `controllable`: device può essere comandato (solo se `enabled=true`)
-   `controller`: sistema di controllo (solo se `enabled=true`, tranne UPS)

---

### TechnicalSettings

**Collezione:** `technicalsettings`

Configurazioni tecniche per appartamento (Smart Lock, Home Assistant, Network, API).

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  aptId: String,                    // Unique, FK a Apartments.aptId (indexed)
  smartLock: {
    provider: String,               // Enum: "tedee" | "other" | null
    bridgeEndpoint: String,          // URL bridge Smart Lock
    token: String,                   // Token autenticazione
    keypadId: String,                // ID keypad
    capabilities: [String]           // Array: es. ["pin_management", "lock_control"]
  },
  homeAssistant: {
    baseUrl: String,                 // es. "http://homeassistant.local:8123"
    token: String,                   // Long-Lived Access Token
    entityMapping: {                 // Map entity_id -> device type
      [entityId: String]: String
    }
  },
  network: {
    wireguardEndpoint: String,       // Endpoint WireGuard VPN
    cloudflareEndpoint: String,      // Optional, endpoint Cloudflare Tunnel
    healthCheckUrl: String           // URL health check
  },
  diagnostics: {
    lastErrors: [{                   // Array embedded, ultimi 50 errori
      timestamp: Number,             // Unix timestamp (ms)
      error: String,                 // Messaggio errore
      source: String                 // Enum: "smart_lock" | "home_assistant" | "network"
    }],
    testResults: {                   // Map test name -> risultato
      [testName: String]: {
        success: Boolean,
        message: String,
        timestamp: Number            // Unix timestamp (ms)
      }
    }
  },
  deviceApis: {                     // Map device type -> configurazione API
    [deviceType: String]: {
      endpoint: String,              // URL endpoint API
      token: String,                 // Token autenticazione
      deviceId: String,              // ID device nell'API esterna
      additionalConfig: {             // Configurazioni aggiuntive key-value
        [key: String]: String
      }
    }
  },
  createdAt: Number,                 // Unix timestamp (ms)
  updatedAt: Number                  // Unix timestamp (ms)
}
```

**Indici:**

-   `{ aptId: 1 }` (unique)

**Note:**

-   Un appartamento ha una sola configurazione tecnica
-   `deviceApis` è una map per configurare API esterne per ogni device type
-   `diagnostics.lastErrors` è limitato a 50 elementi (più recenti)

---

### Readiness

**Collezione:** `readiness` (opzionale, può essere embedded in Apartments)

Stato di readiness degli appartamenti.

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  aptId: String,                    // Unique, FK a Apartments.aptId (indexed)
  readiness: String,                // Enum: "ready" | "guest_in_house" | "checkout_today" | "to_clean" | "cleaning_in_progress"
  updatedAt: Number                 // Unix timestamp (ms)
}
```

**Indici:**

-   `{ aptId: 1 }` (unique)
-   `{ readiness: 1 }`

**Note:**

-   Questa collezione è opzionale: `readiness` può essere embedded nel documento `Apartments`
-   Se embedded, non serve questa collezione separata

---

### Plans

**Collezione:** `plans`

Catalogo piani disponibili. Collezione statica, read-only a runtime.

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  planId: String,                   // Unique: "base", "premium" (indexed)
  name: String,                     // Nome piano
  description: String,               // Descrizione commerciale
  priceCents: Number,                // Prezzo di riferimento
  currency: String,                  // "EUR"
  interval: String,                  // Enum: "month" | "year"
  features: {                        // Feature flag usate dal backend
    smartLock: Boolean,
    cleaningJobs: Boolean,
    advancedDevices: Boolean,
    accessEventsRetentionDays: Number,
    supportLevel: String             // Enum: "standard" | "priority"
  },
  stripePriceId: String,            // FK Stripe price
  createdAt: Number                 // Unix timestamp (ms)
}
```

**Indici:**

-   `{ planId: 1 }` (unique)

**Note:**

-   Non contiene stato, solo configurazione
-   Usata per UI, feature gating, validazioni
-   I piani sono definiti a livello applicativo e non modificati a runtime

---

### BillingCustomers

**Collezione:** `billingcustomers`

Rappresenta chi paga su Stripe. Non coincide necessariamente con un user.

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  billingCustomerId: String,        // Unique: "bill-{uuid}" (indexed)
  stripeCustomerId: String,        // ID customer Stripe (indexed)
  clientId: String,                 // Optional, FK a Clients.clientId (indexed)
  userId: String,                   // Optional, FK a Users.userId
  email: String,
  name: String,
  createdAt: Number,                 // Unix timestamp (ms)
  updatedAt: Number                  // Unix timestamp (ms)
}
```

**Indici:**

-   `{ billingCustomerId: 1 }` (unique)
-   `{ stripeCustomerId: 1 }` (unique)
-   `{ clientId: 1 }` (sparse)

**Note:**

-   Un billing customer può pagare più appartamenti
-   Supporta fatturazione centralizzata
-   Separato da Users per supportare scenari multi-tenant complessi

---

### Subscriptions

**Collezione:** `subscriptions`

Piano attivo (o storico) per ciascun appartamento. Source of truth runtime.

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  subscriptionId: String,           // Unique: "sub-{uuid}" (indexed)
  aptId: String,                    // FK a Apartments.aptId (indexed)
  planId: String,                   // FK a Plans.planId
  billingCustomerId: String,        // FK a BillingCustomers.billingCustomerId
  stripeSubscriptionId: String,     // ID subscription Stripe (indexed)
  status: String,                   // Enum: "trialing" | "active" | "past_due" | "canceled" | "expired" (indexed)
  currentPeriodStart: Number,        // Unix timestamp (ms)
  currentPeriodEnd: Number,          // Unix timestamp (ms)
  cancelAtPeriodEnd: Boolean,       // Default: false
  trialEndsAt: Number,              // Optional, Unix timestamp (ms)
  createdAt: Number,                 // Unix timestamp (ms)
  updatedAt: Number                  // Unix timestamp (ms)
}
```

**Indici:**

-   `{ subscriptionId: 1 }` (unique)
-   `{ aptId: 1, status: 1 }` (compound)
-   `{ stripeSubscriptionId: 1 }` (unique)

**Note:**

-   Un solo documento con `status="active"` per appartamento
-   Le subscription non si modificano distruttivamente: nuova subscription per cambio piano
-   Gli stati storici vengono mantenuti per audit

---

### Payments

**Collezione:** `payments`

Storico pagamenti e fatture. Append-only.

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated
  paymentId: String,                // Unique: "pay-{uuid}" (indexed)
  billingCustomerId: String,        // FK a BillingCustomers.billingCustomerId (indexed)
  aptId: String,                    // FK a Apartments.aptId (indexed)
  subscriptionId: String,           // FK a Subscriptions.subscriptionId (indexed)
  stripeInvoiceId: String,          // Optional, ID invoice Stripe
  stripePaymentIntentId: String,   // Optional, ID payment intent Stripe
  amountCents: Number,              // Importo in centesimi
  currency: String,                 // "EUR"
  status: String,                   // Enum: "paid" | "failed" | "refunded"
  paidAt: Number,                   // Optional, Unix timestamp (ms)
  createdAt: Number                 // Unix timestamp (ms)
}
```

**Indici:**

-   `{ paymentId: 1 }` (unique)
-   `{ billingCustomerId: 1 }`
-   `{ subscriptionId: 1 }`
-   `{ aptId: 1 }`

**Note:**

-   Mai aggiornare o cancellare record (append-only)
-   Usata per audit, report e fatturazione
-   Source of truth per storico pagamenti

---

## Indici Consigliati

### Indici Globali

```javascript
// Users
db.users.createIndex({ userId: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ role: 1, enabled: 1 });

// Apartments
db.apartments.createIndex({ aptId: 1 }, { unique: true });
db.apartments.createIndex({ clientId: 1 });
db.apartments.createIndex({ status: 1, readiness: 1 });

// Stays
db.stays.createIndex({ stayId: 1 }, { unique: true });
db.stays.createIndex({ aptId: 1, checkInAt: 1, checkOutAt: 1 });
db.stays.createIndex({ checkOutAt: 1 }); // Per query checkout oggi

// Pins
db.pins.createIndex({ pin: 1 }, { unique: true });
db.pins.createIndex({ aptId: 1, role: 1 });
db.pins.createIndex({ stayId: 1 });
db.pins.createIndex({ validFrom: 1, validTo: 1 });
// TTL Index opzionale per auto-cleanup PIN scaduti
db.pins.createIndex({ validTo: 1 }, { expireAfterSeconds: 0 });

// AccessEvents
db.accessevents.createIndex({ aptId: 1, ts: -1 });
db.accessevents.createIndex({ type: 1, ts: -1 });
// TTL Index opzionale per retention 90 giorni
db.accessevents.createIndex({ ts: 1 }, { expireAfterSeconds: 7776000 });

// CleaningJobs
db.cleaningjobs.createIndex({ id: 1 }, { unique: true });
db.cleaningjobs.createIndex({ aptId: 1, status: 1 });
db.cleaningjobs.createIndex({ stayId: 1 }, { sparse: true });

// PushSubscriptions
db.pushsubscriptions.createIndex({ fcmToken: 1 }, { unique: true });
db.pushsubscriptions.createIndex({ userId: 1 }, { sparse: true });
db.pushsubscriptions.createIndex({ aptId: 1 }, { sparse: true });
db.pushsubscriptions.createIndex({ stayId: 1 }, { sparse: true });
db.pushsubscriptions.createIndex({ role: 1 });
db.pushsubscriptions.createIndex({ platform: 1 });
db.pushsubscriptions.createIndex({ userId: 1, isActive: 1 });
db.pushsubscriptions.createIndex({ stayId: 1, guestId: 1 }, { sparse: true });
db.pushsubscriptions.createIndex({ stayId: 1, cleanerName: 1 }, { sparse: true });
db.pushsubscriptions.createIndex({ aptId: 1, isActive: 1 });
db.pushsubscriptions.createIndex({ topics: 1 });
db.pushsubscriptions.createIndex({ updatedAt: 1 });

// Plans
db.plans.createIndex({ planId: 1 }, { unique: true });

// BillingCustomers
db.billingcustomers.createIndex({ billingCustomerId: 1 }, { unique: true });
db.billingcustomers.createIndex({ stripeCustomerId: 1 }, { unique: true });
db.billingcustomers.createIndex({ clientId: 1 }, { sparse: true });

// Subscriptions
db.subscriptions.createIndex({ subscriptionId: 1 }, { unique: true });
db.subscriptions.createIndex({ aptId: 1, status: 1 });
db.subscriptions.createIndex({ stripeSubscriptionId: 1 }, { unique: true });

// Payments
db.payments.createIndex({ paymentId: 1 }, { unique: true });
db.payments.createIndex({ billingCustomerId: 1 });
db.payments.createIndex({ subscriptionId: 1 });
db.payments.createIndex({ aptId: 1 });
```

---

## Relazioni tra Collezioni

```
Clients (1) ──< (N) Apartments
Apartments (1) ──< (N) Stays
Stays (1) ──< (N) Pins
Stays (1) ──< (N) CleaningJobs
Apartments (1) ──< (1) CleanerConfigs
Apartments (1) ──< (1) DevicePackages
Apartments (1) ──< (1) TechnicalSettings
Apartments (1) ──< (N) AccessEvents
Users (1) ──< (N) PushSubscriptions (opzionale)
Apartments (1) ──< (N) PushSubscriptions (opzionale)
Stays (1) ──< (N) PushSubscriptions (opzionale, per guest/cleaner)
Clients (1) ──< (N) BillingCustomers (opzionale)
BillingCustomers (1) ──< (N) Subscriptions
Apartments (1) ──< (N) Subscriptions
Plans (1) ──< (N) Subscriptions
Subscriptions (1) ──< (N) Payments
```

**Note:**

-   Le relazioni sono implementate tramite `clientId`, `aptId`, `stayId`, `userId`, `billingCustomerId`, `subscriptionId`, `planId` come foreign keys
-   MongoDB non ha foreign key constraints nativi, validazione a livello applicativo
-   Considerare l'uso di `$lookup` per join quando necessario
-   Un appartamento può avere più subscription (storico), ma solo una con `status="active"`

---

## Note Implementative

### 1. Timestamps

-   Tutti i timestamp sono in **millisecondi** (Unix timestamp \* 1000)
-   Usare `Date.now()` in JavaScript/TypeScript
-   MongoDB `ISODate` può essere usato, ma preferire `Number` per consistenza

### 2. ID Unici

-   `userId`, `stayId`, `aptId`, `clientId` sono stringhe univoche generate dall'applicazione
-   MongoDB `_id` è sempre presente e può essere usato come chiave primaria
-   Considerare l'uso di `_id` come chiave primaria e rimuovere ID custom se non necessario

### 3. Embedded vs Referenced

-   **Embedded**: `Stays.guests`, `CleaningJobs.checklist` (dati accessibili frequentemente insieme)
-   **Referenced**: `Stays.aptId`, `Pins.stayId` (relazioni 1:N, dati che cambiano indipendentemente)

### 4. Denormalizzazione

-   `CleaningJobs.aptName`: denormalizzato per performance UI
-   `AccessEvents`: single source of truth per stato porte/portoni

### 5. TTL Indexes

-   `Pins.validTo`: TTL index per auto-cleanup PIN scaduti (opzionale)
-   `AccessEvents.ts`: TTL index per retention 90 giorni (opzionale)

### 6. Storage Foto

-   **Prototipo**: Base64 embedded in `CleaningJobs.finalPhotos` e `CleaningJobs.problemPhotos`
-   **Produzione**: Salvare URL a storage esterno (S3, R2, Cloudinary) e referenziare URL

### 7. Password Hashing

-   Algoritmo: **pbkdf2** con sha512
-   Iterazioni: 100000
-   Key length: 64 bytes
-   Format: `{salt}${hash}` (hex encoded)

### 8. Validazione

-   Validazione a livello applicativo (MongoDB schema validation opzionale)
-   Validare enum values, date ranges, required fields

### 9. Migrazioni

-   Considerare l'uso di migrazioni per aggiornamenti schema
-   Versioning documenti con campo `schemaVersion` se necessario

### 10. Performance

-   Usare projection per limitare campi restituiti
-   Considerare paginazione per collezioni grandi (`AccessEvents`, `Pins`, `Payments`)
-   Monitorare query lente e ottimizzare indici

### 11. Billing e Stripe Integration

-   **Stripe gestisce solo il pagamento**: MongoDB è la source of truth per subscription e payments
-   **Webhook Stripe** aggiornano: `Subscriptions`, `Payments`, cache in `Apartments`
-   **Eventi Stripe da gestire:**
    -   `customer.subscription.created`
    -   `customer.subscription.updated`
    -   `customer.subscription.deleted`
    -   `invoice.paid`
    -   `invoice.payment_failed`
-   **Cache in Apartments**: I campi `activePlan`, `subscriptionStatus`, `subscriptionEndsAt` sono derivati da `Subscriptions` e aggiornati via webhook
-   **Feature Gating**: La disponibilità di una funzione dipende da:
    -   `DevicePackages` → hardware installato
    -   `Plans.features` → feature acquistata
    -   Esempio: `canUseSmartLock = plan.features.smartLock && devicePkg.devices.smart_lock?.enabled`

### 12. Payments Append-Only

-   La collezione `Payments` è append-only: mai aggiornare o cancellare record
-   Usata per audit, report e fatturazione
-   Per correzioni, creare nuovi record con status appropriato

### 13. Firebase Cloud Messaging (FCM)

-   **Token Management**: I token FCM possono cambiare per vari motivi (reinstall app, clear data, device restore). Gestire `onTokenRefresh` per aggiornare token scaduti nel database
-   **Registrazione Token**:
    -   Client genera token con Firebase SDK (`getToken()`)
    -   Client invia token al BE tramite API
    -   BE salva token associandolo all'utente/guest/cleaner
-   **Aggiornamento Token**: Quando FCM genera un nuovo token (callback `onTokenRefresh`), aggiornare il documento esistente o creare uno nuovo (rimuovendo quello vecchio)
-   **Cleanup Token Invalidi**: Quando FCM restituisce errori (`NOT_FOUND`, `INVALID_ARGUMENT`, `UNREGISTERED`), marcare `isActive: false` o rimuovere il documento
-   **Invio Notifiche**:
    -   Recuperare tutti i token attivi per l'utente/guest/cleaner
    -   Inviare a ciascun token tramite Firebase Admin SDK
    -   Gestire errori e rimuovere token invalidi
-   **Topic-Based Messaging**: Usare `topics` per messaging di gruppo (es. tutti gli utenti di un appartamento). Sottoscrivere/rimuovere topic tramite FCM Admin SDK
-   **Platform Detection**: Identificare `platform` al momento della registrazione (web/ios/android) per personalizzare le notifiche
-   **Compatibilità PWA**: FCM per web usa Web Push API, quindi funziona su PWA con le stesse limitazioni:
    -   iOS 16.4+ richiede PWA installata (Aggiungi alla Home)
    -   Non funziona da Safari browser normale su iOS
    -   Chrome, Firefox, Edge supportano completamente
-   **Multi-Device**: Un utente può avere più token (uno per device/app). Tutti i token attivi ricevono le notifiche
-   **Analytics**: FCM fornisce analytics integrate (delivery rate, open rate) tramite Firebase Console

---

## Esempi Query

### Query Stay Attivo per Appartamento

```javascript
db.stays.findOne({
    aptId: '101',
    checkInAt: { $lte: Date.now() },
    checkOutAt: { $gte: Date.now() },
});
```

### Query PIN Validi per Stay

```javascript
db.pins.find({
    stayId: 'stay-xxx',
    validFrom: { $lte: Date.now() },
    validTo: { $gte: Date.now() },
    revokedAt: { $exists: false },
});
```

### Query Eventi Recenti per Appartamento

```javascript
db.accessevents
    .find({
        aptId: '101',
    })
    .sort({ ts: -1 })
    .limit(20);
```

### Query Job Pulizia in Corso

```javascript
db.cleaningjobs
    .find({
        aptId: '101',
        status: { $in: ['todo', 'in_progress'] },
    })
    .sort({ createdAt: -1 });
```

### Query Subscription Attiva per Appartamento

```javascript
db.subscriptions.findOne({
    aptId: '101',
    status: 'active',
});
```

### Query Pagamenti per Billing Customer

```javascript
db.payments
    .find({
        billingCustomerId: 'bill-xxx',
    })
    .sort({ createdAt: -1 });
```

### Query Token FCM Attivi per Utente

```javascript
db.pushsubscriptions.find({
    userId: 'user-xxx',
    isActive: true,
});
```

### Query Token FCM per Guest

```javascript
db.pushsubscriptions.find({
    stayId: 'stay-xxx',
    guestId: 'g-xxx',
    role: 'guest',
    isActive: true,
});
```

### Query Token FCM per Cleaner

```javascript
db.pushsubscriptions.find({
    stayId: 'stay-xxx',
    cleanerName: 'Mario Rossi',
    role: 'cleaner',
    isActive: true,
});
```

### Query Token FCM per Appartamento

```javascript
db.pushsubscriptions.find({
    aptId: '101',
    isActive: true,
});
```

### Query Token FCM per Topic

```javascript
db.pushsubscriptions.find({
    topics: 'apt-101',
    isActive: true,
});
```

### Cleanup Token Inattivi (non aggiornati da 90 giorni)

```javascript
const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
db.pushsubscriptions.updateMany(
    {
        updatedAt: { $lt: ninetyDaysAgo },
        isActive: true,
    },
    {
        $set: { isActive: false },
    }
);
```

---

## Conclusioni

Questa documentazione fornisce una base solida per l'implementazione del database MongoDB per Servizio UI.

**Prossimi passi:**

1. Creare script di migrazione per inizializzare collezioni e indici
2. Implementare validazione schema MongoDB (opzionale)
3. Definire strategia backup e replica
4. Configurare TTL indexes se necessario
5. Implementare storage esterno per foto (S3/R2)

**Note finali:**

-   La struttura è progettata per essere scalabile e mantenibile
-   Considerare sharding per `AccessEvents` se il volume diventa elevato
-   Monitorare performance e ottimizzare indici in base all'uso reale
