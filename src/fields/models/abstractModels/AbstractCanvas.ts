import { ButtonComponent, ColorComponent, DropdownComponent, TextAreaComponent, TextComponent, ToggleComponent, setIcon } from "obsidian"
import { FileSuggest } from "src/suggester/FileSuggester"
import { Constructor } from "src/typings/types"
import { IFieldManager, Target, isSingleTargeted, removeValidationError } from "../../Field"
import { BaseOptions } from "../../base/BaseField"
import { ISettingsModal } from "../../base/BaseSetting"
import { getLink } from "src/utils/parser"


//#region options values

export const standardColors = ["1", "2", "3", "4", "5", "6"]

export const sides = [
    ["top", "chevron-up"],
    ["right", "chevron-right"],
    ["bottom", "chevron-down"],
    ["left", "chevron-left"]
]

//#endregion

export type Direction = "incoming" | "outgoing" | "bothsides"

export interface Options extends BaseOptions {
    canvasPath: string
    direction?: Direction
    nodeColors?: string[]
    edgeColors?: string[]
    edgeFromSides?: string[]
    edgeToSides?: string[]
    edgeLabels?: string[]
    groupColors?: string[]
    groupLabels?: string[]
}

export interface DefaultedOptions extends Options {
}

const directionOptions: Record<Direction, string> = {
    "incoming": "Incoming",
    "outgoing": "Outgoing",
    "bothsides": "Both Sides"
}

export const DefaultOptions: DefaultedOptions = {
    canvasPath: ""
}

export interface ICanvasBaseSettingModal extends ISettingsModal<Options> {
    canvasPathInput: TextComponent
    createSettingContainer(): void
    buildColorsContainer(container: HTMLDivElement, colorList: string[], label: string): void
    buildEdgeSideContainer(container: HTMLDivElement, edgeList: string[], label: string): void
    buildLabelsContainer(container: HTMLDivElement, labels: string[], title: string): void
    buildNewLabelContainer(currentLabelsContainer: HTMLDivElement, currentLabelsTitle: string, newLabelContainer: HTMLDivElement, labels: string[], title: string): void
    createCanvasPathContainer(container: HTMLDivElement): void
    createDirectionContainer(container: HTMLDivElement, title: string): void
    createDvQueryContainer(container: HTMLDivElement, title: string): void
}

