## WebSocket server

---

#### Usage:

1. Install deps using:

```sh
pnpm i
```

2. Run dev server:

```sh
pnpm dev
```

3. Connect using a WebSocket terminal client ([`wscat` recommended](https://github.com/websockets/wscat)):

- With **no** installation

```sh
pnpm dlx wscat -c wss://localhost:8000
```

- After installation

```sh
wscat -c wss://localhost:8000
```
