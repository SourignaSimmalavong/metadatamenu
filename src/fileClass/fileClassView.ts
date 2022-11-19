import MetadataMenu from "main";
import { FileView, ItemView, WorkspaceLeaf } from "obsidian";
import { FileClassManager } from "src/components/fileClassManager";
import { FileClass } from "./fileClass";
import { FileClassFieldsView } from "./fileClassFieldsView";
import { FileClassSettingsView } from "./fileClassSettingsView";
import { FileClassTableView } from "./fileClassTableView";

export const FILECLASS_VIEW_TYPE = "FileClassView"


class MenuOption {

    private itemContainer: HTMLDivElement

    constructor(
        private menu: HTMLDivElement,
        public id: string,
        private name: string,
        public relatedView: HTMLDivElement,
        private view: FileClassView,
    ) {
        this.itemContainer = this.menu.createDiv({ cls: "fv-menu-item", attr: { id: this.id } })
        this.itemContainer.createEl("h2", { text: this.name })
        this.itemContainer.onclick = () => {
            this.view.updateDisplayView(this.id);
        }
    }

    toggleInactive(): void {
        this.itemContainer.removeClass("active");
        this.relatedView.hide();
    }

    toggleActive(): void {
        this.itemContainer.addClass("active")
        this.relatedView.show();
    }
}

export class FileClassView extends ItemView {

    private menu: HTMLDivElement
    private menuOptions: MenuOption[] = []
    private viewContainer: HTMLDivElement
    private views: HTMLDivElement[] = []
    private settingsView: FileClassSettingsView
    private tableView: FileClassTableView
    private fieldsView: FileClassFieldsView

    constructor(
        public leaf: WorkspaceLeaf,
        private plugin: MetadataMenu,
        private component: FileClassManager,
        public name: string,
        public fileClass: FileClass
    ) {
        super(leaf)
        this.containerEl.addClass("metadata-menu")
        this.containerEl.addClass("fileclass-view")
        this.navigation = false;
        this.icon = "file-spreadsheet"
        this.onunload = () => {
            //@ts-ignore
            this.plugin.app.viewRegistry.unregisterView(FILECLASS_VIEW_TYPE + "__" + this.fileClass.name);
            this.plugin.removeChild(this.component)
            this.unload()
        }
        this.buildLayout();
    }

    updateDisplayView(id: string) {
        ([...this.viewContainer.children] as HTMLDivElement[]).forEach(view => view.hide());
        this.menuOptions.forEach(option => option.id === id ? option.toggleActive() : option.toggleInactive())
    }

    buildLayout(): void {
        this.menu = this.contentEl.createDiv({ cls: "fv-menu" });
        this.viewContainer = this.contentEl.createDiv()
        this.buildSettingsView();
        this.buildFieldsView();
        this.buildTableView();
        this.buildMenu();
        this.updateDisplayView("tableOption");
    }

    buildMenu(): void {
        this.menuOptions.push(new MenuOption(this.menu, "tableOption", "Table view", this.tableView.container, this))
        this.menuOptions.push(new MenuOption(this.menu, "fieldsOption", "Fileclass fields", this.fieldsView.container, this))
        this.menuOptions.push(new MenuOption(this.menu, "settingsOption", "Fileclass settings", this.settingsView.container, this))
    }

    buildSettingsView(): void {
        //todo create the settings view and manage it!!
        this.settingsView = new FileClassSettingsView(this.plugin, this.viewContainer, this.fileClass)
        this.views.push(this.settingsView.container);
    }

    buildFieldsView(): void {
        this.fieldsView = new FileClassFieldsView(this.plugin, this.viewContainer, this.fileClass)
        this.views.push(this.fieldsView.container);
    }

    buildTableView(): void {
        this.tableView = new FileClassTableView(this.plugin, this.component, this.viewContainer, this.fileClass)
        this.views.push(this.tableView.container);
    }

    getDisplayText(): string {
        return this.name || "FileClass"
    }

    getViewType(): string {
        return this.fileClass ? FILECLASS_VIEW_TYPE + "__" + this.fileClass.name : FILECLASS_VIEW_TYPE
    }

    updateFieldsView(): void {
        this.fileClass.getAttributes()
        this.fieldsView.buildSettings()
    }

    updateSettingsView(): void {
        this.settingsView.buildSettings()
    }

    protected async onOpen(): Promise<void> {
        this.icon = this.fileClass?.getIcon() || "file-spreadsheet"
        this.tableView.buildTable();
    }
}