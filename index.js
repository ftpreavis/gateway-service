const fastify = require('fastify')({ logger: true });
const fastifyJwt = require('@fastify/jwt');
const fastifyOauth2 = require('@fastify/oauth2');
const { getVaultValue } = require('./middleware/vault-client');
const fastifyCookie = require('@fastify/cookie');
require('dotenv').config();
const metrics = require('fastify-metrics');

(async () => {
	const jwtSecret = await getVaultValue('jwt', 'JWT_SECRET');

	await fastify.register(metrics, { endpoint: '/metrics' });
	await fastify.register(fastifyCookie);
	await fastify.register(fastifyJwt, {
		secret: jwtSecret,
		cookie: {
			cookieName: 'access_token',
			signed: false,
		},
	});

	// Ajoute middlewares et décorateurs
	fastify.addHook('onRequest', (request, reply, done) => {
		const token = request.cookies.access_token;
		if (token) {
			request.headers['Authorization'] = `Bearer ${token}`;
		}
		console.log('incoming: ', request.method, request.url);
		done();
	});

	fastify.decorate('authenticate', async function (request, reply) {
		try {
			const token = request.cookies.access_token;
			if (!token) return reply.code(401).send('Unauthorized');
			request.user = await request.jwtVerify(token);
			console.log('🔐 Authenticated user:', request.user);
		} catch (err) {
			reply.code(401).send({ error: 'Unauthorized' });
		}
	});

	fastify.decorate('isAdmin', async function (request, reply) {
		if (request.user?.role !== 'ADMIN') {
			return reply.code(403).send({ error: 'Access denied' });
		}
	});

	fastify.decorate('canEditUser', async function (request, reply) {
		const currentUser = request.user;
		const { idOrUsername } = request.params;

		const isSelfByUsername = currentUser.username === idOrUsername;
		const isSelfById = !isNaN(idOrUsername) && currentUser.id === parseInt(idOrUsername);
		const isAdmin = currentUser.role === 'ADMIN';

		if (!isSelfByUsername && !isSelfById && !isAdmin) {
			return reply.code(403).send({ error: 'Forbidden: not allowed to edit' });
		}
	});

	// Routes
	fastify.get('/', async () => 'pong\n');
	fastify.get('/protected', { preValidation: [fastify.authenticate] }, async (request) => {
		return { msg: `Hello ${request.user.username || request.user.email}, you are authenticated.` };
	});

	// Enregistre les modules de routes
	await fastify.register(require('./routes/googleAuth'));
	await fastify.register(require('./routes/users'));
	await fastify.register(require('./routes/normalAuth'));
	await fastify.register(require('./routes/friends'));

	// Démarre le serveur
	fastify.listen({ host: '0.0.0.0', port: 3000 }, (err, addr) => {
		if (err) {
			fastify.log.error(err);
			process.exit(1);
		}
		console.log('Routes :\n' + fastify.printRoutes());
		console.log(`Server listening at ${addr}`);
	});
})();
