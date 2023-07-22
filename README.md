## WebSocket server

---

#### Usage:

1. Install deps using:

```sh
yarn
```

2. Run dev server:

```sh
yarn dev
```

3. Connect using a WebSocket terminal client ([`wscat` recommended](https://github.com/websockets/wscat)):

- Install wscat first

```sh
npm install -g wscat
```

or

```sh
yarn global add wscat
```

- After installation

```sh
wscat -c ws://localhost:8000
```
