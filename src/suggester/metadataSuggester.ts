import MetadataMenu from "main";
import {
    App,
    Editor,
    EditorPosition,
    EditorSuggest,
    EditorSuggestContext,
    EditorSuggestTriggerInfo,
    MarkdownView,
    TFile,
} from "obsidian";
import { createFileClass, FileClass } from "src/fileClass/fileClass"

interface IValueCompletion {
    value: string;
}

export default class ValueSuggest extends EditorSuggest<IValueCompletion> {
    private plugin: MetadataMenu;
    private app: App;
    private triggerPhrase: string = ":::";
    private fileClass: FileClass

    constructor(app: App, plugin: MetadataMenu) {
        super(app);
        this.app = app;
        this.plugin = plugin;

        this.setInstructions([{ command: "Shift", purpose: "put a space after::" }]);

        // @ts-ignore
        this.scope.register(["Shift"], "Enter", (evt: KeyboardEvent) => {
            // @ts-ignore
            this.suggestions.useSelectedItem(evt);
            return false;
        });
    }

    async getSuggestions(context: EditorSuggestContext): Promise<IValueCompletion[]> {
        const suggestions = await this.getValueSuggestions(context);
        if (suggestions.length) {
            return suggestions;
        }
        console.log(context.query)
        // catch-all if there are no matches
        return [{ value: context.query }];
    }

    async getValueSuggestions(context: EditorSuggestContext): Promise<IValueCompletion[]> {
        const line = context.start.line
        const regex = new RegExp(/[_\*~`]*([0-9\w\p{Letter}\p{Emoji_Presentation}][-0-9\w\p{Letter}\p{Emoji_Presentation}\s]*)[_\*~`]*\s*::(.+)?/u)
        const regexResult = context.editor.getRange({ line: line, ch: 0 }, { line: line, ch: -1 }).match(regex)

        if (regexResult && regexResult.length > 0) {
            const fieldName = regexResult[1]
            //if this note has a fileClass, check if field values are defined in the FileClass
            const cache = this.plugin.app.metadataCache.getCache(context.file.path)
            let tryWithPresetField = !cache?.frontmatter
            if (cache?.frontmatter) {
                const { position, ...attributes } = cache.frontmatter
                if (Object.keys(attributes).contains('fileClass')) {
                    const fileClassValue = attributes['fileClass']
                    try {
                        const fileClass = await createFileClass(this.plugin, fileClassValue)
                        this.fileClass = fileClass
                        const fileClassAttributes = this.fileClass.attributes
                        if (fileClassAttributes.map(attr => attr.name).contains(fieldName)) {
                            const options = fileClassAttributes.filter(attr => attr.name == fieldName)[0].options
                            console.log(options)
                            return options.map(option => Object({ value: option }))
                        }
                    } catch (error) {
                        tryWithPresetField = true
                    }
                } else {
                    tryWithPresetField = true
                }
            }
            if (tryWithPresetField) {
                //else check if there are global preset values
                const presetFieldMatch = this.plugin.settings.presetFields.filter(field => field.name == fieldName)
                if (presetFieldMatch.length > 0) {
                    const presetField = presetFieldMatch[0]

                    if (presetField.valuesListNotePath) {
                        //override presetValues if there is a valuesList
                        const matchingFile = this.plugin.app.vault.getMarkdownFiles().filter(file => file.path == presetField.valuesListNotePath)
                        if (matchingFile.length) {
                            const valuesFile = matchingFile[0]
                            const values: { value: string }[] = await (await this.plugin.app.vault.read(valuesFile)).split("\n").map(_value => Object({ value: _value }))
                            return values.filter(item => item.value.startsWith(context.query))
                        }
                    }
                    const values = Object.entries(presetFieldMatch[0].values)
                    return values.map(_value => Object({ value: _value[1] })).filter(item => item.value.startsWith(context.query))
                }
            }
        }
        return []
    }

    renderSuggestion(suggestion: IValueCompletion, el: HTMLElement): void {
        el.setText(suggestion.value);
    }

    selectSuggestion(suggestion: IValueCompletion, event: KeyboardEvent | MouseEvent): void {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            return;
        }
        const includeSpace = event.shiftKey;
        activeView.editor.replaceRange(`${includeSpace ? ":: " : "::"}` + suggestion.value, this.context!.start, this.context!.end);
    }

    onTrigger(
        cursor: EditorPosition,
        editor: Editor,
        file: TFile
    ): EditorSuggestTriggerInfo | null {
        if (!this.plugin.settings.isAutosuggestEnabled) {
            return null;
        }


        const startPos = this.context?.start || {
            line: cursor.line,
            ch: cursor.ch - this.triggerPhrase.length,
        };

        if (!editor.getRange(startPos, cursor).startsWith(this.triggerPhrase)) {
            return null;
        }

        return {
            start: startPos,
            end: cursor,
            query: editor.getRange(startPos, cursor).substring(this.triggerPhrase.length),
        };
    }
}