'use strict';
import * as vscode from 'vscode';
import ActionDispatcher from './ActionDispatcher';

const actionDispatcher = new ActionDispatcher();

export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerCommand('do', (args) => {
        actionDispatcher.dispatchAction(args);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
}