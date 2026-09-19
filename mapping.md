# Flipped.Chat Character Field Mapping Tables
When exporting/porting to a new platform and there are no direct, one-to-one mappings of fields then it takes the best effort educated guessing with testing. There are the current mapping tables that map Flipped.Chat character fields to their relevant target format fields.

## Flat JSON
This is a 1:1 mapping directly. Every field available from the `flipped.chat/create/...` page is copied and included here.

```typescript
type Flipped = {
    character_url: string
    exporter_version: string
    profile_photo: string
    gender:string
    voice: { name: string, tags: Array<string> }
    name: string
    identity: string
    description: {
        private: string
        public: string
    }
    greeting: string
    conversational_style: Array<string>
    tags:Array<string>
    bio: string
    visibility: string
}
```

## Character Card V1

### Specification
```typescript
type CharacterCardV1 = {
    name: string
    description: string
    personality: string
    scenario: string
    first_mes: string
    mes_example: string
}
```
### JSON format
```json
{
  "name": "",
  "description": "",
  "personality": "",
  "scenario": "",
  "first_mes": "",
  "mes_example": ""
}
```

Given a card name `chara`:

| Flipped.Chat Field  | Character Card V1   | Rationale    |
|---------------------|---------------------|--------------|
| Name                | `chara.name`        | Direct match |
| Private Description | `chara.description` | match        |
|                     | `chara.personality` |
| Public Description  | `chara.scenario`    |              |
| Greeting            | `chara.first_mes`   | Direct match |
| Conversation Style  | `chara.mes_example` | Direct match |



## Character Card V2

### Specification
```typescript
type CharacterCardV2 = {
    spec: `chara_card_v2`
    spec_version: `2.0`
    data: {
        // V1 fields
        name: string
        description: string
        personality: string
        scenario: string
        first_mes: string
        mes_example: string
        
        // V2 fields
        creator_notes: string
        system_prompt: string
        post_history_instructions: string
        alternate_greetings: Array<string>
        character_book?: CharacterBook
        
        // May 8th additions
        tags: Array<string>
        creator: string
        charcter_version: string
        extensions: Record<string, any>
    }
}
```

Given a character card `chara`:

| Flipped.Chat field                                                                  | Character Card V2                    | Rationale                                                                                                          |
|-------------------------------------------------------------------------------------|--------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| Name                                                                                | `chara.data.name`                    | Direct match                                                                                                       |
| Public Description                                                                  | `chara.data.description`             | Match from [spec](https://github.com/malfoyslastname/character-card-spec-v2/blob/main/spec_v1.md#description)      |
| Hidden Description                                                                  | `chara.data.personality`             | Mapped based on [spec](https://github.com/malfoyslastname/character-card-spec-v2/blob/main/spec_v1.md#personality) |
| Greeting                                                                            | `chara.data.first_mes`               | Direct match                                                                                                       |
| Tag                                                                                 | `chara.data.tags`                    | Direct match                                                                                                       |
| Bio                                                                                 | `chara.data.creator_notes`           | Short public-facing blurb                                                                                          |
| Conversation Style                                                                  | `chara.data.mes_example`             | Already formatted with `{{user}}/{{char}}` style; this is exactly V2's example-dialogue convention                 |
| Gender, Voice, Identity, Visibility, Profile Photo, character URL, exporter version | `chara.data.extensions.flipped_chat` | V2's sactioned catch-all for non-standard/platform-specific data                                                   |

`scenario`, `system_prompt`, `post_history_instructions`, `alternate_greetings`, `character_book`, `creator`, `character_version` have no Flipped.Chat equivalent, so they're left as spec-compliant empty defaults.

