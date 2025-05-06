const axios = require('axios');

module.exports = async function (fastify, opts) {
    fastify.post('/friends/:idOrUsername', {
        preValidation: [fastify.authenticate]
    }, async (req, reply) => {
        const { idOrUsername } = req.params;

        try {
            const response = await axios.post(`http://db-service:3000/friends/${idOrUsername}`, {
                senderId: req.user.id,
            });
            return reply.send(response.data);
        } catch (err) {
            const status = err.response?.status || 500;
            const message = err.response?.data || { error: 'Friend request failed' };
            return reply.code(status).send(message);
        }
    });

    fastify.patch('/friends/:id/accept', {
        preValidation: [fastify.authenticate]
    }, async (req, reply) => {
        const { id } = req.params;

        try {
            const response = await axios.patch(`http://db-service:3000/friends/${id}/accept`, {
                userId: req.user.id,
            });
            return reply.send(response.data);
        } catch (err) {
            const status = err.response?.status || 500;
            const message = err.response?.data || { error: 'Could not accept friend request' };
            return reply.code(status).send(message);
        }
    });

    fastify.get('/friends', {
        preValidation: [fastify.authenticate]
    }, async (req, reply) => {
        try {
            const response = await axios.get(`http://db-service:3000/friends`, {
                params: { userId: req.user.id },
            });
            return reply.send(response.data);
        } catch (err) {
            const status = err.response?.status || 500;
            const message = err.response?.data || { error: 'Could not load friend list' };
            return reply.code(status).send(message);
        }
    });

    fastify.get('/friends/sent', {
        preValidation: [fastify.authenticate]
    }, async (req, reply) => {
        try {
            const response = await axios.get(`http://db-service:3000/friends/sent`, {
                params: {userId: req.user.id},
            });
            return reply.send(response.data);
        } catch (err) {
            const status = err.response?.status || 500;
            const message = err.response?.data || { error: 'Could not fetch sent requests' };
            return reply.code(status).send(message);
        }
    });

    fastify.delete('/friends/:id', {
        preValidation: [fastify.authenticate]
    }, async (req, reply) => {
        const { id } = req.params;

        try {
            const response = await axios.delete(`http://db-service:3000/friends/${id}`, {
                params: { userId: req.user.id },
            });
            return reply.send(response.data);
        } catch (err) {
            const status = err.response?.status || 500;
            const message = err.response?.data || { error: 'Could not delete friendship' };
            return reply.code(status).send(message);
        }
    })

};
