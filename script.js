(() => {
  const form = document.getElementById("chatForm");
  const input = document.getElementById("messageInput");
  const messages = document.getElementById("messages");
  const welcome = document.getElementById("welcome");
  const sendBtn = document.getElementById("sendBtn");
  const toast = document.getElementById("toast");
  const recentList = document.getElementById("recentList");

  const history = [];
  let toastTimer;

  // -----------------------------
  // Toast notification
  // -----------------------------
  function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }

  // -----------------------------
  // Message timestamp
  // -----------------------------
  function timestamp() {
    return new Intl.DateTimeFormat([], {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date());
  }

  // -----------------------------
  // Safely create formatted Markdown
  // Supports:
  // **bold**
  // *italic*
  // `inline code`
  // - bullet lists
  // 1. numbered lists
  // # headings
  // -----------------------------
  function renderInlineMarkdown(text) {
    const fragment = document.createDocumentFragment();

    // Split text into supported Markdown tokens.
    const pattern =
      /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g;

    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(
            text.slice(lastIndex, match.index)
          )
        );
      }

      const token = match[0];
      let element;
      let value;

      if (
        (token.startsWith("**") && token.endsWith("**")) ||
        (token.startsWith("__") && token.endsWith("__"))
      ) {
        element = document.createElement("strong");
        value = token.slice(2, -2);
      } else if (token.startsWith("`") && token.endsWith("`")) {
        element = document.createElement("code");
        value = token.slice(1, -1);
      } else {
        element = document.createElement("em");
        value = token.slice(1, -1);
      }

      element.textContent = value;
      fragment.appendChild(element);

      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(
        document.createTextNode(text.slice(lastIndex))
      );
    }

    return fragment;
  }

  // -----------------------------
  // Render full message formatting
  // -----------------------------
  function renderMessageContent(container, text) {
    const lines = String(text).split(/\r?\n/);

    let paragraphLines = [];
    let listElement = null;
    let listType = null;
    let codeBlock = false;
    let codeLines = [];

    function flushParagraph() {
      if (!paragraphLines.length) return;

      const paragraph = document.createElement("p");

      paragraphLines.forEach((line, index) => {
        if (index > 0) {
          paragraph.appendChild(document.createElement("br"));
        }

        paragraph.appendChild(renderInlineMarkdown(line));
      });

      container.appendChild(paragraph);
      paragraphLines = [];
    }

    function closeList() {
      listElement = null;
      listType = null;
    }

    function flushCodeBlock() {
      const pre = document.createElement("pre");
      const code = document.createElement("code");

      code.textContent = codeLines.join("\n");

      pre.appendChild(code);
      container.appendChild(pre);

      codeLines = [];
    }

    for (const originalLine of lines) {
      const line = originalLine.trim();

      // Fenced code blocks
      if (line.startsWith("```")) {
        flushParagraph();
        closeList();

        if (!codeBlock) {
          codeBlock = true;
          codeLines = [];
        } else {
          flushCodeBlock();
          codeBlock = false;
        }

        continue;
      }

      if (codeBlock) {
        codeLines.push(originalLine);
        continue;
      }

      // Empty line
      if (!line) {
        flushParagraph();
        closeList();
        continue;
      }

      // Markdown headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        flushParagraph();
        closeList();

        const level = Math.min(headingMatch[1].length, 6);
        const heading = document.createElement(`h${level}`);

        heading.appendChild(
          renderInlineMarkdown(headingMatch[2])
        );

        container.appendChild(heading);
        continue;
      }

      // Bullet lists
      const bulletMatch = line.match(/^[-*+]\s+(.+)$/);

      // Numbered lists
      const numberMatch = line.match(/^\d+[.)]\s+(.+)$/);

      if (bulletMatch || numberMatch) {
        flushParagraph();

        const nextListType = bulletMatch ? "ul" : "ol";

        if (listType !== nextListType || !listElement) {
          closeList();

          listElement = document.createElement(nextListType);
          listType = nextListType;

          container.appendChild(listElement);
        }

        const item = document.createElement("li");

        item.appendChild(
          renderInlineMarkdown(
            bulletMatch ? bulletMatch[1] : numberMatch[1]
          )
        );

        listElement.appendChild(item);
        continue;
      }

      // Normal paragraph line
      closeList();
      paragraphLines.push(originalLine);
    }

    flushParagraph();
    closeList();

    // Handle a code block that wasn't closed.
    if (codeBlock && codeLines.length) {
      flushCodeBlock();
    }
  }

  // -----------------------------
  // Add chat message
  // -----------------------------
  function addMessage(text, who) {
    const article = document.createElement("article");

    article.className =
      `message ${who === "user" ? "user-message" : "assistant-message"}`;

    if (who !== "user") {
      const avatar = document.createElement("span");

      avatar.className = "mini-bot";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = "✦";

      article.appendChild(avatar);
    }

    const content = document.createElement("div");
    content.className = "message-content";

    // Render Markdown safely without injecting raw HTML.
    renderMessageContent(content, text);

    const time = document.createElement("time");
    time.textContent = timestamp();

    content.appendChild(time);
    article.appendChild(content);
    messages.appendChild(article);

    const conversation = document.getElementById("conversation");

    if (conversation) {
      conversation.scrollTop = conversation.scrollHeight;
    }

    return article;
  }

  // -----------------------------
  // Typing indicator
  // -----------------------------
  function showTyping() {
    const article = document.createElement("article");

    article.className = "message assistant-message";
    article.id = "typingIndicator";

    const avatar = document.createElement("span");

    avatar.className = "mini-bot";
    avatar.textContent = "✦";

    const bubble = document.createElement("div");

    bubble.className = "message-content";
    bubble.setAttribute("aria-label", "AuraBot is typing");

    const dots = document.createElement("div");
    dots.className = "typing-dots";

    for (let i = 0; i < 3; i += 1) {
      dots.appendChild(document.createElement("span"));
    }

    bubble.appendChild(dots);
    article.append(avatar, bubble);
    messages.appendChild(article);

    const conversation = document.getElementById("conversation");

    if (conversation) {
      conversation.scrollTop = conversation.scrollHeight;
    }
  }

  // -----------------------------
  // Recent prompts
  // -----------------------------
  function addRecent(text) {
    if (!recentList) return;

    const title =
      text.length > 34 ? `${text.slice(0, 34)}…` : text;

    const item = document.createElement("button");

    item.className = "recent-item";
    item.type = "button";
    item.dataset.prompt = text;

    const icon = document.createElement("span");
    icon.textContent = "▤";

    const label = document.createElement("span");

    label.appendChild(document.createTextNode(title));

    const small = document.createElement("small");
    small.textContent = "Just now";

    label.appendChild(small);
    item.append(icon, label);

    recentList.prepend(item);

    while (recentList.children.length > 5) {
      recentList.lastElementChild.remove();
    }
  }

  // -----------------------------
  // Send message to Flask backend
  // -----------------------------
  async function sendMessage(rawText) {
    const text = String(rawText || "").trim();

    if (!text || sendBtn.disabled) return;

    if (welcome) {
      welcome.hidden = true;
    }

    addMessage(text, "user");

    history.push({
      role: "user",
      text,
    });

    input.value = "";
    input.style.height = "auto";

    sendBtn.disabled = true;

    showTyping();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
        }),
      });

      const data = await response.json().catch(() => ({}));

      document.getElementById("typingIndicator")?.remove();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to send message. Please try again."
        );
      }

      const reply =
        data.reply ||
        "I couldn't create a response just now. Please try again.";

      addMessage(reply, "assistant");

      history.push({
        role: "assistant",
        text: reply,
      });

      addRecent(text);

      if (data.mode === "demo") {
        showToast(
          "Demo mode: configure your Gemini API key for AI answers."
        );
      }
    } catch (error) {
      document.getElementById("typingIndicator")?.remove();

      addMessage(
        error.message || "Connection issue. Please try again.",
        "assistant"
      );

      showToast("Could not connect. Please try again.");
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // -----------------------------
  // Submit chat form
  // -----------------------------
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(input.value);
  });

  // Auto-resize input
  input.addEventListener("input", () => {
    input.style.height = "auto";

    input.style.height =
      `${Math.min(input.scrollHeight, 120)}px`;
  });

  // Enter to send; Shift+Enter for new line
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  // Quick prompts and recent prompts
  document.addEventListener("click", (event) => {
    const promptButton = event.target.closest("[data-prompt]");

    if (promptButton) {
      event.preventDefault();
      sendMessage(promptButton.dataset.prompt);
    }
  });

  // New chat
  document.getElementById("newChatBtn").addEventListener("click", () => {
    messages.replaceChildren();

    if (welcome) {
      welcome.hidden = false;
    }

    history.length = 0;

    addMessage(
      "I'm so happy to see you here, Priya! 🩵\n" +
      "What would you like to explore today?\n" +
      "You can ask me about studies, ideas, coding, or anything you're curious about. ✨",
      "assistant"
    );

    document.querySelector(".sidebar")?.classList.remove("open");
    input.focus();
  });

  // Light / dark theme
  document.getElementById("themeBtn").addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    localStorage.setItem(
      "aurabot-theme",
      document.body.classList.contains("dark-mode")
        ? "dark"
        : "light"
    );
  });

  if (localStorage.getItem("aurabot-theme") === "dark") {
    document.body.classList.add("dark-mode");
  }

  // Mobile sidebar
  document.getElementById("menuBtn").addEventListener("click", () => {
    document.querySelector(".sidebar")?.classList.toggle("open");
  });

  // Session history information
  document.getElementById("historyBtn").addEventListener("click", () => {
    showToast(
      history.length
        ? `${Math.ceil(history.length / 2)} messages exchanged in this session.`
        : "Your new chat will appear here after you start chatting."
    );
  });

  // Explore
  document.getElementById("exploreBtn").addEventListener("click", () => {
    if (welcome) {
      welcome.hidden = false;
    }

    const conversation = document.getElementById("conversation");

    if (conversation) {
      conversation.scrollTop = 0;
    }

    document.querySelector(".sidebar")?.classList.remove("open");

    showToast("Choose a quick action to explore AuraBot.");
  });

  // Settings
  document.getElementById("settingsBtn").addEventListener("click", () => {
    showToast(
      "Use the sun icon in the top bar to switch between light and dark themes."
    );
  });

  // Profile
  document.getElementById("profileBtn").addEventListener("click", () => {
    showToast("Welcome, Priya! Your AuraBot workspace is ready.");
  });

  // View recent prompts
  document.getElementById("viewAllBtn").addEventListener("click", () => {
    showToast("Recent prompts are shown here for this session.");
  });

  // Attachments
  document.getElementById("attachBtn").addEventListener("click", () => {
    showToast("File attachments are not enabled in this version yet.");
  });

  // Emoji button
  document.getElementById("emojiBtn").addEventListener("click", () => {
    input.value += " 😊";
    input.focus();
  });
})();