const axios = require('axios');

module.exports = async function (fastify, opts) {

    fastify.get('/matches', async (req, res) => {
        try {
            const response = await axios.get('http://matchmaking-service:3000/matches');
            return res.send(response.data);
        } catch (err) {
            req.log.error(err.message);
            return res.code(502).send({ error: 'Failed to fetch matches from match service' });
        }
    });

    fastify.get('/matches/:playerId', async (req, res) => {
        try {
            const response = await axios.get(`http://matchmaking-service:3000/matches/${req.params.playerId}`);
            return res.send(response.data);
        } catch (err) {
            req.log.error(err.message);
            return res.code(502).send({ error: 'Failed to fetch matches from match service' });
        }
    });

    fastify.post('/matches', async (req, res) => {
        try {
            const response = await axios.post('http://matchmaking-service:3000/matches', req.body);
            return res.code(201).send(response.data);
        } catch (err) {
            req.log.error(err.response?.data || err.message);
            return res.code(502).send({
                error: 'Failed to create match via match-service',
                message: err.response?.data || err.message
            });        }
    })


}