import fetch from 'node-fetch';

const apiUrl = process.env.TAKETKT_API ?? 'http://localhost:5000';

export const authorized = async (token?: string): Promise<boolean> => {
	if (!token || !(token ?? '').trim().length) return false;
	const url = `${apiUrl}/dashboard-user/verify-token`;
	const options = {
		method: 'GET',
		headers: {
			Accept: 'application/json, text/plain',
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
			token,
		},
	};
	const response = await fetch(url, options);
	const data = await response.json();
	return data as boolean;
};
