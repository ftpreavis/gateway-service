const fastify = require('fastify')({ logger: true });
const fastifyJwt = require('@fastify/jwt');
const fastifyOauth2 = require('@fastify/oauth2');
const fastifyCookie = require('@fastify/cookie');
const dotenv = require('dotenv');
const metrics = require('fastify-metrics');

dotenv.config();

fastify.register(metrics, { endpoint: '/metrics' });
fastify.register(require('./routes/googleAuth'));
fastify.register(require('./routes/users'));
fastify.register(require('./routes/normalAuth'));


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
	} catch (err) {
		reply.code(401).send({ error: 'Unauthorized' });
	}
});

// Route protégée
fastify.get('/protected', { preValidation: [fastify.authenticate] }, async (request, reply) => {
	return { msg: `Hello ${request.user.username || request.user.email}, you are authenticated.` };
});



// Start Server
fastify.listen({ host: '0.0.0.0', port: 3000 }, (err, addr) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	console.log(`Server listening at ${addr}`);
});
