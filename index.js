const fastify = require('fastify')({ logger: true });
const fastifyJwt = require('@fastify/jwt');
const fastifyOauth2 = require('@fastify/oauth2');
const { getVaultValue } = require('./middleware/vault-client');
const fastifyCookie = require('@fastify/cookie');
require('dotenv').config();
const metrics = require('fastify-metrics');

fastify.register(metrics, { endpoint: '/metrics' });

fastify.register(fastifyCookie);

fastify.register(fastifyJwt, {
	secret: async (req, reply) => {
		return getVaultValue('jwt', 'JWT_SECRET')
	},
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
	console.log('incoming: ', request.method, request.url);
	done();
});

fastify.get('/', async (request, reply) => {
	return 'pong\n'
})

// Middleware pour vérifier les JWT
fastify.decorate('authenticate', async function (request, reply) {
	try {
		const token = request.cookies.access_token;
		if (!token) {
			return reply.code(401).send('Unauthorized');
		}
		request.user = await request.jwtVerify(token);
		console.log('🔐 Authenticated user:', request.user); // 👈
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

// Route protégée
fastify.get('/protected', { preValidation: [fastify.authenticate] }, async (request, reply) => {
	return { msg: `Hello ${request.user.username || request.user.email}, you are authenticated.` };
});

fastify.ready(err => {
	if (err) throw err;
	console.log('Routes : ');
	console.log(fastify.printRoutes());
})

// Start Server
fastify.listen({ host: '0.0.0.0', port: 3000 }, (err, addr) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	console.log(`Server listening at ${addr}`);
});

fastify.register(require('./routes/googleAuth'));
fastify.register(require('./routes/users'));
fastify.register(require('./routes/normalAuth'));
fastify.register(require('./routes/friends'));
