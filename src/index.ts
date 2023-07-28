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
const wss = new WebSocketServer({ port: Number(process.env.PORT) });

wss.on('connection', async (ws: Socket, req) => {
	// ? Check if authorized:
	const url = new URL(req.url!, `http://${req.headers.host}`);
	const token = url.searchParams.get('token');

	const subscriber = createPostgresSubscriber(dbConfig);
	const [client] = await Promise.all([pool.connect(), subscriber.connect()]);

	// * Start Listening:
	ws.on('message', async (data) => {
		try {
			// ? Check if authorized:
			const is_authed = await authorized(token);
			if (!is_authed) {
				console.log('Unauthorized');
				ws.emit('error', 'Unauthorized');
				return;
			}

			// * Parse data:
			const { table, condition, params = [] } = parseJson<InitData>(data, {});

			// ? Check if table is valid:
			if (table !== 'waitings' && table !== 'reservations' && table !== 'waitings, reservations') {
				ws.emit('error', 'Invalid table name');
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
					// ? Check if pool is not connected:
					const { rows } = await client.query(queryOptions);
					console.log('Sending data:', rows);
					const newTickets = rows.map((row) => parseJson<Ticket>(row.data));
					if (!oldTickets.length || detectChange(oldTickets, newTickets)) {
						oldTickets = cloneDeep(newTickets);
						const data = JSON.stringify(newTickets);
						ws.send(data);
					}
				} catch (error) {
					console.log('Error in sendQueryData():', error.message);
					ws.close(1011, 'Error in initial query: ' + error.message ?? 'Unknown error');
				}
			};

			const listener = async () => {
				try {
					// Check if subscriber is not connected:
					if (table === 'waitings, reservations') {
						subscriber.listenTo('waitings_realtime');
						subscriber.listenTo('reservations_realtime');
					} else {
						subscriber.listenTo(table + '_realtime');
					}
					subscriber.events.on('error', (error) => {
						console.log('Error in listener even:', error.message);
					});
					subscriber.events.on('notification', async (data) => {
						// const ticket = parseJson<Ticket>(data.payload);
						sendQueryData();
					});
				} catch (error) {
					console.log('Error in listener():', error.message);
					ws.emit('error', 'error.message');
					subscriber.close();
				}
			};

			sendQueryData();
			listener();
		} catch (error) {
			console.log('Error in ws.on(message):', error.message);
		}
	});

	// * Keep Alive:
	ws.on('pong', heartbeat);

	// * Close:
	ws.on('close', () => {
		subscriber.close();
		client.release();
	});
});

const interval = keepAlive(wss);
wss.on('close', () => clearInterval(interval));

console.log(`Server listening on port ${process.env.PORT}`);
