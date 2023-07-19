declare global {
	namespace NodeJS {
		interface ProcessEnv {
			DATABASE: string;
			DB_USER: string;
			DB_HOST: string;
			DB_PASSWORD: string;
			DB_PORT: string;
			PORT: string;
		}
	}
}

export {};
