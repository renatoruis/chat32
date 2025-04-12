export function saveUser(id, name) {
  localStorage.setItem("chat_id", id);
  localStorage.setItem("chat_name", name);
}

export function getUser() {
  const id = localStorage.getItem("chat_id");
  const name = localStorage.getItem("chat_name");
  if (!id || !name) return null;
  return { id, name };
}

export function saveRoom(room) {
  localStorage.setItem("chat_room", room);
}

export function getRoom() {
  return localStorage.getItem("chat_room");
}
