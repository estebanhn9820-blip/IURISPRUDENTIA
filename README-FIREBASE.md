# Integración Firebase para IURISPRUDENTIA

Cuenta autorizada: `estebanhn9820@gmail.com`

Archivos:

- `firebase-integration.js`: autenticación con Google, Firestore y Storage.
- `firestore.rules`: permite acceder solo a la cuenta autorizada.
- `storage.rules`: protege los PDF bajo `provenance/`.

Añade antes de `</body>`:

```html
<script type="module" src="firebase-integration.js"></script>
```

Después publica las reglas en Firebase y autoriza `estebanhn9820-blip.github.io` en Authentication.
