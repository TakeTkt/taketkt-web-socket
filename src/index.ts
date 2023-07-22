// # DotEnv:
import DotEnv from 'dotenv';
DotEnv.config();
// # Imports:
import cloneDeep from 'lodash.clonedeep';
import { Pool } from 'pg';
import createPostgresSubscriber from 'pg-listen';
import { WebSocketServer } from 'ws';
import { detectChange, parseJson } from './utils';
import { authorized } from './utils/auth';
import { heartbeat, keepAlive } from './utils/keepalive';
import { InitData, Socket, Ticket } from './utils/types';

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

wss.on('connection', async (ws: Socket, req) => {
	// ? Check if authorized:
	const url = new URL(req.url!, `http://${req.headers.host}`);
	const token = url.searchParams.get('token');
	if (!(await authorized(token))) {
		ws.close(1008, 'Not Unauthorized');
		return;
	}

	// * Start Listening:
	ws.on('message', (data) => {
		const { table, condition, params = [] } = parseJson<InitData>(data, {});

		if (table !== 'waitings' && table !== 'reservations') {
			ws.close(1014, 'Invalid table name');
			return;
		}

		let oldTickets: Ticket[] = [];

		const sendQueryData = async () => {
			try {
				let queryOptions: { text: string; values: any[] } = {
					text: `SELECT data FROM ${table}`,
					values: params,
				};
				if (condition) {
					queryOptions.text += ` ${condition}`;
				}
				const { rows } = await pool.query(queryOptions);
				const newTickets = rows.map((row) => parseJson<Ticket>(row.data));
				if (!oldTickets.length || detectChange(oldTickets, newTickets)) {
					oldTickets = cloneDeep(newTickets);
					ws.send(JSON.stringify(newTickets));
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
					// const ticket = parseJson<Ticket>(data.payload);
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

console.log(`Server listening on port ${process.env.PORT}`);
