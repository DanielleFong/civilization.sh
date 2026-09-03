"""FireTuner passthrough: one game connection, many clients.

The game accepts ONE tuner client. This proxy owns that connection and lets several
clients (civ6 MCP server, passive recorder, FireTuner GUI) share it.
Frames: [u32 LE len][i32 LE tag][payload\0]. Commands are serialized: while a client's
command is in flight, every frame from the game is routed to that client until the
stream goes quiet (QUIET s) or a hard cap (CAP s) passes; otherwise frames are broadcast.

  python tuner_proxy.py [--game 127.0.0.1:4318] [--listen 127.0.0.1:4319]
"""
import asyncio, struct, sys, time, argparse
HDR = struct.Struct("<Ii")
QUIET, CAP = 0.6, 20.0

async def read_frame(r):
    h = await r.readexactly(HDR.size); n, tag = HDR.unpack(h); return tag, await r.readexactly(n)

def frame(tag, data): return HDR.pack(len(data), tag) + data

class Proxy:
    def __init__(self, game, listen):
        self.game, self.listen = game, listen
        self.gw = None; self.clients = {}; self.lock = asyncio.Lock()
        self.owner = None; self.last_frame = 0.0; self.got = 0

    async def game_reader(self):
        while True:
            try: tag, data = await read_frame(self.gr)
            except Exception as e:
                print(f"[{ts()}] game connection lost: {e}", flush=True); self.owner = None
                for w in list(self.clients): w.close()
                await self.reconnect(); continue
            self.last_frame = time.time(); self.got += 1
            targets = [self.owner] if self.owner and self.owner in self.clients else list(self.clients)
            for w in targets:
                try: w.write(frame(tag, data))
                except Exception: pass

    async def reconnect(self):
        while True:
            try:
                self.gr, self.gw = await asyncio.open_connection(*self.game); print(f"[{ts()}] connected to game {self.game}", flush=True); return
            except Exception as e:
                print(f"[{ts()}] game connect failed: {e}; retry 10s", flush=True); await asyncio.sleep(10)

    async def handle(self, r, w):
        name = w.get_extra_info("peername"); self.clients[w] = name; print(f"[{ts()}] client + {name} ({len(self.clients)})", flush=True)
        try:
            while True:
                tag, data = await read_frame(r)
                async with self.lock:                      # one command in flight
                    self.owner = w; self.got = 0; self.last_frame = t0 = time.time()
                    self.gw.write(frame(tag, data)); await self.gw.drain()
                    while time.time() - t0 < CAP:
                        await asyncio.sleep(0.05)
                        if self.got and time.time() - self.last_frame > QUIET: break
                        if not self.got and time.time() - t0 > 3.0: break   # no reply at all
                    self.owner = None
        except Exception: pass
        finally:
            self.clients.pop(w, None); w.close(); print(f"[{ts()}] client - {name} ({len(self.clients)})", flush=True)

    async def run(self):
        await self.reconnect(); asyncio.create_task(self.game_reader())
        srv = await asyncio.start_server(self.handle, *self.listen); print(f"[{ts()}] listening on {self.listen}", flush=True)
        async with srv: await srv.serve_forever()

def ts(): return time.strftime("%H:%M:%S")
if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--game", default="127.0.0.1:4318"); ap.add_argument("--listen", default="127.0.0.1:4320")
    a = ap.parse_args(); g = a.game.split(":"); l = a.listen.split(":")
    asyncio.run(Proxy((g[0], int(g[1])), (l[0], int(l[1]))).run())
