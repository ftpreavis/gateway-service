const fastify = require('fastify')({ logger: true });
const fastifyJwt = require('@fastify/jwt');
const fastifyOauth2 = require('@fastify/oauth2');
const fastifyCookie = require('@fastify/cookie');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Register plugins
fastify.register(fastifyCookie);
fastify.register(fastifyJwt, {
	secret: process.env.JWT_SECRET, // ⚠️ Remplacer par une vraie clé sécurisée en prod
	cookie: {
		cookieName: 'access_token',
		signed: false,
	}
});

fastify.addHook('onRequest', (request, reply, done) => {
	const token = request.cookies.access_token;
	if (token) {
		request.headers['Authorization'] = `Bearer ${token}`;
	}
	done();
})

fastify.register(fastifyOauth2, {
	name: 'googleOAuth2',
	scope: ['profile', 'email'],
	credentials: {
		client: {
			id: process.env.GOOGLE_CLIENT_ID,
			secret: process.env.GOOGLE_CLIENT_SECRET,
		},
		auth: fastifyOauth2.GOOGLE_CONFIGURATION,
	},
	startRedirectPath: '/auth/google', // Démarre la redirection Google OAuth
	callbackUri: 'http://localhost:4003/auth/google/callback', // DOIT être ton gateway ici !
});

// Middleware pour vérifier les JWT
fastify.decorate('authenticate', async function (request, reply) {
	try {
		const token = request.cookies.access_token;
		console.log("Token in cookies:", token); // Loguer le token reçu
		if (!token) {
			return reply.code(401).send('Unauthorized');
		}
		request.user = await request.jwtVerify(token);
		console.log("Decoded user:", request.user); // Loguer l'utilisateur décodé
	} catch (err) {
		console.error(err); // Loguer l'erreur si elle se produit
		reply.code(401).send({ error: 'Unauthorized' });
	}
});


// ROUTES

// Route publique
fastify.get('/', async (request, reply) => {
	return 'pong\n';
});

// Route protégée
fastify.get('/protected', { preValidation: [fastify.authenticate] }, async (request, reply) => {
	return { msg: `Hello ${request.user.username || request.user.email}, you are authenticated.` };
});

// Callback OAuth Google
fastify.get('/auth/google/callback', async (request, reply) => {
	try {
		const token = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

		if (!token.token.access_token) {
			return reply.code(400).send({ error: 'Access token is missing' });
		}

		console.log('Received access token: ', token.token.access_token);

		// Récupérer les infos utilisateur Google
		const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
			headers: { Authorization: `Bearer ${token.token.access_token}` },
		});

		console.log('userInfo', userInfo.data);

		const googleId = userInfo.data.id;
		const email = userInfo.data.email;

		// Ici : tu pourrais enregistrer l'utilisateur en base si tu veux (via db-service)
		// Par exemple :
		// await axios.post('http://db-service:3000/users/google', { googleId, email });

		// Créer un JWT pour cet utilisateur Google
		const jwt = fastify.jwt.sign({ googleId, email });

		console.log('Generated JWT: ', jwt);

		// Soit tu rediriges avec le JWT en cookie
		reply
			.setCookie('access_token', jwt, {
				path: '/',
				httpOnly: true,
			})
			.redirect('/protected');

		// OU alors tu peux simplement envoyer le token :
		// reply.send({ token: jwt });

	} catch (err) {
		fastify.log.error(err);
		if (err.response) {
			reply
				.code(err.response.status)
				.send({ error: 'OAuth callback failed', details: err.response.data });
		} else {
			reply
				.code(500)
				.send({ error: 'OAuth callback failed', details: err.message });
		}
	}
});

// Route pour logout
fastify.get('/auth/logout', async (request, reply) => {
	reply.clearCookie('access_token');
	reply.redirect('https://accounts.google.com/Logout');
});

// Start Server
fastify.listen({ host: '0.0.0.0', port: 3000 }, (err, addr) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	console.log(`Server listening at ${addr}`);
});
