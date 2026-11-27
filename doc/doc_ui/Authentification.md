# Écrans d’authentification

## État d’intégration

`LoginPage.tsx` et `ForgetPassword.tsx` sont implémentés dans les sources.
Cependant, `App.tsx` rend actuellement le dashboard directement et ne référence
pas `LoginPage`. Aucun mécanisme de garde de route ni parcours de redirection
après connexion n’est présent dans l’application montée telle qu’elle est
documentée ici.

## Connexion (`LoginPage`)

L’écran de connexion comprend une zone de présentation de LogSight et un
formulaire avec:

- adresse e-mail (validation HTML `email`);
- mot de passe et bouton afficher/masquer;
- option « Remember me », activée par défaut;
- bouton « Forgot password? » ouvrant le dialogue de réinitialisation;
- états de chargement, erreur et succès.

À la soumission, le composant envoie `email`, `password` et `rememberMe` à
`POST /api/auth/sign-in/email`. Pendant l’envoi, les champs concernés et le
bouton de connexion sont désactivés.

Si la réponse expose `twoFactorRedirect`, un message indique qu’une
authentification à deux facteurs est requise. Aucun écran de saisie du second
facteur ni redirection n’est implémenté dans ce composant. Sinon, le formulaire
affiche « Signed in successfully. »; il ne change pas de page et ne met pas à
jour d’état global d’authentification.

Les erreurs Axios utilisent, dans l’ordre, `response.data.message`,
`response.data.error`, puis un message générique. Une erreur JavaScript standard
affiche son message, sinon le message générique est utilisé.

## Réinitialisation (`ForgetPassword`)

Le dialogue comporte trois étapes:

1. **Adresse e-mail** — préremplie avec l’adresse du formulaire de connexion.
   La demande envoie `email` et `redirectTo: window.location.origin` à
   `POST /api/auth/request-password-reset`.
2. **Code** — après une réponse réussie à la demande, le composant affiche un
   message neutre (« If an account exists… »), puis demande le jeton reçu par
   e-mail. Le bouton Continue change d’étape sans vérifier le jeton auprès du
   serveur.
3. **Nouveau mot de passe** — le composant exige au moins huit caractères et
   vérifie l’égalité des deux saisies côté client. Il transmet `token` (nettoyé
   avec `trim()`) et `newPassword` à `POST /api/auth/reset-password`.

Le jeton est donc validé lors de la soumission finale, par l’API. En cas de
succès, le dialogue se ferme et l’écran de connexion affiche un message de
confirmation. Des contrôles permettent de revenir à l’étape précédente ou
d’utiliser une autre adresse.

Le dialogue expose les attributs ARIA `role="dialog"`, `aria-modal`,
`aria-labelledby` et `aria-describedby`. Un clic sur le fond le ferme si une
requête n’est pas en cours; le bouton de fermeture est également désactivé
pendant les requêtes.

## Limites de portée

Cette documentation décrit uniquement le comportement côté navigateur. Elle ne
décrit pas les politiques de session, d’expiration, de sécurité des jetons ou
de validation serveur, qui relèvent du service d’authentification.
