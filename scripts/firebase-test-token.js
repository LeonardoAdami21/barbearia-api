/**
 * Gera um ID token REAL do Firebase para testar o POST /api/auth/firebase sem o app.
 *
 *   yarn firebase:token                       -> usuário teste@barbearia.dev
 *   yarn firebase:token joao@email.com "João" -> outro e-mail/nome
 *
 * Como funciona: com a service account (credentials/), cria ou atualiza o usuário no
 * Firebase Authentication com o e-mail já verificado, gera um custom token e troca esse
 * custom token por um ID token na API REST do Firebase (precisa da FIREBASE_WEB_API_KEY).
 * O ID token vale 1 hora. Só para desenvolvimento.
 */
require('dotenv/config');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { cert, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

async function main() {
  const [email = 'teste@gmail.com', name = 'Barbeira de Teste'] =
    process.argv.slice(2);

  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    console.error(
      'Defina FIREBASE_WEB_API_KEY no .env.\n' +
        'Onde pegar: Firebase Console > Configurações do projeto > Geral > "Chave de API da Web".',
    );
    process.exit(1);
  }

  const path = resolve(
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      'credentials/firebase-service-account.json',
  );
  const sa = JSON.parse(readFileSync(path, 'utf8'));
  const auth = getAuth(
    initializeApp({
      projectId: sa.project_id,
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    }),
  );

  const user = await auth
    .getUserByEmail(email)
    .then((u) =>
      auth.updateUser(u.uid, { emailVerified: true, displayName: name }),
    )
    .catch((error) => {
      if (error.code !== 'auth/user-not-found') throw error;
      return auth.createUser({ email, emailVerified: true, displayName: name });
    });

  // Custom token é só o passo intermediário: ele NÃO serve no /auth/firebase.
  const customToken = await auth.createCustomToken(user.uid);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const body = await response.json();
  if (!response.ok) {
    console.error(
      'O Firebase recusou a troca do token:',
      body.error?.message ?? body,
    );
    process.exit(1);
  }

  console.error(
    `Usuário: ${email} (uid ${user.uid}). Token válido por 1 hora.`,
  );
  console.error(
    'Use no Swagger em POST /api/auth/firebase: { "idToken": "<token abaixo>" }\n',
  );
  console.log(body.idToken);
}

main().catch((error) => {
  console.error(error.code ?? '', error.message);
  process.exit(1);
});
