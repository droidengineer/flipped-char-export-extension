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
  // Used to bound "search between this label and the next" for multi-element
  // fields (e.g. tags, voice, profile photo). Output key order now follows
  // the Character Card V2 spec convention instead (see result object below).
  // For 1:1 map Flat JSON
  // const LABEL_ORDER = [
  //   "Profile Photo", "Avatar", "Gender", "Voice", "Name", "Identity",
  //   "for character(private seen)", "background history(public seen)",
  //   "Greeting", "Conversational Style", "Tag", "Bio", "Visibility"
  // ];

  // Extension version, included in the export so downstream tooling can tell
  // which extractor schema produced a given file. Content scripts have
  // access to this subset of the runtime API even in the page's context.
  const extApi = typeof browser !== "undefined" ? browser : (typeof chrome !== "undefined" ? chrome : null);
  const extVersion =
    extApi && extApi.runtime && extApi.runtime.getManifest
      ? extApi.runtime.getManifest().version
      : null;

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

  // The two Description textareas' React useId()-derived ids are NOT stable
  // across characters (confirmed: differs per character), so we can't rely
  // on a fixed id. Instead we match on the field's <h5> heading text, which
  // is static UI copy regardless of character — e.g.:
  //   <h5>for character<span>(private seen)</span></h5>
  //   <h5>background history<span>(public seen)</span></h5>
  // then walk up to the nearest ancestor containing the <textarea>.
  function findElementByText(tag, textStart) {
    const els = document.querySelectorAll(tag);
    for (const el of els) {
      const t = norm(el.textContent).toLowerCase();
      if (t.startsWith(textStart.toLowerCase())) return el;
    }
    return null;
  }

  function textareaNearHeading(headingText) {
    let heading = findElementByText("h5", headingText) || findElementByText("label", headingText);
    if (!heading) return null;
    let anc = heading;
    for (let i = 0; i < 6 && anc; i++) {
      const ta = anc.querySelector ? anc.querySelector("textarea") : null;
      if (ta) return ta;
      anc = anc.parentElement;
    }
    return null;
  }

  function valueForDescription(headingText, fallbackLabel) {
    const ta = textareaNearHeading(headingText);
    if (ta) return norm(ta.value);
    warnings.push(`Could not locate textarea near heading "${headingText}" — falling back to label search for "${fallbackLabel}".`);
    return valueForLabel(fallbackLabel);
  }

  // The app renders each radio-style option (Gender, Visibility) with an
  // inner indicator div that toggles between class "block" (selected) and
  // "hidden" (not selected), e.g.:
  //   <div class="h-full w-full rounded-full border-2 border-white block">   <- selected
  //   <div class="h-full w-full rounded-full border-2 border-white hidden">  <- not selected
  // Note: the OUTER wrapper circle also carries "rounded-full" + sometimes an
  // exact "border-white" class token, so we require the block/hidden class
  // too — otherwise we can match the wrapper instead of the real toggle.
  function isIndicatorDiv(el) {
    if (!el || el.tagName !== "DIV") return false;
    const cl = el.classList;
    return (
      cl.contains("rounded-full") &&
      cl.contains("border-white") &&
      (cl.contains("block") || cl.contains("hidden"))
    );
  }

  function findIndicatorNear(startNode) {
    // Climb a few ancestor levels from the option's text node, searching
    // each ancestor's subtree, stopping at the first indicator found —
    // this keeps us inside that single option's wrapper rather than
    // accidentally matching a sibling option's indicator.
    let anc = startNode;
    for (let i = 0; i < 4 && anc; i++) {
      const divs = anc.querySelectorAll ? anc.querySelectorAll("div") : [];
      for (const d of divs) {
        if (isIndicatorDiv(d)) return d;
      }
      anc = anc.parentElement;
    }
    return null;
  }

  // Radio-style option groups (Gender, Visibility): find which of `options`
  // is currently selected via the block/hidden indicator div, falling back
  // to native <input type=radio> / aria-checked if the app's markup differs.
  function selectedOption(labelText, options) {
    const startEl = findLabelEl(labelText);
    if (!startEl) {
      warnings.push(`Could not locate the "${labelText}" section.`);
      return null;
    }
    for (const opt of options) {
      const optLabelEl = findLabelEl(opt);
      if (!optLabelEl) continue;
      if (!(startEl.compareDocumentPosition(optLabelEl) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;

      const indicator = findIndicatorNear(optLabelEl);
      if (indicator) {
        if (indicator.classList.contains("block")) return opt;
        if (indicator.classList.contains("hidden")) continue;
      }

      // Fallbacks in case markup differs on some pages.
      const host = optLabelEl.closest("button, label, div") || optLabelEl;
      const radio = host.querySelector("input[type=radio]");
      if (radio) {
        if (radio.checked) return opt;
        continue;
      }
      const ariaHost = host.closest("[aria-checked]");
      if (ariaHost && ariaHost.getAttribute("aria-checked") === "true") return opt;
    }
    warnings.push(
      `Could not confidently detect the selected "${labelText}" option — verify manually (options tried: ${options.join(", ")}).`
    );
    return null;
  }

  // Tag chips: <span class="...">TagText<span class="iconfont-custom icon-close ...">
  // The remove "×" is an icon font rendered via CSS (::before), not real text,
  // so we match on the icon's class name rather than its (empty) textContent.
  // The chip's own text minus the icon's (empty) text content is the tag text.
  function extractTags() {
    const startEl = findLabelEl("Tag");
    const endEl = findLabelEl("Bio");
    if (!startEl) {
      warnings.push('Could not locate the "Tag" section.');
      return [];
    }
    const closeIcons = document.querySelectorAll('[class*="icon-close"]');
    const tags = [];
    for (const icon of closeIcons) {
      const afterStart = startEl.compareDocumentPosition(icon) & Node.DOCUMENT_POSITION_FOLLOWING;
      const beforeEnd = endEl
        ? icon.compareDocumentPosition(endEl) & Node.DOCUMENT_POSITION_FOLLOWING
        : true;
      if (!afterStart || !beforeEnd) continue;
      const chip = icon.parentElement;
      if (!chip) continue;
      const text = norm(chip.textContent);
      if (text && text.length < 40 && !tags.includes(text)) tags.push(text);
    }
    if (!tags.length) warnings.push('Found no tags — verify the "Tag" section manually.');
    return tags;
  }

  // Voice: name is in <div class="mb-2">Young Conversational Male</div>,
  // tags are sibling <span> elements in the same "text-left" container:
  //   <div class="text-left">
  //     <div class="mb-2">Young Conversational Male</div>
  //     <span>Young</span><span>Airy</span>
  //   </div>
  function extractVoice() {
    const labelEl = findLabelEl("Voice");
    const endEl = findLabelEl("Name");
    if (!labelEl) {
      warnings.push('Could not locate the "Voice" section.');
      return { name: "", tags: [] };
    }
    const mb2Divs = document.querySelectorAll("div.mb-2");
    let nameEl = null;
    for (const d of mb2Divs) {
      const afterStart = labelEl.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING;
      const beforeEnd = endEl
        ? d.compareDocumentPosition(endEl) & Node.DOCUMENT_POSITION_FOLLOWING
        : true;
      if (afterStart && beforeEnd) {
        nameEl = d;
        break;
      }
    }
    if (!nameEl) {
      warnings.push('Could not locate the Voice name — verify manually.');
      return { name: "", tags: [] };
    }
    const name = norm(nameEl.textContent);
    const parent = nameEl.parentElement;
    const tags = parent
      ? Array.from(parent.children)
          .filter((c) => c !== nameEl && c.tagName === "SPAN")
          .map((s) => norm(s.textContent))
          .filter(Boolean)
      : [];
    return { name, tags };
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

  // ── Character Card V2 mapping ──────────────────────────────────────────
  // Spec: { spec: "chara_card_v2", spec_version: "2.0", data: {...} }
  // Core spec fields with no flipped.chat source (personality, system_prompt,
  // post_history_instructions, alternate_greetings, character_book, creator,
  // character_version) are left at their spec-compliant empty defaults.
  //
  // Mapping used:
  //   Name                          -> data.name
  //   for character (private seen)  -> data.description      (always-injected core definition)
  //   background history (public)   -> data.scenario          (public backstory/setting context)
  //   Bio                           -> data.creator_notes      (short public-facing blurb)
  //   Greeting                      -> data.first_mes
  //   Conversational Style          -> data.mes_example        (already {{user}}/{{char}} formatted)
  //   Tag                           -> data.tags
  //   Gender, Voice, Identity,
  //   Visibility, Profile Photo,
  //   character URL, exporter ver.  -> data.extensions.flipped_chat
  //     (V2's sanctioned catch-all for non-standard/platform-specific data)
  const flippedChatExtensions = {
    character_url: location.href,
    exporter_version: extVersion,
    profile_photo: extractProfilePhoto(),
    gender: selectedOption("Gender", ["Woman", "Man", "Non-binary"]),
    voice: extractVoice(),
    identity: valueForLabel("Identity"),
    visibility: selectedOption("Visibility", ["Public", "Unlisted", "Private"]),
  };

  const result = {
    // V1 backfill
    name: valueForLabel("Name"),
    description: valueForDescription("for character", "for character(private seen)"),
    scenario: valueForDescription("background history", "background history(public seen)"),
    personality: "",
    first_mes: valueForLabel("Greeting"),
    mes_example: valueForLabel("Conversational Style"),

    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: valueForLabel("Name"),
      description: valueForDescription("for character", "for character(private seen)"),
      scenario: valueForDescription("background history", "background history(public seen)"),
      personality: "",
      first_mes: valueForLabel("Greeting"),
      mes_example: valueForLabel("Conversational Style"),
      creator_notes: valueForLabel("Bio"),
      system_prompt: "",
      post_history_instructions: "",
      alternate_greetings: [],
      tags: extractTags(),
      creator: "",
      character_version: "",
      extensions: {
        flipped_chat: flippedChatExtensions,
      },
    },
    _warnings: warnings,
  };
  return result;

})();
