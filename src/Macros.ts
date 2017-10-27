'use strict';
import * as vscode from 'vscode';

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

    private emitter: vscode.EventEmitter < MacroTreeItem > = new vscode.EventEmitter < MacroTreeItem > ();
    public onDidChangeTreeData: vscode.Event < MacroTreeItem > = this.emitter.event;

    constructor() {
        vscode.workspace.onDidChangeConfiguration(() => {
            this.emitter.fire();
        });
        vscode.window.registerTreeDataProvider('do.macros', new Macros());
        
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

    public registerAsCommands() {
        
    }
}