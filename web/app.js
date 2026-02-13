const toggleButton = document.getElementById("chat-toggle");
const closeButton = document.getElementById("chat-close");
const panel = document.getElementById("chat-panel");
const messages = document.getElementById("chat-messages");
const input = document.getElementById("chat-input");
const sendButton = document.getElementById("chat-send");

let isOpen = false;
let conversationId = getOrCreateConversationId();

function getOrCreateConversationId() {
  const storageKey = "chatbot_conversation_id";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const generated =
    (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(storageKey, generated);
  return generated;
}

function addMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `message ${role}`;
  bubble.textContent = text;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}

function setOpen(nextOpen) {
  isOpen = nextOpen;
  panel.setAttribute("aria-hidden", (!isOpen).toString());
  toggleButton.setAttribute("aria-expanded", isOpen.toString());
  panel.classList.toggle("open", isOpen);
  if (isOpen) {
    input.focus();
    if (messages.children.length === 0) {
      addMessage("bot", "Hello! This is the local demo bot. Ask a question.");
    }
  }
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;

  addMessage("user", text);
  input.value = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, conversation_id: conversationId }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const reply = errorPayload.reply || "Request failed. Please try again.";
      addMessage("bot", reply);
      return;
    }

    const payload = await response.json();
    if (payload.conversation_id && payload.conversation_id !== conversationId) {
      conversationId = payload.conversation_id;
      window.localStorage.setItem("chatbot_conversation_id", conversationId);
    }
    addMessage("bot", payload.reply || "(No reply)");
  } catch (error) {
    addMessage("bot", "Network error: cannot reach the backend.");
  }
}

toggleButton.addEventListener("click", () => setOpen(!isOpen));
closeButton.addEventListener("click", () => setOpen(false));
sendButton.addEventListener("click", sendMessage);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});
