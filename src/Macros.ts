'use strict';
import * as vscode from 'vscode';
import Do from './Do';

class MacroTreeItem extends vscode.TreeItem {
    constructor(macroName) {
        super(macroName);

        this.command = {
            command: 'do',
            arguments: [macroName],
            title: 'Do:' + macroName
        };
    }
}

export default class Macros implements vscode.TreeDataProvider < MacroTreeItem > {

    private treeDataChangeEmitter: vscode.EventEmitter < MacroTreeItem > = new vscode.EventEmitter < MacroTreeItem > ();
    public onDidChangeTreeData: vscode.Event < MacroTreeItem > = this.treeDataChangeEmitter.event;

    private macroListeners:Array<vscode.Disposable> = [];
    private treeItemDataProvider:vscode.Disposable;

    private app:Do;

    constructor(app:Do) {
        this.app = app;
        this.treeItemDataProvider = vscode.window.registerTreeDataProvider('do.macros', this);
    }

    public dispose() {
        this.treeItemDataProvider.dispose();
        this.deregisterMacros();
    }

    private deregisterMacros() {
        this.macroListeners.forEach(listener => {
            listener.dispose();
        });
    }

    private registerMacros() {
        if(this.app.settings.registerMacrosAsCommands) {
            Object.keys(this.app.settings.macros).forEach( name => {
                const disposable = vscode.commands.registerCommand(`do.${name}`, args => {
                    this.app.dispatchAction(args, () => {
                        this.app.log('done:', name);
                    });
                });
                this.macroListeners.push(disposable);
            });
        }
    }

    public configChanged() {
        this.deregisterMacros();
        this.registerMacros();
        this.treeDataChangeEmitter.fire();
    }

    public getTreeItem(element ? : MacroTreeItem): MacroTreeItem {
        return element;
    }

    public getChildren(element ? : MacroTreeItem): Array < MacroTreeItem > {
        if (!element) {
            const conf = vscode.workspace.getConfiguration('do');
            if (conf && conf.macros) {
                return Object.keys(conf.macros).map(macroName => {
                    return new MacroTreeItem(macroName);
                });
            }
        }
    }

}