// const fastifyOauth2 = require("@fastify/oauth2");
// const axios = require("axios");
// const { getVaultValue } = require("../middleware/vault-client");
//
// module.exports = async function (fastify, opts) {
//     // 🔐 Récupère les secrets depuis Vault
//     const [clientId, clientSecret] = await Promise.all([
//         getVaultValue("oauth_id", "GOOGLE_CLIENT_ID"),
//         getVaultValue("oauth_secret", "GOOGLE_CLIENT_SECRET"),
//     ]);
//
//     // 🧭 Enregistre Google OAuth une fois les secrets récupérés
//     await fastify.register(fastifyOauth2, {
//         name: "googleOAuth2",
//         scope: ["profile", "email"],
//         credentials: {
//             client: {
//                 id: clientId,
//                 secret: clientSecret,
//             },
//             auth: fastifyOauth2.GOOGLE_CONFIGURATION,
//         },
//         startRedirectPath: "/auth/google",
//         callbackUri: process.env.GOOGLE_CALLBACK_URI || "http://localhost:4003/auth/google/callback",
//     });
//
//     // ✅ Callback Google OAuth
//     fastify.get("/auth/google/callback", async (request, reply) => {
//         try {
//             const token = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
//             if (!token.token.access_token) {
//                 return reply.code(400).send({ error: "Access token is missing" });
//             }
//
//             const userInfo = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
//                 headers: { Authorization: `Bearer ${token.token.access_token}` },
//             });
//
//             const googleId = userInfo.data.id;
//             const email = userInfo.data.email;
//
//             const dbResponse = await axios.post("http://db-service:3000/users/google", { googleId, email });
//             const user = dbResponse.data;
//
//             if (!user.id || !user.username || !user.role) {
//                 return reply.code(500).send({ error: "Invalid user data" });
//             }
//
//             const jwt = fastify.jwt.sign({
//                 id: user.id,
//                 username: user.username,
//                 email: user.email,
//                 role: user.role,
//             });
//
//             reply
//                 .setCookie("access_token", jwt, {
//                     path: "/",
//                     httpOnly: true,
//                     secure: process.env.NODE_ENV === "production",
//                     sameSite: "Lax",
//                 })
//                 .redirect("/protected");
//
//         } catch (err) {
//             fastify.log.error(err);
//             reply.code(500).send({ error: "OAuth callback failed", details: err.message });
//         }
//     });
//
//     // 🔓 Logout
//     fastify.get("/auth/logout", async (request, reply) => {
//         reply.clearCookie("access_token");
//         reply.redirect("https://accounts.google.com/Logout");
//     });
// };


const axios = require('axios');
const { getVaultValue } = require('../middleware/vault-client');

module.exports = async function (fastify, opts) {
    const [clientId, clientSecret] = await Promise.all([
        getVaultValue("oauth_id", "GOOGLE_CLIENT_ID"),
        getVaultValue("oauth_secret", "GOOGLE_CLIENT_SECRET"),
    ]);

	fastify.get('/auth/google/config', async (request, reply) => {
		try {
			reply.send({ clientId: clientId });
		} catch (err) {
			console.error("[GATEWAY] OAuth callback failed:", err);
			reply.code(500).send({ error: "OAuth callback failed", details: err.message });
		};
	});

    fastify.post('/auth/google/callback', async (request, reply) => {
        try {
            const { code } = request.body;
            console.log("[GATEWAY] Code reçu :", code);

            const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: process.env.FRONTEND_GOOGLE_CALLBACK_URI || "http://localhost:5173/auth/google/callback",
                grant_type: 'authorization_code',
            });
            const access_token = tokenRes.data.access_token;
            console.log("[GATEWAY] access_token:", access_token);

            if (!access_token) {
                return reply.code(400).send({ error: "Access token manquant" });
            }

            const userInfo = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
                headers: { Authorization: `Bearer ${access_token}` },
            });
            console.log("[GATEWAY] userInfo:", userInfo.data);

            const { id: googleId, email } = userInfo.data;

            const dbResponse = await axios.post("http://db-service:3000/users/google", { googleId, email });
            console.log("[GATEWAY] Réponse DB:", dbResponse.data);

            const user = dbResponse.data;

            if (!user || !user.id) {
                return reply.code(500).send({ error: "Invalid user response from DB" });
            }

            const jwt = fastify.jwt.sign({
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            });

            console.log("[GATEWAY] JWT généré :", jwt);

            reply.send({ token: jwt, user });

        } catch (err) {
            console.error("[GATEWAY] OAuth callback failed:", err);
            reply.code(500).send({ error: "OAuth callback failed", details: err.message });
        }
    });

};
