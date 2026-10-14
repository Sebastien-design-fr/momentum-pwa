'use strict';
msalRedirectBridge.broadcastResponseToMainFrame().catch(()=>{history.replaceState(null,'',location.pathname);document.getElementById('auth-status').textContent='La connexion n’a pas pu revenir à MOMENTUM. Ferme cette fenêtre et réessaie depuis l’onglet Mail.';});
