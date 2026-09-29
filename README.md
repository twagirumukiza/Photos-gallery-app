# Générateur de script galerie photo

- `generateur.html` : l'application (un seul fichier, aucune installation). Déposez vos photos, répondez aux questions (lien du site, dossiers, alt/commentaires) : elle produit `galerie.js`.
- `gallery.js` : le composant seul, pour un usage manuel (déjà inclus dans le script généré).

## Utilisation
1. Ouvrez `generateur.html` (en local ou sur GitHub Pages).
2. Déposez vos photos, indiquez le lien de votre site, ajoutez alt et commentaires si vous voulez.
3. Téléchargez `galerie.js` et déposez-le à la racine de votre site (photos dans `photos/`, miniatures dans `photos/thumbs/`).
4. Collez où vous voulez :
```html
<photo-gallery></photo-gallery>
<script src="https://VOTRE-SITE/galerie.js"></script>
```
Variante sans fichier : « Copier le script complet » et collez-le directement dans la page.
Le bouton « Créer les miniatures (ZIP) » fabrique les miniatures si vous n'en avez pas.
