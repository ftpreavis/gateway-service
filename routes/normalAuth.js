const axios = require('axios');

module.exports = async function (fastify, opts) {
    const AUTH_SERVICE = 'http://auth-service:3000';

    fastify.post('/auth/signup', async (req, reply) => {
        try {
            const res = await axios.post(`${AUTH_SERVICE}/signup`, req.body);

            return reply.send(res.data);
        } catch (err) {
            const status = err.response?.status || 500;
            const data = err.response?.data || { error: 'Signup failed' };
            return reply.code(status).send(data);
        }
    });

    fastify.post('/auth/login', async (req, reply) => {
        try {
            const res = await axios.post(`${AUTH_SERVICE}/login`, req.body);
            return reply.send(res.data);
        } catch (err) {
            const status = err.response?.status || 500;
            const data = err.response?.data || { error: 'Login failed' };
            return reply.code(status).send(data);
        }
    });

    fastify.get('/auth/normalLogout', async (req, reply) => {
        try {
            const res = await axios.get(`${AUTH_SERVICE}/logout`);
            return reply.send(res.data);
        } catch (err) {
            const status = err.response?.status || 500;
            const data = err.response?.data || { error: 'Logout failed' };
            return reply.code(status).send(data);
        }
    });
}