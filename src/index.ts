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
		const { table, condition, token } = JSON.parse(`${data ?? {}}`);

		// if (!(await authorized(token))) {
		// 	ws.close(1014, 'Not authorized');
		// 	return;
		// }

		if (table !== 'waitings' && table !== 'reservations') {
			ws.close(1014, 'Invalid table name');
			return;
		}

		let selectQuery = `SELECT data FROM ${table}`;
		if (condition) {
			selectQuery += ` WHERE ${condition}`;
		}

		const sendQueryData = async () => {
			const _client = await pool.connect();
			const { rows } = await _client.query(selectQuery);
			ws.send(JSON.stringify(rows));
			_client.release();
		};

		const client = await pool.connect();
		let listenQuery = table === 'waitings' ? 'LISTEN waitings_realtime' : 'LISTEN reservations_realtime';
		client.query(listenQuery);

		client.on('notification', async () => {
			console.log('Notification received');
			sendQueryData();
		});

		sendQueryData();
	});

	// * Keep Alive:
	ws.on('pong', heartbeat);

	// * Close:
	ws.on('close', () => {
		pool.end();
		ws.send('closed');
	});
});

const interval = keepAlive(wss);
wss.on('close', () => clearInterval(interval));
