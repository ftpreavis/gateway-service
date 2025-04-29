const fastifyOauth2 = require("@fastify/oauth2");
const axios = require('axios');

module.exports = async function (fastify, opts) {
    fastify.register(fastifyOauth2, {
        name: 'googleOAuth2',
        scope: ['profile', 'email'],
        credentials: {
            client: {
                id: process.env.GOOGLE_CLIENT_ID,
                secret: process.env.GOOGLE_CLIENT_SECRET,
            },
            auth: fastifyOauth2.GOOGLE_CONFIGURATION,
        },
        startRedirectPath: '/auth/google', // Démarre la redirection Google OAuth
        callbackUri: 'http://localhost:4003/auth/google/callback', // DOIT être ton gateway ici !
    });

    // Callback OAuth Google
    fastify.get('/auth/google/callback', async (request, reply) => {
        try {
            const token = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

            if (!token.token.access_token) {
                return reply.code(400).send({error: 'Access token is missing'});
            }

            console.log('Received access token: ', token.token.access_token);

            // Récupérer les infos utilisateur Google
            const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {Authorization: `Bearer ${token.token.access_token}`},
            });

            console.log('userInfo', userInfo.data);

            const googleId = userInfo.data.id;
            const email = userInfo.data.email;

            await axios.post('http://db-service:3000/users/google', { googleId, email });

            // Créer un JWT pour cet utilisateur Google
            const jwt = fastify.jwt.sign({googleId, email});


            // Soit tu rediriges avec le JWT en cookie
            reply
                .setCookie('access_token', jwt, {
                    path: '/',
                    httpOnly: true,
                })
                .redirect('/protected');

        } catch (err) {
            fastify.log.error(err);
            if (err.response) {
                reply
                    .code(err.response.status)
                    .send({error: 'OAuth callback failed', details: err.response.data});
            } else {
                reply
                    .code(500)
                    .send({error: 'OAuth callback failed', details: err.message});
            }
        }
    });

    // Route pour logout
    fastify.get('/auth/logout', async (request, reply) => {
        reply.clearCookie('access_token');
        reply.redirect('https://accounts.google.com/Logout');
    });
}