// extractor.js
// Runs INSIDE the flipped.chat page (injected via chrome.scripting.executeScript).
// Uses label-text matching rather than hardcoded CSS class names, since the
// app's generated class names can change between deploys. This function is
// the last statement in the file, so its return value becomes the
// executeScript result.
(function extractCharacterData() {
  const warnings = [];
  const norm = (s) => (s || "").replace(/[ \t]+\n/g, "\n").trim();

  // Ordered list of field labels as they appear top-to-bottom on the edit page.
  // Used to bound "search between this label and the next" for multi-element fields.
  const LABEL_ORDER = [
    "Profile Photo", "Avatar", "Gender", "Voice", "Name", "Identity",
    "for character(private seen)", "background history(public seen)",
    "Greeting", "Conversational Style", "Tag", "Bio", "Visibility"
  ];

  // Find the element whose OWN direct text (ignoring nested element text)
  // matches labelText, case-insensitively, ignoring a trailing required "*".
  function findLabelEl(labelText) {
    const target = labelText.toLowerCase();
    const all = document.querySelectorAll("body *");
    for (const el of all) {
      if (el.children.length > 1) continue; // labels are simple leaf-ish nodes
      const direct = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent)
        .join("")
        .trim();
      if (direct && direct.toLowerCase().replace(/\*$/, "").trim() === target) {
        return el;
      }
    }
    return null;
  }

  // First form field (input/textarea, excluding radio/checkbox/file) that
  // appears in DOM order after labelEl.
  function fieldAfter(labelEl) {
    if (!labelEl) return null;
    const fields = document.querySelectorAll(
      'textarea, input:not([type=radio]):not([type=checkbox]):not([type=file])'
    );
    for (const f of fields) {
      if (labelEl.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING) {
        return f;
      }
    }
    return null;
  }

  function valueForLabel(labelText) {
    const labelEl = findLabelEl(labelText);
    const field = fieldAfter(labelEl);
    if (!field) {
      warnings.push(`Could not locate a field for "${labelText}".`);
      return "";
    }
    return norm(field.value);
  }

  // Radio-style option groups (Gender, Visibility): find which of `options`
  // is currently selected. Tries native <input type=radio>, aria-checked,
  // and common "selected/active" class name heuristics, in that order.
  function selectedOption(labelText, options) {
    const startEl = findLabelEl(labelText);
    if (!startEl) {
      warnings.push(`Could not locate the "${labelText}" section.`);
      return null;
    }
    for (const opt of options) {
      const optLabelEl = findLabelEl(opt);
      if (!optLabelEl) continue;
      if (startEl.compareDocumentPosition(optLabelEl) & Node.DOCUMENT_POSITION_FOLLOWING) {
        const host = optLabelEl.closest("button, label, div") || optLabelEl;
        const radio = host.querySelector('input[type=radio]');
        if (radio) {
          if (radio.checked) return opt;
          continue;
        }
        const ariaHost = host.closest("[aria-checked]");
        if (ariaHost && ariaHost.getAttribute("aria-checked") === "true") return opt;
        const cls = (host.className || "").toString().toLowerCase();
        if (/selected|active|\bchecked\b|--on\b/.test(cls)) return opt;
      }
    }
    warnings.push(
      `Could not confidently detect the selected "${labelText}" option — verify manually (options tried: ${options.join(", ")}).`
    );
    return null;
  }

  // Tag chips: short text elements with an adjacent remove ("×") control,
  // located between the "Tag" label and the "Bio" label.
  function extractTags() {
    const startEl = findLabelEl("Tag");
    const endEl = findLabelEl("Bio");
    if (!startEl) {
      warnings.push('Could not locate the "Tag" section.');
      return [];
    }
    const candidates = document.querySelectorAll("span, div, button");
    const tags = [];
    for (const el of candidates) {
      const afterStart = startEl.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING;
      const beforeEnd = endEl
        ? el.compareDocumentPosition(endEl) & Node.DOCUMENT_POSITION_FOLLOWING
        : true;
      if (!afterStart || !beforeEnd) continue;
      const hasRemoveBtn = Array.from(el.querySelectorAll("button, span")).some(
        (c) => norm(c.textContent) === "×" || norm(c.textContent) === "x"
      );
      if (hasRemoveBtn && el.children.length <= 2) {
        const text = norm(el.textContent).replace(/[×x]\s*$/i, "").trim();
        if (text && text.length < 40 && !tags.includes(text)) tags.push(text);
      }
    }
    if (!tags.length) warnings.push('Found no tags — verify the "Tag" section manually.');
    return tags;
  }

  // Voice: e.g. "Young Conversational Male" plus small tag chips like "Young","Airy".
  function extractVoice() {
    const labelEl = findLabelEl("Voice");
    if (!labelEl) {
      warnings.push('Could not locate the "Voice" section.');
      return { name: "", tags: [] };
    }
    let node = labelEl.nextElementSibling;
    let hops = 0;
    while (node && hops < 6 && norm(node.textContent).length === 0) {
      node = node.nextElementSibling;
      hops++;
    }
    const block = node || labelEl.parentElement;
    const fullText = norm(block ? block.textContent : "");
    const lines = fullText.split("\n").map(norm).filter(Boolean);
    return {
      name: lines[0] || "",
      tags: lines.slice(1),
    };
  }

  // Profile photo: first <img> appearing after the "Profile Photo" label,
  // before the "Gender" label. Avatar is confirmed to be the same image,
  // so only profile_photo is returned.
  function extractProfilePhoto() {
    const startEl = findLabelEl("Profile Photo");
    const endEl = findLabelEl("Gender");
    const imgs = document.querySelectorAll("img");
    for (const img of imgs) {
      const afterStart = startEl
        ? startEl.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_FOLLOWING
        : true;
      const beforeEnd = endEl
        ? img.compareDocumentPosition(endEl) & Node.DOCUMENT_POSITION_FOLLOWING
        : true;
      if (afterStart && beforeEnd && img.src) return img.src;
    }
    warnings.push("Could not locate the profile photo <img> element — check the Profile Photo/Avatar crop area manually.");
    return null;
  }

  const result = {
    character_url: location.href,
    name: valueForLabel("Name"),
    identity: valueForLabel("Identity"),
    gender: selectedOption("Gender", ["Woman", "Man", "Non-binary"]),
    voice: extractVoice(),
    description: {
      for_character_private: valueForLabel("for character(private seen)"),
      background_history_public: valueForLabel("background history(public seen)"),
    },
    greeting: valueForLabel("Greeting"),
    conversational_style: valueForLabel("Conversational Style"),
    tags: extractTags(),
    bio: valueForLabel("Bio"),
    visibility: selectedOption("Visibility", ["Public", "Unlisted", "Private"]),
    profile_photo: extractProfilePhoto(),
    _warnings: warnings,
  };

  return result;
})();
