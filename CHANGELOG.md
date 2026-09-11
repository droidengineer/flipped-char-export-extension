# Changelog

## 1.1.0
- Added extension icon (16/32/48/128px), generated from the provided logo, referenced in both `icons` and `action.default_icon` in the manifest.
- Exported JSON now starts with `character_url`, then `version` (the extension's own version, read via the runtime API, so exports are traceable to the extractor build that produced them), followed by the character fields in the same top-to-bottom order they appear on the edit page (`LABEL_ORDER`): profile photo → gender → voice → name → identity → description (private/public) → greeting → conversational style → tags → bio → visibility.
- `avatar` is intentionally absent from the field order — confirmed to be the same image as the profile photo, so it isn't tracked as a separate field.

## 1.0.1
- Fixed Voice extraction: name and tag chips were being concatenated into one string; now read separately from the `div.mb-2` name element and its sibling `<span>` tags.

## 1.0.0
- Initial release: popup-triggered extraction of Name, Identity, Gender, Voice, both Description fields, Greeting, Conversational Style, Tags, Bio, Visibility, and Profile Photo from a flipped.chat character edit page, exported as downloadable JSON.