export function settingsModal(Base: Constructor<ISettingsModal<DefaultedOptions>>): Constructor<ICanvasBaseSettingModal> {
    return class SettingsModal extends Base {
        public canvasPathInput: TextComponent

        createSettingContainer() {

        }
        validateOptions(): boolean {
            return true
        }
        public buildColorsContainer = (container: HTMLDivElement, colorList: string[], label: string) => {
            container.replaceChildren(...[]);
            container.createEl("span", { text: label, cls: "label" });
            container.createDiv({ cls: "spacer" });
            const toggleStandardColorButton = (container: HTMLDivElement, color: string) => {
                if (colorList.includes(color)) {
                    container.addClass("active");
                    setIcon(container, "cross");
                } else {
                    container.removeClass("active");
                    setIcon(container, "plus");
                }
            }

            standardColors.forEach(color => {
                const colorContainer = container.createDiv({ cls: `node-color color-${color}` })
                toggleStandardColorButton(colorContainer, color)
                colorContainer.onmouseover = () => {
                    colorContainer.setAttr("style", `color: white`)
                }
                colorContainer.onmouseout = () => {
                    colorContainer.removeAttribute("style")
                }
                colorContainer.onclick = () => {
                    const colors = colorList as string[]
                    if (colors.includes(color)) {
                        colors.remove(color)
                    } else {
                        colors.push(color)
                    }
                    toggleStandardColorButton(colorContainer, color)

                }
            })

            const toggleAltColors = () => {
                const altGroupColors: string[] = colorList && colorList.filter((color: string) => !standardColors.includes(color)) || []
                altGroupColors.forEach(color => {
                    const colorContainer = container.createDiv({ cls: `node-color` })
                    colorContainer.setAttr("style", `background-color: ${color}; color: ${color}`)
                    colorContainer.onmouseover = () => {
                        colorContainer.setAttr("style", `background-color: ${color}; color: white`)
                    }
                    colorContainer.onmouseout = () => {
                        colorContainer.setAttr("style", `background-color: ${color}; color: ${color}`)
                    }
                    setIcon(colorContainer, "cross")
                    colorContainer.onclick = () => {
                        (colorList as string[]).remove(color);
                        container.removeChild(colorContainer);
                    }
                })
            }
            toggleAltColors()

            const altColorPickerContainer = container.createDiv({ cls: `node-color picker` })
            const altColorPicker = new ColorComponent(altColorPickerContainer);
            altColorPicker.onChange(value => {
                colorList.push(value);
                this.buildColorsContainer(container, colorList, label);
            })
        }

        public buildEdgeSideContainer = (container: HTMLDivElement, edgeList: string[], label: string) => {
            container.createDiv({ cls: "label", text: label })
            container.createDiv({ cls: "spacer" })
            sides.forEach(([side, iconName]) => {
                edgeList = (edgeList as string[] | undefined) || sides.map(side => side[0])
                const edgeSideContainer = container.createDiv({ cls: "edge-side" })
                const sideIconContainer = edgeSideContainer.createDiv({ cls: "side-icon" })
                setIcon(sideIconContainer, iconName)
                const sideTogglerContainer = new ToggleComponent(edgeSideContainer);
                sideTogglerContainer.setValue(edgeList.includes(side))
                sideTogglerContainer.onChange(value => value ? edgeList.push(side) : edgeList.remove(side))
            })

        }

        public buildLabelsContainer = (container: HTMLDivElement, labels: string[], title: string) => {
            container.replaceChildren(...[]);
            container.createDiv({ cls: "label", text: title });
            (labels as string[]).forEach(label => {
                const labelContainer = container.createDiv({ cls: "item chip", text: label })
                new ButtonComponent(labelContainer)
                    .setIcon("x-circle")
                    .setClass("item-remove")
                    .onClick(() => {
                        labels.remove(label)
                        container.removeChild(labelContainer)
                    })
            })
        }

        public buildNewLabelContainer = (
            currentLabelsContainer: HTMLDivElement,
            currentLabelsTitle: string,
            newLabelContainer: HTMLDivElement,
            labels: string[],
            title: string
        ) => {
            newLabelContainer.createDiv({ cls: "label", text: title })
            newLabelContainer.createDiv({ cls: "spacer" })
            const labelInput = new TextComponent(newLabelContainer);
            const labelValidate = new ButtonComponent(newLabelContainer);
            labelInput.onChange(value => value ? labelValidate.setCta() : labelValidate.removeCta())
            labelValidate.setIcon("plus-circle")
            labelValidate.onClick(() => {
                labels.push(labelInput.getValue());
                this.buildLabelsContainer(currentLabelsContainer, labels, currentLabelsTitle);
                labelInput.setValue("")
                labelValidate.removeCta();
            })
        }

        public createCanvasPathContainer = (container: HTMLDivElement) => {
            container.createDiv({ text: `Path of the canvas`, cls: "label" });
            const canvasPathInput = new TextComponent(container);
            canvasPathInput.inputEl.addClass("full-width");
            canvasPathInput.inputEl.addClass("with-label");
            new FileSuggest(
                canvasPathInput.inputEl,
                this.plugin,
                "/",
                "canvas"
            )
            const canvasPath = this.field.options.canvasPath;
            canvasPathInput.setValue(canvasPath || "");
            canvasPathInput.setPlaceholder("Path/of/the/file.canvas");
            canvasPathInput.onChange(value => {
                removeValidationError(canvasPathInput)
                this.field.options.canvasPath = value
            });
            this.canvasPathInput = canvasPathInput
        }

        public createDirectionContainer = (container: HTMLDivElement, title: string) => {
            container.createDiv({ text: title, cls: "label" });
            container.createDiv({ cls: "spacer" });
            const directionSelection = new DropdownComponent(container);
            Object.entries(directionOptions).forEach(([direction, label]: [Direction, string]) => directionSelection.addOption(direction, label));
            directionSelection.setValue(this.field.options.direction || "incoming")
            directionSelection.onChange((value: Direction) => this.field.options.direction = value)
        }

        public createDvQueryContainer = (container: HTMLDivElement, title: string) => {
            container.createEl("span", { text: title });
            container.createEl("span", { text: "Dataview query returning a list of files (<dv> object is available)", cls: "sub-text" });
            const filesFromDVQueryContainer = container.createDiv({ cls: "field-container" })
            const filesFromDVQuery = new TextAreaComponent(filesFromDVQueryContainer);
            filesFromDVQuery.inputEl.addClass("full-width");
            filesFromDVQuery.inputEl.cols = 65;
            filesFromDVQuery.inputEl.rows = 3;
            filesFromDVQuery.setPlaceholder("ex: dv.pages('#student')")
            filesFromDVQuery.setValue(this.field.options.filesFromDVQuery || "");
            filesFromDVQuery.onChange((value) => {
                this.field.options.filesFromDVQuery = value
            })
        }
    }

}

export function validateValue(managedField: IFieldManager<Target, Options>) {
    let error = false;
    if (!(managedField.options.canvasPath as string)?.endsWith(".canvas")) {
        error = true;
    }
    return !error
}

export function valueString(managedField: IFieldManager<Target, Options>): string {
    if (!isSingleTargeted(managedField)) return ""
    const result: string[] = []
    const value = managedField.value
    const values = Array.isArray(value) ? value : [value]
    values.forEach((value, i) => {
        const link = getLink(value, managedField.target)
        if (link?.path) {
            const linkText = link.path.split("/").last() || ""
            result.push(linkText.replace(/(.*).md/, "$1"));
        } else {
            result.push(value);
        }
        if (i < values.length - 1) {
            result.push(" | ")
        }
    })
    return result.join("")
}


export function displayValue(managedField: IFieldManager<Target, Options>, container: HTMLDivElement, onClicked: () => any) {
    if (!isSingleTargeted(managedField)) return
    const value = managedField.value
    const values = Array.isArray(value) ? value : [value]
    values.forEach((value, i) => {
        const link = getLink(value, managedField.target)
        if (link?.path) {
            const linkText = link.path.split("/").last() || ""
            const linkEl = container.createEl('a', { text: linkText.replace(/(.*).md/, "$1") });
            linkEl.onclick = () => {
                managedField.plugin.app.workspace.openLinkText(value.path, managedField.target.path, true)
                onClicked()
            }
        } else {
            container.createDiv({ text: value });
        }
        if (i < values.length - 1) {
            container.createEl('span', { text: " | " })
        }
    })
    container.createDiv()
}