(() => {
  const storageKey = "ai-multiagent-harness:client";
  const validClient = (value) => value === "claude" || value === "codex";
  const requested = new URL(location.href).searchParams.get("client");
  let saved;

  try {
    saved = localStorage.getItem(storageKey);
    if (validClient(requested)) localStorage.setItem(storageKey, requested);
  } catch {
    // The URL still works when browser storage is unavailable.
  }

  const client = validClient(requested) ? requested : validClient(saved) ? saved : "claude";
  document.documentElement.dataset.client = client;

  for (const variant of document.querySelectorAll("template[data-codex-variant]")) {
    if (client === "codex") variant.previousElementSibling.replaceWith(variant.content);
    variant.remove();
  }

  if (client === "codex") {
    for (const item of document.querySelectorAll("[data-codex-remove]")) item.remove();
    for (const item of document.querySelectorAll("[data-codex-text]")) item.textContent = item.dataset.codexText;
    for (const item of document.querySelectorAll("[data-codex-count]")) item.dataset.count = item.dataset.codexCount;
    for (const item of document.querySelectorAll("[data-codex-label]")) item.setAttribute("aria-label", item.dataset.codexLabel);
  }

  const choices = document.querySelectorAll("a[data-client-choice]");
  for (const choice of choices) {
    if (choice.dataset.clientChoice === client) choice.setAttribute("aria-current", "page");
    else choice.removeAttribute("aria-current");
  }

  function updateChoiceLinks() {
    for (const choice of choices) {
      const target = new URL(location.href);
      target.searchParams.set("client", choice.dataset.clientChoice);
      choice.href = target.href;
    }
  }

  updateChoiceLinks();
  addEventListener("hashchange", updateChoiceLinks);
  document.addEventListener("slidechange", updateChoiceLinks);

  for (const link of document.querySelectorAll("a[data-keep-client]")) {
    const target = new URL(link.getAttribute("href"), location.href);
    target.searchParams.set("client", client);
    link.href = target.href;
  }
})();
