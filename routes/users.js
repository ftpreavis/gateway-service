const axios = require('axios');
const FormData = require('form-data');

module.exports = async function (fastify, opts) {

    await fastify.register(require('@fastify/multipart'));

    // Users list
    fastify.get('/users', async (req, reply) => {
        try {
            const response = await axios.get('http://user-service:3000/users');
            return reply.send(response.data);
        } catch (err) {
            fastify.log.error(err);
            const status = err.response?.status || 500;
            const message = err.response?.data || { error: 'User service error' };
            return reply.code(status).send(message);
        }
    })

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

    //Update avatar
    // fastify.patch('/users/:idOrUsername/avatar', { preValidation: [fastify.authenticate, fastify.canEditUser] }, async (req, reply) => {
    //     const { idOrUsername } = req.params;
    //     const { avatar } = req.body;
    //
    //     try {
    //         // Get old avatar
    //         const userRes = await axios.get(`http://user-service:3000/users/${idOrUsername}`);
    //         const oldAvatar = userRes.data.avatar;
    //
    //         // Delete old avatar
    //         if (oldAvatar && !oldAvatar.endsWith('default.png')) {
    //             await axios.delete(`http://media-service:3000/delete/avatar`, {
    //                 data: { path: oldAvatar },
    //             });
    //         }
    //         const response = await axios.patch(`http://user-service:3000/users/${idOrUsername}/avatar`, { avatar });
    //         return reply.send(response.data);
    //     } catch (err) {
    //         fastify.log.error(err);
    //         const status = err.response?.status || 500;
    //         const message = err.response?.data || { error: 'Avatar update failed' };
    //         return reply.code(status).send(message);
    //     }
    // });

    fastify.patch('/users/:idOrUsername/avatar', {
        preValidation: [fastify.authenticate, fastify.canEditUser],
    }, async (req, reply) => {
        const { idOrUsername } = req.params;
        const data = await req.file(); // récupère le fichier envoyé
        console.log("📦 Fichier reçu:", data.filename, data.mimetype, data.file);

        try {
            // Envoyer le fichier au media-service
            const form = new FormData();
            form.append('file', data.file, data.filename); // 🔧 FIX: compatible avec form-data

            const uploadRes = await axios.post('http://media-service:3000/upload/avatar', form, {
                headers: form.getHeaders()
            });
            const avatarPath = uploadRes.data.path;

            // Récupérer l'ancien avatar
            const userRes = await axios.get(`http://user-service:3000/users/${idOrUsername}`);
            const oldAvatar = userRes.data.avatar;

            // Supprimer l'ancien avatar s'il n'est pas par défaut
            if (oldAvatar && !oldAvatar.endsWith('default.png')) {
                await axios.delete('http://media-service:3000/delete/avatar', {
                    data: { path: oldAvatar }
                });
            }

            // Mettre à jour l'utilisateur avec le nouvel avatar
            const updateRes = await axios.patch(`http://user-service:3000/users/${idOrUsername}/avatar`, {
                avatar: avatarPath
            });

            return reply.send(updateRes.data);
        } catch (err) {
            req.log.error(err);
            const status = err.response?.status || 500;
            const message = err.response?.data || { error: 'Avatar update failed' };
            return reply.code(status).send(message);
        }
    });


    // Get avatar
    fastify.get('/users/:idOrUsername/avatar', async (req, reply) => {
        try {
            const { idOrUsername } = req.params;

            //Get user profile
            const userRes = await axios.get(`http://user-service:3000/users/${idOrUsername}`);
            let avatarPath = userRes.data.avatar;

            if (!avatarPath) {
                // To replace by default avatar
                avatarPath = '/uploads/avatars/default.png';
            }
            // proxy to serve media by the gateway
            const avatarRes = await axios.get(`http://media-service:3000${avatarPath}`, { responseType: 'stream' });
            reply.headers(avatarRes.headers);
            return reply.send(avatarRes.data);
        } catch (err) {
            fastify.log.error('Avatar fetch failed' ,err);
            const status = err.response?.status || 500;
            const message = err.response?.data || { error: 'Could not fetch avatar' };
            return reply.code(status).send(message);
        }
    });

    fastify.patch('/users/:idOrUsername', {
        preValidation: [fastify.authenticate, fastify.canEditUser]
    }, async (req, reply) => {
        const { idOrUsername } = req.params;
        const { username, biography, password } = req.body;

        if (!username && !biography && !password) {
            return reply.code(400).send({ error: 'No fields to update' });
        }

        try {
            const updatePayload = {};
            if (username) updatePayload.username = username;
            if (biography) updatePayload.biography = biography;
            if (password) updatePayload.password = password;

            const response = await axios.patch(`http://user-service:3000/users/${idOrUsername}`, updatePayload);
            return reply.send(response.data);
        } catch (err) {
            const status = err.response?.status;
            const message = err.response?.data;

            fastify.log.error(`User update failed [${status || 500}]`, message || err.message);

            if (status && message) {
                return reply.code(status).send(message);
            }

            return reply.code(500).send({ error: 'Could not update user' });
        }
    });

    // GDPR

    fastify.post('/users/anonymize', { preValidation: [fastify.authenticate] }, async (req, reply) => {
        const userId = req.user.id;

        try {
            const response = await axios.post(
                `http://user-service:3000/users/${userId}/anonymize`,
                {},
                { headers: { 'Content-Type': 'application/json' } }
            );
            return reply.send(response.data);
        } catch (err) {
            fastify.log.error('Anonymized failed:' ,err);
            const status = err.response?.status || 500;
            const message = err.response?.data || { error: 'Anonymized failed' };
            return reply.code(status).send(message);
        }
    });

    // Settings
    fastify.get('/users/:id/settings', async (req, reply) => {
        const userId = req.params.id;

        try {
            const res = await axios.get(`http://db-service:3000/users/${userId}/settings`);
            return reply.send(res.data);
        } catch (err) {
            console.error('[GATEWAY] Failed to get user settings', err.message);
            return reply.code(err.response?.status || 500)
                .send({
                    error: 'Could not find user settings',
                    details: err.response?.data || err.message
                });
        }
    });

    fastify.patch('/users/:id/settings', async (req, reply) => {
        const userId = req.params.id;
        const payload = req.body;

        try {
            const res = await axios.patch(`http://db-service:3000/users/${userId}/settings`, payload);
            return reply.send(res.data);
        } catch (err) {
            console.error('[GATEWAY] Failed to update user settings', err.message);
            return reply.code(500).send({
                error: 'Could not find user settings',
                details: err.response?.data || err.message
            });
        }
    });

    fastify.get('/users/search', async (req, reply) => {
        const query = req.query.q;

        if (!query || typeof query !== 'string' || query.length < 1) {
            return reply.code(400).send({ error: 'Missing or invalid search query' });
        }

        try {
            const res = await axios.get(`http://db-service:3000/users/search?q=${encodeURIComponent(query)}`);
            return reply.send(res.data);
        } catch (err) {
            console.error('[GATEWAY] Failed to proxy user search', err.message);
            return reply.code(err.response?.status || 500).send({
                error: 'Failed to fetch search results',
                details: err.response?.data || err.message,
            });
        }
    })

};