# Changelog

# 1.2.3
* added new output format:
4. **V2-V1 Backfill** output format for broken V1 implementations
* removed `data.character_book` from v2 output
* remapped public description → `v2.scenario`
* remapped private description → `v2.description`

# 1.2.2
* Added multiple formats for export:
1. **Flat JSON** 
2. **Character Card V1** (`{ name: "...", description: "...", personality: "...", scenario: "...", first_mes: "...", mes_example: "..." }`)
3. **Character Card V2** (`{ spec: "chara_card_v2", spec_version: "2.0", data: {...} }`)

* Added extension version to extension popup window


## 1.2.1
* Remapped Flipped private → `data.personality` and public → `data.description`
* Added default "1.0" for `character_version`

## 1.2.0

* Output format changed to **Character Card V2** (`{ spec: "chara_card_v2", spec_version: "2.0", data: {...} }`), the widely-supported standard used by SillyTavern, chub.ai, and most character-card importers — no longer a Folx-specific shape.
* Field mapping onto the V2 schema:
    * Name → `data.name`
    * "for character (private seen)" → `data.description` (the always-injected core definition)
    * "background history (public seen)" → `data.scenario` (public backstory/setting context)
    * Bio → `data.creator_notes` (short public-facing blurb)
    * Greeting → `data.first_mes`
    * Conversational Style → `data.mes_example` (already `{{user}}`/`{{char}}`-formatted, matching V2's convention directly)
    * Tag → `data.tags`
    * Gender, Voice, Identity, Visibility, Profile Photo, character URL, and the exporter's own version → `data.extensions.flipped_chat` (V2's sanctioned catch-all for non-standard/platform-specific metadata)
* Core V2 fields with no flipped.chat source (`personality`, `system_prompt`, `post_history_instructions`, `alternate_greetings`, `character_book`, `creator`, `character_version`) are left at their spec-compliant empty defaults.
* Downloaded filename changed to `<name>-card-v2.json`.

## 1.1.1
- Fixed Voice extraction
- Fixed JSON export
- Fixed manifest icon

## 1.1.0
- Added extension icon (16/32/48/128px), generated from the provided logo, referenced in both `icons` and `action.default_icon` in the manifest.
- Exported JSON now starts with `character_url`, then `version` (the extension's own version, read via the runtime API, so exports are traceable to the extractor build that produced them), followed by the character fields in the same top-to-bottom order they appear on the edit page (`LABEL_ORDER`): profile photo → gender → voice → name → identity → description (private/public) → greeting → conversational style → tags → bio → visibility.
- `avatar` is intentionally absent from the field order — confirmed to be the same image as the profile photo, so it isn't tracked as a separate field.

## 1.0.1
- Fixed Voice extraction: name and tag chips were being concatenated into one string; now read separately from the `div.mb-2` name element and its sibling `<span>` tags.

## 1.0.0
- Initial release: popup-triggered extraction of Name, Identity, Gender, Voice, both Description fields, Greeting, Conversational Style, Tags, Bio, Visibility, and Profile Photo from a Flipped.Chat character edit page, exported as downloadable JSON.
