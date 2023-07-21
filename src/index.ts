import DotEnv from 'dotenv';
DotEnv.config();
import { Pool } from 'pg';
import { WebSocketServer } from 'ws';
import { heartbeat, keepAlive } from './utils/keepalive';
import { Socket } from './utils/state';
import { authorized } from './utils/auth';

const pool = new Pool({
	database: process.env.DATABASE!,
	user: process.env.DB_USER!,
	host: process.env.DB_HOST!,
	password: process.env.DB_PASSWORD!,
	port: Number(process.env.DB_PORT ?? 6316),
});

const wss = new WebSocketServer({ port: Number(process.env.PORT) });

console.log(`Server listening on port ${process.env.PORT}`);

wss.on('connection', (ws: Socket) => {
	console.log('WebSocket client connected');

	// * Start Listening:
	ws.on('message', async (data) => {
		try {
			const { query, params, token } = JSON.parse(`${data ?? {}}`);

			// if (!(await authorized(token))) {
			// 	ws.close();
			// 	return;
			// }

			if (query) {
				const client = await pool.connect();
				await client.query(query);

				console.log(`Listening to table query: ${query}`);

				// Send the result of the query back to the client
				client.on('notification', (notification) => {
					ws.send(notification.payload);
				});
			}
		} catch (e) {
			console.error('Error parsing message:', e.message);
		}
	});

	// * Keep Alive:
	ws.on('pong', heartbeat);

	// * Close:
	ws.on('close', () => ws.send('closed'));
});

const interval = keepAlive(wss);
wss.on('close', () => clearInterval(interval));
