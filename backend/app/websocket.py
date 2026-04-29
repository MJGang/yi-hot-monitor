from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active: list[dict] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active.append({"ws": websocket, "keywords": set()})

    def disconnect(self, websocket: WebSocket):
        self.active = [c for c in self.active if c["ws"] != websocket]

    def _find(self, websocket: WebSocket) -> dict | None:
        for c in self.active:
            if c["ws"] == websocket:
                return c
        return None

    def subscribe(self, websocket: WebSocket, keywords: list[str]):
        conn = self._find(websocket)
        if conn:
            conn["keywords"].update(keywords)

    def unsubscribe(self, websocket: WebSocket, keywords: list[str]):
        conn = self._find(websocket)
        if conn:
            conn["keywords"].difference_update(keywords)

    async def broadcast(self, message: dict):
        for conn in self.active:
            try:
                await conn["ws"].send_json(message)
            except Exception:
                pass

    async def send_to_keyword(self, message: dict, keyword: str):
        for conn in self.active:
            if keyword in conn["keywords"]:
                try:
                    await conn["ws"].send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    # 连接后立即发送当前扫描状态，避免刷新页面后丢失扫描中状态
    from app.services.scanner import scan_is_locked
    try:
        await websocket.send_json({"type": "scan:status", "scanning": await scan_is_locked()})
    except Exception:
        pass
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "subscribe":
                manager.subscribe(websocket, data.get("keywords", []))
            elif msg_type == "unsubscribe":
                manager.unsubscribe(websocket, data.get("keywords", []))
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        manager.disconnect(websocket)


async def notify_new_hotspot(hotspot: dict, keyword: str):
    """推送新热点给订阅该关键词的客户端，并广播通知"""
    await manager.send_to_keyword({"type": "hotspot:new", "data": hotspot}, keyword)
    await manager.broadcast({
        "type": "notification",
        "subtype": "hotspot",
        "title": "发现新热点",
        "content": hotspot.get("title")
    })


async def notify_update(hotspot: dict, keyword: str):
    """推送热点更新给订阅该关键词的客户端"""
    await manager.send_to_keyword({"type": "hotspot:update", "data": hotspot}, keyword)


async def notify_scan_complete(new_count: int):
    await manager.broadcast({"type": "scan:complete", "new_hotspots": new_count})


async def notify_scan_start():
    await manager.broadcast({"type": "scan:start"})
