// # DotEnv:
import DotEnv from 'dotenv';
DotEnv.config();
// # Imports:
import cloneDeep from 'lodash.clonedeep';
import { Pool } from 'pg';
import createPostgresSubscriber from 'pg-listen';
import type { Reservation, Waiting } from 'taketkt';
import { WebSocket, WebSocketServer } from 'ws';
import { heartbeat, keepAlive } from './utils/keepalive';

type Socket = WebSocket & { isAlive: boolean };
type Ticket = Waiting & Reservation;
type InitData = {
	table?: 'waitings' | 'reservations';
	condition?: string;
	params?: any[];
	token?: string;
};

const dbConfig = {
	database: process.env.DATABASE!,
	user: process.env.DB_USER!,
	host: process.env.DB_HOST!,
	password: process.env.DB_PASSWORD!,
	port: Number(process.env.DB_PORT ?? 6316),
};

const pool = new Pool(dbConfig);
const subscriber = createPostgresSubscriber(dbConfig);
const wss = new WebSocketServer({ port: Number(process.env.PORT) });

console.log(`Server listening on port ${process.env.PORT}`);

wss.on('connection', (ws: Socket) => {
	console.log('WebSocket client connected');

	// * Start Listening:
	ws.on('message', async (data) => {
		const { table, condition, params = [], token } = JSON.parse(`${data ?? {}}`) as InitData;

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

		let tickets: Ticket[] = [];

		const sendQueryData = async () => {
			try {
				const { rows } = await pool.query(selectQuery, params);
				const _tickets = rows.map((row) => JSON.parse(row.data) as Ticket);
				if (detectChange(tickets, _tickets)) {
					tickets = cloneDeep(_tickets);
					ws.send(JSON.stringify(_tickets));
				}
			} catch (error) {
				ws.close(1011, 'Error in initial query: ' + error.message ?? 'Unknown error');
				return;
			}
		};

		const listener = async () => {
			try {
				await subscriber.connect();
				subscriber.listenTo(table + '_realtime');
				subscriber.events.on('error', (error) => {
					console.log('Error in listener even:', error.message);
				});
				subscriber.events.on('notification', async (data) => {
					sendQueryData();
				});
			} catch (error) {
				ws.close(1011, '[Error @ listener()]: ' + error.message ?? 'Unknown error');
				subscriber.close();
				return;
			}
		};

		sendQueryData();
		listener();
	});

	// * Keep Alive:
	ws.on('pong', heartbeat);

	// * Close:
	ws.on('close', () => {
		subscriber.close();
		pool.end();
		ws.close(1000, 'WebSocket client disconnected');
	});
});

const interval = keepAlive(wss);
wss.on('close', () => clearInterval(interval));
