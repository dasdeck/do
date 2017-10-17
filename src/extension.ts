'use strict';
import * as vscode from 'vscode';
import Do from './Do';

const doInstance = new Do();

export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerCommand('do', (args) => {
        doInstance.dispatchAction(args);
    });

    if(doInstance.settings.onStart){
        
    }

    context.subscriptions.push(disposable);
}

export function deactivate() {
}