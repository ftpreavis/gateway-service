const axios = require('axios');

module.exports = async function (fastify, opts) {
	const baseUrl = 'http://db-service:3000/chat';

	const proxy = async (method, path, options = {}) => {
		try {
			const response = await axios({
				method,
				url: `${baseUrl}${path}`,
				...options
			});
			return response.data;
		} catch (err) {
			fastify.log.error(err);
			const status = err.response?.status || 500;
			const message = err.response?.data || { error: 'Chat service error' };
			throw { status, message };
		}
	};

	// Proxy helper with error handling
	const handle = (fn) => async (req, reply) => {
		try {
			const data = await fn(req);
			reply.send(data);
		} catch (err) {
			reply.code(err.status).send(err.message);
		}
	};

	// Messages
	fastify.post('/messages', { preValidation: [fastify.authenticate, fastify.canEditUser] }, handle(req => proxy('post', '/messages', { data: req.body })));

	fastify.get('/messages/:userId', { preValidation: [fastify.authenticate] }, handle(req => {
		const { userId: otherUserId } = req.params;
		const { userId: currentUserId, take, skip } = req.query;
		return proxy('get', `/messages/${otherUserId}`, { params: { userId: currentUserId, take, skip } });
	}));

	fastify.patch('/messages/read', { preValidation: [fastify.authenticate, fastify.canEditUser] }, handle(req => proxy('patch', '/messages/read', { data: req.body })));

	// Unread counts
	fastify.get('/messages/unread/total', { preValidation: [fastify.authenticate] }, handle(req => proxy('get', '/messages/unread/total', { params: req.query })));
	fastify.get('/messages/unread/by-conversation', { preValidation: [fastify.authenticate] }, handle(req => proxy('get', '/messages/unread/by-conversation', { params: req.query })));

	// Conversations
	fastify.get('/conversations', { preValidation: [fastify.authenticate] }, handle(req => proxy('get', '/conversations', { params: req.query })));

	// Block routes
	fastify.post('/block', { preValidation: [fastify.authenticate, fastify.canEditUser] }, handle(req => proxy('post', '/block', { data: req.body })));
	fastify.delete('/block', { preValidation: [fastify.authenticate, fastify.canEditUser] }, handle(req => proxy('delete', '/block', { data: req.body })));
	fastify.get('/block', { preValidation: [fastify.authenticate] }, handle(req => proxy('get', '/block', { params: req.query })));
};
