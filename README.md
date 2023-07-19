## WebSocket server

---

#### Usage:

1. Install deps using:

```sh
pnpm i
```

2. Connect using a WebSocket terminal client ([`wscat` recommended](https://github.com/websockets/wscat)):

- With **no** installation

```sh
pnpm dlx wscat -c wss://plot.gq
```

- After installation

```sh
wscat -c wss://plot.gq
```
