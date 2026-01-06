# Guida Test Push Notifications su Render

## URL Deploy
**Render:** https://servizio-ui-redesign.onrender.com

## Prerequisiti

### Per Desktop/Android
- Browser moderno (Chrome, Firefox, Edge, Safari 16+)
- HTTPS (già disponibile su Render)
- Service Worker supportato

### Per iPhone/iOS
- iOS 16.4 o superiore
- Safari browser
- App installata come PWA (aggiunta alla Home)

---

## Procedura di Test

### Step 1: Deploy su Render
1. Assicurati che il codice sia committato e pushato
2. Render dovrebbe fare auto-deploy se configurato
3. Verifica che l'app sia accessibile su https://servizio-ui-redesign.onrender.com

### Step 2: Verifica Service Worker
1. Apri l'app su Render in un browser desktop
2. Apri DevTools (F12) → Console
3. Dovresti vedere: `[SW] Service Worker registrato con successo`
4. Vai su DevTools → Application → Service Workers
5. Verifica che `/sw.js` sia registrato e attivo

### Step 3: Abilita Notifiche (Desktop/Android)
1. Accedi all'app (qualsiasi ruolo)
2. Nell'header, clicca sull'icona campanella (Bell) accanto al tema
3. Il browser chiederà permesso per le notifiche → clicca "Consenti"
4. L'icona cambierà in blu quando abilitata

### Step 4: Abilita Notifiche (iPhone/iOS)
1. **IMPORTANTE:** Prima di tutto, installa l'app come PWA:
   - Apri Safari su iPhone
   - Vai su https://servizio-ui-redesign.onrender.com
   - Tocca il pulsante "Condividi" (quadrato con freccia)
   - Seleziona "Aggiungi alla Home"
   - Conferma
2. Apri l'app dalla Home (non da Safari browser)
3. Accedi all'app
4. Nell'header, tocca l'icona campanella
5. iOS chiederà permesso → "Consenti"
6. L'icona diventerà blu quando abilitata

### Step 5: Test Push (Solo Tech)
1. Accedi come utente **tech** (`/loginhost-tech` → `tech/tech123`)
2. Vai alla pagina Dashboard Tech (`/app/tech`)
3. Nella sidebar destra, troverai la sezione "PUSH NOTIFICATIONS"
4. Clicca il bottone **"Test Push"**
5. Dovresti ricevere una notifica immediatamente

### Step 6: Test con App Chiusa (iPhone/iOS)
1. Dopo aver abilitato le notifiche e fatto il test
2. Chiudi completamente l'app (swipe up e swipe via)
3. Dalla Dashboard Tech, clicca di nuovo "Test Push"
4. La notifica dovrebbe arrivare anche con app chiusa

---

## Troubleshooting

### Service Worker non si registra
- Verifica che `/sw.js` sia accessibile: https://servizio-ui-redesign.onrender.com/sw.js
- Controlla Console per errori
- Assicurati di essere su HTTPS (Render usa HTTPS automaticamente)

### Notifiche non arrivano su iPhone
- **Devi installare l'app come PWA** (Aggiungi alla Home)
- Non funziona da Safari browser normale
- iOS richiede almeno 16.4
- Verifica che il permesso sia stato concesso (Settings → Safari → Notifiche)

### Bottone "Test Push" dà errore
- Verifica di essere loggato come **tech**
- Controlla Console per errori API
- Verifica che almeno una subscription sia registrata (dev aver abilitato le notifiche prima)

### Notifica non visibile
- Verifica permessi del browser/Sistema
- Controlla che non sia in modalità "Non disturbare"
- Su desktop, verifica le impostazioni notifiche del browser

---

## Verifica Funzionamento

### Check List
- [ ] Service Worker registrato (Console log + DevTools)
- [ ] Notifiche abilitate (icona blu nell'header)
- [ ] Subscription salvata (verifica in Network tab → chiamata a `/api/push/subscribe`)
- [ ] Test push funziona (notifica ricevuta)
- [ ] Funziona con app chiusa (solo iOS PWA)

### Log Utili
- Console browser: `[SW]`, `[PushNotificationToggle]`
- Network tab: chiamate a `/api/push/*`
- Render logs: errori backend se presenti

---

## Note Importanti

1. **Prototipo in-memory**: Le subscription si perdono al restart del server
2. **VAPID keys**: Rigenerate ad ogni restart (OK per prototipo)
3. **iPhone**: Funziona SOLO con PWA installata, non da Safari normale
4. **HTTPS obbligatorio**: Render fornisce HTTPS automaticamente

---

## Test Multi-Dispositivo

Puoi testare inviando notifiche a più dispositivi:
1. Abilita notifiche su desktop Chrome
2. Abilita notifiche su iPhone (PWA installata)
3. Abilita notifiche su Android Chrome
4. Dalla Dashboard Tech, clicca "Test Push"
5. Tutti i dispositivi registrati dovrebbero ricevere la notifica

