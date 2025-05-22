const axios = require('axios');

module.exports = async function (fastify, opts) {
    const AUTH_SERVICE = 'http://auth-service:3000';

    fastify.post('/auth/2fa/setup', async (req, res) => {
        try {
            const response = await axios.post(`${AUTH_SERVICE}/2fa/setup`, {}, {
                headers: {
                    cookie: req.headers.cookie,
                }
            });
            res.send(response.data);
        } catch (err) {
            res.code(err.response?.status || 500).send(err.response?.data || { error: 'Proxy failed' });
        }
    });

    fastify.post('/auth/2fa/verify', async (req, res) => {
        try {
            const response = await axios.post(`${AUTH_SERVICE}/2fa/verify`, req.body, {
                headers: {
                    cookie: req.headers.cookie,
                }
            });
            res.send(response.data);
        } catch (err) {
            res.code(err.response?.status || 500).send(err.response?.data || { error: 'Proxy failed' });
        }
    });

    fastify.post('/auth/2fa/login', async (req, res) => {
        try {
            const response = await axios.post(`${AUTH_SERVICE}/2fa/login`, req.body);
            const token = response.data.token;
            res
                .setCookie('access_token', token, {
                    path: '/',
                    httpOnly: true,
                })
                .send(response.data);
        } catch (err) {
            res.code(err.response?.status || 500).send(err.response?.data || { error: 'Proxy failed' });
        }
    });

}