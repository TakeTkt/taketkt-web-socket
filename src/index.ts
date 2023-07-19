import DotEnv from 'dotenv';
DotEnv.config();
import { Pool } from 'pg';
import { WebSocketServer } from 'ws';
import { heartbeat, keepAlive } from './utils/keepalive.js';
import { Socket } from './utils/state.js';

const pool = new Pool({
	database: process.env.DATABASE!,
	user: process.env.DB_USER!,
	host: process.env.DB_HOST!,
	password: process.env.DB_PASSWORD!,
	port: Number(process.env.DB_PORT ?? 6316),
});

const wss = new WebSocketServer({ port: Number(process.env.PORT) });

wss.on('connection', (ws: Socket) => {
	console.log('WebSocket client connected');

	ws.on('message', function message(data) {
		console.log('received: %s', data);
		const query = `LISTEN table_update;`;

		pool.connect((err, client, release) => {
			if (err) {
				console.error('Error acquiring client', err.stack);
				return;
			}
			// Run Query:
			client.query(query, (err, result) => {
				if (err) {
					console.error('Error executing query', err.stack);
					return;
				}
				console.log('Listening for table updates...');
			});
		});
	});

	ws.on('pong', heartbeat);
	ws.on('close', () => ws.send('closed'));
});

const interval = keepAlive(wss);
wss.on('close', () => clearInterval(interval));
