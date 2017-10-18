'use strict';
import * as vscode from 'vscode';
import Do from './Do';

const doInstance = new Do();

export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerCommand('do', (args) => {
        doInstance.dispatchAction(args,() => {
            vscode.window.showInformationMessage('do:done!');
        });
    });

    if (doInstance.settings.onStart) {

    }

    context.subscriptions.push(disposable);
}

export function deactivate() {
}

vscode.window.onDidCloseTerminal(terminal => {

    let term = <any>terminal;
    if(term.action) {
        delete term.action.terminal;
        delete term.action;
    }
});