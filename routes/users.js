const axios = require('axios');

module.exports = async function (fastify, opts) {
    // Active user profile
    fastify.get('/users/profile', { preValidation: [fastify.authenticate] }, async (req, reply) => {
        const identifier = req.user.username || req.user.id;

        try {
            const response = await axios.get(`http://user-service:3000/users/${identifier}`);
            return reply.send(response.data);
        } catch (err) {
            fastify.log.error(err);
            const status = err.response?.status || 500;
            const message = err.response?.data || { error: 'User service error' };
            return reply.code(status).send(message);
        }
    });

    // Selected user profile
    fastify.get('/users/profile/:idOrUsername', { preValidation: [fastify.authenticate] }, async (req, reply) => {
        const { idOrUsername } = req.params;

        try {
            const response = await axios.get(`http://user-service:3000/users/${idOrUsername}`);
            return reply.send(response.data);
        } catch (err) {
            fastify.log.error(err);
            const status = err.response?.status || 500;
            const message = err.response?.data || { error: 'User service error' };
            return reply.code(status).send(message);
        }
    });
};