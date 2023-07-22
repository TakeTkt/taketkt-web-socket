import type { Reservation, Waiting } from 'taketkt';
import { WebSocket } from 'ws';

export type Socket = WebSocket & { isAlive: boolean };

export type Ticket = Waiting & Reservation;

export type InitData = {
	table?: 'waitings' | 'reservations';
	condition?: string;
	params?: any[];
	token?: string;
};
