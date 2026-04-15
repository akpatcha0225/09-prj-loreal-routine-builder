const WORKER_ENDPOINT = "https://loreal-bot.kpatchaabdias.workers.dev/";
const SELECTED_STORAGE_KEY = "loreal-selected-products";
const CHAT_STORAGE_KEY = "loreal-chat-history";

const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const clearSearchBtn = document.getElementById("clearSearch");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const selectedCount = document.getElementById("selectedCount");
const generateRoutineButton = document.getElementById("generateRoutine");
const clearSelectionBtn = document.getElementById("clearSelection");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const rtlToggle = document.getElementById("rtlToggle");

let allProducts = [];
let selectedProductIds = new Set();
let chatHistory = [];

async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products || [];
}

function getSavedSelection() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(SELECTED_STORAGE_KEY) || "[]",
    );
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function getSavedChatHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveSelection() {
  localStorage.setItem(
    SELECTED_STORAGE_KEY,
    JSON.stringify([...selectedProductIds]),
  );
}

function saveChatHistory() {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
}

function buildSystemMessage() {
  return {
    role: "system",
    content:
      "You are a friendly L'Oréal beauty advisor. Answer only about the user's personalized routine, skincare, haircare, makeup, fragrance, or related product care. Use the selected products and their details to provide clear, helpful guidance.",
  };
}

function initializeChatHistory() {
  chatHistory = getSavedChatHistory();

  if (!chatHistory.length || chatHistory[0].role !== "system") {
    chatHistory = [buildSystemMessage()];
  }
}

function getFilteredProducts() {
  const searchTerm = productSearch.value.trim().toLowerCase();
  const category = categoryFilter.value;

  return allProducts.filter((product) => {
    const matchesCategory = !category || product.category === category;
    const matchesSearch =
      !searchTerm ||
      [product.name, product.brand, product.category, product.description]
        .join(" ")
        .toLowerCase()
        .includes(searchTerm);
    return matchesCategory && matchesSearch;
  });
}

function renderProductGrid() {
  const products = getFilteredProducts();

  if (!products.length) {
    productsContainer.innerHTML = `
      <div class="empty-state">
        No products match your search. Try a different keyword or category.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProductIds.has(product.id);
      return `
        <article class="product-card ${isSelected ? "selected" : ""}" data-id="${product.id}" tabindex="0">
          <img src="${product.image}" alt="${product.name}" />
          <div class="product-copy">
            <div class="product-brand">${product.brand}</div>
            <h3>${product.name}</h3>
            <div class="product-category">${product.category}</div>
            <button class="details-btn" type="button" aria-expanded="false">Details</button>
            <p class="product-description">${product.description}</p>
            <span class="product-chip">${isSelected ? "Selected" : "Tap to add"}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderSelectedProducts() {
  const selected = allProducts.filter((product) =>
    selectedProductIds.has(product.id),
  );
  selectedCount.textContent = `${selected.length} product${selected.length === 1 ? "" : "s"} selected`;
  generateRoutineButton.disabled = selected.length === 0;
  clearSelectionBtn.disabled = selected.length === 0;

  if (!selected.length) {
    selectedProductsList.innerHTML = `
      <div class="empty-selected">
        Your selected products will appear here to help build a custom routine.
      </div>
    `;
    return;
  }

  selectedProductsList.innerHTML = selected
    .map(
      (product) => `
        <div class="selected-item">
          <div>
            <strong>${product.name}</strong>
            <span>${product.brand}</span>
          </div>
          <button class="remove-btn" type="button" data-id="${product.id}">Remove</button>
        </div>
      `,
    )
    .join("");
}

function renderChatWindow() {
  const visibleMessages = chatHistory.filter(
    (message) => message.role !== "system",
  );

  if (!visibleMessages.length) {
    chatWindow.innerHTML = `
      <div class="placeholder-message">
        Select at least one product and generate a routine to start the conversation.
      </div>
    `;
    return;
  }

  chatWindow.innerHTML = visibleMessages
    .map((message) => {
      const roleClass = message.role === "user" ? "user" : "assistant";
      const author = message.role === "user" ? "You" : "Advisor";
      return `
        <div class="chat-line ${roleClass}">
          <div class="chat-author">${author}</div>
          <div class="chat-bubble">${message.content}</div>
        </div>
      `;
    })
    .join("");

  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function updateActionState() {
  renderProductGrid();
  renderSelectedProducts();
}

function toggleProductSelection(productId) {
  if (selectedProductIds.has(productId)) {
    selectedProductIds.delete(productId);
  } else {
    selectedProductIds.add(productId);
  }

  saveSelection();
  updateActionState();
}

function removeSelectedProduct(productId) {
  selectedProductIds.delete(productId);
  saveSelection();
  updateActionState();
}

function clearSelection() {
  selectedProductIds.clear();
  saveSelection();
  updateActionState();
}

function showTypingIndicator() {
  const tip = document.createElement("div");
  tip.className = "chat-line assistant typing";
  tip.innerHTML = `<div class="chat-author">Advisor</div><div class="chat-bubble">Thinking through your routine…</div>`;
  chatWindow.appendChild(tip);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return tip;
}

function showErrorMessage(message) {
  chatWindow.innerHTML = `
    <div class="chat-line assistant">
      <div class="chat-author">Advisor</div>
      <div class="chat-bubble">${message}</div>
    </div>
  `;
}

function extractResponseContent(data) {
  if (!data) return "Sorry, I couldn't generate a response right now.";
  if (data.choices?.[0]?.message?.content)
    return data.choices[0].message.content;
  if (data.choices?.[0]?.text) return data.choices[0].text;
  if (data.output?.[0]?.content) {
    return data.output.map((chunk) => chunk?.text || "").join("");
  }
  return "Sorry, I couldn't generate a response right now.";
}

async function sendToWorker() {
  const workerUrl = WORKER_ENDPOINT.trim();

  if (!workerUrl || workerUrl.includes("YOUR_CLOUDFLARE_WORKER")) {
    showErrorMessage(
      "Update the WORKER_ENDPOINT constant in script.js with your deployed Cloudflare Worker URL.",
    );
    return;
  }

  const typingNode = showTypingIndicator();

  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "gpt-4o", messages: chatHistory }),
    });

    typingNode.remove();

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Worker response error:", errorText);
      chatHistory.push({
        role: "assistant",
        content:
          "I couldn't reach the AI service. Please check your worker endpoint and try again.",
      });
      saveChatHistory();
      renderChatWindow();
      return;
    }

    const data = await response.json();
    const replyText = extractResponseContent(data);

    chatHistory.push({ role: "assistant", content: replyText });
    saveChatHistory();
    renderChatWindow();
  } catch (error) {
    typingNode.remove();
    console.error(error);
    chatHistory.push({
      role: "assistant",
      content:
        "Something went wrong while generating your routine. Please check the console and try again.",
    });
    saveChatHistory();
    renderChatWindow();
  }
}

