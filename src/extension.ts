'use strict';
import * as vscode from 'vscode';
import Do from './Do';


export function activate(context: vscode.ExtensionContext) {

    const app = new Do();
    app.register();
    context.subscriptions.push(app);

}

export function deactivate(context: vscode.ExtensionContext) {
    
}

