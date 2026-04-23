import socketio

sio = socketio.AsyncServer(
    cors={
        "origins": ["*"],
        "methods": ["GET", "POST"]
    }
)


@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")


@sio.event
async def subscribe(sid, data):
    """Subscribe client to keyword rooms"""
    keywords = data.get("keywords", [])
    for kw in keywords:
        await sio.enter_room(sid, f"keyword:{kw}")
    print(f"Client {sid} subscribed to: {keywords}")


@sio.event
async def unsubscribe(sid, data):
    """Unsubscribe client from keyword rooms"""
    keywords = data.get("keywords", [])
    for kw in keywords:
        await sio.leave_room(sid, f"keyword:{kw}")
    print(f"Client {sid} unsubscribed from: {keywords}")


@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")


async def notify_new_hotspot(hotspot: dict, keyword: str):
    """Emit new hotspot event to subscribed clients"""
    await sio.emit("hotspot:new", hotspot, room=f"keyword:{keyword}")
    await sio.emit("notification", {
        "type": "hotspot",
        "title": "发现新热点",
        "content": hotspot.get("title")
    })


async def notify_update(hotspot: dict, keyword: str):
    """Emit hotspot update event"""
    await sio.emit("hotspot:update", hotspot, room=f"keyword:{keyword}")