async function handleGenerateRoutine() {
  const selectedProducts = allProducts.filter((product) =>
    selectedProductIds.has(product.id),
  );

  if (!selectedProducts.length) {
    showErrorMessage(
      "Please select at least one product before generating a routine.",
    );
    return;
  }

  const productDetails = selectedProducts
    .map(
      (product, index) =>
        `${index + 1}. ${product.name} — ${product.brand}
Category: ${product.category}
Description: ${product.description}`,
    )
    .join("\n\n");

  chatHistory.push({
    role: "user",
    content:
      "Create a personalized routine using only the selected L'Oréal products below. Include the best order, application tips, and why each product works together. Use the product names and categories exactly as shown.\n\n" +
      productDetails,
  });

  saveChatHistory();
  renderChatWindow();
  await sendToWorker();
}

function handleFollowUpQuestion(question) {
  if (!question) return;
  chatHistory.push({ role: "user", content: question });
  saveChatHistory();
  renderChatWindow();
  sendToWorker();
}

function setRTLMode() {
  const currentDir = document.documentElement.getAttribute("dir") || "ltr";
  const nextDir = currentDir === "ltr" ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", nextDir);
  rtlToggle.textContent = nextDir === "ltr" ? "RTL Mode" : "LTR Mode";
}

function setupEventListeners() {
  productSearch.addEventListener("input", renderProductGrid);
  clearSearchBtn.addEventListener("click", () => {
    productSearch.value = "";
    renderProductGrid();
    productSearch.focus();
  });

  categoryFilter.addEventListener("change", renderProductGrid);

  productsContainer.addEventListener("click", (event) => {
    const card = event.target.closest(".product-card");
    if (!card) return;

    const productId = Number(card.dataset.id);

    if (event.target.closest(".details-btn")) {
      const description = card.querySelector(".product-description");
      const button = card.querySelector(".details-btn");
      const expanded = card.classList.toggle("expanded");
      button.setAttribute("aria-expanded", expanded);
      return;
    }

    toggleProductSelection(productId);
  });

  productsContainer.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest(".product-card");
    if (!card) return;
    event.preventDefault();
    const productId = Number(card.dataset.id);
    toggleProductSelection(productId);
  });

  selectedProductsList.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".remove-btn");
    if (!removeButton) return;
    const productId = Number(removeButton.dataset.id);
    removeSelectedProduct(productId);
  });

  clearSelectionBtn.addEventListener("click", clearSelection);
  generateRoutineButton.addEventListener("click", handleGenerateRoutine);

  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = userInput.value.trim();
    if (!message) return;
    userInput.value = "";
    handleFollowUpQuestion(message);
  });

  rtlToggle.addEventListener("click", setRTLMode);
}

async function init() {
  allProducts = await loadProducts();
  selectedProductIds = new Set(getSavedSelection());
  initializeChatHistory();
  setupEventListeners();
  renderProductGrid();
  renderSelectedProducts();
  renderChatWindow();
}

init();
